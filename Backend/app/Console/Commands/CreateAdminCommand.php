<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAdminCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:create
                            {--email=admin@example.com : Adresse email de l\'administrateur}
                            {--name=Administrateur : Nom complet de l\'administrateur}
                            {--password= : Mot de passe administrateur (min. 12 caractères)}
                            {--force : Forcer la mise à jour si le compte existe déjà}';

    /**
     * The aliases for the console command.
     *
     * @var list<string>
     */
    protected $aliases = ['app:create-admin'];

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Créer ou réinitialiser de manière sécurisée et idempotente le compte administrateur';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = strtolower(trim((string) $this->option('email')));
        $name = trim((string) $this->option('name'));
        $password = (string) $this->option('password');
        $force = (bool) $this->option('force');

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error("L'adresse email fournie est invalide : {$email}");

            return self::FAILURE;
        }

        // Determine password securely: option -> env var -> interactive hidden prompt
        if (empty($password)) {
            $password = (string) env('ADMIN_INITIAL_PASSWORD', '');
        }

        if (empty($password) && $this->input->isInteractive()) {
            $password = (string) $this->secret('Entrez le mot de passe administrateur (min. 12 caractères) :');
        }

        if (empty($password)) {
            $this->error('Le mot de passe administrateur est obligatoire. Fournissez --password, la variable ADMIN_INITIAL_PASSWORD ou saisissez-le interactivement.');

            return self::FAILURE;
        }

        if (strlen($password) < 12) {
            $this->error('Pour des raisons de sécurité, le mot de passe administrateur doit contenir au moins 12 caractères.');

            return self::FAILURE;
        }

        // Check if user already exists
        $user = User::where('email', $email)->first();

        if ($user) {
            if ($force) {
                $user->name = $name;
                $user->password = Hash::make($password);
                $user->is_admin = true;
                $user->save();

                $this->info("Compte administrateur existant mis à jour avec succès : {$email}");

                return self::SUCCESS;
            }

            $this->error("Un compte existe déjà avec cette adresse email : {$email}. Utilisez --force pour le mettre à jour.");

            return self::FAILURE;
        }

        $user = new User([
            'name' => $name,
            'email' => $email,
        ]);
        $user->password = Hash::make($password);
        $user->is_admin = true;
        $user->email_verified_at = now();
        $user->save();

        $this->info("Nouveau compte administrateur créé avec succès : {$email}");

        return self::SUCCESS;
    }
}
