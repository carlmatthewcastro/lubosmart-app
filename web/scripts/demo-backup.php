<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\Process\Process;

// Private local backup. Never run against a deployed database with this script.
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
set_exception_handler(static function (Throwable $exception): void {
    fwrite(STDERR, 'Demo backup failed: '.($exception::class === RuntimeException::class ? $exception->getMessage() : 'See the private application log.').PHP_EOL);
    exit(1);
});

if (! app()->environment('local') || DB::getDriverName() !== 'mysql'
    || ! in_array(trim((string) DB::connection()->getConfig('host')), ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Backup script is restricted to local MySQL/MariaDB.');
}
$directory = base_path('.tools/demo-backups/'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(3)));
mkdir($directory, 0700, true);
$connection = DB::connection();
$binary = PHP_OS_FAMILY === 'Windows' ? 'C:/xampp/mysql/bin/mysqldump.exe' : 'mysqldump';
$dump = new Process([$binary, '--host='.trim($connection->getConfig('host')), '--port='.$connection->getConfig('port'),
    '--user='.$connection->getConfig('username'), '--single-transaction', '--routines', '--triggers', '--events', '--hex-blob',
    '--result-file='.$directory.'/database.sql', $connection->getDatabaseName()], base_path(), ['MYSQL_PWD' => (string) $connection->getConfig('password')]);
$dump->setTimeout(180);
$dump->mustRun();
if (! is_file($directory.'/database.sql') || filesize($directory.'/database.sql') < 1000) {
    throw new RuntimeException('Database dump is missing or empty.');
}
// storage/app also contains historical build checkouts. Archive runtime uploads only.
$paths = ['public'];
foreach (['registration', 'reverification', 'delivery-proofs', 'return-evidence', 'return-proofs', 'support-evidence', 'support', 'account-evidence', 'avatars', 'demo'] as $name) {
    if (is_dir(storage_path('app/private/'.$name))) {
        $paths[] = 'private/'.$name;
    }
}
$archive = new Process(['tar', '-cf', $directory.'/uploads.tar', '-C', storage_path('app'), ...$paths]);
$archive->setTimeout(180);
$archive->mustRun();
$snapshot = [];
foreach ($connection->select('SHOW TABLES') as $row) {
    $table = array_values((array) $row)[0];
    $columns = Schema::getColumnListing($table);
    if (in_array('id', $columns, true)) {
        $snapshot[$table] = $connection->table($table)->orderBy('id')->get()->mapWithKeys(fn ($record) => [$record->id => hash('sha256', json_encode($record, JSON_THROW_ON_ERROR))])->all();
    }
}
file_put_contents($directory.'/record-fingerprints.json', json_encode($snapshot, JSON_THROW_ON_ERROR));
$manifest = ['database' => $connection->getDatabaseName(), 'host' => trim($connection->getConfig('host')), 'created_at' => gmdate(DATE_ATOM),
    'database_sha256' => hash_file('sha256', $directory.'/database.sql'), 'uploads_sha256' => hash_file('sha256', $directory.'/uploads.tar')];
file_put_contents($directory.'/manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
foreach (glob($directory.'/*') as $file) {
    chmod($file, 0600);
}
echo 'Verified backup written to '.$directory.PHP_EOL;
