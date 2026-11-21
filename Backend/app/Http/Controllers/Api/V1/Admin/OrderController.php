<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\ProcessOrderReturnRequest;
use App\Http\Requests\TransitionOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends ApiController
{
    public function __construct(
        protected OrderService $orderService
    ) {}

    /**
     * List paginated orders with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['items', 'statusHistories.user']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->input('date'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('min_total')) {
            $query->where('total', '>=', (float) $request->input('min_total'));
        }

        if ($request->filled('max_total')) {
            $query->where('total', '<=', (float) $request->input('max_total'));
        }

        if ($request->filled('search')) {
            $search = '%'.trim((string) $request->input('search')).'%';
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', $search)
                    ->orWhere('customer_phone', 'like', $search)
                    ->orWhere('customer_name', 'like', $search);
            });
        }

        $sortBy = in_array($request->input('sort_by'), ['created_at', 'total', 'status', 'reference'], true)
            ? $request->input('sort_by')
            : 'created_at';
        $sortOrder = strtolower((string) $request->input('sort_order')) === 'asc' ? 'asc' : 'desc';

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $orders = $query->orderBy($sortBy, $sortOrder)->paginate($perPage);

        return $this->success([
            'data' => OrderResource::collection($orders->items())->resolve(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
            'statuses' => collect(OrderStatus::cases())->map(fn ($case) => [
                'value' => $case->value,
                'label' => $case->label(),
            ])->values(),
        ], 'Commandes récupérées.');
    }

    /**
     * Show single order with items and allowed transitions.
     */
    public function show(Order $order): JsonResponse
    {
        $order->load(['items.product.images', 'statusHistories.user', 'returns.item', 'returns.variant', 'returns.user']);

        $allowedTransitions = collect($order->status->allowedTransitions())->map(fn ($s) => [
            'value' => $s->value,
            'label' => $s->label(),
        ])->values();

        return $this->success([
            'order' => (new OrderResource($order))->resolve(),
            'allowed_transitions' => $allowedTransitions,
        ], 'Commande récupérée.');
    }

    /**
     * Transition order status.
     */
    public function updateStatus(TransitionOrderStatusRequest $request, Order $order): JsonResponse
    {
        $newStatus = OrderStatus::from($request->validated('status'));
        $reason = $request->validated('reason');

        $order = $this->orderService->transitionStatus($order, $newStatus, $request->user()?->id, $reason);

        $order->load(['items.product.images', 'statusHistories.user', 'returns.item', 'returns.variant', 'returns.user']);

        return $this->success(
            (new OrderResource($order))->resolve(),
            "Statut de la commande mis à jour vers « {$newStatus->label()} »."
        );
    }

    /**
     * Process return of items for a delivered or return-requested order.
     */
    public function processReturn(ProcessOrderReturnRequest $request, Order $order): JsonResponse
    {
        $validated = $request->validated();

        $order = $this->orderService->processReturn(
            $order,
            $validated['returns'],
            $request->user()?->id,
            $validated['reason'] ?? null
        );

        $order->load(['items.product.images', 'statusHistories.user', 'returns.item', 'returns.variant', 'returns.user']);

        return $this->success(
            (new OrderResource($order))->resolve(),
            'Retour de marchandise traité avec succès.'
        );
    }

    /**
     * Update internal administrative notes on an order.
     */
    public function updateNotes(Request $request, Order $order): JsonResponse
    {
        $request->validate([
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $order = $this->orderService->updateAdminNotes(
            $order,
            (string) $request->input('admin_notes', ''),
            $request->user()?->id
        );

        $order->load(['items.product.images', 'statusHistories.user', 'returns.item', 'returns.variant', 'returns.user']);

        return $this->success(
            (new OrderResource($order))->resolve(),
            'Notes administratives mises à jour.'
        );
    }

    /**
     * Update payment status of an order (cash on delivery collection).
     */
    public function updatePayment(Request $request, Order $order): JsonResponse
    {
        $request->validate([
            'payment_status' => ['required', 'string', 'in:pending,paid,refunded'],
        ], [
            'payment_status.required' => 'Le statut du paiement est obligatoire.',
            'payment_status.in' => 'Le statut du paiement doit être pending, paid ou refunded.',
        ]);

        $newPaymentStatus = PaymentStatus::from((string) $request->input('payment_status'));

        $order = $this->orderService->updatePaymentStatus(
            $order,
            $newPaymentStatus,
            $request->user()?->id
        );

        $order->load(['items.product.images', 'statusHistories.user', 'returns.item', 'returns.variant', 'returns.user']);

        return $this->success(
            (new OrderResource($order))->resolve(),
            "Statut du paiement mis à jour vers « {$newPaymentStatus->label()} »."
        );
    }
}
