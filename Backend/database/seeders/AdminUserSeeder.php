<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds idempotently without exposing secrets in source code.
     */
    public function run(): void
    {
        $email = config('admin.email');
        $password = config('admin.password');
        $name = config('admin.name') ?: 'Zakaria El Bahli';

        if (empty($email) || empty($password)) {
            throw new RuntimeException(
                "Impossible d'exécuter AdminUserSeeder : ADMIN_EMAIL et ADMIN_PASSWORD doivent être obligatoirement définis dans le fichier .env (aucune valeur par défaut autorisée)."
            );
        }

        $email = strtolower(trim((string) $email));

        $admin = User::firstOrNew(['email' => $email]);
        $admin->name = trim((string) $name);

        // Only set password if the admin account is new
        if (! $admin->exists) {
            $admin->password = Hash::make((string) $password);
            $admin->email_verified_at = now();
        }

        $admin->is_admin = true;
        $admin->save();
    }
}
