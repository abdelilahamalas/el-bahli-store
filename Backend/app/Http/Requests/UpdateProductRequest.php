<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
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
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'promotional_price' => ['nullable', 'numeric', 'min:0', 'lt:price', 'max:999999.99'],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['nullable', 'file', 'image', 'mimes:jpeg,png,webp', 'max:4096'],
            'images' => ['nullable', 'array', 'max:10'],
            'images.*' => ['file', 'image', 'mimes:jpeg,png,webp', 'max:4096'],
            'sizes' => ['required', 'array', 'min:1'],
            'sizes.*.size' => ['required', 'string', 'max:20'],
            'sizes.*.color' => ['nullable', 'string', 'max:50'],
            'sizes.*.stock' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category_id.required' => 'La catégorie est obligatoire.',
            'category_id.exists' => 'La catégorie sélectionnée n\'existe pas.',
            'name.required' => 'Le nom du produit est obligatoire.',
            'price.required' => 'Le prix du produit est obligatoire.',
            'price.numeric' => 'Le prix doit être un nombre valide.',
            'price.min' => 'Le prix ne peut pas être négatif.',
            'promotional_price.numeric' => 'Le prix promotionnel doit être un nombre valide.',
            'promotional_price.min' => 'Le prix promotionnel ne peut pas être négatif.',
            'promotional_price.lt' => 'Le prix promotionnel doit être inférieur au prix normal.',
            'sizes.required' => 'Au moins une taille avec son stock doit être renseignée.',
            'image.image' => 'Le fichier doit être une image.',
            'image.mimes' => 'Formats acceptés : JPEG, PNG, WebP.',
            'image.max' => 'L\'image ne doit pas dépasser 4 Mo.',
        ];
    }
}
