const assert = require('node:assert/strict');

module.exports = async function dashboardRedesign({ role, viewport, evaluate, delay, record, screenshot }) {
    for (const width of [1440, 768, 320]) {
        await viewport(width, 1000);
        await delay(250);
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true, `${role} overflow at ${width}`);
        assert.equal(await evaluate('document.querySelectorAll("main h1").length'), 1);
        assert.equal(await evaluate('document.querySelector("main").textContent.includes("Welcome back")'), true);
        assert.equal(
            await evaluate(
                `!!document.querySelector('section[aria-label="Account overview"], section[aria-label="Store summary"], section[aria-label="Marketplace summary"], section[aria-label="Parcel summary"]')`,
            ),
            true,
        );
        await screenshot(`redesign-${role}-${width}`);
        record(`${role} dashboard ${width}px`, 'Compact dashboard reflows without document overflow');
    }
    await evaluate('document.documentElement.classList.add("dark")');
    await delay(200);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true);
    await screenshot(`redesign-${role}-dark-320`);
    await evaluate('document.documentElement.classList.remove("dark")');
    if (role === 'buyer') {
        assert.equal(await evaluate('document.querySelector("main").textContent.includes("Available Lubos Coins")'), true);
        assert.equal(await evaluate('!!document.querySelector("main svg[role=img]")'), false);
    }
    if (role === 'seller') {
        assert.equal(await evaluate('document.querySelector("main").textContent.includes("Received settlements")'), true);
    }
    if (role === 'rider') {
        assert.equal(await evaluate('document.querySelector("main").textContent.includes("Compensation overview")'), true);
    }
    if (role === 'logistics') {
        assert.equal(await evaluate('document.querySelector("main").textContent.includes("Needs attention")'), true);
    }
    record(`${role} dashboard content and dark reflow`, 'Role content, semantic heading, zero-data fixtures and dark layout verified');
};
