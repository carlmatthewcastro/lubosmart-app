<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

test('buyer signup requires a readable supported identity document', function ($file) {
    Notification::fake();
    $this->post('/register', sharedRegistrationData(['identity' => $file]))
        ->assertSessionHasErrors('identity');
    $this->assertDatabaseMissing('users', ['email' => 'shared@example.com']);
    $this->assertDatabaseCount('registration_documents', 0);
})->with([
    'missing' => fn () => null,
    'unsupported' => fn () => UploadedFile::fake()->create('id.txt', 10, 'text/plain'),
    'too large' => fn () => UploadedFile::fake()->create('id.pdf', 5121, 'application/pdf'),
]);

test('buyer signup stores its identity privately with the application', function () {
    Notification::fake();
    $this->post('/register', sharedRegistrationData())->assertSessionHasNoErrors()
        ->assertRedirect(route('verification.notice', absolute: false));
    $user = User::where('email', 'shared@example.com')->firstOrFail();
    $document = $user->application->documents()->sole();
    expect($document->kind)->toBe('identity')->and($document->disk)->toBe('local');
    Storage::disk('local')->assertExists($document->path);
    Storage::disk('public')->assertMissing($document->path);
});
