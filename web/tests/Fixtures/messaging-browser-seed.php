<?php

use App\Models\SupportCase;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

// Synthetic conversations in the disposable browser database only.
$stage = realpath(getenv('LUBOSMART_AUTH_BROWSER_STAGE') ?: '');
$temporary = realpath(sys_get_temp_dir());
if (! $stage || ! str_starts_with($stage, $temporary.DIRECTORY_SEPARATOR.'lubosmart-auth-browser-')
    || realpath(getenv('DB_DATABASE') ?: '') !== $stage.DIRECTORY_SEPARATOR.'test.sqlite') {
    throw new RuntimeException('Messaging browser fixtures require an isolated temporary database.');
}
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$admin = User::where('role', 'admin')->firstOrFail();
$buyer = User::where('role', 'buyer')->firstOrFail();
foreach (User::whereIn('role', ['buyer', 'seller', 'rider', 'logistics', 'admin'])->get() as $user) {
    $author = $user->id === $admin->id ? $buyer : $admin;
    $case = SupportCase::create(['opened_by' => $author->id, 'kind' => 'message', 'subject' => 'Synthetic Account Assistance']);
    $case->participants()->attach([$user->id, $author->id]);
    $case->messages()->create(['user_id' => $author->id, 'body' => 'Synthetic message for browser verification.']);
}
echo 'Synthetic conversations ready';
