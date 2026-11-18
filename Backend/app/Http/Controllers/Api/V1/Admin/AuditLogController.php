<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends ApiController
{
    /**
     * List audit logs with pagination and action filter.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user');

        if ($request->filled('action')) {
            $query->where('action', 'like', '%'.trim((string) $request->input('action')).'%');
        }

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $logs = $query->latest('id')->paginate($perPage);

        return $this->success([
            'data' => AuditLogResource::collection($logs->items())->resolve(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
            'filters' => [
                'action' => $request->input('action', ''),
            ],
        ], 'Journaux d’audit récupérés.');
    }
}
