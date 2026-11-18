<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**
     * Keys that must never be stored in plain text or at all in metadata.
     *
     * @var list<string>
     */
    protected array $sensitiveKeys = [
        'password',
        'password_confirmation',
        'current_password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'customer_phone',
        'phone',
        'address',
        'customer_address',
        'ip_address',
        'token',
    ];

    /**
     * Record an audit log entry.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function log(
        string $action,
        ?Model $subject = null,
        array $metadata = [],
        ?int $userId = null,
        ?string $ip = null,
        ?string $userAgent = null
    ): AuditLog {
        $sanitizedMetadata = $this->sanitizeMetadata($metadata);

        return AuditLog::create([
            'user_id' => $userId ?? Auth::id(),
            'action' => $action,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject?->getKey(),
            'metadata' => $sanitizedMetadata,
            'ip_address' => $ip ?? Request::ip(),
            'user_agent' => $userAgent ?? Request::userAgent(),
        ]);
    }

    /**
     * Recursively scrub sensitive keys from metadata.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function sanitizeMetadata(array $data): array
    {
        $sanitized = [];

        foreach ($data as $key => $value) {
            $lowerKey = strtolower((string) $key);

            if (in_array($lowerKey, $this->sensitiveKeys, true)) {
                $sanitized[$key] = '[REDACTED]';

                continue;
            }

            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeMetadata($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }
}
