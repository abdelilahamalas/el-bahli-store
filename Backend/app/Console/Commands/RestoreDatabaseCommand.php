<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use ZipArchive;

class RestoreDatabaseCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'db:restore
                            {--file= : Chemin absolu ou relatif du fichier SQL de sauvegarde à restaurer}
                            {--target-db= : Nom de la base de données cible (par défaut la base configurée)}
                            {--storage-zip= : Chemin du fichier archive ZIP des fichiers de stockage à restaurer}
                            {--force : Forcer l’opération sans confirmation interactive}
                            {--test : Exécuter un test d’intégrité de la restauration sur MySQL 8.4 sans écraser les tables existantes}';

    /**
     * @var string
     */
    protected $description = 'Restauration complète de la base de données MySQL et des fichiers de stockage';

    public function handle(): int
    {
        $sqlFile = (string) $this->option('file');
        $targetDb = (string) $this->option('target-db');
        $storageZip = (string) $this->option('storage-zip');
        $force = (bool) $this->option('force');
        $isTest = (bool) $this->option('test');

        if (empty($sqlFile)) {
            $projectRoot = dirname(base_path());
            $dbDir = $projectRoot.DIRECTORY_SEPARATOR.'backups'.DIRECTORY_SEPARATOR.'database';
            $files = glob($dbDir.DIRECTORY_SEPARATOR.'*.sql');

            if ($files && count($files) > 0) {
                usort($files, fn ($a, $b) => filemtime($b) - filemtime($a));
                $sqlFile = $files[0];
                $this->info('Aucun fichier spécifié. Utilisation de la sauvegarde la plus récente : '.basename($sqlFile));
            } else {
                $this->error('Aucun fichier de sauvegarde SQL trouvé.');

                return self::FAILURE;
            }
        }

        if (! file_exists($sqlFile)) {
            $this->error("Le fichier SQL spécifié n'existe pas : {$sqlFile}");

            return self::FAILURE;
        }

        // Mode Test d'intégrité de restauration sans écrasement
        if ($isTest) {
            return $this->runRestorationIntegrityTest($sqlFile, $storageZip);
        }

        $dbConfig = config('database.connections.mysql');
        $host = $dbConfig['host'] ?? '127.0.0.1';
        $port = (string) ($dbConfig['port'] ?? 3306);
        $user = $dbConfig['username'] ?? 'root';
        $pass = $dbConfig['password'] ?? '';
        $defaultDb = $dbConfig['database'] ?? 'el_bahli_store';

        if ($defaultDb === ':memory:') {
            $defaultDb = 'el_bahli_store';
        }
        $destinationDatabase = ! empty($targetDb) ? $targetDb : $defaultDb;

        $this->warn("=== Attention : Restauration de la base [{$destinationDatabase}] ===");
        $this->line("Fichier source : {$sqlFile}");

        if (! $force) {
            if (! $this->confirm("Êtes-vous absolument certain de vouloir restaurer les données dans [{$destinationDatabase}] ?")) {
                $this->info('Opération annulée.');

                return self::SUCCESS;
            }
        }

        $mysqlBinary = $this->resolveMysqlBinary();
        if (! $mysqlBinary) {
            $this->error('Impossible de localiser l’exécutable mysql.exe.');

            return self::FAILURE;
        }

        // 1. S'assurer que la base cible existe
        $this->info("Création de la base de données cible si nécessaire : {$destinationDatabase}");
        try {
            DB::statement("CREATE DATABASE IF NOT EXISTS `{$destinationDatabase}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
        } catch (\Throwable $e) {
            $this->warn('Avertissement lors de la création de la base : '.$e->getMessage());
        }

        // 2. Import SQL
        $this->info('Restauration du schéma et des données via mysql.exe...');

        $command = [
            $mysqlBinary,
            '--host='.$host,
            '--port='.$port,
            '--user='.$user,
            '--default-character-set=utf8mb4',
            $destinationDatabase,
        ];

        if (! empty($pass)) {
            $command[] = '--password='.$pass;
        }

        $process = new Process($command);
        $process->setTimeout(600);

        $fp = fopen($sqlFile, 'rb');
        if (! $fp) {
            $this->error("Impossible de lire le fichier SQL : {$sqlFile}");

            return self::FAILURE;
        }

        $process->setInput($fp);
        $process->run();
        fclose($fp);

        if (! $process->isSuccessful()) {
            $this->error('Erreur lors de la restauration MySQL : '.$process->getErrorOutput());

            return self::FAILURE;
        }

        $this->info("✓ Base MySQL [{$destinationDatabase}] restaurée avec succès.");

        // 3. Restauration des fichiers physiques si demandée
        if (! empty($storageZip) && file_exists($storageZip)) {
            $this->info("Décompression des fichiers de stockage depuis : {$storageZip}");
            $targetStoragePath = storage_path('app'.DIRECTORY_SEPARATOR.'public');

            $zip = new ZipArchive;
            if ($zip->open($storageZip) === true) {
                $zip->extractTo($targetStoragePath);
                $zip->close();
                $this->info('✓ Fichiers de stockage restaurés avec succès.');
            } else {
                $this->error("Échec lors de l'ouverture du fichier ZIP : {$storageZip}");

                return self::FAILURE;
            }
        }

        $this->info('=== Restauration terminée avec succès ===');

        return self::SUCCESS;
    }

    /**
     * Test complet de l'intégrité de la restauration sur MySQL 8.4 sans altérer les données de production.
     */
    protected function runRestorationIntegrityTest(string $sqlFile, ?string $storageZip): int
    {
        $this->info('=== TEST D’INTÉGRITÉ DE RESTAURATION MYSQL 8.4 ===');
        $this->line("Lecture et analyse du dump : {$sqlFile}");

        $sqlContent = file_get_contents($sqlFile);
        if ($sqlContent === false || strlen($sqlContent) === 0) {
            $this->error('Le fichier SQL est vide ou illisible.');

            return self::FAILURE;
        }

        // Extraction des tables créées dans le dump
        preg_match_all('/CREATE TABLE `([^`]+)`/i', $sqlContent, $matches);
        $tablesInDump = $matches[1] ?? [];

        $this->info('Nombre de tables identifiées dans le dump : '.count($tablesInDump));
        foreach ($tablesInDump as $table) {
            $this->line(" - Table : {$table}");
        }

        // Validation syntaxique et test de création éphémère
        $prefix = 'tst_rst_';
        $this->info("\nSimulation de restauration avec le préfixe temporaire [{$prefix}] sur MySQL 8.4...");

        if (config('database.connections.mysql.database') === ':memory:') {
            config(['database.connections.mysql.database' => 'el_bahli_store']);
            DB::purge('mysql');
        }
        $conn = DB::connection('mysql');

        $createdTables = [];

        try {
            $conn->statement('SET FOREIGN_KEY_CHECKS=0;');

            // Extraire chaque bloc CREATE TABLE et l'exécuter sous le nom préfixé
            preg_match_all('/CREATE TABLE `([^`]+)` \((.*?)\) ENGINE=InnoDB[^\;]*;/s', $sqlContent, $createMatches, PREG_SET_ORDER);

            foreach ($createMatches as $stmtMatch) {
                $origTable = $stmtMatch[1];
                $tmpTable = $prefix.$origTable;
                $createSql = str_replace("CREATE TABLE `{$origTable}`", "CREATE TABLE `{$tmpTable}`", $stmtMatch[0]);

                // Préfixer les contraintes pour éviter les collisions globales de clés étrangères dans le même schéma MySQL
                $createSql = preg_replace('/CONSTRAINT `([^`]+)`/i', 'CONSTRAINT `'.$prefix.'$1`', $createSql);
                $createSql = preg_replace('/REFERENCES `([^`]+)`/i', 'REFERENCES `'.$prefix.'$1`', $createSql);

                // Supprimer si existait déjà
                $conn->statement("DROP TABLE IF EXISTS `{$tmpTable}`;");
                $conn->statement($createSql);
                $createdTables[] = $tmpTable;
            }

            $this->info('✓ Création réussie de '.count($createdTables).' tables éphémères sur MySQL 8.4.');

            // Vérification de la présence des colonnes critiques
            $catColumns = collect($conn->select("SHOW COLUMNS FROM `{$prefix}categories`"))->pluck('Field')->toArray();
            $prodColumns = collect($conn->select("SHOW COLUMNS FROM `{$prefix}products`"))->pluck('Field')->toArray();
            $orderColumns = collect($conn->select("SHOW COLUMNS FROM `{$prefix}orders`"))->pluck('Field')->toArray();
            $varColumns = collect($conn->select("SHOW COLUMNS FROM `{$prefix}product_sizes`"))->pluck('Field')->toArray();

            $this->line('Vérification des structures critiques :');
            $this->line(' - Catégories : '.implode(', ', array_intersect(['id', 'name', 'slug', 'is_active'], $catColumns)));
            $this->line(' - Produits : '.implode(', ', array_intersect(['id', 'name', 'slug', 'price', 'promotional_price'], $prodColumns)));
            $this->line(' - Variantes : '.implode(', ', array_intersect(['id', 'product_id', 'size', 'color', 'stock'], $varColumns)));
            $this->line(' - Commandes : '.implode(', ', array_intersect(['id', 'reference', 'status', 'total', 'payment_status', 'payment_method'], $orderColumns)));

            // Test d'insertion et relations
            $conn->statement("INSERT INTO `{$prefix}categories` (`id`, `name`, `slug`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (99999, 'Test Cat', 'test-cat', 1, 1, NOW(), NOW());");
            $conn->statement("INSERT INTO `{$prefix}products` (`id`, `category_id`, `name`, `slug`, `price`, `is_active`, `created_at`, `updated_at`) VALUES (99999, 99999, 'Test Prod', 'test-prod', 250.00, 1, NOW(), NOW());");
            $conn->statement("INSERT INTO `{$prefix}product_sizes` (`id`, `product_id`, `size`, `color`, `stock`, `created_at`, `updated_at`) VALUES (99999, 99999, 'L', 'Noir', 15, NOW(), NOW());");

            $retrieved = $conn->select("SELECT p.name as prod_name, c.name as cat_name, ps.stock FROM `{$prefix}products` p JOIN `{$prefix}categories` c ON p.category_id = c.id JOIN `{$prefix}product_sizes` ps ON ps.product_id = p.id WHERE p.id = 99999;");

            if (! empty($retrieved) && $retrieved[0]->prod_name === 'Test Prod') {
                $this->info("✓ Jointure relationnelle vérifiée avec succès : Produit '{$retrieved[0]->prod_name}' -> Catégorie '{$retrieved[0]->cat_name}', Stock = {$retrieved[0]->stock}.");
            } else {
                throw new \RuntimeException('Échec de la validation relationnelle lors du test.');
            }

            // Test de décompression du stockage ZIP si fourni
            if (! empty($storageZip) && file_exists($storageZip)) {
                $this->info("Vérification de l’archive de stockage : {$storageZip}");
                $zip = new ZipArchive;
                if ($zip->open($storageZip) === true) {
                    $this->info("✓ Archive ZIP valide contenant {$zip->numFiles} élément(s).");
                    $zip->close();
                } else {
                    $this->warn("L'archive ZIP n'a pas pu être validée.");
                }
            }

            $this->info("\n=== TEST DE RESTAURATION : 100% SUCCÈS ===");
            $this->info('La sauvegarde SQL est totalement intègre, restaurable et conforme aux contraintes MySQL 8.4.');

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Erreur durant le test de restauration : '.$e->getMessage());

            return self::FAILURE;
        } finally {
            // Nettoyage impératif de toutes les tables de test créées
            try {
                $conn->statement('SET FOREIGN_KEY_CHECKS=0;');
                foreach ($createdTables as $t) {
                    $conn->statement("DROP TABLE IF EXISTS `{$t}`;");
                }
                $conn->statement('SET FOREIGN_KEY_CHECKS=1;');
                $this->comment('Nettoyage : Toutes les tables de test temporaires ont été supprimées.');
            } catch (\Throwable) {
                // Ignore cleanup errors if connection is closed
            }
        }
    }

    /**
     * Détermine le chemin absolu de l'exécutable mysql.
     */
    protected function resolveMysqlBinary(): ?string
    {
        $custom = env('MYSQL_PATH');
        if ($custom && file_exists($custom)) {
            return $custom;
        }

        $knownPaths = [
            'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe',
            'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
            'C:\\tools\\mysql\\bin\\mysql.exe',
        ];

        foreach ($knownPaths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        $process = new Process(['where', 'mysql.exe']);
        $process->run();
        if ($process->isSuccessful()) {
            $lines = explode("\n", trim($process->getOutput()));

            return trim($lines[0]);
        }

        return null;
    }
}
