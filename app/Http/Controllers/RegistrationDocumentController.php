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
        if ($document->application->user_id !== $request->user()->id) {
            Gate::authorize('review', $document->application);
        }

        return Storage::disk($document->disk)->download($document->path, $document->kind.'.'.pathinfo($document->path, PATHINFO_EXTENSION), ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }
}
