const assert = require('node:assert/strict');

module.exports = async function checkRecordMenus({ role, navigate, viewport, evaluate, until, delay, record, screenshot, click, cdp }) {
    const escape = async () => {
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    };
    const choose = async (label) => {
        await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent.trim()===${JSON.stringify(label)}).click()`);
        await until(() => evaluate(`!document.querySelector('[role="menu"]')`), 'record menu closes after selection');
        await delay(100);
    };
    const menu = async (selector) => {
        await until(() => evaluate(`!document.querySelector('[role="menu"]')`), 'previous menu closed');
        await delay(100);
        await click(selector);
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'record menu');
        await delay(200);
        assert.equal(await evaluate('document.querySelectorAll("[role=menu]").length'), 1);
    };
    const track = async () =>
        evaluate(
            `window.recordMutations = 0; window.recordOriginalOpen = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function(method,...args) { if (!['GET','HEAD'].includes(method.toUpperCase())) window.recordMutations++; return window.recordOriginalOpen.call(this,method,...args); };`,
        );
    const reflow = async (name) => {
        for (const [width, height] of [
            [1440, 1000],
            [768, 1024],
            [320, 900],
            [844, 390],
        ]) {
            await viewport(width, height);
            await delay(250);
            assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, name + ' reflow ' + width);
            await screenshot(name + '-' + width);
        }
        await viewport(320, 900);
        await evaluate('document.documentElement.classList.add("dark")');
        await delay(300);
        await screenshot(name + '-dark');
        await evaluate('document.documentElement.classList.remove("dark")');
        await viewport(1440, 1000);
        await delay(250);
    };
    if (role === 'logistics') {
        await navigate('/deliveries?stage=all');
        const rows = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.deliveries.data');
        assert.ok(rows.length);
        const first = rows[0];
        const trigger = `button[aria-label="Actions for parcel #${first.id}"]`;
        await track();
        assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(el=>el.textContent.trim()==='View Parcel & Actions')`), false);
        assert.equal(
            await evaluate(`document.querySelector(${JSON.stringify(trigger)}).closest('section.workspace-card').getBoundingClientRect().height<360`),
            true,
        );
        await menu(trigger);
        assert.equal(
            await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].some(el=>el.textContent==='View handling history')`),
            !!first.events?.length,
        );
        await choose('View parcel & actions');
        await until(() => evaluate(`!!document.querySelector('[role="dialog"]')`), 'parcel dialog');
        assert.equal(
            await evaluate(`document.querySelector('[role="dialog"]').textContent.includes(${JSON.stringify(first.seller_order.store.name)})`),
            true,
        );
        await escape();
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close parcel');
        await delay(250);
        assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), `Actions for parcel #${first.id}`);
        await click(`button[aria-label^="View parcel #${first.id}:"]`);
        await until(() => evaluate(`!!document.querySelector('[role="dialog"]')`), 'title opens parcel');
        await escape();
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close title parcel');
        await delay(250);
        assert.equal(
            await evaluate('document.activeElement.getAttribute("aria-label")'),
            `View parcel #${first.id}: ${first.seller_order.store.name}`,
        );
        record('Compact Logistics parcel summary', 'Compact cards, title/menu details and focus restoration preserve the existing action dialog');
        const historical = rows.find((row) => row.events?.length);
        if (historical) {
            await menu(`button[aria-label="Actions for parcel #${historical.id}"]`);
            await choose('View handling history');
            await until(() => evaluate(`!!document.querySelector('[role="dialog"] details[data-parcel-history][open]')`), 'parcel history shortcut');
            await escape();
            await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close history');
            await delay(250);
            record('Logistics parcel history shortcut', 'Existing handling events open directly without changing parcel state');
        }
        await reflow('compact-logistics-parcels');
        await menu(trigger);
        await viewport(320, 900);
        await delay(250);
        assert.equal(await evaluate('document.querySelector("[role=menu]").getBoundingClientRect().right<=innerWidth+1'), true);
        await screenshot('compact-logistics-parcel-menu');
        await escape();
        assert.equal(await evaluate('window.recordMutations'), 0);
        record('Logistics parcel menu safety and reflow', 'Desktop/tablet/mobile/landscape and dark layouts fit; viewing menus submits no mutations');
        return;
    }
    if (role === 'rider') {
        await navigate('/deliveries?stage=all');
        await track();
        const rows = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.deliveries.data');
        assert.ok(rows.length);
        assert.equal(await evaluate('!!document.querySelector("main form, main button")'), true);
        await reflow('compact-rider-deliveries');
        assert.equal(await evaluate('window.recordMutations'), 0);
        record(
            'Rider delivery card presentation',
            'Shared headers reflow while physical-pickup, delivery and COD controls remain in the existing workflow',
        );
        return;
    }
    await navigate('/orders');
    await track();
    const orders = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.orders.data');
    assert.ok(orders.length);
    const first = orders[0];
    const label = `order #${first.order_id} / parcel #${first.id}`;
    const trigger = `button[aria-label="Actions for ${label}"]`;
    assert.equal(
        await evaluate(
            `[...document.querySelectorAll('main details')].filter(el=>el.querySelector('summary')?.textContent.includes('Parcel handover history') || el.querySelector('summary')?.textContent.includes('Order conversation')).every(el=>el.getBoundingClientRect().height===0)`,
        ),
        true,
    );
    await menu(trigger);
    assert.equal(
        await evaluate(`!!document.querySelector('[role="menuitem"][href="/orders/${first.id}/waybill"]')`),
        ['seller', 'admin'].includes(role),
    );
    assert.equal(
        await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].some(el=>el.textContent==='Request or follow a return')`),
        role === 'buyer' && first.status === 'completed',
    );
    await choose('View order details');
    await until(
        () => evaluate(`[...document.querySelectorAll('details[open] summary')].some(el=>el.textContent==='Order details')`),
        'order details disclosure',
    );
    await until(() => evaluate(`document.activeElement.textContent==='Order details'`), 'order details focus');
    assert.equal(await evaluate('document.body.innerText.includes("Cash on delivery")'), true);
    await menu(trigger);
    await choose('Order conversation');
    await until(
        () => evaluate(`[...document.querySelectorAll('details[open] summary')].some(el=>el.textContent.includes('Order conversation'))`),
        'order conversation',
    );
    if (role === 'admin') assert.equal(await evaluate('document.querySelectorAll("textarea").length'), 0);
    if (role === 'seller' && ['pending', 'processing'].includes(first.status))
        assert.equal(
            await evaluate(
                `[...document.querySelectorAll('button')].some(el=>['Start preparing','Mark ready for pickup'].includes(el.textContent.trim()))`,
            ),
            true,
        );
    if (first.status !== 'cancelled') {
        await menu(trigger);
        await choose('View handover history');
        await until(
            () => evaluate(`[...document.querySelectorAll('details[open] summary')].some(el=>el.textContent==='Parcel handover history')`),
            'order history',
        );
        await until(() => evaluate(`document.activeElement.textContent==='Parcel handover history'`), 'history summary focus');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await cdp('Input.dispatchKeyEvent', { type: 'char', text: '\r', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await delay(250);

        await until(
            () => evaluate('document.activeElement.getAttribute("aria-label") === ' + JSON.stringify('Actions for ' + label)),
            'closed history focus',
        );
    }
    assert.equal(await evaluate('window.recordMutations'), 0);
    record(
        role + ' order secondary actions',
        'Details, conversation and history open; waybill/return eligibility and read-only admin behavior are preserved',
    );
    await navigate('/orders');
    await track();
    await reflow('compact-' + role + '-orders');
    await menu(trigger);
    await viewport(320, 900);
    await delay(250);
    assert.equal(await evaluate('document.querySelector("[role=menu]").getBoundingClientRect().right<=innerWidth+1'), true);
    await screenshot('compact-' + role + '-order-menu');
    await escape();
    assert.equal(await evaluate('window.recordMutations'), 0);
    record(role + ' order menu safety and reflow', 'Compact summaries and menus fit all tested widths/themes without automatic status changes');
};
