<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TableauDeBordTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_api_dashboard()
    {
        $response = $this->getJson(route('api.v1.admin.dashboard'));
        $response->assertStatus(401);
    }

    public function test_non_admin_users_cannot_access_api_dashboard()
    {
        $user = User::factory()->create(['is_admin' => false]);
        Sanctum::actingAs($user);

        $response = $this->getJson(route('api.v1.admin.dashboard'));
        $response->assertForbidden();
    }

    public function test_admin_users_can_access_api_dashboard()
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin, ['admin']);

        $response = $this->getJson(route('api.v1.admin.dashboard'));
        $response->assertOk()
            ->assertJson(['success' => true]);
    }
}
