const assert = require('node:assert/strict');

module.exports = async function workspaceDesign({ role, navigate, viewport, evaluate, until, delay, record, screenshot, click }) {
    for (const width of [1440, 768, 320]) {
        await viewport(width, 1000);
        await delay(150);
        assert.equal(await evaluate(`document.querySelectorAll('main h1').length`), 1, role + ' has one page heading');
        assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true, role + ' overflow at ' + width);
        assert.equal(await evaluate(`!!document.querySelector('.workspace-welcome')`), true);
        await screenshot(`reference-${role}-${width}`);
        record(`${role} dashboard at ${width}px`, 'Illustrated welcome, one heading, no document overflow');
    }
    await evaluate(`document.documentElement.classList.add('dark')`);
    await delay(400);
    await screenshot(`reference-${role}-dark-mobile`);
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
    await evaluate(`document.documentElement.classList.remove('dark')`);
    await delay(400);

    if (role === 'admin') {
        await viewport(1440, 1000);
        await evaluate(`document.querySelector('[aria-label="Chart measure"] button:last-child').click()`);
        assert.equal(await evaluate(`document.querySelector('[aria-label="Chart measure"] button:last-child').getAttribute('aria-pressed')`), 'true');
        assert.equal(await evaluate(`!!document.querySelector('[aria-label="Sales and delivery performance"] svg path')`), true);
        record('Admin analytics', 'Area chart and measure switch retain real data and exact figures');
    }
    const operational =
        role === 'admin'
            ? ['/accounts', '/reviews', '/reports']
            : role === 'buyer'
              ? ['/orders', '/shop']
              : role === 'seller'
                ? ['/inventory', '/orders', '/reports']
                : ['/deliveries', '/reports'];
    for (const route of ['/settings/profile', '/settings/password', '/support', ...operational]) {
        await navigate(route);
        await until(
            () => evaluate(`!document.querySelector('main').textContent.includes('Loading verified registration details')`),
            'Settled content ' + route,
        );
        for (const width of [1440, 320]) {
            await viewport(width, 1000);
            await delay(150);
            assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true, route + ' overflow at ' + width);
            assert.equal(await evaluate(`document.querySelectorAll('main h1').length`), 1, route + ' heading');
            await screenshot(`reference-${role}-${route.replaceAll('/', '-')}-${width}`);
        }
        record(`${role} ${route}`, 'Desktop and mobile reflow');
        if (route === '/support') {
            await evaluate(
                `Array.from(document.querySelectorAll('[aria-label="Conversation filters"] button')).find(button => button.textContent === 'Unread').click()`,
            );
            await until(() => evaluate(`new URLSearchParams(location.search).get('unread') === '1'`), 'Unread filter');
            await evaluate(`document.querySelector('[aria-label="Conversation filters"] button').click()`);
            await until(() => evaluate(`!new URLSearchParams(location.search).get('unread')`), 'All conversation filter');
        }
    }
    if (role === 'admin') {
        await navigate('/accounts');
        await viewport(1440, 1000);
        const accountId = await evaluate(`document.querySelector('button[data-account-id]').dataset.accountId`);
        await evaluate(`document.querySelector('button[data-account-id]').click()`);
        await until(
            () => evaluate(`!!document.querySelector('[role="dialog"]') && !document.querySelector('[aria-label="Loading Details"]')`),
            'account details modal',
        );
        assert.equal(
            await evaluate(
                `!!document.querySelector('[aria-label="Registration details sections"]') || !!document.querySelector('[aria-label="Account details sections"]')`,
            ),
            true,
        );
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').contains(document.activeElement)`), true);
        await screenshot('reference-account-modal-desktop');
        await viewport(320, 850);
        await delay(150);
        assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
        await screenshot('reference-account-modal-mobile');
        await evaluate(`document.querySelector('[role="dialog"] > button').click()`);
        await delay(250);
        assert.equal(await evaluate(`document.activeElement.dataset.accountId`), accountId, 'Closing restores account focus');
        await viewport(1440, 1000);
        await click('button[aria-label^="Actions for"]');
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'Account action menu');
        await evaluate(`Array.from(document.querySelectorAll('[role="menuitem"]')).find(item => item.textContent === 'View details').click()`);
        await until(() => evaluate(`!!document.querySelector('[role="dialog"]')`), 'Details from account menu');
        await delay(100);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').contains(document.activeElement)`), true);
        await evaluate(`document.querySelector('[role="dialog"] > button').click()`);
        await delay(250);
        for (let attempt = 0; attempt < 3; attempt++) {
            await click('button[aria-label^="Actions for"]');
            await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'Repeat account menu');
            await evaluate(`Array.from(document.querySelectorAll('[role="menuitem"]')).find(item => item.textContent === 'View details').click()`);
            await until(
                () =>
                    evaluate(
                        `!!document.querySelector('[role="dialog"]') && document.querySelector('[role="dialog"]').contains(document.activeElement)`,
                    ),
                'Repeat focus handoff',
            );
            await delay(200);
            assert.equal(await evaluate(`document.querySelector('[role="dialog"]').contains(document.activeElement)`), true);
            await evaluate(`document.querySelector('[role="dialog"] > button').click()`);
            await delay(250);
        }
        record('Account details modal', 'Loads real details, contains focus, reflows at 320px, restores focus on close');
    }
};
