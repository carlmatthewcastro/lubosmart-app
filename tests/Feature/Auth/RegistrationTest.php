<?php

use App\Models\User;

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'role' => 'buyer',
    ]);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('sellers can register with a pending store', function () {
    $response = $this->post('/register', [
        'name' => 'Seller User',
        'email' => 'seller@example.com',
        'role' => 'seller',
        'store_name' => 'Seller Store',
        'store_description' => 'A store description.',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);
    $this->assertAuthenticated();
    $user = User::query()->where('email', 'seller@example.com')->firstOrFail();
    $this->assertDatabaseHas('users', [
        'email' => 'seller@example.com',
        'role' => 'seller',
    ]);
    $this->assertDatabaseHas('stores', [
        'user_id' => $user->id,
        'name' => 'Seller Store',
        'description' => 'A store description.',
        'status' => 'pending',
    ]);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('riders can self-register', function () {
    $this->post('/register', [
        'name' => 'Rider User',
        'email' => 'rider@example.com',
        'role' => 'rider',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('dashboard', absolute: false));

    $this->assertDatabaseHas('users', [
        'email' => 'rider@example.com',
        'role' => 'rider',
    ]);
});

test('seller registration requires store details', function () {
    $response = $this->from('/register')->post('/register', [
        'name' => 'Seller User',
        'email' => 'seller@example.com',
        'role' => 'seller',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertRedirect('/register');
    $response->assertSessionHasErrors(['store_name', 'store_description']);
    $this->assertDatabaseMissing('users', ['email' => 'seller@example.com']);
    $this->assertDatabaseCount('stores', 0);
});

test('restricted roles cannot self-register', function (string $role) {
    $response = $this->from('/register')->post('/register', [
        'name' => 'Admin User',
        'email' => $role.'@example.com',
        'role' => $role,
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertRedirect('/register');
    $response->assertSessionHasErrors('role');
    $this->assertDatabaseMissing('users', ['email' => $role.'@example.com']);
})->with(['admin', 'logistics']);
