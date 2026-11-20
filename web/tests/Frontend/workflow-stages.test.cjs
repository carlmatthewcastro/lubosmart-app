const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const exportsValue = {};
vm.runInNewContext(
    ts.transpileModule(fs.readFileSync('resources/views/components/shared/workflow-stages.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports: exportsValue, require: (name) => (name === 'lucide-react' ? new Proxy({}, { get: (_, key) => key }) : require(name)), Date },
);
const { parcelStages, returnStages, codStages } = exportsValue;
const order = (status, delivery = null) => ({ status, delivery, order: { status, created_at: '2026-11-01T08:00:00Z' } });
const stage = (stages, id) => stages.find((s) => s.id === id);

test('assignment and seller completion never establish physical delivery', () => {
    for (const value of [order('shipped', { status: 'assigned' }), order('completed', { status: 'in_transit' }), order('completed')]) {
        assert.equal(stage(parcelStages(value), 'delivered').state, 'pending');
    }
    assert.equal(stage(parcelStages(order('shipped', { status: 'assigned' })), 'ready').state, 'current');
});

test('recorded delivery completes transport without adding a settlement stage or invented date', () => {
    const stages = parcelStages(order('completed', { status: 'delivered' }));
    assert.equal(stage(stages, 'delivered').state, 'completed');
    assert.equal(stage(stages, 'delivered').timestamp, undefined);
    assert.equal(
        stages.some((s) => s.id === 'settlement'),
        false,
    );
});

test('missing handovers remain unconfirmed even when a later handover exists', () => {
    const stages = parcelStages(order('shipped', { status: 'in_transit', sorted_at: '2026-11-02T08:00:00Z' }), true);
    assert.notEqual(stage(stages, 'pickup').state, 'completed');
    assert.equal(stage(stages, 'pickup').timestamp, undefined);
    assert.equal(stage(stages, 'sorted').state, 'completed');
});

test('exceptions stop active progress and preserve actual custody history', () => {
    const stages = parcelStages(order('shipped', { status: 'in_transit', picked_up_at: '2026-11-02T08:00:00Z', exception_status: 'damaged' }), true);
    assert.equal(stage(stages, 'pickup').state, 'completed');
    assert.equal(stage(stages, 'received').state, 'failed');
    assert.equal(stage(stages, 'received').description, 'damaged');
    assert.equal(
        stages.some((s) => s.state === 'current'),
        false,
    );
});

test('cancellation is visible and never completes delivery', () => {
    const stages = parcelStages(order('cancelled'));
    assert.equal(stages[0].state, 'cancelled');
    assert.equal(stage(stages, 'delivered').state, 'pending');
});

test('return approval and receipt never establish a refund', () => {
    for (const status of ['requested', 'approved', 'assigned', 'collected', 'received']) {
        const stages = returnStages({ status, events: [], decision_reason: null });
        assert.notEqual(stage(stages, 'refund').state, 'completed');
    }
});

test('declined requests stop review rather than completing approval', () => {
    const stages = returnStages({
        status: 'rejected',
        decision_reason: 'Outside policy',
        events: [{ action: 'reject', created_at: '2026-11-02T08:00:00Z' }],
    });
    assert.equal(stages[0].state, 'failed');
    assert.equal(stages[0].description, 'Outside policy');
    assert.equal(stage(stages, 'approved').state, 'pending');
});

test('closed without refund and paid refund remain distinct terminal outcomes', () => {
    const closed = stage(
        returnStages({ status: 'closed', decision_reason: 'Resolved', events: [{ action: 'close', created_at: '2026-11-02T08:00:00Z' }] }),
        'refund',
    );
    const refunded = stage(
        returnStages({ status: 'refunded', decision_reason: null, events: [{ action: 'refund', created_at: '2026-11-03T08:00:00Z' }] }),
        'refund',
    );
    assert.equal(closed.label, 'Closed without refund');
    assert.equal(refunded.label, 'Refund recorded');
    assert.notEqual(closed.timestamp, refunded.timestamp);
    assert.equal(closed.state, 'completed');
    assert.equal(refunded.state, 'completed');
});

test('unrecognized future return status does not fabricate progress', () => {
    assert.equal(
        returnStages({ status: 'future_status', events: [], decision_reason: null }).every((s) => s.state === 'pending'),
        true,
    );
});

test('legacy cash handover without actual received amount never completes reconciliation', () => {
    const stages = codStages({ status: 'handed_over', received_amount: null });
    assert.equal(stage(stages, 'handover').state, 'current');
    assert.equal(stage(stages, 'reconciled').state, 'pending');
    assert.equal(stages.filter((s) => s.state === 'current').length, 1);
});

test('cash discrepancy interrupts financial progress without losing receipt evidence', () => {
    const stages = codStages({ status: 'handed_over', received_amount: '100.00', discrepancy_reason: 'Short cash' });
    assert.equal(stage(stages, 'handover').state, 'completed');
    assert.equal(stage(stages, 'reconciled').state, 'failed');
    assert.equal(
        stages.some((s) => s.state === 'current'),
        false,
    );
});

test('reconciliation uses actual timestamps and stays distinct from seller payout', () => {
    const stages = codStages({ status: 'reconciled', received_amount: '100.00', reconciled_at: '2026-11-02T08:00:00Z' });
    assert.equal(stage(stages, 'reconciled').state, 'completed');
    assert.equal(stage(stages, 'reconciled').timestamp, '2026-11-02T08:00:00Z');
    assert.equal(
        stages.some((s) => s.id === 'payout'),
        false,
    );
});
