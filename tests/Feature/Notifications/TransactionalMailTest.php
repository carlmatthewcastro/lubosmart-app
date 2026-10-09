<?php

use App\Models\User;
use App\Notifications\AccountStatusChanged;
use App\Notifications\ApplicationReviewed;
use App\Notifications\EmailSecurityCode;
use App\Notifications\OrderDeliveryUpdated;
use App\Notifications\SellerComplianceNotice;
use App\Notifications\VerifyAccountEmail;
use App\Providers\AppServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    config([
        'app.name' => 'LubosMart',
        'app.url' => 'https://lubosmart.app',
        'mail.default' => 'array',
        'mail.security_mailer' => 'array',
        'mail.from' => ['address' => 'sender@example.com', 'name' => 'LubosMart'],
        'mail.reply_to' => ['address' => 'support@example.com', 'name' => 'LubosMart Support'],
        'mail.logo_url' => 'https://lubosmart.app/email-logo.png',
    ]);
    app()->getProvider(AppServiceProvider::class)->boot();
    Mail::purge('array');
});

test('transactional emails deliver branded HTML and plain text with consistent headers', function (Closure $notification, string $subject, array $content) {
    $user = User::factory()->make(['name' => 'Maria Santos', 'email' => 'recipient@example.com', 'role' => 'seller']);

    $user->notifyNow($notification());
    $email = Mail::mailer('array')->getSymfonyTransport()->messages()->sole()->getOriginalMessage();

    expect($email->getSubject())->toBe($subject);
    expect($email->getFrom()[0]->getName())->toBe('LubosMart');
    expect($email->getFrom()[0]->getAddress())->toBe('sender@example.com');
    expect($email->getReplyTo()[0]->getAddress())->toBe('support@example.com');
    expect($email->getTo()[0]->getAddress())->toBe('recipient@example.com');
    expect($email->getHtmlBody())->toContain(
        'Hello, Maria!', 'LubosMart logo', 'https://lubosmart.app/email-logo.png',
        'The LubosMart Team', '© '.date('Y').' LubosMart. All rights reserved.',
        'This is an automated message. Please do not reply.',
    )->not->toContain('Laravel Logo', 'laravel.com', 'Regards, Laravel', 'localhost', '${');
    expect($email->getTextBody())->toContain(
        'Hello, Maria!', 'The LubosMart Team', '© '.date('Y').' LubosMart. All rights reserved.',
        'This is an automated message. Please do not reply.', ...$content,
    )->not->toContain('<table', '<img', '<br', 'localhost');
})->with([
    'verification' => [fn () => new VerifyAccountEmail(route('verification.verify', ['token' => str_repeat('a', 64)])), 'Verify your LubosMart email', ['24 hours', 'If you did not create this account, you can ignore this email.']],
    'approved' => [fn () => new ApplicationReviewed('approved', null), 'Your LubosMart application was approved', ['approved', 'https://lubosmart.app/dashboard/seller']],
    'rejected' => [fn () => new ApplicationReviewed('rejected', 'Please upload a clearer ID.'), 'Your LubosMart application was rejected', ['Reason: Please upload a clearer ID.', 'submit it again', 'https://lubosmart.app/application']],
    'suspended' => [fn () => new AccountStatusChanged('suspended', 'Please contact us about your documents.'), 'Your LubosMart account was suspended', ['access is currently restricted', 'support@example.com', 'Reason: Please contact us about your documents.']],
    'deactivated' => [fn () => new AccountStatusChanged('deactivated', 'Requested by the account owner.'), 'Your LubosMart account was deactivated', ['access is currently restricted', 'support@example.com']],
    'reactivated' => [fn () => new AccountStatusChanged('approved', 'Review completed.'), 'Your LubosMart account was reactivated', ['use your account again', 'https://lubosmart.app/dashboard/seller']],
    'password code' => [fn () => new EmailSecurityCode('012345', 'password'), 'Your LubosMart password code', ['Your code: 012345', '10 minutes', 'If you did not request this, ignore this email.']],
    'profile code' => [fn () => new EmailSecurityCode('123456', 'profile'), 'Confirm your LubosMart account change', ['sensitive account change', '10 minutes', 'If you did not request this, ignore this email.']],
    'delivery update' => [fn () => new OrderDeliveryUpdated(12, 34, 'in_transit'), 'LubosMart order #12 delivery update', ['in transit', 'https://lubosmart.app/orders']],
    'listing review' => [fn () => new SellerComplianceNotice('Rice', 'blocked', 'Please update the description.'), 'LubosMart listing review', ['Rice', 'Please update the description.']],
]);

test('approval button and fallback links open the recipients role dashboard', function (string $role) {
    $user = User::factory()->make(['role' => $role]);

    $html = (string) (new ApplicationReviewed('approved', null))->toMail($user)->render();

    expect(substr_count($html, 'href="https://lubosmart.app/dashboard/'.$role.'"'))->toBe(2);
    expect($html)->toContain('background-color: #6d47b3');
})->with(['buyer', 'seller', 'courier', 'sorting_center', 'admin']);

test('rejection button and fallback links open the application page even without a reason', function () {
    $user = User::factory()->make();

    $message = (new ApplicationReviewed('rejected', null))->toMail($user);
    $html = (string) $message->render();

    expect(substr_count($html, 'href="https://lubosmart.app/application"'))->toBe(2);
    expect($html)->toContain('Please review your application details.')->not->toContain('/dashboard');
});

test('restricted accounts receive a reachable support address without a dashboard button', function (string $status) {
    $user = User::factory()->make();

    $html = (string) (new AccountStatusChanged($status, 'Review needed.'))->toMail($user)->render();

    expect($html)->toContain('support@example.com')->not->toContain('/dashboard', '/support', 'button-primary');
})->with(['suspended', 'deactivated']);

test('greetings use the structured first name from the registration profile', function () {
    $user = User::factory()->create(['name' => 'Maria Clara Santos']);
    DB::table('user_profiles')->insert(['user_id' => $user->id, 'first_name' => 'Maria Clara', 'last_name' => 'Santos']);

    $html = (string) (new EmailSecurityCode('123456', 'password'))->toMail($user)->render();

    expect($html)->toContain('Hello, Maria Clara!');
});

test('greetings fall back for legacy accounts and missing names', function (string $name, string $greeting) {
    $user = User::factory()->make(['name' => $name]);

    $html = (string) (new EmailSecurityCode('123456', 'password'))->toMail($user)->render();

    expect($html)->toContain($greeting);
})->with([
    'legacy account' => ['Maria Santos', 'Hello, Maria!'],
    'missing name' => ['', 'Hello!'],
    'whitespace name' => ['  ', 'Hello!'],
]);

test('recipient names and reasons render as text instead of injected HTML or links', function () {
    $user = User::factory()->make();
    $user->first_name = '<script>alert(1)</script> [Support](https://untrusted.example)';
    $notification = new ApplicationReviewed('rejected', '<img src=x onerror=alert(1)> [Click](https://untrusted.example)');

    $html = (string) $notification->toMail($user)->render();

    expect($html)->toContain('&lt;script&gt;', '&lt;img')
        ->not->toContain('<script>', '<img src=x', 'href="https://untrusted.example"');
});

test('mail links follow APP_URL even when an HTTP request arrives on another origin', function () {
    app('url')->setRequest(Request::create('http://internal-host.example'));
    $user = User::factory()->make(['role' => 'buyer']);

    $html = (string) (new ApplicationReviewed('approved', null))->toMail($user)->render();

    expect($html)->toContain('https://lubosmart.app/dashboard/buyer')
        ->not->toContain('internal-host.example', 'http://lubosmart.app');
});
