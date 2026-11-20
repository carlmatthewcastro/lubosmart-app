# Order journey

1. A buyer selects products/options, address and a shipping quote. Checkout revalidates stock, prices and any store voucher. Coin use is opt-in against merchandise after discounts; shipping remains cash.
2. One purchase creates a separate seller parcel and tracking reference for each store. Checkout snapshots commercial details and protects repeat submissions with a buyer-scoped request key.
3. Each seller prepares its parcel and prints the waybill. Ready for Pickup and a printed label do not establish physical custody.
4. Logistics assigns eligible pickup/delivery riders. The three forward scan checkpoints are pickup, facility receipt and delivery-rider handover. Sorting and assignment do not add scans.
5. The assigned delivery rider starts delivery and completes it with private photo proof, recipient name, contextual notes and confirmation of the server-derived COD when due. Failure is a separate reasoned action. Each parcel progresses independently; one completed parcel does not complete the others.
6. Rider submits the collected cash handover; Logistics confirms actual receipt. Logistics retains shipping and submits merchandise remittance. Admin separately verifies reconciliation and actual platform receipt before eligible Seller settlement.

Use [scanning/POD](PARCEL_SCANNING.md) for custody and completion details and [finance/returns](FINANCE_AND_RETURNS.md) for coin allocations, settlement gates, financial responsibility and reverse-return tasks. Cancellation is limited to the supported pre-preparation stage and restores stock/coin debits once; a completed return does not automatically restore voucher usage.

Stock, custody, money and API retries require server confirmation. Preserve mutation keys across uncertain retries. There is no verified offline custody synchronization feature.

Sources: [checkout action](../../web/app/Actions/Checkout/CreateOrderFromCart.php), [delivery handler](../../web/app/Http/Controllers/DeliveryController.php), and the [finance contract](FINANCE_AND_RETURNS.md).

[Workflow index](README.md)
