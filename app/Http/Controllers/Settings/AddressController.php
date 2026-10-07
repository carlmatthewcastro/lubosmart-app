<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AddressRequest;
use App\Models\Address;
use App\Models\RegistrationApplication;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AddressController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('settings/addresses', [
            'addresses' => Address::query()->where('user_id', $request->user()->id)->orderByDesc('is_default')->latest('id')->get(),
            'registrationAddressId' => $request->user()->application()->value('address_id'),
        ]);
    }

    public function store(AddressRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $addresses = Address::query()->where('user_id', $request->user()->id);
            $default = $request->boolean('is_default') || ! (clone $addresses)->where('is_default', true)->exists();
            if ($default) {
                $addresses->update(['is_default' => false]);
            }
            Address::query()->create([...$request->validated(), 'user_id' => $request->user()->id, 'is_default' => $default]);
        }, 3);

        return to_route('settings.addresses.index')->with('status', 'Address saved.');
    }

    public function update(AddressRequest $request, Address $address): RedirectResponse
    {
        DB::transaction(function () use ($request, $address) {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $address->refresh();
            $this->ensureEditable($address);
            $default = $request->boolean('is_default') || $address->is_default;
            if ($default) {
                Address::query()->where('user_id', $request->user()->id)->whereKeyNot($address->id)->update(['is_default' => false]);
            }
            $address->update([...$request->validated(), 'is_default' => $default]);
        }, 3);

        return to_route('settings.addresses.index')->with('status', 'Address updated. Existing orders keep their original delivery details.');
    }

    public function destroy(Request $request, Address $address): RedirectResponse
    {
        abort_unless($address->user_id === $request->user()->id, 403);
        DB::transaction(function () use ($request, $address) {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $address->refresh();
            $this->ensureEditable($address);
            $default = $address->is_default;
            $address->delete();
            if ($default) {
                Address::query()->where('user_id', $request->user()->id)->oldest('id')->first()?->update(['is_default' => true]);
            }
        }, 3);

        return to_route('settings.addresses.index')->with('status', 'Address removed.');
    }

    public function default(Request $request, Address $address): RedirectResponse
    {
        abort_unless($address->user_id === $request->user()->id, 403);
        DB::transaction(function () use ($request, $address) {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $address->refresh();
            Address::query()->where('user_id', $request->user()->id)->update(['is_default' => false]);
            $address->update(['is_default' => true]);
        }, 3);

        return to_route('settings.addresses.index')->with('status', 'Default address updated.');
    }

    private function ensureEditable(Address $address): void
    {
        if (RegistrationApplication::query()->where('address_id', $address->id)->exists()) {
            throw ValidationException::withMessages(['address' => 'Your registration address is part of your application. Add a separate address for deliveries.']);
        }
    }
}
