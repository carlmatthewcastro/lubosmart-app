<?php

use App\Models\RegistrationApplication;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')->assertRedirect(route('dashboard.role', ['role' => 'buyer']));
});

test('admin overview shows the oldest eligible applications including couriers and excludes drafts', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $first = null;
    for ($index = 0; $index < 6; $index++) {
        $application = RegistrationApplication::query()->create([
            'user_id' => User::factory()->create(['role' => 'seller'])->id,
            'requested_role' => 'seller',
            'status' => 'submitted',
            'submitted_at' => now()->subDays(6 - $index),
        ]);
        $first ??= $application;
    }
    foreach ([['courier', 'submitted'], ['seller', 'draft'], ['sorting_center', 'approved']] as [$role, $status]) {
        RegistrationApplication::query()->create([
            'user_id' => User::factory()->create(['role' => $role])->id,
            'requested_role' => $role,
            'status' => $status,
            'submitted_at' => now()->subDays(10),
        ]);
    }

    $this->actingAs($admin)->get('/dashboard/admin')->assertInertia(fn (Assert $page) => $page
        ->component('admin/dashboard')
        ->where('stats.Pending review', 7)
        ->has('adminOverview.applications', 5)
        ->where('adminOverview.applications.0.role', 'courier')
        ->where('adminOverview.applications.1.id', $first->id)
        ->missing('adminOverview.activeDeliveries')
        ->missing('adminOverview.codAwaitingReconciliation'));
});

test('non admin dashboards do not expose the admin review queue', function () {
    $this->actingAs(User::factory()->create())->get('/dashboard/buyer')
        ->assertInertia(fn (Assert $page) => $page->component('workspace/dashboard')->where('adminOverview', null));
});
