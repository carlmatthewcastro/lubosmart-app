<?php

use App\Models\User;

test('each dashboard role is denied other dashboards and unsupported operational routes', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'courier') {
        linkRiderToApprovedCenter($user);
    }
    $this->actingAs($user);

    $this->get('/dashboard/'.$role)->assertOk();
    foreach (array_diff(['buyer', 'seller', 'courier', 'sorting_center', 'admin'], [$role]) as $otherRole) {
        $this->get('/dashboard/'.$otherRole)->assertForbidden();
    }
    $access = [
        '/cart' => ['buyer'],
        '/inventory' => ['seller'],
        '/orders' => ['buyer', 'seller', 'admin'],
        '/deliveries' => ['courier', 'sorting_center', 'admin'],
        '/reports' => ['seller', 'courier', 'sorting_center', 'admin'],
        '/reviews' => ['admin', 'sorting_center'],
        '/accounts' => ['admin', 'sorting_center'],
        '/logistics/riders' => ['sorting_center'],
        '/logistics/shipping-rates' => ['sorting_center'],
        '/admin/commission' => ['admin'],
        '/admin/platform' => ['admin'],
        '/admin/compliance' => ['admin'],
        '/admin/audit-log' => ['admin'],
    ];
    foreach ($access as $url => $allowedRoles) {
        if (! in_array($role, $allowedRoles, true)) {
            $this->get($url)->assertForbidden();
        }
    }
    foreach (['/checkout' => 'buyer', '/inventory' => 'seller', '/logistics/riders' => 'sorting_center', '/logistics/shipping-rates' => 'sorting_center', '/admin/platform' => 'admin'] as $url => $allowedRole) {
        if ($role !== $allowedRole) {
            $this->post($url, ['role' => $allowedRole, 'status' => 'approved'])->assertForbidden();
        }
    }
})->with(['buyer', 'seller', 'courier', 'sorting_center', 'admin']);
