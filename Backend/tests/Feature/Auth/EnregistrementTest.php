<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnregistrementTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_returns_404_not_found(): void
    {
        $response = $this->get('/register');

        $response->assertNotFound();
    }

    public function test_public_user_registration_is_disabled_and_returns_404(): void
    {
        $response = $this->post('/register', [
            'name' => 'Visiteur Malveillant',
            'email' => 'visiteur@example.com',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
        ]);

        $response->assertNotFound();
        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'visiteur@example.com']);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_no_visitor_can_register_or_become_admin(): void
    {
        $response = $this->post('/register', [
            'name' => 'Attaquant Privilège',
            'email' => 'hacker@example.com',
            'password' => 'Password12345!',
            'password_confirmation' => 'Password12345!',
            'is_admin' => true,
        ]);

        $response->assertNotFound();
        $this->assertDatabaseCount('users', 0);
        $this->assertNull(User::where('is_admin', true)->first());
    }

    public function test_is_admin_attribute_cannot_be_mass_assigned_via_http_request(): void
    {
        $this->expectException(MassAssignmentException::class);

        User::create([
            'name' => 'Utilisateur Modifié',
            'email' => 'hacker@example.com',
            'password' => 'password123',
            'is_admin' => true,
        ]);
    }
}
