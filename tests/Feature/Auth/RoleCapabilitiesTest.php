<?php

use App\Models\User;

test('each dashboard role is denied other dashboards and unsupported operational routes', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'rider') {
        linkRiderToApprovedCenter($user);
    }
    $this->actingAs($user);

    $this->get('/dashboard/'.$role)->assertOk();
    foreach (array_diff(['buyer', 'seller', 'rider', 'logistics', 'admin'], [$role]) as $otherRole) {
        $this->get('/dashboard/'.$otherRole)->assertForbidden();
    }
    $access = [
        '/cart' => ['buyer'],
        '/inventory' => ['seller'],
        '/orders' => ['buyer', 'seller', 'admin'],
        '/deliveries' => ['rider', 'logistics', 'admin'],
        '/reports' => ['seller', 'rider', 'logistics', 'admin'],
        '/reviews' => ['admin', 'logistics'],
        '/accounts' => ['admin', 'logistics'],
        '/logistics/riders' => ['logistics'],
        '/logistics/shipping-rates' => ['logistics'],
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
    foreach (['/checkout' => 'buyer', '/inventory' => 'seller', '/logistics/riders' => 'logistics', '/logistics/shipping-rates' => 'logistics', '/admin/platform' => 'admin'] as $url => $allowedRole) {
        if ($role !== $allowedRole) {
            $this->post($url, ['role' => $allowedRole, 'status' => 'approved'])->assertForbidden();
        }
    }
})->with(['buyer', 'seller', 'rider', 'logistics', 'admin']);
