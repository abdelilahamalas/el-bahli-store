<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Initial Administrator Credentials
    |--------------------------------------------------------------------------
    |
    | Read from environment variables at configuration time so that
    | configuration caching (php artisan config:cache) in production works
    | seamlessly without relying on env() in seeders or runtime code.
    |
    */
    'email' => env('ADMIN_EMAIL'),
    'password' => env('ADMIN_PASSWORD'),
    'name' => env('ADMIN_NAME', 'Zakaria El Bahli'),
];
