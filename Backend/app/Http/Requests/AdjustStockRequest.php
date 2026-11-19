<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
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
            'new_stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'new_stock.required' => 'La nouvelle quantité en stock est obligatoire.',
            'new_stock.integer' => 'La quantité doit être un nombre entier.',
            'new_stock.min' => 'La quantité en stock ne peut pas être négative.',
            'new_stock.max' => 'La quantité en stock maximale est de 1 000 000.',
            'reason.required' => 'Le motif de l’ajustement de stock est obligatoire.',
            'reason.min' => 'Le motif doit comporter au moins 3 caractères.',
            'reason.max' => 'Le motif ne peut pas dépasser 255 caractères.',
        ];
    }
}
