<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CsvProductImportService
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    /**
     * Generate downloadable CSV template with UTF-8 BOM.
     */
    public function getTemplateContent(): string
    {
        $bom = "\xEF\xBB\xBF";
        $header = "nom,categorie,prix,prix_promo,description,variantes\n";
        $example1 = "\"Sweat-Shirt Premium\",\"Sweat-Shirt\",\"350.00\",\"299.00\",\"Sweat brodé de qualité supérieure\",\"Noir:M:10|Noir:L:15|Blanc:M:8\"\n";
        $example2 = "\"Polo Classic\",\"Polo\",\"220.00\",\"\",\"Polo 100% coton peigné\",\"Bleu:S:5|Bleu:M:12|Blanc:L:7\"\n";

        return $bom.$header.$example1.$example2;
    }

    /**
     * Parse and validate CSV rows without persisting.
     *
     * @return array{
     *     valid_rows: array<int, array<string, mixed>>,
     *     errors: array<int, string>,
     *     total_rows: int
     * }
     */
    public function parseAndValidateCsv(string $filePath): array
    {
        $handle = fopen($filePath, 'r');
        if (! $handle) {
            return [
                'valid_rows' => [],
                'errors' => ['Impossible d\'ouvrir le fichier CSV téléchargé.'],
                'total_rows' => 0,
            ];
        }

        // Detect and skip UTF-8 BOM if present
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $header = fgetcsv($handle, 1000, ',');
        if (! $header || count($header) < 5) {
            fclose($handle);

            return [
                'valid_rows' => [],
                'errors' => ['Format de fichier invalide. Veuillez utiliser le modèle CSV fourni.'],
                'total_rows' => 0,
            ];
        }

        // Normalize header
        $header = array_map(fn ($h) => trim(strtolower((string) $h)), $header);
        $expectedCols = ['nom', 'categorie', 'prix'];
        foreach ($expectedCols as $col) {
            if (! in_array($col, $header, true)) {
                fclose($handle);

                return [
                    'valid_rows' => [],
                    'errors' => ["Colonne obligatoire manquante : « {$col} »."],
                    'total_rows' => 0,
                ];
            }
        }

        $categoriesMap = Category::pluck('id', 'name')
            ->mapWithKeys(fn ($id, $name) => [strtolower($name) => $id])
            ->toArray();

        // Also map slug
        $categoriesSlugMap = Category::pluck('id', 'slug')->toArray();

        $validRows = [];
        $errors = [];
        $lineNumber = 1;

        while (($data = fgetcsv($handle, 2000, ',')) !== false) {
            $lineNumber++;

            // Skip empty rows
            if (empty(array_filter($data))) {
                continue;
            }

            $row = [];
            foreach ($header as $i => $key) {
                $row[$key] = trim($data[$i] ?? '');
            }

            $name = $row['nom'] ?? '';
            $catName = $row['categorie'] ?? '';
            $price = $row['prix'] ?? '';
            $promoPrice = $row['prix_promo'] ?? null;
            $description = $row['description'] ?? null;
            $variantsRaw = $row['variantes'] ?? '';

            // 1. Validate name
            if (empty($name) || strlen($name) < 2 || strlen($name) > 150) {
                $errors[] = "Ligne {$lineNumber} : Le nom du produit est invalide (doit comporter entre 2 et 150 caractères).";

                continue;
            }

            // 2. Validate category
            $catId = $categoriesMap[strtolower($catName)] ?? ($categoriesSlugMap[Str::slug($catName)] ?? null);
            if (! $catId) {
                $errors[] = "Ligne {$lineNumber} : La catégorie « {$catName} » n'existe pas dans le catalogue.";

                continue;
            }

            // 3. Validate price
            if (! is_numeric($price) || (float) $price < 0) {
                $errors[] = "Ligne {$lineNumber} : Le prix « {$price} » est invalide.";

                continue;
            }

            if ($promoPrice !== null && $promoPrice !== '') {
                if (! is_numeric($promoPrice) || (float) $promoPrice < 0) {
                    $errors[] = "Ligne {$lineNumber} : Le prix promotionnel « {$promoPrice} » est invalide.";

                    continue;
                }

                if ((float) $promoPrice >= (float) $price) {
                    $errors[] = "Ligne {$lineNumber} : Le prix promotionnel (« {$promoPrice} ») doit être inférieur au prix normal (« {$price} »).";

                    continue;
                }
            }

            // 4. Parse variants
            // Format: "Couleur:Taille:Stock|Couleur:Taille:Stock" (ex: Noir:M:10|Blanc:L:5)
            $parsedVariants = [];
            if (! empty($variantsRaw)) {
                $variantEntries = explode('|', $variantsRaw);
                $hasVariantError = false;

                foreach ($variantEntries as $entry) {
                    $parts = array_map('trim', explode(':', $entry));
                    if (count($parts) < 3) {
                        $errors[] = "Ligne {$lineNumber} : Format de variante invalide « {$entry} » (attendu: Couleur:Taille:Stock).";
                        $hasVariantError = true;
                        break;
                    }

                    $color = $parts[0] ?: 'Standard';
                    $size = $parts[1];
                    $stock = (int) $parts[2];

                    if ($stock < 0) {
                        $errors[] = "Ligne {$lineNumber} : Le stock de la variante « {$size}/{$color} » ne peut pas être négatif.";
                        $hasVariantError = true;
                        break;
                    }

                    $parsedVariants[] = [
                        'color' => $color,
                        'size' => $size,
                        'stock' => $stock,
                    ];
                }

                if ($hasVariantError) {
                    continue;
                }
            } else {
                // Default single standard variant if none specified
                $parsedVariants[] = [
                    'color' => 'Standard',
                    'size' => 'Unique',
                    'stock' => 0,
                ];
            }

            $validRows[] = [
                'name' => $name,
                'category_id' => $catId,
                'category_name' => $catName,
                'price' => number_format((float) $price, 2, '.', ''),
                'promotional_price' => ! empty($promoPrice) ? number_format((float) $promoPrice, 2, '.', '') : null,
                'description' => ! empty($description) ? trim(strip_tags((string) $description)) : null,
                'variants' => $parsedVariants,
                'total_stock' => array_sum(array_column($parsedVariants, 'stock')),
            ];
        }

        fclose($handle);

        return [
            'valid_rows' => $validRows,
            'valid_count' => count($validRows),
            'errors' => $errors,
            'invalid_count' => count($errors),
            'total_rows' => count($validRows) + count($errors),
        ];
    }

    /**
     * Persist confirmed imported products in transaction.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{created_products: int, created_variants: int}
     */
    public function importConfirmed(array $rows, ?int $userId = null): array
    {
        return DB::transaction(function () use ($rows, $userId) {
            $createdProducts = 0;
            $createdVariants = 0;

            foreach ($rows as $row) {
                $name = trim(strip_tags((string) $row['name']));
                $baseSlug = Str::slug($name);
                $slug = $baseSlug;
                $counter = 1;
                while (Product::where('slug', $slug)->exists()) {
                    $slug = "{$baseSlug}-{$counter}";
                    $counter++;
                }

                $product = Product::create([
                    'category_id' => $row['category_id'],
                    'name' => $name,
                    'slug' => $slug,
                    'description' => $row['description'] ?? null,
                    'price' => $row['price'],
                    'promotional_price' => $row['promotional_price'] ?? null,
                    'is_active' => true,
                ]);

                $createdProducts++;

                foreach ($row['variants'] as $v) {
                    $variant = ProductSize::create([
                        'product_id' => $product->id,
                        'size' => $v['size'],
                        'color' => $v['color'] ?? 'Standard',
                        'stock' => max(0, (int) $v['stock']),
                        'is_active' => true,
                    ]);

                    $createdVariants++;

                    if ($variant->stock > 0) {
                        StockMovement::create([
                            'product_size_id' => $variant->id,
                            'order_id' => null,
                            'user_id' => $userId,
                            'type' => StockMovement::TYPE_INITIAL_STOCK,
                            'quantity_before' => 0,
                            'quantity_delta' => $variant->stock,
                            'quantity_after' => $variant->stock,
                            'reason' => 'Stock initial importé via CSV',
                        ]);
                    }
                }
            }

            $this->auditService->log('products.imported_csv', null, [
                'count_products' => $createdProducts,
                'count_variants' => $createdVariants,
            ], $userId);

            return [
                'created_products' => $createdProducts,
                'created_variants' => $createdVariants,
            ];
        });
    }
}
