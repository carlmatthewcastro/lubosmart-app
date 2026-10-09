<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->string('admin_sub_role', 32)->nullable());
        DB::table('users')->where('role', 'admin')->update(['admin_sub_role' => 'super_admin']);
        Schema::table('audit_events', function (Blueprint $table) {
            $table->string('module', 32)->nullable()->index();
            $table->string('actor_sub_role', 32)->nullable();
            $table->uuid('request_id')->nullable()->index();
        });
        foreach (['registration_application' => 'registrations', 'user' => 'accounts', 'product' => 'compliance', 'support_case' => 'disputes', 'commerce_settings' => 'finance', 'platform_content' => 'system'] as $subject => $module) {
            DB::table('audit_events')->where('subject_type', $subject)->update(['module' => $module]);
        }
        Schema::create('support_case_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('last_read_message_id')->nullable();
            $table->timestamp('read_at');
            $table->unique(['support_case_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_case_reads');
        Schema::table('audit_events', function (Blueprint $table) {
            $table->dropIndex(['module']);
            $table->dropIndex(['request_id']);
            $table->dropColumn(['module', 'actor_sub_role', 'request_id']);
        });
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('admin_sub_role'));
    }
};
