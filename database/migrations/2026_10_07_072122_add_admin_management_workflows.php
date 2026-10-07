<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('status', ['active', 'pending', 'suspended', 'deactivated'])->default('active')->change();
        });
        Schema::table('products', function (Blueprint $table) {
            $table->timestamp('blocked_at')->nullable();
        });
        Schema::create('product_moderations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('action', 30);
            $table->text('reason');
            $table->timestamps();
        });
        Schema::create('support_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opened_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('seller_order_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('kind', 20);
            $table->string('subject', 160);
            $table->string('status', 20)->default('open');
            $table->text('resolution')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('last_admin_seen_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'updated_at']);
        });
        Schema::create('support_case_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->unique(['support_case_id', 'user_id']);
        });
        Schema::create('support_case_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->text('body');
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name', 180)->nullable();
            $table->timestamps();
        });
        Schema::create('platform_contents', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 20);
            $table->string('title', 160);
            $table->text('body');
            $table->boolean('published')->default(false);
            $table->foreignId('updated_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('users')->where('status', 'deactivated')->exists()) {
            throw new RuntimeException('Reactivate deactivated accounts before rolling back.');
        }
        Schema::dropIfExists('platform_contents');
        Schema::dropIfExists('support_case_messages');
        Schema::dropIfExists('support_case_participants');
        Schema::dropIfExists('support_cases');
        Schema::dropIfExists('product_moderations');
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('blocked_at'));
        Schema::table('users', fn (Blueprint $table) => $table->enum('status', ['active', 'pending', 'suspended'])->default('active')->change());
    }
};
