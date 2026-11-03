<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Services\Seller\SellerWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    public function __invoke(Request $request, SellerWorkspace $workspace): JsonResponse
    {
        return response()->json($workspace->queueCounts($request->user()))->header('Cache-Control', 'no-store');
    }
}
