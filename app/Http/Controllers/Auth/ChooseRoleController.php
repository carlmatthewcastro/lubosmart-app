<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ChooseRoleController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        return $request->user()->role === null ? Inertia::render('auth/choose-role') : to_route('dashboard');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['role' => ['required', Rule::in(['buyer', 'seller', 'courier', 'sorting_center'])]]);
        DB::transaction(function () use ($request, $data) {
            $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($user->role === null && $user->status === 'incomplete', 403);
            $user->forceFill(['role' => $data['role']])->save();
            $user->application()->create(['requested_role' => $data['role']]);
            $request->user()->setRawAttributes($user->getAttributes(), true);
        });

        return to_route('application.edit');
    }
}
