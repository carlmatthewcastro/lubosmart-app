<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Services\Logistics\LogisticsWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    public function __invoke(Request $request, LogisticsWorkspace $workspace): JsonResponse
    {
        abort_unless($request->user()->role === 'logistics' && $request->user()->canOperate(), 403);

        return response()->json($workspace->queueCounts($request->user()))->header('Cache-Control', 'private, no-store');
    }
}
