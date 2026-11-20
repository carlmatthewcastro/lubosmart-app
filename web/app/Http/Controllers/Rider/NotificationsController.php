<?php

namespace App\Http\Controllers\Rider;

use App\Http\Controllers\Controller;
use App\Services\Rider\RiderWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    public function __invoke(Request $request, RiderWorkspace $workspace): JsonResponse
    {
        abort_unless($request->user()->role === 'rider' && $request->user()->canOperate(), 403);

        return response()->json($workspace->queueCounts($request->user()))->header('Cache-Control', 'private, no-store');
    }
}
