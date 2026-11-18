<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes — El Bahli Store API
|--------------------------------------------------------------------------
|
| Les routes web sont réservées aux points d'entrée système et vérification d'état.
| L'ensemble des fonctionnalités e-commerce est exposé sous /api/v1 (routes/api.php).
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
