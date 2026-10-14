<?php

namespace App\Http\Controllers;

use App\Services\Admin\AdminWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNotificationsController extends Controller
{
    public function __invoke(Request $request, AdminWorkspace $workspace): JsonResponse
    {
        return response()->json($workspace->data($request->user()))->header('Cache-Control', 'private, no-store');
    }
}
