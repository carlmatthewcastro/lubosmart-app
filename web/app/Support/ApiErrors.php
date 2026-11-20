<?php

namespace App\Support;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class ApiErrors
{
    public static function render(Throwable $exception, Request $request): ?JsonResponse
    {
        if (! $request->is('api/v1', 'api/v1/*')) {
            return null;
        }

        $status = match (true) {
            $exception instanceof ValidationException => $exception->status,
            $exception instanceof AuthenticationException => 401,
            $exception instanceof HttpExceptionInterface => $exception->getStatusCode(),
            default => 500,
        };
        $code = match ($status) {
            401 => 'unauthenticated', 403 => 'forbidden', 404 => 'not_found',
            409 => 'state_conflict', 422 => 'validation_failed', 429 => 'rate_limited',
            default => $status >= 500 ? 'server_error' : 'request_failed',
        };
        $message = match ($status) {
            401 => $request->routeIs('api.v1.tokens.store', 'api.v1.session', 'api.v1.google') ? 'Sign-in could not be verified. Check your credentials or linked Google account.' : 'A valid device token is required.',
            403 => 'You cannot perform this action.',
            404 => 'Resource not found.',
            422 => 'Please check the submitted fields.',
            429 => 'Too many requests. Please try again later.',
            default => $status >= 500 ? 'Unable to complete the request.' : ($exception->getMessage() ?: 'Unable to complete the request.'),
        };

        return response()->json([
            'message' => $message,
            'code' => $code,
            ...($exception instanceof ValidationException ? ['errors' => $exception->errors()] : []),
        ], $status, $exception instanceof HttpExceptionInterface ? $exception->getHeaders() : [])
            ->header('Cache-Control', 'private, no-store');
    }
}
