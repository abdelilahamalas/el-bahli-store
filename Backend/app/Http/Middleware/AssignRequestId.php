<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AssignRequestId
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Lire ou générer un identifiant de corrélation unique (UUID v4)
        $requestId = $request->header('X-Request-ID');
        if (! $requestId || ! Str::isUuid($requestId)) {
            $requestId = (string) Str::uuid();
            $request->headers->set('X-Request-ID', $requestId);
        }

        /** @var Response $response */
        $response = $next($request);

        // 2. Attacher l'identifiant de requête à la réponse HTTP
        $response->headers->set('X-Request-ID', $requestId);

        return $response;
    }
}
