<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends ApiController
{
    /**
     * Admin login with rate limiting and token creation.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ], [
            'email.required' => 'L’adresse email est obligatoire.',
            'email.email' => 'L’adresse email est invalide.',
            'password.required' => 'Le mot de passe est obligatoire.',
        ]);

        $throttleKey = 'admin_api_login|' . strtolower((string) $validated['email']) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return $this->error(
                "Trop de tentatives de connexion. Veuillez réessayer dans {$seconds} secondes.",
                null,
                429
            );
        }

        $user = User::where('email', strtolower((string) $validated['email']))->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 300);

            return $this->error('Identifiants de connexion incorrects.', null, 401);
        }

        if (!$user->isAdmin()) {
            RateLimiter::hit($throttleKey, 300);

            return $this->error('Accès refusé. Ce compte ne possède pas les privilèges administrateur.', null, 403);
        }

        RateLimiter::clear($throttleKey);

        $remember = $request->boolean('remember');

        // Stateful session support if request is from a stateful domain
        if ($request->hasSession()) {
            Auth::guard('web')->login($user, $remember);
            $request->session()->regenerate();
        }

        // Generate Sanctum Bearer token for decoupled SPA / mobile with appropriate expiry
        $expiresAt = $remember ? now()->addDays(30) : now()->addHours(12);
        $token = $user->createToken('admin-api-token', ['admin'], $expiresAt)->plainTextToken;

        return $this->success([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => (bool) $user->is_admin,
            ],
        ], 'Connexion administrateur réussie.');
    }

    /**
     * Logout and revoke active tokens.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            // Revoke current token if using Sanctum personal access token
            if (method_exists($user, 'currentAccessToken') && $user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
            }

            // Invalidate session if session-based
            if ($request->hasSession()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
        }

        return $this->success(null, 'Déconnexion réussie.');
    }

    /**
     * Get authenticated admin profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => (bool) $user->is_admin,
        ], 'Profil administrateur récupéré.');
    }
}
