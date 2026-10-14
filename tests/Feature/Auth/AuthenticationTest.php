<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('approved verified admin can log in and reach the admin dashboard', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->post('/login', ['email' => $admin->email, 'password' => 'password'])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($admin);
    $this->get('/dashboard')->assertRedirect(route('dashboard.role', ['role' => 'admin']));
    $this->get('/dashboard/admin')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
        ->component('admin/dashboard')
        ->where('auth.user.role', 'admin'));
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ])->assertSessionHasErrors(['email' => 'Incorrect email or password']);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});
