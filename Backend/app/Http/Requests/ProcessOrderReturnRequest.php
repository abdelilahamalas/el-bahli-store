<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProcessOrderReturnRequest extends FormRequest
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
            'reason' => ['nullable', 'string', 'max:500'],
            'returns' => ['required', 'array', 'min:1'],
            'returns.*.order_item_id' => ['required', 'integer'],
            'returns.*.quantity_returned' => ['required', 'integer', 'min:1'],
            'returns.*.quantity_resellable' => ['nullable', 'integer', 'min:0'],
            'returns.*.quantity_damaged' => ['nullable', 'integer', 'min:0'],
            'returns.*.reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'returns.required' => 'Veuillez spécifier au moins un article à retourner.',
            'returns.*.order_item_id.required' => 'L\'identifiant de la ligne de commande est requis.',
            'returns.*.quantity_returned.min' => 'La quantité retournée doit être supérieure à 0.',
        ];
    }
}
