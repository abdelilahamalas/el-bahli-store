<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\PublicOrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\URL;

class OrderController extends ApiController
{
    public function __construct(
        protected OrderService $orderService
    ) {}

    /**
     * Create a new customer order via REST API.
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        // Anti-bot honeypot check: reject silently if filled
        if ($request->filled('website')) {
            return $this->success(null, 'Commande enregistrée.');
        }

        $idempotencyToken = (string) $request->validated('idempotency_token');

        // Prevent double submission within 15 minutes using atomic cache lock
        $acquired = Cache::add('order_idem_'.$idempotencyToken, true, now()->addMinutes(15));
        if (! $acquired) {
            return $this->error(
                'Cette commande a déjà été enregistrée ou est en cours de traitement.',
                null,
                409
            );
        }

        $validated = $request->validated();

        $order = $this->orderService->createOrder(
            [
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'city' => $validated['city'],
                'address' => $validated['address'],
                'note' => $validated['note'] ?? null,
            ],
            $validated['items'],
            $request->ip()
        );

        // Generate signed confirmation URL
        $confirmationUrl = URL::temporarySignedRoute(
            'api.v1.orders.confirmation',
            now()->addHours(24),
            ['token' => $order->reference]
        );

        return $this->created([
            'reference' => $order->reference,
            'confirmation_token' => $order->reference,
            'confirmation_url' => $confirmationUrl,
            'order' => (new PublicOrderResource($order->load('items')))->resolve(),
        ], 'Votre commande a été passée avec succès. Elle sera traitée après confirmation téléphonique.');
    }

    /**
     * Retrieve public order summary for order confirmation page.
     */
    public function confirmation(Request $request, string $token): JsonResponse
    {
        /** @var Order|null $order */
        $order = Order::with('items')
            ->where('reference', $token)
            ->first();

        if (! $order) {
            return $this->error('Commande introuvable.', null, 404);
        }

        return $this->success(
            (new PublicOrderResource($order))->resolve(),
            'Confirmation de commande récupérée avec succès.'
        );
    }
}
