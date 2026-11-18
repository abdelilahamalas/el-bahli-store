<?php

namespace App\Services;

use App\Models\ImageProduit;
use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\Laravel\Facades\Image;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class ImageService
{
    public const MAX_SIZE_BYTES = 4194304; // 4 Mo

    public const MAX_PIXELS = 36000000; // 6000 x 6000 pixels max (Pixel flood protection)

    public const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    /**
     * Store and process a product image, generating 900px main WebP and 300px thumbnail.
     *
     * @return array{image: string, thumbnail: string}
     *
     * @throws ValidationException
     */
    public function processImage(UploadedFile $file): array
    {
        $this->validateImage($file);

        $uuid = Str::uuid()->toString();
        $mainRelativePath = "products/{$uuid}.webp";
        $thumbRelativePath = "products/thumbnails/{$uuid}.webp";

        $encoder = new WebpEncoder(quality: 85, strip: true);

        $source = $file->getPathname() ?: $file->getContent();

        // Process 900px main version
        $mainImage = Image::decode($source);
        $mainImage->scaleDown(width: 900);
        $encodedMain = $mainImage->encode($encoder);

        // Process 300px thumbnail version
        $thumbImage = Image::decode($source);
        $thumbImage->scaleDown(width: 300);
        $encodedThumb = $thumbImage->encode($encoder);

        Storage::disk('public')->put($mainRelativePath, (string) $encodedMain);
        Storage::disk('public')->put($thumbRelativePath, (string) $encodedThumb);

        return [
            'image' => $mainRelativePath,
            'thumbnail' => $thumbRelativePath,
        ];
    }

    /**
     * Add an image to a product's gallery.
     */
    public function addImageToProduct(
        Product $product,
        UploadedFile $file,
        bool $isMain = false,
        ?int $sortOrder = null,
        ?string $alt = null
    ): ImageProduit {
        $paths = $this->processImage($file);

        return DB::transaction(function () use ($product, $paths, $isMain, $sortOrder, $alt) {
            $hasExistingImages = ImageProduit::where('produit_id', $product->id)->exists();

            // If it's the very first image or explicitly marked main, make it main
            $shouldBeMain = $isMain || ! $hasExistingImages;

            if ($shouldBeMain) {
                ImageProduit::where('produit_id', $product->id)->update(['est_principale' => false]);
            }

            if ($sortOrder === null) {
                $maxOrder = (int) ImageProduit::where('produit_id', $product->id)->max('ordre_affichage');
                $sortOrder = $maxOrder + 1;
            }

            $imageProduit = ImageProduit::create([
                'produit_id' => $product->id,
                'chemin_image' => $paths['image'],
                'chemin_miniature' => $paths['thumbnail'],
                'est_principale' => $shouldBeMain,
                'ordre_affichage' => $sortOrder,
                'texte_alternatif' => $alt ?: $product->name,
            ]);

            // Sync legacy product columns for backward compatibility
            if ($shouldBeMain) {
                $product->update([
                    'image' => $paths['image'],
                    'thumbnail' => $paths['thumbnail'],
                ]);
            }

            return $imageProduit;
        });
    }

    /**
     * Add multiple images to a product's gallery.
     *
     * @param  array<int, UploadedFile>  $files
     * @return Collection<int, ImageProduit>
     */
    public function addMultipleImagesToProduct(Product $product, array $files): Collection
    {
        $created = collect();
        $hasMain = ImageProduit::where('produit_id', $product->id)->where('est_principale', true)->exists();

        foreach ($files as $index => $file) {
            $isMain = (! $hasMain && $index === 0);
            $imageProduit = $this->addImageToProduct($product, $file, $isMain);
            $created->push($imageProduit);
            if ($isMain) {
                $hasMain = true;
            }
        }

        return $created;
    }

    /**
     * Set an image as the main image of a product.
     *
     * @throws AccessDeniedHttpException
     */
    public function setMainImage(Product $product, ImageProduit|int $imageId): ImageProduit
    {
        /** @var ImageProduit $image */
        $image = $imageId instanceof ImageProduit ? $imageId : ImageProduit::findOrFail($imageId);

        // Anti-IDOR check
        if ((int) $image->produit_id !== (int) $product->id) {
            throw new AccessDeniedHttpException("Cette image n'appartient pas au produit spécifié.");
        }

        return DB::transaction(function () use ($product, $image) {
            ImageProduit::where('produit_id', $product->id)->update(['est_principale' => false]);

            $image->update(['est_principale' => true]);

            $product->update([
                'image' => $image->chemin_image,
                'thumbnail' => $image->chemin_miniature,
            ]);

            return $image;
        });
    }

    /**
     * Reorder images for a product.
     *
     * @param  array<int, array{id: int, ordre_affichage: int}>  $imageOrders
     *
     * @throws AccessDeniedHttpException
     */
    public function reorderImages(Product $product, array $imageOrders): void
    {
        DB::transaction(function () use ($product, $imageOrders) {
            foreach ($imageOrders as $orderData) {
                $image = ImageProduit::findOrFail($orderData['id']);

                if ((int) $image->produit_id !== (int) $product->id) {
                    throw new AccessDeniedHttpException("L'image #{$orderData['id']} n'appartient pas au produit spécifié.");
                }

                $sortOrder = $orderData['sort_order'] ?? $orderData['ordre_affichage'] ?? 0;
                $image->update(['ordre_affichage' => (int) $sortOrder]);
            }
        });
    }

    /**
     * Replace an existing image file with a new one.
     *
     * @throws AccessDeniedHttpException
     */
    public function replaceProductImage(Product $product, int $imageId, UploadedFile $newFile, ?string $newAlt = null): ImageProduit
    {
        /** @var ImageProduit $image */
        $image = ImageProduit::findOrFail($imageId);

        if ((int) $image->produit_id !== (int) $product->id) {
            throw new AccessDeniedHttpException("Cette image n'appartient pas au produit spécifié.");
        }

        $oldImage = $image->chemin_image;
        $oldThumb = $image->chemin_miniature;

        $newPaths = $this->processImage($newFile);

        DB::transaction(function () use ($product, $image, $newPaths, $newAlt) {
            $image->update([
                'chemin_image' => $newPaths['image'],
                'chemin_miniature' => $newPaths['thumbnail'],
                'texte_alternatif' => $newAlt ?? $image->texte_alternatif,
            ]);

            if ($image->est_principale) {
                $product->update([
                    'image' => $newPaths['image'],
                    'thumbnail' => $newPaths['thumbnail'],
                ]);
            }
        });

        // Safely delete old physical files after DB transaction commit
        $this->deleteFile($oldImage);
        $this->deleteFile($oldThumb);

        return $image;
    }

    /**
     * Delete an image from a product's gallery.
     * If the deleted image was the main one, deterministically select the next main image.
     *
     * @throws AccessDeniedHttpException
     */
    public function deleteImageFromProduct(Product $product, ImageProduit|int $imageId): void
    {
        /** @var ImageProduit $image */
        $image = $imageId instanceof ImageProduit ? $imageId : ImageProduit::findOrFail($imageId);

        if ((int) $image->produit_id !== (int) $product->id) {
            throw new AccessDeniedHttpException("Cette image n'appartient pas au produit spécifié.");
        }

        $wasMain = (bool) $image->est_principale;
        $oldImage = $image->chemin_image;
        $oldThumb = $image->chemin_miniature;

        DB::transaction(function () use ($product, $image, $wasMain) {
            $image->delete();

            if ($wasMain) {
                // Select next image deterministically: lowest ordre_affichage, then lowest id
                $nextMain = ImageProduit::where('produit_id', $product->id)
                    ->orderBy('ordre_affichage', 'asc')
                    ->orderBy('id', 'asc')
                    ->first();

                if ($nextMain) {
                    $nextMain->update(['est_principale' => true]);
                    $product->update([
                        'image' => $nextMain->chemin_image,
                        'thumbnail' => $nextMain->chemin_miniature,
                    ]);
                } else {
                    $product->update([
                        'image' => null,
                        'thumbnail' => null,
                    ]);
                }
            }
        });

        // Clean up physical files after successful DB transaction
        $this->deleteFile($oldImage);
        $this->deleteFile($oldThumb);
    }

    /**
     * Delete image alias.
     */
    public function deleteImage(ImageProduit|int $image): void
    {
        /** @var ImageProduit $imageModel */
        $imageModel = $image instanceof ImageProduit ? $image : ImageProduit::findOrFail($image);
        $this->deleteImageFromProduct($imageModel->product, $imageModel);
    }

    /**
     * Backward-compatible helper for legacy single upload calls.
     *
     * @return array{image: string, thumbnail: string}
     */
    public function storeProductImage(UploadedFile $file): array
    {
        return $this->processImage($file);
    }

    /**
     * Store store logo.
     */
    public function storeStoreLogo(UploadedFile $file): string
    {
        $this->validateImage($file);

        $uuid = Str::uuid()->toString();
        $relativePath = "store/logo_{$uuid}.webp";

        $encoder = new WebpEncoder(quality: 90, strip: true);

        $source = $file->getPathname() ?: $file->getContent();
        $image = Image::decode($source);
        $image->scaleDown(width: 500);
        $encoded = $image->encode($encoder);

        Storage::disk('public')->put($relativePath, (string) $encoded);

        return $relativePath;
    }

    /**
     * Delete files from public storage safely.
     */
    public function deleteFile(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    /**
     * Delete both main image and thumbnail of a product.
     */
    public function deleteProductImage(?string $mainPath, ?string $thumbPath): void
    {
        $this->deleteFile($mainPath);
        $this->deleteFile($thumbPath);
    }

    /**
     * Validate the uploaded file: checks error, size, dimensions, and real MIME type.
     *
     * @throws ValidationException
     */
    public function validateImage(UploadedFile $file): void
    {
        if (! $file->isValid()) {
            throw ValidationException::withMessages([
                'image' => 'Le fichier téléchargé est corrompu ou invalide.',
            ]);
        }

        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            throw ValidationException::withMessages([
                'image' => "L'image ne doit pas dépasser 4 Mo.",
            ]);
        }

        $realMime = $file->getMimeType();
        if (! in_array($realMime, self::ALLOWED_MIME_TYPES, true)) {
            throw ValidationException::withMessages([
                'image' => "Format d'image non supporté. Formats acceptés : JPEG, PNG, WebP.",
            ]);
        }

        // Pixel-flood protection
        $imageInfo = @getimagesize($file->getPathname());
        if ($imageInfo) {
            $width = $imageInfo[0] ?? 0;
            $height = $imageInfo[1] ?? 0;
            if ($width * $height > self::MAX_PIXELS) {
                throw ValidationException::withMessages([
                    'image' => "Les dimensions de l'image sont trop élevées (maximum 6000x6000 pixels).",
                ]);
            }
        }
    }
}
