<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\CartEstimateRequest;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;

class CartController extends ApiController
{
    public function __construct(
        protected OrderService $orderService
    ) {}

    /**
     * Compute a validated cart quotation.
     */
    public function estimate(CartEstimateRequest $request): JsonResponse
    {
        $estimate = $this->orderService->estimateCart($request->validated('items'));

        return $this->success($estimate, 'Estimation du panier calculée avec succès.');
    }
}
