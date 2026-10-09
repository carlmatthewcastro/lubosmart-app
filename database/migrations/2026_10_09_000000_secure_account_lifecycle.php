<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['buyer', 'seller', 'rider', 'logistics', 'admin'])->nullable()->change();
            $table->string('password')->nullable()->change();
            $table->enum('status', ['active', 'deactivated', 'incomplete', 'pending', 'approved', 'rejected', 'suspended'])->default('incomplete')->change();
        });
        DB::table('users')->where('status', 'active')->update(['status' => 'approved']);
        DB::table('users')->where('status', 'deactivated')->update(['status' => 'suspended']);
        DB::table('users')->where('status', 'pending')->whereIn('id', DB::table('registration_applications')->where('status', 'draft')->select('user_id'))->update(['status' => 'incomplete']);
        DB::table('users')->where('status', 'pending')->whereIn('id', DB::table('registration_applications')->where('status', 'rejected')->select('user_id'))->update(['status' => 'rejected']);
        // Buyers previously bypassed registration. Require review unless already reviewed.
        DB::table('users')->where('role', 'buyer')->where('status', 'approved')->whereNotIn('id', DB::table('registration_applications')->where('status', 'approved')->select('user_id'))->update(['status' => 'incomplete']);
        Schema::table('users', function (Blueprint $table) {
            $table->enum('status', ['incomplete', 'pending', 'approved', 'rejected', 'suspended'])->default('incomplete')->change();
        });
        Schema::table('stores', function (Blueprint $table) {
            $table->text('bank_account')->nullable();
        });
        Schema::create('email_security_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 20);
            $table->string('email', 160);
            $table->string('code_hash')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->string('token_hash', 64)->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->unique(['user_id', 'purpose']);
        });
        Schema::create('email_code_requests', function (Blueprint $table) {
            $table->id();
            $table->string('email_hash', 64)->index();
            $table->timestamp('requested_at')->index();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Account security changes require a forward migration to preserve approval and password state.');
    }
};
