<?php

namespace App\Services;

use App\Models\Order;

class SellerBuyerPrivacy
{
    public static function minimize(Order $order): void
    {
        $order->makeHidden(['buyer_id', 'address_id', 'shipping_phone', 'shipping_line1', 'shipping_line2',
            'shipping_barangay', 'shipping_region', 'shipping_zip', 'subtotal', 'shipping_total', 'total']);
    }

    public static function waybill(Order $order): void
    {
        $order->makeHidden(['buyer_id', 'address_id', 'subtotal', 'shipping_total', 'total']);
    }
}
