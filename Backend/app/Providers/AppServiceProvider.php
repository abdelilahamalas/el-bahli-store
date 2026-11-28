<?php

namespace App\Providers;

use App\Models\Category;
use App\Models\Setting;
use App\Observers\CategoryObserver;
use App\Observers\SettingObserver;
use App\Services\OrderService;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void {}

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimiting();

        Category::observe(CategoryObserver::class);
        Setting::observe(SettingObserver::class);
    }

    /**
     * Configure named rate limiters with French 429 error messages.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('order-submission', function (Request $request) {
            $ip = $request->ip() ?: '127.0.0.1';
            $phone = OrderService::normalizeMoroccanPhone((string) $request->input('customer_phone', '')) ?: 'unknown';

            // En environnement local (développement), quotas assouplis pour permettre les tests continus
            if (app()->isLocal()) {
                return [
                    Limit::perMinute(60)->by($ip),
                    Limit::perHour(200)->by($phone),
                ];
            }

            return [
                Limit::perMinute(5)->by($ip)->response(function () {
                    return response()->json(['message' => 'Trop de tentatives de commande. Veuillez patienter une minute.'], 429);
                }),
                Limit::perHour(20)->by($ip)->response(function () {
                    return response()->json(['message' => 'Trop de commandes passées depuis cette adresse IP. Veuillez réessayer plus tard.'], 429);
                }),
                Limit::perHour(5)->by($phone)->response(function () {
                    return response()->json(['message' => 'Trop de commandes passées pour ce numéro de téléphone dans l\'heure.'], 429);
                }),
            ];
        });

        RateLimiter::for('cart-estimate', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip() ?: '127.0.0.1')->response(function () {
                return response()->json(['message' => 'Trop de demandes de calcul de devis. Veuillez patienter.'], 429);
            });
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input('email')).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey)->response(function () {
                return response()->json(['message' => 'Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes.'], 429);
            });
        });

        RateLimiter::for('public-search', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip() ?: '127.0.0.1')->response(function () {
                return response()->json([
                    'success' => false,
                    'code' => 'TOO_MANY_REQUESTS',
                    'message' => 'Trop de requêtes de recherche. Veuillez patienter quelques instants.',
                ], 429);
            });
        });

        RateLimiter::for('public-catalog', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip() ?: '127.0.0.1')->response(function () {
                return response()->json([
                    'success' => false,
                    'code' => 'TOO_MANY_REQUESTS',
                    'message' => 'Trop de requêtes catalogue. Veuillez patienter quelques instants.',
                ], 429);
            });
        });

        RateLimiter::for('order-confirmation', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip() ?: '127.0.0.1')->response(function () {
                return response()->json([
                    'success' => false,
                    'code' => 'TOO_MANY_REQUESTS',
                    'message' => 'Trop de consultations de confirmation. Veuillez patienter.',
                ], 429);
            });
        });

        RateLimiter::for('admin-upload', function (Request $request) {
            $key = $request->user()?->id ?: ($request->ip() ?: '127.0.0.1');

            return Limit::perMinute(30)->by($key)->response(function () {
                return response()->json([
                    'success' => false,
                    'code' => 'TOO_MANY_REQUESTS',
                    'message' => 'Trop d\'envois d\'images simultanés. Veuillez patienter une minute.',
                ], 429);
            });
        });

        RateLimiter::for('admin-import', function (Request $request) {
            $key = $request->user()?->id ?: ($request->ip() ?: '127.0.0.1');

            return Limit::perMinute(10)->by($key)->response(function () {
                return response()->json([
                    'success' => false,
                    'code' => 'TOO_MANY_REQUESTS',
                    'message' => 'Trop d\'opérations d\'import CSV. Veuillez patienter quelques instants.',
                ], 429);
            });
        });

        RateLimiter::for('admin', function (Request $request) {
            $key = $request->user()?->id ?: $request->ip();

            return Limit::perMinute(120)->by($key)->response(function () {
                return response()->json([
                    'success' => false,
                    'code' => 'TOO_MANY_REQUESTS',
                    'message' => 'Trop de requêtes administratives. Veuillez patienter un instant.',
                ], 429);
            });
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Model::shouldBeStrict(! app()->isProduction());

        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
