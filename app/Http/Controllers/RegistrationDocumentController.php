<?php

namespace App\Http\Controllers;

use App\Models\RegistrationDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RegistrationDocumentController extends Controller
{
    public function __invoke(Request $request, RegistrationDocument $document): StreamedResponse
    {
        Gate::authorize('view', $document->application);

        abort_unless(Storage::disk($document->disk)->exists($document->path), 404, 'This document is unavailable.');

        return Storage::disk($document->disk)->response($document->path, $document->kind.'.'.pathinfo($document->path, PATHINFO_EXTENSION), [
            'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store',
            'Content-Security-Policy' => "default-src 'none'; sandbox", 'Content-Type' => $document->mime_type,
        ], 'inline');
    }
}
