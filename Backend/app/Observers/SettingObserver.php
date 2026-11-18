<?php

namespace App\Observers;

use App\Models\Setting;
use App\Services\SettingService;

class SettingObserver
{
    public function __construct(
        protected SettingService $settingService
    ) {}

    /**
     * Handle the Setting "saved" event.
     */
    public function saved(Setting $setting): void
    {
        $this->settingService->clearCache();
    }

    /**
     * Handle the Setting "deleted" event.
     */
    public function deleted(Setting $setting): void
    {
        $this->settingService->clearCache();
    }
}
