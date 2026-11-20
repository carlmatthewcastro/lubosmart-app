<?php

namespace App\Http\Controllers;

use App\Services\WorkspaceStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceStatusController extends Controller
{
    public function __invoke(Request $request, WorkspaceStatus $workspace): JsonResponse
    {
        return response()->json($workspace->data($request->user()))->header('Cache-Control', 'private, no-store');
    }
}
