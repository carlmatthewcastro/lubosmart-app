<?php

use App\Support\AccountRules;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Refuse ambiguous legacy identities before changing schema or any account value.
        $emails = [];
        $phones = [];
        DB::table('users')->orderBy('id')->chunkById(500, function ($users) use (&$emails, &$phones) {
            foreach ($users as $user) {
                $email = AccountRules::email($user->email);
                $phone = AccountRules::validPhone($user->phone) ? AccountRules::phone($user->phone) : null;
                if (isset($emails[$email]) || ($phone !== null && isset($phones[$phone]))) {
                    throw new RuntimeException('Normalized account identifiers collide. Resolve existing duplicates before retrying; no accounts were changed.');
                }
                $emails[$email] = true;
                if ($phone !== null) {
                    $phones[$phone] = true;
                }
            }
        });
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'email_normalized')) {
                $table->string('email_normalized', 160)->nullable();
            }
            if (! Schema::hasColumn('users', 'phone_normalized')) {
                $table->string('phone_normalized', 11)->nullable();
            }
        });
        foreach (['email_normalized', 'phone_normalized'] as $column) {
            $index = 'users_'.$column.'_unique';
            if (! Schema::hasIndex('users', $index)) {
                Schema::table('users', fn (Blueprint $table) => $table->unique($column, $index));
            }
        }
        DB::table('users')->orderBy('id')->chunkById(500, function ($users) {
            foreach ($users as $user) {
                DB::table('users')->where('id', $user->id)->update([
                    'email_normalized' => AccountRules::email($user->email),
                    'phone_normalized' => AccountRules::validPhone($user->phone) ? AccountRules::phone($user->phone) : null,
                ]);
            }
        });
        if (! Schema::hasTable('registration_email_codes')) {
            Schema::create('registration_email_codes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $table->string('email', 160);
                $table->string('code_hash');
                $table->dateTime('expires_at');
                $table->dateTime('last_sent_at');
                $table->unsignedTinyInteger('attempts')->default(0);
                $table->unsignedTinyInteger('send_count')->default(1);
                $table->dateTime('window_started_at');
                $table->timestamp('consumed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Use a forward migration to preserve identity constraints and verification state.');
    }
};
