<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes — El Bahli Store API
|--------------------------------------------------------------------------
|
| Les routes web sont réservées aux points d'entrée système et vérification d'état.
| L'ensemble des fonctionnalités e-commerce est exposé sous /api/v1 (routes/api.php).
| Les requêtes web sur /admin/* sont redirigées vers l'application frontend React.
|
*/

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name', 'El Bahli Store API'),
        'version' => '1.0.0',
        'status' => 'online',
        'api_url' => url('/api/v1'),
        'documentation' => url('/docs/API_CONTRACT.md'),
    ]);
})->name('home');

Route::get('/dashboard', function () {
    return redirect()->route('home');
})->name('dashboard');

// Redirection de la nouvelle URL administrateur vers l'application frontend React
Route::get('/zakaria/admin/{any?}', function (?string $any = null) {
    $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
    $path = $any ? "/zakaria/admin/{$any}" : '/zakaria/admin/login';
    $query = request()->getQueryString();
    $target = "{$frontendUrl}{$path}".($query ? "?{$query}" : '');

    return redirect()->away($target);
})->where('any', '.*')->name('zakaria.admin.web.redirect');

// Redirection sécurisée des anciennes URLs /admin/* vers l'application frontend
Route::get('/admin/{any?}', function (?string $any = null) {
    $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
    $path = ($any && $any !== 'login') ? "/admin/{$any}" : '/zakaria/admin/login';
    $query = request()->getQueryString();
    $target = "{$frontendUrl}{$path}".($query ? "?{$query}" : '');

    return redirect()->away($target);
})->where('any', '.*')->name('admin.web.redirect');
