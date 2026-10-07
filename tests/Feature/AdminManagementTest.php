<?php

use App\Models\Address;
use App\Models\Category;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\SupportCase;
use App\Models\User;
use App\Notifications\SellerComplianceNotice;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Notification::fake();
    Storage::fake('local');
    Storage::fake('public');
    $this->admin = User::factory()->create(['role' => 'admin']);
    $this->seller = User::factory()->create(['role' => 'seller']);
    $this->buyer = User::factory()->create();
    $this->category = Category::query()->create(['name' => 'Bags', 'is_active' => true]);
    $this->store = Store::query()->create(['user_id' => $this->seller->id, 'name' => 'Test store', 'status' => 'approved', 'business_category_id' => $this->category->id]);
    $this->product = Product::query()->create(['store_id' => $this->store->id, 'category_id' => $this->category->id, 'name' => 'Test bag', 'price' => 100, 'stock' => 10, 'status' => 'active']);
    $this->address = Address::query()->create(['user_id' => $this->buyer->id, 'label' => 'Home', 'recipient_name' => 'Test buyer', 'phone' => '09000000000', 'line1' => 'Test street', 'barangay' => 'Test barangay', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);
});

function adminTestParcel($test): SellerOrder
{
    $test->actingAs($test->buyer)->put('/cart/'.$test->product->id, ['quantity' => 2]);
    $test->post('/checkout', ['address_id' => $test->address->id, 'checkout_key' => (string) Str::uuid()])->assertRedirect('/orders');

    return SellerOrder::query()->latest('id')->firstOrFail();
}

test('all admin management pages reject non admin roles', function (string $role) {
    $this->actingAs(User::factory()->create(['role' => $role]));
    foreach (['/admin/compliance', '/admin/platform', '/admin/commission', '/reports/export?type=sales'] as $url) {
        $this->get($url)->assertForbidden();
    }
    $this->patch('/admin/compliance/'.$this->product->id, ['action' => 'hide', 'reason' => 'Violation'])->assertForbidden();
    $this->post('/admin/platform', ['kind' => 'policy', 'title' => 'Policy', 'body' => 'Rules', 'published' => true])->assertForbidden();
    $this->assertDatabaseCount('product_moderations', 0);
    $this->assertDatabaseCount('platform_contents', 0);
})->with(['buyer', 'seller', 'rider', 'logistics']);

test('admin warns blocks and restores listings with audit and seller notification', function () {
    $this->actingAs($this->admin)->patch('/admin/compliance/'.$this->product->id, ['action' => 'warn', 'reason' => 'Correct the product photo.'])->assertRedirect();
    Notification::assertSentTo($this->seller, SellerComplianceNotice::class);
    $this->patch('/admin/compliance/'.$this->product->id, ['action' => 'hide', 'reason' => 'Listing requires review.'])->assertRedirect();
    expect($this->product->fresh()->status)->toBe('hidden')->and($this->product->fresh()->blocked_at)->not->toBeNull();
    $this->get('/shop')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    $this->actingAs($this->seller)->put('/inventory/'.$this->product->id, ['name' => 'Test bag', 'category_id' => $this->category->id, 'price' => 100, 'stock' => 10, 'status' => 'active'])->assertSessionHasErrors('status');
    $this->actingAs($this->admin)->patch('/admin/compliance/'.$this->product->id, ['action' => 'restore', 'reason' => 'Listing corrected.'])->assertRedirect();
    expect($this->product->fresh()->status)->toBe('active')->and($this->product->fresh()->blocked_at)->toBeNull();
    $this->assertDatabaseCount('product_moderations', 3);
});

test('compliance review requires a reason and cannot restore category violations', function () {
    $other = Category::query()->create(['name' => 'Food', 'is_active' => true]);
    $this->product->update(['category_id' => $other->id]);
    $this->actingAs($this->admin)->get('/admin/compliance?status=mismatch')->assertInertia(fn (Assert $page) => $page->has('products.data', 1));
    $this->patch('/admin/compliance/'.$this->product->id, ['action' => 'hide'])->assertSessionHasErrors('reason');
    $this->patch('/admin/compliance/'.$this->product->id, ['action' => 'restore', 'reason' => 'Try restore'])->assertUnprocessable();
    $this->assertDatabaseCount('product_moderations', 0);
});

test('suspending a seller removes all their listings from the public catalog and blocks checkout', function () {
    $other = Product::query()->create(['store_id' => $this->store->id, 'category_id' => $this->category->id, 'name' => 'Another bag', 'price' => 100, 'stock' => 10, 'status' => 'active']);
    $this->actingAs($this->buyer)->put('/cart/'.$other->id, ['quantity' => 1]);
    $this->actingAs($this->admin)->patch('/admin/compliance/'.$this->product->id, ['action' => 'suspend', 'reason' => 'Prohibited listing.'])->assertRedirect();
    expect($this->seller->fresh()->status)->toBe('suspended');
    $this->get('/shop')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    $this->actingAs($this->buyer)->post('/checkout', ['address_id' => $this->address->id, 'checkout_key' => (string) Str::uuid()])->assertSessionHasErrors('cart');
    $this->assertDatabaseCount('orders', 0);
});

test('admin deactivates accounts while retaining data and immediately blocking sessions and password login', function () {
    $this->actingAs($this->admin)->patch('/accounts/'.$this->buyer->id, ['status' => 'deactivated', 'reason' => 'Account closure request.'])->assertRedirect();
    $this->assertDatabaseHas('users', ['id' => $this->buyer->id, 'status' => 'deactivated']);
    $this->actingAs($this->buyer->fresh())->get('/settings/profile')->assertForbidden();
    $this->post('/logout')->assertRedirect();
    $this->post('/login', ['email' => $this->buyer->email, 'password' => 'password'])->assertSessionHasErrors('email');
    $this->assertGuest();
    $this->actingAs($this->admin)->patch('/accounts/'.$this->buyer->id, ['status' => 'active', 'reason' => 'Account reopened.'])->assertRedirect();
    expect($this->buyer->fresh()->status)->toBe('active');
});

test('admin cannot deactivate self or bypass pending approval', function () {
    $this->actingAs($this->admin)->patch('/accounts/'.$this->admin->id, ['status' => 'deactivated', 'reason' => 'Test'])->assertForbidden();
    $pending = User::factory()->create(['role' => 'seller', 'status' => 'pending']);
    $this->patch('/accounts/'.$pending->id, ['status' => 'active', 'reason' => 'Bypass'])->assertSessionHasErrors('status');
    expect($pending->fresh()->status)->toBe('pending');
});

test('account filters and profile details are accessible only to authorized managers', function () {
    $this->actingAs($this->admin)->get('/accounts?role=seller&search='.$this->seller->email)->assertInertia(fn (Assert $page) => $page->has('accounts.data', 1)->where('accounts.data.0.id', $this->seller->id));
    $this->get('/accounts/'.$this->seller->id)->assertInertia(fn (Assert $page) => $page->component('admin/account')->where('account.email', $this->seller->email)->missing('account.password'));
    $this->actingAs($this->buyer)->get('/accounts/'.$this->seller->id)->assertForbidden();
});

test('complaint evidence and conversation are scoped to the involved parties and admin', function () {
    $parcel = adminTestParcel($this);
    $this->post('/support', ['kind' => 'complaint', 'subject' => 'Order concern', 'body' => 'Please review my parcel.', 'seller_order_id' => $parcel->id, 'attachment' => UploadedFile::fake()->create('evidence.pdf', 1, 'application/pdf')])->assertRedirect();
    $case = SupportCase::query()->firstOrFail();
    $message = $case->messages()->firstOrFail();
    Storage::disk('local')->assertExists($message->attachment_path);
    $this->actingAs(User::factory()->create())->get('/support/'.$case->id)->assertForbidden();
    $this->get('/support/'.$case->id.'/evidence/'.$message->id)->assertForbidden();
    $this->post('/support/'.$case->id.'/messages', ['body' => 'Unauthorized reply'])->assertForbidden();
    $this->actingAs($this->seller)->get('/support/'.$case->id)->assertOk();
    $this->get('/support/'.$case->id.'/evidence/'.$message->id)->assertDownload('evidence.pdf');
    $this->actingAs($this->admin)->post('/support/'.$case->id.'/messages', ['body' => 'We are reviewing your concern.'])->assertRedirect();
    $this->assertDatabaseCount('support_case_messages', 2);
});

test('users cannot open cases for unrelated parcels or add arbitrary recipients', function () {
    $parcel = adminTestParcel($this);
    $this->actingAs(User::factory()->create())->post('/support', ['kind' => 'complaint', 'subject' => 'Test', 'body' => 'Test', 'seller_order_id' => $parcel->id])->assertForbidden();
    $this->post('/support', ['kind' => 'message', 'subject' => 'Test', 'body' => 'Test', 'recipient_email' => $this->seller->email])->assertForbidden();
    $this->assertDatabaseCount('support_cases', 0);
});

test('case resolution requires notes and only admin can resolve or reopen', function () {
    $this->actingAs($this->buyer)->post('/support', ['kind' => 'complaint', 'subject' => 'Help', 'body' => 'Need assistance.'])->assertRedirect();
    $case = SupportCase::query()->firstOrFail();
    $this->patch('/support/'.$case->id, ['status' => 'resolved', 'resolution' => 'Fake decision'])->assertForbidden();
    $this->actingAs($this->admin)->patch('/support/'.$case->id, ['status' => 'resolved'])->assertSessionHasErrors('resolution');
    $this->patch('/support/'.$case->id, ['status' => 'resolved', 'resolution' => 'Issue resolved with the buyer.'])->assertRedirect();
    $this->actingAs($this->buyer)->post('/support/'.$case->id.'/messages', ['body' => 'Another reply', 'attachment' => UploadedFile::fake()->create('evidence.pdf', 1, 'application/pdf')])->assertConflict();
    expect(Storage::disk('local')->allFiles('support-evidence'))->toBeEmpty();
    $this->actingAs($this->admin)->patch('/support/'.$case->id, ['status' => 'open', 'resolution' => null])->assertRedirect();
    $this->actingAs($this->buyer)->post('/support/'.$case->id.'/messages', ['body' => 'Thanks for reopening.'])->assertRedirect();
});

test('admin messages reach the selected recipient and attention counts clear after viewing', function () {
    $this->actingAs($this->admin)->post('/support', ['kind' => 'message', 'subject' => 'Account assistance', 'body' => 'How can we help?', 'recipient_email' => $this->buyer->email])->assertRedirect();
    $case = SupportCase::query()->firstOrFail();
    $this->actingAs($this->buyer)->post('/support/'.$case->id.'/messages', ['body' => 'Please check my profile.'])->assertRedirect();
    $this->actingAs($this->admin)->get('/dashboard/admin')->assertInertia(fn (Assert $page) => $page->where('adminOverview.unreadConversations', 1));
    $this->get('/support/'.$case->id)->assertOk();
    $this->get('/dashboard/admin')->assertInertia(fn (Assert $page) => $page->where('adminOverview.unreadConversations', 0));
    $this->actingAs($this->buyer)->post('/support/'.$case->id.'/messages', ['body' => 'One more question.'])->assertRedirect();
    $this->actingAs($this->admin)->get('/dashboard/admin')->assertInertia(fn (Assert $page) => $page->where('adminOverview.unreadConversations', 1));
});

test('platform drafts stay private while published policies can be edited and unpublished', function () {
    $this->actingAs($this->admin)->post('/admin/platform', ['kind' => 'policy', 'title' => 'Marketplace policy', 'body' => 'Our platform guidelines.', 'published' => false])->assertRedirect();
    $id = DB::table('platform_contents')->value('id');
    $this->get('/platform-information')->assertInertia(fn (Assert $page) => $page->has('contents.data', 0));
    $this->put('/admin/platform/'.$id, ['kind' => 'policy', 'title' => 'Marketplace policy', 'body' => 'Updated guidelines.', 'published' => true])->assertRedirect();
    $this->get('/platform-information')->assertInertia(fn (Assert $page) => $page->has('contents.data', 1)->where('contents.data.0.body', 'Updated guidelines.'));
    $this->put('/admin/platform/'.$id, ['kind' => 'policy', 'title' => 'Marketplace policy', 'body' => 'Updated guidelines.', 'published' => false])->assertRedirect();
    $this->get('/platform-information')->assertInertia(fn (Assert $page) => $page->has('contents.data', 0));
    $this->assertDatabaseCount('audit_events', 3);
});

test('sales and commission exports respect delivery dates and preserve commission snapshots', function () {
    $parcel = adminTestParcel($this);
    $parcel->update(['status' => 'completed']);
    $parcel->delivery->forceFill(['status' => 'delivered', 'delivered_at' => '2026-10-07 10:00:00'])->save();
    $this->actingAs($this->admin)->patch('/reports/settings', ['shipping_fee_per_seller_order' => 50, 'platform_commission_basis_points' => 2000])->assertRedirect();
    expect($parcel->fresh()->commission_amount)->toBe('20.00');
    $this->get('/reports/export?type=commission&from=2026-10-07&to=2026-10-07')->assertDownload('commission-report-'.now()->format('Y-m-d').'.csv')->assertStreamedContent("Parcel,Store,\"Product sales (PHP)\",\"Commission (PHP)\",\"Seller proceeds (PHP)\"\n".$parcel->id.",\"Test store\",200.00,20.00,180.00\n");
    $this->get('/reports?from=2026-10-08')->assertInertia(fn (Assert $page) => $page->where('totals.Completed parcels', 0));
    $this->get('/reports?to=2026-10-07')->assertInertia(fn (Assert $page) => $page->where('totals.Completed parcels', 1));
    $this->get('/reports?from=2026-10-09&to=2026-10-07')->assertSessionHasErrors('to');
});

test('support records prevent accidental account deletion', function () {
    $this->actingAs($this->buyer)->post('/support', ['kind' => 'message', 'subject' => 'Help', 'body' => 'Need help.']);
    $this->delete('/settings/profile', ['password' => 'password'])->assertSessionHasErrors('password');
    $this->assertModelExists($this->buyer);
});

test('only published announcements appear on the homepage', function () {
    $this->actingAs($this->admin);
    foreach ([['announcement', true, 'Public update'], ['announcement', false, 'Private draft'], ['policy', true, 'Platform policy']] as [$kind, $published, $title]) {
        $this->post('/admin/platform', ['kind' => $kind, 'title' => $title, 'body' => 'Test content.', 'published' => $published])->assertRedirect();
    }
    $this->get('/')->assertInertia(fn (Assert $page) => $page->has('announcements', 1)->where('announcements.0.title', 'Public update'));
});
