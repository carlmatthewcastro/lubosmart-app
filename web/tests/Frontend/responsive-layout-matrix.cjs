const assert = require('node:assert/strict');
module.exports = async function layoutMatrix({ role, navigate, viewport, evaluate, delay, record, screenshot }) {
    const routes = role
        ? [
              '/dashboard/' + role,
              '/settings/profile',
              '/settings/password',
              '/notifications',
              '/support',
              ...(role === 'admin' ? ['/accounts'] : ['/settings/addresses']),
              ...(role === 'buyer'
                  ? ['/shop', '/wishlist', '/cart', '/orders']
                  : role === 'seller'
                    ? ['/inventory', '/orders']
                    : role === 'logistics'
                      ? ['/deliveries?stage=incoming', '/reports']
                      : role === 'rider'
                        ? ['/deliveries']
                        : []),
          ]
        : ['/', '/shop', '/products/1'];
    for (const route of routes) {
        await navigate(route);
        for (const width of [1920, 1440, 1024, 768, 375, 320]) {
            await viewport(width, 1000);
            await delay(200);
            for (const expanded of role && width >= 768 ? [true, false] : [null]) {
                if (expanded !== null) {
                    await evaluate(
                        `(() => { const button=[...document.querySelectorAll('button[aria-label="Collapse navigation"],button[aria-label="Expand navigation"]')].find(el=>el.getBoundingClientRect().width>0); if(button && (button.getAttribute('aria-expanded')==='true')!==${expanded}) button.click(); })()`,
                    );
                }
                await delay(300);
                const metrics = await evaluate(
                    `(() => {const main=document.querySelector('main');const page=main?.querySelector(':scope > div.w-full') || main;const box=page?.getBoundingClientRect();const bounds=main?.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1, width:box?.width, available:bounds?.width, sidebar:document.querySelector('[data-state][data-variant]')?.getAttribute('data-state')};})()`,
                );
                assert.equal(metrics.overflow, false, route + ' overflow at ' + width + ' ' + expanded);
                if (role) {
                    assert.ok(metrics.width >= metrics.available - 2, route + ' unused outer width at ' + width);
                    if (expanded !== null) assert.equal(metrics.sidebar, expanded ? 'expanded' : 'collapsed');
                }
                if (width === 1920)
                    await screenshot(
                        'responsive-desktop-' + (role || 'public') + '-' + route.replaceAll('/', '-').replaceAll('?', '-') + '-' + expanded,
                    );
                record('Responsive ' + (role || 'public') + ' ' + route + ' ' + width + ' ' + expanded, metrics);
            }
        }
        await screenshot('responsive-' + (role || 'public') + '-' + route.replaceAll('/', '-').replaceAll('?', '-'));
    }
};
