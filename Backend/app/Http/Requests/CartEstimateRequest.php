<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CartEstimateRequest extends FormRequest
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
            'items.required' => 'Le panier est vide.',
            'items.min' => 'Le panier doit contenir au moins un article.',
            'items.max' => 'Le panier ne peut pas contenir plus de 20 articles distincts.',
            'items.*.product_id.exists' => 'Un des produits sélectionnés n\'existe pas.',
            'items.*.quantity.min' => 'La quantité minimale est de 1.',
            'items.*.quantity.max' => 'La quantité maximale par article est de 10.',
        ];
    }
}
