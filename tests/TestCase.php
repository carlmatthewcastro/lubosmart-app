<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Storage;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // HTTP feature tests must not depend on a locally running SSR service.
        config(['inertia.ssr.enabled' => false]);
        Storage::fake('local');

        // HTTP feature tests verify server behavior independently of built assets.
        $this->withoutVite();
    }
}
