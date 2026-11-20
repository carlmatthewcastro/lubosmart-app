const assert = require('node:assert/strict');
module.exports = async function marketplaceCheck({ navigate, viewport, evaluate, until, delay, record, screenshot, click, set, cdp }) {
    for (const width of [375, 768, 1440, 1920]) {
        await viewport(width, 1000);
        const metrics = () =>
            evaluate(`(() => {
            const header = document.querySelector('.reference-header');
            const search = header.querySelector('.home-navbar-search');
            const brand = header.querySelector('.reference-brand');
            return { height: header.getBoundingClientRect().height, searchWidth: search.getBoundingClientRect().width,
                brandWidth: brand.getBoundingClientRect().width, name: brand.textContent.trim(),
                navigation: [...header.querySelectorAll('nav a')].map(link => [link.textContent.trim(), new URL(link.href).pathname]) };
        })()`);
        await navigate('/');
        const home = await metrics();
        await screenshot('restored-home-' + width);
        await navigate('/shop');
        assert.deepEqual(await metrics(), home, 'Marketplace follows original homepage navigation at ' + width);
    }
    record(
        'Original homepage navigation shared',
        'Homepage and Marketplace match in navbar geometry, brand and clickable destinations at mobile, tablet and desktop widths.',
    );
    await viewport(1440, 1000);
    await navigate('/shop');
    assert.equal(await evaluate('document.querySelectorAll("input[type=search]").length'), 1);
    const expandedWidth = await evaluate('document.querySelector(".catalog-product-grid").getBoundingClientRect().width');
    await click('details > summary');
    await delay(100);
    assert.ok((await evaluate('document.querySelector(".catalog-product-grid").getBoundingClientRect().width')) > expandedWidth);
    await click('details > summary');
    await set('select[name=sort]', 'price_asc');
    await until(() => evaluate('new URLSearchParams(location.search).get("sort") === "price_asc"'), 'price sort');
    await until(() => evaluate('document.querySelector(".product-card h2").textContent.trim() === "Browser product 1"'), 'sorted cards');
    await set('.home-navbar-search input', 'Browser product 3');
    await click('.home-navbar-search button');
    await until(() => evaluate('document.querySelectorAll(".product-card").length === 1'), 'navbar search');
    assert.equal(await evaluate('new URLSearchParams(location.search).get("sort")'), 'price_asc');
    assert.ok((await evaluate('document.querySelector(".product-card").getBoundingClientRect().width')) <= 320);
    await screenshot('marketplace-single-listing-desktop');
    await navigate('/shop');
    await viewport(375, 900);
    await click('button[aria-haspopup=dialog]');
    await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'filter drawer');
    await delay(550);
    await set('[role=dialog] input[name=min_price]', '999');
    await click('[role=dialog] button[type=submit]');
    await until(() => evaluate('document.body.innerText.includes("No matching products")'), 'filtered empty state');
    assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'), false);
    await click('a[href="/shop"].underline');
    await until(() => evaluate('document.querySelectorAll(".product-card").length === 4'), 'reset filters');
    await click('.home-menu-toggle');
    assert.equal(await evaluate('document.querySelector(".home-menu-toggle").getAttribute("aria-expanded")'), 'true');
    await evaluate('document.querySelector(".reference-nav a").focus()');
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal(await evaluate('document.activeElement === document.querySelector(".home-menu-toggle")'), true);
    await click('.reference-account button');
    await until(() => evaluate('document.documentElement.classList.contains("dark")'), 'dark mode');
    await screenshot('marketplace-mobile-dark');
    await click('.reference-account button');
    for (const width of [375, 768, 1024, 1440, 1920]) {
        await viewport(width, 1000);
        await delay(100);
        assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false, 'catalog overflow ' + width);
        assert.ok(
            (await evaluate('Math.max(...Array.from(document.querySelectorAll(".product-card"), card => card.getBoundingClientRect().width))')) <=
                320,
        );
        await screenshot('marketplace-' + width);
    }
    await viewport(1440, 1000);
    await navigate('/shop?search=Browser%20product%204');
    assert.equal(await evaluate('document.querySelector(".product-card").innerText.includes("Photo unavailable")'), true);
    record(
        'Marketplace discovery interactions',
        'Shared search preserves sorting, one listing keeps normal width, sidebar collapse expands results, mobile filters/reset/empty state, keyboard menu Escape, dark mode and neutral image fallback pass.',
    );
};
