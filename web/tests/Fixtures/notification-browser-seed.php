<?php

use App\Models\User;
use App\Services\Notifications\NotificationInbox;
use Illuminate\Contracts\Console\Kernel;

// Synthetic notifications in the disposable browser database only.
$stage = realpath(getenv('LUBOSMART_AUTH_BROWSER_STAGE') ?: '');
$temporary = realpath(sys_get_temp_dir());
if (! $stage || ! str_starts_with($stage, $temporary.DIRECTORY_SEPARATOR.'lubosmart-auth-browser-')
    || realpath(getenv('DB_DATABASE') ?: '') !== $stage.DIRECTORY_SEPARATOR.'test.sqlite') {
    throw new RuntimeException('Notification browser fixtures require an isolated temporary database.');
}
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$wave = $argv[1] ?? 'initial';
foreach (User::whereIn('role', ['buyer', 'seller', 'rider', 'logistics', 'admin'])->get() as $user) {
    foreach ($wave === 'initial' ? range(1, 22) : [23] as $index) {
        app(NotificationInbox::class)->send($user->id, 'account.browser', 'browser-'.$index,
            'Synthetic account update '.$index, 'Notification browser acceptance fixture.', 'account', $user->id, $index % 2 === 0);
    }
}
echo 'Synthetic inbox ready';
