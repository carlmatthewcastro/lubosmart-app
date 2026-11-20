<?php

namespace App\Services;

class DeliveryNotes
{
    public static function forAction(string $action): array
    {
        return match ($action) {
            'delivered' => ['Received by buyer.', 'Received by authorized representative.', 'Received by family member.', 'Received by authorized security guard.', 'Received by authorized receptionist.', 'Other / Custom notes'],
            'failed_attempt' => ['Buyer unavailable.', 'Buyer cannot be contacted.', 'Incorrect or incomplete delivery address.', 'Buyer refused to accept the parcel.', 'Buyer unable to pay the COD amount.', 'Delivery location inaccessible.', 'Other / Custom notes'],
            'return_to_center' => ['Returned due to failed delivery.', 'Returned due to buyer refusal.', 'Parcel returned to logistics facility.', 'Damaged parcel returned to logistics.', 'Other / Custom notes'],
            default => [],
        };
    }
}
