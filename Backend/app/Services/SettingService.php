<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingService
{
    public const CACHE_KEY = 'store_settings_all';

    /**
     * Get all settings from cache or database.
     *
     * @return array<string, string|null>
     */
    public function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            return Setting::pluck('value', 'key')->toArray();
        });
    }

    /**
     * Get a specific setting value.
     */
    public function get(string $key, ?string $default = null): ?string
    {
        $settings = $this->all();

        return $settings[$key] ?? $default;
    }

    /**
     * Set a specific setting.
     */
    public function set(string $key, ?string $value): void
    {
        Setting::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );

        $this->clearCache();
    }

    /**
     * Set multiple settings at once.
     *
     * @param  array<string, string|null>  $settings
     */
    public function setMany(array $settings): void
    {
        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        $this->clearCache();
    }

    /**
     * Invalidate settings cache.
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Get delivery fee as float.
     * Règle commerciale : La livraison est TOUJOURS gratuite (0.00 MAD).
     */
    public function getDeliveryFee(): float
    {
        return 0.0;
    }

    /**
     * Generate safe WhatsApp direct link.
     */
    public function getWhatsAppLink(): ?string
    {
        $phone = $this->get('whatsapp_number');
        if (! $phone) {
            return null;
        }

        // Keep only digits
        $digits = preg_replace('/\D/', '', $phone);
        if (! $digits) {
            return null;
        }

        // If local format like 06XXXXXXXX, convert to 2126XXXXXXXX
        if (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $digits = '212'.substr($digits, 1);
        }

        return 'https://wa.me/'.$digits;
    }

    /**
     * Return safe public settings for client frontend.
     *
     * @return array<string, mixed>
     */
    public function getPublicSettings(): array
    {
        $all = $this->all();

        return [
            'store_name' => $all['store_name'] ?? 'El Bahli Store',
            'store_phone' => $all['store_phone'] ?? null,
            'store_email' => $all['store_email'] ?? null,
            'store_logo' => $all['store_logo'] ?? null,
            'instagram_url' => $this->sanitizeUrl($all['instagram_url'] ?? null, 'instagram.com'),
            'tiktok_url' => $this->sanitizeUrl($all['tiktok_url'] ?? null, 'tiktok.com'),
            'whatsapp_number' => $all['whatsapp_number'] ?? null,
            'whatsapp_link' => $this->getWhatsAppLink(),
            'delivery_fee' => number_format($this->getDeliveryFee(), 2, '.', ''),
        ];
    }

    /**
     * Sanitize external URL: must be HTTPS and match expected domain.
     */
    public function sanitizeUrl(?string $url, string $expectedDomain): ?string
    {
        if (! $url) {
            return null;
        }

        $trimmed = trim($url);

        if (! str_starts_with(strtolower($trimmed), 'https://')) {
            return null;
        }

        $host = parse_url($trimmed, PHP_URL_HOST);
        if (! $host) {
            return null;
        }

        $host = strtolower($host);
        if ($host !== $expectedDomain && ! str_ends_with($host, '.'.$expectedDomain)) {
            return null;
        }

        return filter_var($trimmed, FILTER_VALIDATE_URL) ?: null;
    }
}
