<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\UpdateSettingsRequest;
use App\Services\AuditService;
use App\Services\ImageService;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;

class SettingController extends ApiController
{
    public function __construct(
        protected SettingService $settingService,
        protected ImageService $imageService,
        protected AuditService $auditService
    ) {}

    /**
     * Get store settings.
     */
    public function show(): JsonResponse
    {
        $allSettings = $this->settingService->all();

        return $this->success([
            'store_name' => $allSettings['store_name'] ?? 'El Bahli Store',
            'store_phone' => $allSettings['store_phone'] ?? '',
            'store_email' => $allSettings['store_email'] ?? '',
            'store_logo' => $allSettings['store_logo'] ?? null,
            'store_logo_url' => ! empty($allSettings['store_logo']) ? asset('storage/'.$allSettings['store_logo']) : null,
            'instagram_url' => $allSettings['instagram_url'] ?? '',
            'tiktok_url' => $allSettings['tiktok_url'] ?? '',
            'whatsapp_number' => $allSettings['whatsapp_number'] ?? '',
            'whatsapp_link' => $this->settingService->getWhatsAppLink(),
            'delivery_fee' => '0.00',
            'is_delivery_free' => true,
            'payment_method' => 'cash_on_delivery',
            'low_stock_threshold' => (int) ($allSettings['low_stock_threshold'] ?? 5),
            'currency' => $allSettings['currency'] ?? 'MAD',
            'language' => $allSettings['language'] ?? 'fr',
            'store_city' => $allSettings['store_city'] ?? 'Tanger',
            'store_address' => $allSettings['store_address'] ?? 'Tanger, Maroc',
        ], 'Paramètres de la boutique récupérés.');
    }

    /**
     * Update store settings.
     */
    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $settingsToSave = [
            'store_name' => trim(strip_tags((string) $validated['store_name'])),
            'store_phone' => ! empty($validated['store_phone']) ? trim(strip_tags((string) $validated['store_phone'])) : null,
            'store_email' => ! empty($validated['store_email']) ? trim((string) $validated['store_email']) : null,
            'instagram_url' => ! empty($validated['instagram_url']) ? trim((string) $validated['instagram_url']) : null,
            'tiktok_url' => ! empty($validated['tiktok_url']) ? trim((string) $validated['tiktok_url']) : null,
            'whatsapp_number' => ! empty($validated['whatsapp_number']) ? trim(strip_tags((string) $validated['whatsapp_number'])) : null,
            'currency' => ! empty($validated['currency']) ? trim((string) $validated['currency']) : 'MAD',
            'language' => ! empty($validated['language']) ? trim((string) $validated['language']) : 'fr',
            'low_stock_threshold' => (string) (isset($validated['low_stock_threshold']) ? (int) $validated['low_stock_threshold'] : 5),
            'store_city' => ! empty($validated['store_city']) ? trim(strip_tags((string) $validated['store_city'])) : 'Tanger',
            'store_address' => ! empty($validated['store_address']) ? trim(strip_tags((string) $validated['store_address'])) : 'Tanger, Maroc',
        ];

        if ($request->hasFile('logo')) {
            $oldLogo = $this->settingService->get('store_logo');
            $newLogoPath = $this->imageService->storeStoreLogo($request->file('logo'));
            $settingsToSave['store_logo'] = $newLogoPath;

            if ($oldLogo) {
                $this->imageService->deleteFile($oldLogo);
            }
        }

        $this->settingService->setMany($settingsToSave);

        $this->auditService->log('settings.updated', null, [
            'keys' => array_keys($settingsToSave),
        ]);

        return $this->show();
    }
}
