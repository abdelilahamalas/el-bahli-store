<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GestionImagesTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->adminUser = User::factory()->create([
            'is_admin' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Vestes',
            'slug' => 'vestes',
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }

    public function test_non_image_file_is_rejected(): void
    {
        $fakeFile = UploadedFile::fake()->create('malicious.php', 100, 'application/x-php');

        $response = $this->actingAs($this->adminUser, 'sanctum')->postJson(route('api.v1.admin.products.store'), [
            'category_id' => $this->category->id,
            'name' => 'Produit Dangereux',
            'price' => '100.00',
            'image' => $fakeFile,
            'sizes' => [
                ['size' => 'M', 'stock' => 10],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    public function test_file_larger_than_4mb_is_rejected(): void
    {
        // 5 MB image
        $largeImage = UploadedFile::fake()->image('large.jpg')->size(5120);

        $response = $this->actingAs($this->adminUser, 'sanctum')->post(route('api.v1.admin.products.store'), [
            'category_id' => $this->category->id,
            'name' => 'Produit Image Trop Lourde',
            'price' => '100.00',
            'image' => $largeImage,
            'sizes' => [
                ['size' => 'M', 'stock' => 10],
            ],
        ], ['Accept' => 'application/json']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    public function test_image_is_renamed_and_converted_to_webp_with_thumbnail(): void
    {
        $image = UploadedFile::fake()->image('client-original-photo.png', 1200, 800);

        $response = $this->actingAs($this->adminUser, 'sanctum')->post(route('api.v1.admin.products.store'), [
            'category_id' => $this->category->id,
            'name' => 'Veste Cuir',
            'price' => '999.00',
            'image' => $image,
            'sizes' => [
                ['size' => 'L', 'stock' => 5],
            ],
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJson(['success' => true]);

        /** @var Product $product */
        $product = Product::latest()->first();
        $this->assertNotNull($product);

        // The image filename must be an unguessable webp (never original client name)
        $this->assertStringEndsWith('.webp', $product->image);
        $this->assertStringEndsWith('.webp', $product->thumbnail);
        $this->assertStringNotContainsString('client-original-photo', $product->image);

        // Check storage existence
        Storage::disk('public')->assertExists($product->image);
        Storage::disk('public')->assertExists($product->thumbnail);
    }
}
