<?php

namespace App\Http\Controllers;

use App\Models\CommerceSetting;
use App\Models\ParcelReturn;
use App\Models\SellerOrder;
use App\Services\Admin\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ParcelReturnController extends Controller
{
    public function settings(Request $request, AuditLogger $audit)
    {
        abort_unless($request->user()->canAdmin('disputes'), 403);
        $data = $request->validate(['return_window_days' => 'required|integer|min:1|max:365']);
        DB::transaction(function () use ($request, $data, $audit) {
            $setting = CommerceSetting::query()->whereKey(1)->lockForUpdate()->firstOrFail();
            $previous = $setting->return_window_days;
            // Preserve the policy currently applicable to legacy delivered parcels.
            // No delivery dates or historical approvals are reconstructed.
            DB::table('deliveries')->where('status', 'delivered')->whereNull('return_window_days')
                ->update(['return_window_days' => $previous]);
            $setting->update($data);
            $audit->record(['actor_id' => $request->user()->id, 'subject_type' => 'commerce_settings', 'subject_id' => 1,
                'action' => 'return_window_updated', 'changes' => ['from_days' => $previous, 'to_days' => (int) $data['return_window_days']]]);
        }, 3);

        return back()->with('status', 'Standard return window updated for future deliveries. Existing delivered parcels and approved requests retain their eligibility.');
    }

    public function index(Request $request)
    {
        return app(ReturnWorkflowController::class)->index($request);
    }

    public function exception(Request $request)
    {
        abort_unless($request->user()->canAdmin('disputes'), 403);
        $data = $request->validate(['seller_order_id' => 'required|exists:seller_orders,id', 'reason' => 'required|string|min:10|max:1000']);
        DB::transaction(function () use ($request, $data) {
            $parcel = SellerOrder::query()->whereKey($data['seller_order_id'])->lockForUpdate()->firstOrFail();
            abort_unless($parcel->delivery?->status === 'delivered', 409);
            abort_if(DB::table('return_window_exceptions')->where('seller_order_id', $parcel->id)->exists(), 409, 'An authorized exception already exists for this parcel.');
            DB::table('return_window_exceptions')->insert(['seller_order_id' => $parcel->id, 'actor_id' => $request->user()->id, 'reason' => $data['reason'], 'created_at' => now()]);
            app(AuditLogger::class)->record(['actor_id' => $request->user()->id, 'subject_type' => 'seller_order', 'subject_id' => $parcel->id, 'action' => 'return_window_exception', 'changes' => $data]);
        }, 3);

        return back()->with('status', 'Documented return-window exception recorded. The buyer can submit the request.');
    }

    public function evidence(Request $request, ParcelReturn $return, int $index)
    {
        abort_unless($request->user()->canAdmin('disputes') || $request->user()->canAdmin('finance') || ($request->user()->role === 'buyer' && $return->buyer_id === $request->user()->id), 403);
        $path = $return->evidence_paths[$index] ?? null;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, ['Cache-Control' => 'private, no-store']);
    }

    public function store(Request $request)
    {
        return app(ReturnWorkflowController::class)->store($request);
    }

    public function update(Request $request, ParcelReturn $return, AuditLogger $audit)
    {
        return app(ReturnWorkflowController::class)->update($request, $return);
    }
}
