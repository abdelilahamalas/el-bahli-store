<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'store_name' => ['required', 'string', 'min:2', 'max:100'],
            'store_phone' => ['nullable', 'string', 'max:30'],
            'store_email' => ['nullable', 'email', 'max:100'],
            'logo' => ['nullable', 'file', 'image', 'mimes:jpeg,png,webp', 'max:4096'],
            'instagram_url' => [
                'nullable',
                'url',
                'regex:/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.\/]+/i',
            ],
            'tiktok_url' => [
                'nullable',
                'url',
                'regex:/^https:\/\/(www\.)?tiktok\.com\/@[A-Za-z0-9_.]+/i',
            ],
            'whatsapp_number' => ['nullable', 'string', 'max:30'],
            'currency' => ['nullable', 'string', 'max:10'],
            'language' => ['nullable', 'string', 'max:10'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'store_city' => ['nullable', 'string', 'max:100'],
            'store_address' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'store_name.required' => 'Le nom du magasin est obligatoire.',
            'store_email.email' => 'L\'adresse e-mail n\'est pas valide.',
            'instagram_url.regex' => 'Le lien Instagram doit être une URL HTTPS valide (ex: https://instagram.com/compte).',
            'tiktok_url.regex' => 'Le lien TikTok doit être une URL HTTPS valide (ex: https://tiktok.com/@compte).',
            'logo.image' => 'Le logo doit être une image.',
            'logo.mimes' => 'Formats acceptés : JPEG, PNG, WebP.',
            'logo.max' => 'Le logo ne doit pas dépasser 4 Mo.',
        ];
    }
}
