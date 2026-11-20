<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->string('category', 20)->default('updates');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['notifiable_type', 'notifiable_id', 'read_at'], 'notifications_unread');
            $table->index(['notifiable_type', 'notifiable_id', 'category', 'created_at', 'id'], 'notifications_history');
            $table->index(['notifiable_type', 'notifiable_id', 'created_at', 'id'], 'notifications_timeline');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
