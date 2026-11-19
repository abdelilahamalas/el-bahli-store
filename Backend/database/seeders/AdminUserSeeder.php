<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds idempotently without exposing secrets in source code.
     */
    public function run(): void
    {
        $email = strtolower(trim((string) env('ADMIN_INITIAL_EMAIL', 'zakariaelbahli@store.com')));
        $name = trim((string) env('ADMIN_INITIAL_NAME', 'Zakaria El Bahli'));
        $password = (string) env('ADMIN_INITIAL_PASSWORD', '');

        // Si aucun mot de passe n'est configuré, génération d'une clé aléatoire sécurisée.
        if (empty($password)) {
            $password = Str::random(24);
        }

        $admin = User::firstOrNew(['email' => $email]);
        $admin->name = $name;

        // Only set password if the admin account is new
        if (! $admin->exists) {
            $admin->password = Hash::make($password);
            $admin->email_verified_at = now();
        }

        $admin->is_admin = true;
        $admin->save();
    }
}
