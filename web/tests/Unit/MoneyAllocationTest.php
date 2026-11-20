<?php

use App\Services\ParcelFinance;

it('allocates large centavo amounts exactly without intermediate multiplication overflow', function () {
    expect(ParcelFinance::proportion(8_000_000_000_000_000_000, 2, 3))->toBe([5_333_333_333_333_333_333, 1]);
    expect(ParcelFinance::commission(8_000_000_000_000_000_000, 500))->toBe(400_000_000_000_000_000);
    expect(ParcelFinance::proportion(101, 1, 2))->toBe([50, 1]);
    expect(ParcelFinance::proportion(101, 2, 2))->toBe([101, 0]);
    expect(ParcelFinance::proportion(0, 0, 1))->toBe([0, 0]);
});
