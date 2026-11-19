<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;
use ZipArchive;

class BackupDatabaseCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'db:backup
                            {--only-db : Sauvegarder uniquement la base de données MySQL}
                            {--only-files : Sauvegarder uniquement les fichiers de stockage}
                            {--keep=10 : Nombre de sauvegardes récentes à conserver}';

    /**
     * @var string
     */
    protected $description = 'Sauvegarde complète de la base de données MySQL et des fichiers téléversés de la boutique';

    public function handle(): int
    {
        $timestamp = date('Y-m-d_H-i-s');
        $projectRoot = dirname(base_path());
        $backupsDir = $projectRoot.DIRECTORY_SEPARATOR.'backups';

        $dbDir = $backupsDir.DIRECTORY_SEPARATOR.'database';
        $storageDir = $backupsDir.DIRECTORY_SEPARATOR.'storage';

        if (! is_dir($dbDir)) {
            mkdir($dbDir, 0755, true);
        }
        if (! is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }

        $onlyFiles = (bool) $this->option('only-files');
        $onlyDb = (bool) $this->option('only-db');
        $keep = (int) $this->option('keep');

        $this->info("=== Démarrage de la sauvegarde El Bahli Store [{$timestamp}] ===");

        // 1. Sauvegarde MySQL
        if (! $onlyFiles) {
            $sqlFile = $dbDir.DIRECTORY_SEPARATOR."el_bahli_store_{$timestamp}.sql";
            $this->info("Export MySQL vers : {$sqlFile}");

            $mysqldumpPath = $this->resolveMysqldumpBinary();
            if (! $mysqldumpPath) {
                $this->error('Impossible de localiser l’utilitaire mysqldump.exe.');

                return self::FAILURE;
            }

            $dbConfig = config('database.connections.mysql');
            $host = $dbConfig['host'] ?? '127.0.0.1';
            $port = (string) ($dbConfig['port'] ?? 3306);
            $user = $dbConfig['username'] ?? 'root';
            $pass = $dbConfig['password'] ?? '';
            $database = (! empty($dbConfig['database']) && $dbConfig['database'] !== ':memory:') ? $dbConfig['database'] : 'el_bahli_store';

            $command = [
                $mysqldumpPath,
                '--host='.$host,
                '--port='.$port,
                '--user='.$user,
                '--routines',
                '--triggers',
                '--single-transaction',
                '--default-character-set=utf8mb4',
                '--quick',
                $database,
            ];

            if (! empty($pass)) {
                $command[] = '--password='.$pass;
            }

            $process = new Process($command);
            $process->setTimeout(300);

            // Exécution du processus et écriture du dump
            $fp = fopen($sqlFile, 'wb');
            if (! $fp) {
                $this->error("Impossible d’ouvrir en écriture le fichier : {$sqlFile}");

                return self::FAILURE;
            }

            $process->run(function ($type, $buffer) use ($fp) {
                if ($type === Process::OUT) {
                    fwrite($fp, $buffer);
                }
            });
            fclose($fp);

            if (! $process->isSuccessful() || filesize($sqlFile) === 0) {
                $this->error('Échec lors de l’export MySQL : '.$process->getErrorOutput());
                if (file_exists($sqlFile)) {
                    @unlink($sqlFile);
                }

                return self::FAILURE;
            }

            $fileSizeKb = round(filesize($sqlFile) / 1024, 2);
            $this->info("✓ Base de données sauvegardée avec succès ({$fileSizeKb} Ko).");

            $this->rotateBackups($dbDir, 'sql', $keep);
        }

        // 2. Sauvegarde des fichiers physiques du stockage public
        if (! $onlyDb) {
            $zipFile = $storageDir.DIRECTORY_SEPARATOR."storage_public_{$timestamp}.zip";
            $this->info("Compression du stockage public vers : {$zipFile}");

            $publicStoragePath = storage_path('app'.DIRECTORY_SEPARATOR.'public');
            if (is_dir($publicStoragePath)) {
                $zipSuccess = $this->createZipFromDirectory($publicStoragePath, $zipFile);
                if ($zipSuccess) {
                    $zipSizeKb = round(filesize($zipFile) / 1024, 2);
                    $this->info("✓ Fichiers de stockage sauvegardés avec succès ({$zipSizeKb} Ko).");
                    $this->rotateBackups($storageDir, 'zip', $keep);
                } else {
                    $this->warn('La création du fichier ZIP de stockage a échoué ou aucun fichier à compresser.');
                }
            } else {
                $this->warn("Le dossier de stockage public n'existe pas : {$publicStoragePath}");
            }
        }

        $this->info('=== Sauvegarde terminée avec succès ===');

        return self::SUCCESS;
    }

    /**
     * Détermine le chemin absolu de l'exécutable mysqldump.
     */
    protected function resolveMysqldumpBinary(): ?string
    {
        $custom = env('MYSQLDUMP_PATH');
        if ($custom && file_exists($custom)) {
            return $custom;
        }

        $knownPaths = [
            'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe',
            'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
            'C:\\tools\\mysql\\bin\\mysqldump.exe',
        ];

        foreach ($knownPaths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        // Recherche dans le PATH système
        $process = new Process(['where', 'mysqldump.exe']);
        $process->run();
        if ($process->isSuccessful()) {
            $lines = explode("\n", trim($process->getOutput()));

            return trim($lines[0]);
        }

        return null;
    }

    /**
     * Compresse un dossier dans une archive ZIP.
     */
    protected function createZipFromDirectory(string $sourceDir, string $destinationZip): bool
    {
        if (! class_exists(ZipArchive::class)) {
            return false;
        }

        $zip = new ZipArchive;
        if ($zip->open($destinationZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return false;
        }

        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourceDir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );

        $hasFiles = false;
        foreach ($files as $file) {
            /** @var \SplFileInfo $file */
            if (! $file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($sourceDir) + 1);
                $zip->addFile($filePath, $relativePath);
                $hasFiles = true;
            }
        }

        if (! $hasFiles) {
            $zip->addFromString('.empty', '');
        }

        return $zip->close();
    }

    /**
     * Conserve uniquement les N sauvegardes les plus récentes.
     */
    protected function rotateBackups(string $directory, string $extension, int $keep): void
    {
        if ($keep <= 0) {
            return;
        }

        $files = glob($directory.DIRECTORY_SEPARATOR."*.{$extension}");
        if (! $files || count($files) <= $keep) {
            return;
        }

        // Tri par date de modification décroissante
        usort($files, fn ($a, $b) => filemtime($b) - filemtime($a));

        $toDelete = array_slice($files, $keep);
        foreach ($toDelete as $oldFile) {
            @unlink($oldFile);
            $this->comment('Rotation : ancienne sauvegarde supprimée -> '.basename($oldFile));
        }
    }
}
