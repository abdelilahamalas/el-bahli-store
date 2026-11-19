<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * Prepare data for validation (alias mappings: variants -> sizes, sale_price -> promotional_price).
     */
    protected function prepareForValidation(): void
    {
        $merge = [];
        if (! $this->has('sizes') && $this->has('variants')) {
            $merge['sizes'] = $this->input('variants');
        } elseif ($this->has('sizes') && ! $this->has('variants')) {
            $merge['variants'] = $this->input('sizes');
        }

        if (! $this->has('promotional_price') && $this->has('sale_price')) {
            $merge['promotional_price'] = $this->input('sale_price');
        }

        if (! empty($merge)) {
            $this->merge($merge);
        }
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
            'sale_price' => ['nullable', 'numeric', 'min:0', 'lt:price', 'max:999999.99'],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['nullable', 'file', 'image', 'mimes:jpeg,png,webp', 'max:4096'],
            'images' => ['nullable', 'array', 'max:10'],
            'images.*' => ['file', 'image', 'mimes:jpeg,png,webp', 'max:4096'],
            'sizes' => ['required_without:variants', 'array', 'min:1'],
            'sizes.*.size' => ['required', 'string', 'max:20'],
            'sizes.*.color' => ['nullable', 'string', 'max:50'],
            'sizes.*.stock' => ['required', 'integer', 'min:0', 'max:100000'],
            'sizes.*.is_active' => ['nullable', 'boolean'],
            'variants' => ['sometimes', 'array', 'min:1'],
            'variants.*.size' => ['required', 'string', 'max:20'],
            'variants.*.color' => ['nullable', 'string', 'max:50'],
            'variants.*.stock' => ['required', 'integer', 'min:0', 'max:100000'],
            'variants.*.is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $variants = $this->input('sizes') ?? $this->input('variants');
            if (is_array($variants)) {
                $seen = [];
                foreach ($variants as $index => $item) {
                    if (! is_array($item) || empty($item['size'])) {
                        continue;
                    }
                    $size = strtolower(trim((string) $item['size']));
                    $color = strtolower(trim((string) ($item['color'] ?? 'Standard')));
                    $key = "{$size}|{$color}";

                    if (isset($seen[$key])) {
                        $colorLabel = ! empty($item['color']) && $item['color'] !== 'Standard' ? " en couleur « {$item['color']} »" : '';
                        $v->errors()->add("sizes.{$index}.size", "La taille « {$item['size']} »{$colorLabel} est dupliquée dans les variantes.");
                    }
                    $seen[$key] = true;
                }
            }
        });
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
            'sale_price.lt' => 'Le prix promotionnel doit être inférieur au prix normal.',
            'sizes.required' => 'Au moins une taille avec son stock doit être renseignée.',
            'sizes.required_without' => 'Au moins une variante avec son stock doit être renseignée.',
            'sizes.*.stock.min' => 'Le stock ne peut pas être négatif.',
            'variants.*.stock.min' => 'Le stock ne peut pas être négatif.',
            'image.image' => 'Le fichier doit être une image.',
            'image.mimes' => 'Formats acceptés : JPEG, PNG, WebP.',
            'image.max' => 'L\'image ne doit pas dépasser 4 Mo.',
        ];
    }
}
