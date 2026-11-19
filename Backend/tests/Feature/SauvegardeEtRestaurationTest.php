<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class SauvegardeEtRestaurationTest extends TestCase
{
    public function test_db_backup_command_executes_successfully(): void
    {
        $exitCode = $this->artisan('db:backup', [
            '--keep' => 5,
        ]);

        $exitCode->assertExitCode(0);

        // Vérifier la présence du répertoire de sauvegarde
        $dbBackupDir = base_path('../backups/database');
        $this->assertTrue(File::exists($dbBackupDir));

        $sqlFiles = File::glob($dbBackupDir.'/*.sql');
        $this->assertNotEmpty($sqlFiles, 'Au moins un fichier SQL de sauvegarde doit être généré.');
    }

    public function test_db_restore_command_with_invalid_file_fails_safely(): void
    {
        $exitCode = $this->artisan('db:restore', [
            '--file' => 'fichier_inexistant.sql',
            '--force' => true,
        ]);

        $exitCode->assertExitCode(1);
    }

    public function test_db_restore_command_in_test_mode_validates_integrity(): void
    {
        $dbBackupDir = base_path('../backups/database');
        $sqlFiles = File::glob($dbBackupDir.'/*.sql');

        if (empty($sqlFiles)) {
            $this->artisan('db:backup', ['--only-db' => true]);
            $sqlFiles = File::glob($dbBackupDir.'/*.sql');
        }

        $latestSql = end($sqlFiles);

        $exitCode = $this->artisan('db:restore', [
            '--file' => $latestSql,
            '--test' => true,
            '--force' => true,
        ]);

        $exitCode->assertExitCode(0);
    }
}
