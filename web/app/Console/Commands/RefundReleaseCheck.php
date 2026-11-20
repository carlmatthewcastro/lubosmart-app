<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class RefundReleaseCheck extends Command
{
    protected $signature = 'returns:release-check {--production : Check production environment and upload limits}';

    protected $description = 'Read-only refund release preflight; never migrates, credits wallets, or prints secrets';

    public function handle(): int
    {
        $failures = 0;
        $check = function (bool $ok, string $label) use (&$failures): void {
            $this->line(($ok ? 'PASS ' : 'FAIL ').$label);
            $failures += $ok ? 0 : 1;
        };
        try {
            DB::select('SELECT 1');
            $check(true, 'Database connection');
            $recorded = Schema::hasTable('migrations') ? DB::table('migrations')->pluck('migration')->all() : [];
            $pending = collect(glob(database_path('migrations/*.php')))->map(fn ($file) => basename($file, '.php'))->diff($recorded);
            $check($pending->isEmpty(), 'All release migrations applied ('.$pending->count().' pending)');
            foreach (['parcel_returns' => ['refund_status', 'return_shipping_responsibility'], 'return_items' => ['approved_quantity'], 'return_tasks' => ['confirmed_by'], 'return_task_proofs' => ['path'], 'wallet_transactions' => ['operation_key'], 'refund_fund_entries' => ['responsibility'], 'rider_payments' => ['return_task_id', 'operation_key']] as $table => $columns) {
                $check(Schema::hasTable($table) && Schema::hasColumns($table, $columns), $table.' schema');
            }
            foreach (['wallet_transactions' => ['operation_key'], 'return_tasks' => ['parcel_return_id'], 'return_task_proofs' => ['return_task_id', 'leg']] as $table => $columns) {
                $check(Schema::hasTable($table) && Schema::hasIndex($table, $columns, 'unique'), $table.' idempotency constraint');
            }
            if (Schema::hasColumn('parcel_returns', 'refund_status')) {
                $count = DB::table('parcel_returns')->where('refund_status', 'approved_uncredited')->count();
                if ($count) {
                    $this->warn($count.' historical approved cases require admin review/reconciliation; no credit was issued by this check.');
                }
            }
            if (Schema::hasTable('return_task_proofs')) {
                $missing = 0;
                foreach (DB::table('return_task_proofs')->orderBy('id')->lazyById(100) as $proof) {
                    $missing += Storage::disk('local')->exists($proof->path) ? 0 : 1;
                }
                $check($missing === 0, 'Recorded private return proofs exist ('.$missing.' missing)');
            }
        } catch (\Throwable $exception) {
            report($exception);
            $check(false, 'Database/schema preflight could not complete; inspect protected application logs');
        }
        $check(is_writable(storage_path('app/private')), 'Private upload directory writable');
        if ($this->option('production')) {
            $check(app()->isProduction(), 'APP_ENV production');
            $check(! config('app.debug'), 'Debug disabled');
            $check((bool) config('app.key'), 'Application key configured (value hidden)');
            $check(str_starts_with((string) config('app.url'), 'https://'), 'HTTPS application URL');
            $check((bool) config('session.secure'), 'Secure session cookies');
            $check(DB::connection()->getDriverName() === 'mysql', 'MySQL production driver');
            $check(ini_parse_quantity(ini_get('upload_max_filesize')) >= 5 * 1024 * 1024, 'Per-file upload capacity at least 5 MB');
            $postLimit = ini_parse_quantity(ini_get('post_max_size'));
            $check($postLimit === 0 || $postLimit >= 26 * 1024 * 1024, 'Multipart capacity fits five 5 MB photos plus overhead');
        }
        $this->line($failures ? 'Refund release preflight failed.' : 'Refund technical preflight passed. Host, backups, workers and business-review cases require separate verification.');

        return $failures ? self::FAILURE : self::SUCCESS;
    }
}
