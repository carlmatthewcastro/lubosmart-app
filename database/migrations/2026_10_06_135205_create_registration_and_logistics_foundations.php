<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('middle_initial', 10)->nullable();
            $table->string('sex', 40)->nullable();
            $table->date('birthday')->nullable();
            $table->timestamps();
        });

        Schema::create('registration_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->enum('requested_role', ['buyer', 'seller', 'rider']);
            $table->enum('status', ['draft', 'submitted', 'approved', 'rejected'])->default('draft');
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->string('policy_version', 80)->nullable();
            $table->timestamp('policy_accepted_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'submitted_at']);
        });

        Schema::create('registration_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registration_application_id')->constrained()->restrictOnDelete();
            $table->string('kind', 60);
            $table->string('disk', 60)->default('local');
            $table->string('path', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->timestamps();
        });

        Schema::create('rider_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->string('vehicle_type', 60);
            $table->string('plate_number', 30)->nullable();
            $table->boolean('is_available')->default(false);
            $table->timestamps();
        });

        Schema::create('sorting_centers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name', 160);
            $table->text('address');
            $table->string('phone', 30)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('service_areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sorting_center_id')->constrained()->restrictOnDelete();
            $table->string('code', 40)->unique();
            $table->string('name', 160);
            $table->string('province_code', 40);
            $table->string('city_code', 40);
            $table->string('barangay_code', 40)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['province_code', 'city_code', 'barangay_code']);
        });

        Schema::create('sorting_center_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sorting_center_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('granted_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['sorting_center_id', 'user_id']);
        });

        Schema::create('rider_service_area', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rider_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('service_area_id')->constrained()->restrictOnDelete();
            $table->timestamps();
            $table->unique(['rider_id', 'service_area_id']);
        });

        Schema::create('parcel_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained()->restrictOnDelete();
            $table->foreignId('sorting_center_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('type', 60);
            $table->string('reference', 100)->unique();
            $table->text('notes')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['delivery_id', 'occurred_at']);
        });

        Schema::create('cod_collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('rider_id')->constrained('users')->restrictOnDelete();
            $table->string('reference', 100)->unique();
            $table->decimal('amount', 10, 2);
            $table->enum('status', ['collected', 'handed_over', 'reconciled'])->default('collected');
            $table->timestamp('collected_at');
            $table->foreignId('received_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('handed_over_at')->nullable();
            $table->foreignId('reconciled_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reconciled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('seller_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_order_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('cod_collection_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('approved_by')->constrained('users')->restrictOnDelete();
            $table->string('reference', 100)->unique();
            $table->decimal('amount', 10, 2);
            $table->timestamp('settled_at');
            $table->timestamps();
        });

        Schema::create('audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('subject_type', 100);
            $table->unsignedBigInteger('subject_id');
            $table->string('action', 80);
            $table->json('changes')->nullable();
            $table->timestamp('occurred_at');
            $table->index(['subject_type', 'subject_id', 'occurred_at']);
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->foreignId('business_category_id')->nullable()->constrained('categories')->restrictOnDelete();
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->foreignId('sorting_center_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('service_area_id')->nullable()->constrained()->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_area_id');
            $table->dropConstrainedForeignId('sorting_center_id');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->dropConstrainedForeignId('business_category_id');
        });

        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('seller_settlements');
        Schema::dropIfExists('cod_collections');
        Schema::dropIfExists('parcel_events');
        Schema::dropIfExists('rider_service_area');
        Schema::dropIfExists('sorting_center_user');
        Schema::dropIfExists('service_areas');
        Schema::dropIfExists('sorting_centers');
        Schema::dropIfExists('rider_profiles');
        Schema::dropIfExists('registration_documents');
        Schema::dropIfExists('registration_applications');
        Schema::dropIfExists('user_profiles');
    }
};
