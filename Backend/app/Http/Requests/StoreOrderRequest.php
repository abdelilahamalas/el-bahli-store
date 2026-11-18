<?php

namespace App\Http\Requests;

use App\Services\OrderService;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'min:2', 'max:100'],
            'customer_phone' => [
                'required',
                'string',
                'max:30',
                function ($attribute, $value, $fail) {
                    if (! OrderService::normalizeMoroccanPhone($value)) {
                        $fail('Le numéro de téléphone doit être un numéro marocain valide (ex : 0612345678, +212612345678).');
                    }
                },
            ],
            'city' => ['required', 'string', 'min:2', 'max:100'],
            'address' => ['required', 'string', 'min:5', 'max:255'],
            'note' => ['nullable', 'string', 'max:500'],
            'idempotency_token' => ['required', 'string'],
            'website' => ['nullable', 'string', 'max:100'], // Honeypot anti-robot
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.size' => ['required', 'string', 'max:20'],
            'items.*.color' => ['nullable', 'string', 'max:50'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:10'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer_name.required' => 'Votre nom complet est obligatoire.',
            'customer_phone.required' => 'Le numéro de téléphone est obligatoire.',
            'city.required' => 'La ville de livraison est obligatoire.',
            'address.required' => 'L\'adresse de livraison est obligatoire.',
            'idempotency_token.required' => 'Jeton de validation manquant.',
            'items.required' => 'Votre commande doit comporter au moins un article.',
            'items.min' => 'Votre commande doit comporter au moins un article.',
            'items.max' => 'Une commande ne peut pas dépasser 20 articles distincts.',
            'items.*.product_id.exists' => 'Un article sélectionné n\'existe pas dans notre catalogue.',
            'items.*.quantity.min' => 'La quantité par article doit être supérieure à 0.',
            'items.*.quantity.max' => 'La quantité par article ne peut pas dépasser 10.',
        ];
    }
}
