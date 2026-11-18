<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds idempotently.
     */
    public function run(): void
    {
        $defaultSettings = [
            'store_name' => 'El Bahli Store',
            'store_phone' => '+212600000000',
            'store_whatsapp' => '+212600000000',
            'whatsapp_number' => '+212600000000',
            'store_email' => 'contact@example.com',
            'store_logo' => null,
            'store_city' => 'Tanger',
            'store_address' => 'Tanger, Maroc',
            'currency' => 'MAD',
            'language' => 'fr',
            'low_stock_threshold' => '5',
            'instagram_url' => 'https://instagram.com/elbahlistore',
            'tiktok_url' => 'https://tiktok.com/@elbahlistore',
        ];

        foreach ($defaultSettings as $key => $value) {
            Setting::firstOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }
    }
}
