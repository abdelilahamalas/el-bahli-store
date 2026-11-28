<?php

use Illuminate\Http\Request;

return [

    /*
    |--------------------------------------------------------------------------
    | Trusted Proxies
    |--------------------------------------------------------------------------
    |
    | Définir les adresses IP ou blocs CIDR des proxies de confiance (ex. Cloudflare).
    | Laisser vide (null) par défaut afin que Laravel utilise exclusivement REMOTE_ADDR
    | et protège les limiteurs de débit (rate limiters) contre les faux X-Forwarded-For.
    |
    | Si Cloudflare est activé ultérieurement, renseigner la variable TRUSTED_PROXIES
    | dans le fichier .env avec les plages officielles Cloudflare (ex: 173.245.48.0/20,103.21.244.0/22,...).
    |
    */

    'proxies' => (function () {
        $env = env('TRUSTED_PROXIES');
        if (! empty($env)) {
            return array_values(array_filter(array_map('trim', explode(',', (string) $env))));
        }

        return null;
    })(),

    /*
    |--------------------------------------------------------------------------
    | Trusted Headers
    |--------------------------------------------------------------------------
    */

    'headers' => Request::HEADER_X_FORWARDED_FOR |
        Request::HEADER_X_FORWARDED_HOST |
        Request::HEADER_X_FORWARDED_PORT |
        Request::HEADER_X_FORWARDED_PROTO |
        Request::HEADER_X_FORWARDED_PREFIX,

];
