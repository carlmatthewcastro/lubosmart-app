<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

// One-time local cleanup; reviewed IDs from legacy test-account/demo generators.
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (! app()->environment('local') || ! in_array(DB::connection()->getConfig('host'), ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Local database only.');
}
$roots = ['users' => [24, 25, 26, 30, 36, 37, 38, 40, 41, 42, 43, 44, 45], 'stores' => [11, 12, 13], 'products' => [12, 13, 14, 15, 16], 'orders' => range(4, 13)];
$edges = DB::select('SELECT TABLE_NAME child, COLUMN_NAME col, REFERENCED_TABLE_NAME parent, REFERENCED_COLUMN_NAME ref FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL');
$tables = array_map(fn ($row) => array_values((array) $row)[0], DB::select('SHOW TABLES'));
$data = [];
foreach ($tables as $table) {
    $data[$table] = DB::table($table)->get()->map(fn ($r) => (array) $r)->all();
}
$selected = [];
foreach ($roots as $table => $ids) {
    foreach ($data[$table] as $i => $row) {
        if (in_array($row['id'], $ids)) {
            $selected[$table][$i] = true;
        }
    }
}
do {
    $changed = false;
    foreach ($edges as $edge) {
        $values = [];
        foreach (array_keys($selected[$edge->parent] ?? []) as $i) {
            $values[] = $data[$edge->parent][$i][$edge->ref];
        }
        foreach ($data[$edge->child] as $i => $row) {
            if ($row[$edge->col] !== null && in_array($row[$edge->col], $values) && ! isset($selected[$edge->child][$i])) {
                $selected[$edge->child][$i] = true;
                $changed = true;
            }
        }
    }
} while ($changed);
foreach ($roots as $table => $ids) {
    foreach (array_keys($selected[$table] ?? []) as $i) {
        if (! in_array($data[$table][$i]['id'], $ids)) {
            throw new RuntimeException('Would affect preserved '.$table.' #'.$data[$table][$i]['id']);
        }
    }
}
foreach ($data['demo_fixtures'] as $fixture) {
    if (! class_exists($fixture['record_type'])) {
        continue;
    }
    $table = (new $fixture['record_type'])->getTable();
    foreach (array_keys($selected[$table] ?? []) as $i) {
        if ($data[$table][$i]['id'] == $fixture['record_id']) {
            throw new RuntimeException('Would affect new fixture '.$fixture['fixture_key']);
        }
    }
}
$summary = array_map('count', $selected);
echo json_encode($summary, JSON_PRETTY_PRINT), PHP_EOL;
if (! in_array('--apply', $argv, true)) {
    exit;
}
// Leaves first with constraints enabled. Cycles or unknown relationships abort the transaction.
DB::transaction(function () use ($selected, $data, $edges) {
    $pending = $selected;
    while ($pending) {
        $progress = false;
        foreach ($pending as $table => $indices) {
            foreach (array_keys($indices) as $i) {
                $row = $data[$table][$i];
                $blocked = false;
                foreach ($edges as $edge) {
                    if ($edge->parent !== $table) {
                        continue;
                    }
                    foreach (array_keys($pending[$edge->child] ?? []) as $j) {
                        if ($data[$edge->child][$j][$edge->col] !== null && $data[$edge->child][$j][$edge->col] == $row[$edge->ref]) {
                            $blocked = true;
                        }
                    }
                }
                if ($blocked) {
                    continue;
                }
                $query = DB::table($table);
                if (isset($row['id'])) {
                    $query->where('id', $row['id']);
                } else {
                    foreach ($row as $key => $value) {
                        $query->where($key, $value);
                    }
                }
                $query->delete();
                unset($pending[$table][$i]);
                if (! $pending[$table]) {
                    unset($pending[$table]);
                }
                $progress = true;
            }
        }
        if (! $progress) {
            throw new RuntimeException('Cyclic references; cleanup rolled back.');
        }
    }
    // Verify every retained row, including all realistic records and new fixtures.
    foreach ($data as $table => $rows) {
        $expected = array_values(array_filter($rows, fn ($row, $i) => ! isset($selected[$table][$i]), ARRAY_FILTER_USE_BOTH));
        $actual = DB::table($table)->get()->map(fn ($r) => (array) $r)->all();
        $normalize = function ($rows) {
            $encoded = array_map(fn ($r) => json_encode($r), $rows);
            sort($encoded);

            return $encoded;
        };
        if ($normalize($expected) !== $normalize($actual)) {
            throw new RuntimeException('Retained rows changed in '.$table.'; rolled back.');
        }
    }
});
echo 'Cleanup committed; all retained rows verified unchanged.', PHP_EOL;
