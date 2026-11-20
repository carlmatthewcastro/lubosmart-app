<?php

use Illuminate\Contracts\Console\Kernel;

$stage = realpath(getenv('LUBOSMART_AUTH_BROWSER_STAGE') ?: '');
$temporary = realpath(sys_get_temp_dir());
if (! $stage || ! str_starts_with($stage, $temporary.DIRECTORY_SEPARATOR.'lubosmart-auth-browser-')
    || realpath(getenv('DB_DATABASE') ?: '') !== $stage.DIRECTORY_SEPARATOR.'test.sqlite') {
    throw new RuntimeException('Refund browser fixtures require an isolated temporary database.');
}
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
require dirname(__DIR__).'/Support/RefundScenario.php';
$fixture = refundScenario();
foreach (['buyer', 'seller', 'admin', 'logistics', 'rider'] as $role) {
    $fixture[$role]->forceFill(['name' => 'Browser '.$role, 'email' => $role.'@dashboard.example.com', 'password' => 'Browser@2026'])->save();
}
echo json_encode(['rider' => $fixture['rider']->id, 'parcel' => $fixture['parcel']->id], JSON_THROW_ON_ERROR);
