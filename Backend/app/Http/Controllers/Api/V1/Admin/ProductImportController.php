<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Services\CsvProductImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductImportController extends ApiController
{
    public function __construct(
        protected CsvProductImportService $importService
    ) {}

    /**
     * Download CSV template.
     */
    public function template(): StreamedResponse
    {
        $csvContent = $this->importService->getTemplateContent();
        $filename = 'modele_import_produits_elbahli.csv';

        return response()->streamDownload(function () use ($csvContent) {
            echo $csvContent;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * Upload and preview CSV product import.
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'csv_file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ], [
            'csv_file.required' => 'Veuillez sélectionner un fichier CSV à importer.',
            'csv_file.file' => 'Le fichier téléversé est invalide.',
            'csv_file.mimes' => 'Le fichier doit être au format CSV.',
            'csv_file.max' => 'La taille du fichier CSV ne doit pas dépasser 5 Mo.',
        ]);

        $file = $request->file('csv_file');
        $result = $this->importService->parseAndValidateCsv($file->getRealPath());

        $token = Str::random(40);

        if (! empty($result['valid_rows'])) {
            Cache::put('product_import_'.$token, $result['valid_rows'], now()->addMinutes(60));
            if ($request->hasSession()) {
                session(['product_import_'.$token => $result['valid_rows']]);
            }
        }

        return $this->success([
            'token' => $token,
            'summary' => [
                'total' => $result['total_rows'],
                'valid' => $result['valid_count'],
                'invalid' => $result['invalid_count'],
            ],
            'errors' => $result['errors'],
            'preview_rows' => array_slice($result['valid_rows'], 0, 50),
        ], 'Aperçu du fichier CSV analysé avec succès.');
    }

    /**
     * Confirm and execute import.
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'import_token' => ['required', 'string'],
        ], [
            'import_token.required' => 'Jeton d’importation manquant.',
        ]);

        $token = (string) $request->input('import_token');
        $rows = Cache::get('product_import_'.$token) ?? ($request->hasSession() ? session('product_import_'.$token) : null);

        if (! is_array($rows) || empty($rows)) {
            return $this->error('Session d’import expirée ou invalide. Veuillez téléverser à nouveau votre fichier CSV.', null, 422);
        }

        $result = $this->importService->importConfirmed($rows, $request->user()?->id);
        $productsCount = $result['created_products'] ?? 0;
        $variantsCount = $result['created_variants'] ?? 0;

        Cache::forget('product_import_'.$token);
        if ($request->hasSession()) {
            session()->forget('product_import_'.$token);
        }

        return $this->created([
            'created_products' => $productsCount,
            'created_variants' => $variantsCount,
        ], "{$productsCount} produit(s) ({$variantsCount} variantes) importé(s) avec succès avec leurs stocks initiaux.");
    }

    /**
     * Cancel an ongoing import preview.
     */
    public function cancel(Request $request): JsonResponse
    {
        $token = (string) $request->input('import_token');
        if ($token) {
            Cache::forget('product_import_'.$token);
            if ($request->hasSession()) {
                session()->forget('product_import_'.$token);
            }
        }

        return $this->success(null, 'Importation de produits annulée.');
    }
}
