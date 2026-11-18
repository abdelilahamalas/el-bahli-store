<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            'Capuches',
            'Capuches zippé',
            'Sweat-Shirt',
            'Polo',
            'Jackets',
            'Jeans',
            'Tenu montone',
            'Pantalons classe',
            'Ensembles',
            'Casquettes',
            'T-shirts',
            'Chaussures',
        ];

        foreach ($categories as $index => $name) {
            $slug = Str::slug($name);

            // Create only if it does not already exist by slug or name
            // Does NOT overwrite any existing customization made by the administrator
            $existing = Category::where('slug', $slug)
                ->orWhere('name', $name)
                ->first();

            if (! $existing) {
                Category::create([
                    'name' => $name,
                    'slug' => $slug,
                    'is_active' => true,
                    'sort_order' => $index + 1,
                ]);
            }
        }
    }
}
