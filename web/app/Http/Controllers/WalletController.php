<?php

namespace App\Http\Controllers;

use App\Services\LubosCoins;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WalletController extends Controller
{
    public function correct(Request $request, LubosCoins $coins)
    {
        $data = $request->validate(['transaction_id' => 'required|integer', 'reason' => 'required|string|min:10|max:1000']);
        $coins->correct($request->user(), (int) $data['transaction_id'], $data['reason']);

        return back()->with('status', 'Wallet correction recorded with its funding adjustment.');
    }

    public function index(Request $request)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $props = ['balance_cents' => (int) DB::table('buyer_wallets')->where('buyer_id', $request->user()->id)->value('balance_cents'),
            'entries' => DB::table('wallet_transactions')->where('buyer_id', $request->user()->id)->orderByDesc('id')->paginate(20)];

        return $request->routeIs('api.v1.*') ? response()->json(['data' => $props])->header('Cache-Control', 'private, no-store') : Inertia::render('marketplace/wallet', $props);
    }
}
