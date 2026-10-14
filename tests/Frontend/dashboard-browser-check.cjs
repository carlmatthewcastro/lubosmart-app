const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'storage/app/dashboard-ui-check');
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'lubosmart-auth-browser-'));
const database = path.join(stage, 'test.sqlite');
fs.writeFileSync(database, '');
fs.mkdirSync(output, { recursive: true });
const env = {
    ...process.env,
    APP_ENV: 'testing',
    APP_DEBUG: 'true',
    APP_CONFIG_CACHE: path.join(stage, 'config.php'),
    APP_KEY: 'base64:' + Buffer.alloc(32, 7).toString('base64'),
    DB_URL: '',
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: database,
    MAIL_MAILER: 'array',
    MAIL_SECURITY_MAILER: 'array',
    QUEUE_CONNECTION: 'sync',
    CACHE_STORE: 'database',
    SESSION_DRIVER: 'database',
    SESSION_CONNECTION: 'sqlite',
    DB_CACHE_CONNECTION: 'sqlite',
    DB_CACHE_LOCK_CONNECTION: 'sqlite',
    SESSION_SECURE_COOKIE: 'false',
    LUBOSMART_AUTH_BROWSER_STAGE: stage,
};
const checks = [];
const processes = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function port() {
    const server = net.createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const value = server.address().port;
    await new Promise((resolve) => server.close(resolve));
    return value;
}
async function until(predicate, label) {
    for (let i = 0; i < 150; i++) {
        if (await predicate()) return;
        await delay(100);
    }
    throw Error('Timed out: ' + label);
}

(async () => {
    let socket;
    let inspect;
    const runtimeErrors = [];
    try {
        const migrate = spawnSync('php', ['artisan', 'migrate', '--force'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
        assert.equal(migrate.status, 0, migrate.stdout + migrate.stderr);
        const seed = spawnSync('php', ['tests/Fixtures/auth-browser-router.php', 'dashboard-seed'], {
            cwd: root,
            env,
            encoding: 'utf8',
            windowsHide: true,
        });
        assert.equal(seed.status, 0, seed.stderr);
        assert.ok(seed.stdout.trim().startsWith('{'), seed.stdout);
        assert.deepEqual(JSON.parse(seed.stdout), { orders: 1, parcels: 1 });
        console.log('Isolated database and fixtures ready');
        const appPort = await port(),
            debugPort = await port();
        env.APP_URL = 'http://127.0.0.1:' + appPort;
        processes.push(
            spawn('php', ['-S', '127.0.0.1:' + appPort, '-t', 'public', 'tests/Fixtures/auth-browser-router.php'], {
                cwd: root,
                env,
                stdio: 'ignore',
                windowsHide: true,
            }),
        );
        const browser = [
            'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        ].find((file) => fs.existsSync(file));
        assert.ok(browser, 'Chrome or Edge required');
        processes.push(
            spawn(
                browser,
                [
                    '--headless=new',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--no-sandbox',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-background-networking',
                    '--remote-debugging-port=' + debugPort,
                    '--user-data-dir=' + path.join(stage, 'browser-profile'),
                    'about:blank',
                ],
                { stdio: 'ignore', windowsHide: true },
            ),
        );
        let tabs;
        await until(async () => {
            try {
                tabs = await (await fetch('http://127.0.0.1:' + debugPort + '/json/list', { signal: AbortSignal.timeout(1000) })).json();
                return tabs.some((t) => t.type === 'page');
            } catch {
                return false;
            }
        }, 'browser start');
        console.log('Headless browser ready');
        socket = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(Error('Browser WebSocket connection timed out')), 10000);
            socket.onopen = () => {
                clearTimeout(timeout);
                resolve();
            };
            socket.onerror = reject;
        });
        let counter = 0;
        const pending = new Map();
        const errors = runtimeErrors;
        const consoleErrors = [];
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.id) {
                const entry = pending.get(message.id);
                if (entry) {
                    pending.delete(message.id);
                    if (message.error) entry.reject(Error(message.error.message));
                    else entry.resolve(message.result);
                }
            } else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
                console.log('HTTP ' + message.params.response.status + ' ' + new URL(message.params.response.url).pathname);
            } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') consoleErrors.push('console.error');
            else if (message.method === 'Runtime.exceptionThrown')
                errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description ?? ''));
        };
        const cdp = (method, params = {}) =>
            new Promise((resolve, reject) => {
                const id = ++counter;
                const timeout = setTimeout(() => {
                    pending.delete(id);
                    reject(Error('Browser command timed out: ' + method));
                }, 15000);
                pending.set(id, {
                    resolve: (result) => {
                        clearTimeout(timeout);
                        resolve(result);
                    },
                    reject: (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    },
                });
                socket.send(JSON.stringify({ id, method, params }));
            });
        await cdp('Page.enable');
        await cdp('Runtime.enable');
        await cdp('Network.enable');
        const evaluate = async (expression) => {
            const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
            return result.result.value;
        };
        inspect = evaluate;
        const navigate = async (route) => {
            await cdp('Page.navigate', { url: env.APP_URL + route });
            await until(() => evaluate('!!document.querySelector("#app") && !!document.querySelector("h1")'), 'render ' + route);
            await delay(250);
        };
        const viewport = async (width, height) =>
            cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
        const screenshot = async (name) => {
            const data = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
            fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(data.data, 'base64'));
        };
        const record = (name, details) => {
            checks.push({ name, status: 'PASS', details });
            console.log('PASS: ' + name);
        };
        const click = async (selector) => {
            const point = await evaluate(
                `(() => { const element=document.querySelector(${JSON.stringify(selector)}); element.scrollIntoView({block:'center'}); const rect=element.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`,
            );
            await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
            await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
        };
        const set = (selector, value) =>
            evaluate(
                `(() => { const el=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.focus();el.blur(); })()`,
            );
        for (const role of process.env.LUBOSMART_BROWSER_ROLES
            ? process.env.LUBOSMART_BROWSER_ROLES.split(',')
            : ['buyer', 'seller', 'courier', 'sorting_center', 'admin']) {
            await cdp('Network.clearBrowserCookies');
            await viewport(1440, 1000);
            await navigate('/login');
            await set('#login-email', role + '@dashboard.example.com');
            await set('#login-password', 'Browser@2026');
            await click('button[type=submit]');
            await until(() => evaluate('location.pathname === "/dashboard/' + role + '"'), 'dashboard login ' + role);
            await navigate('/dashboard/' + role);
            await until(() => evaluate('!!document.querySelector("main h1")'), 'dashboard content ' + role);
            await delay(400);
            const page = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props');
            if (role === 'buyer') assert.equal(page.stats.Orders, 1);
            if (role === 'seller') assert.equal(page.stats['Seller orders'], 1);
            if (role === 'courier') assert.equal(page.stats.Parcels, 1);
            if (role === 'sorting_center') assert.equal(page.metrics.incoming, 1);
            if (role === 'admin') assert.equal(page.stats.Accounts, 3);
            assert.equal(await evaluate('document.querySelectorAll("h1").length'), 1);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            assert.equal(await evaluate(`!!document.querySelector('a[href="/dashboard"][aria-current="page"]')`), true);
            if (['admin', 'sorting_center'].includes(role)) {
                assert.equal(await evaluate(`!!document.querySelector('[aria-label="Open account menu"]')`), true);
            } else {
                assert.equal(await evaluate(`!!document.querySelector('a[href="/settings/profile"]')`), true);
            }
            assert.equal(await evaluate('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Messages")'), false);
            assert.equal(await evaluate('!!document.querySelector(' + JSON.stringify('a[href="/support?kind=message"]') + ')'), true);
            await screenshot(role + '-desktop');
            record(role + ' desktop dashboard', 'Actual role login, single heading, current navigation and synthetic account data');
            if (role === 'buyer') {
                await navigate('/shop');
                await until(() => evaluate('document.querySelectorAll(".product-card").length === 4'), 'shared product cards');
                await until(
                    () => evaluate('[...document.querySelectorAll(".product-card img")].every(img=>img.complete && img.naturalWidth>0)'),
                    'product photos',
                );
                const boxes = await evaluate(
                    '[...document.querySelectorAll(".product-card")].map(card=>{const image=card.firstElementChild.getBoundingClientRect();return {width:Math.round(image.width),height:Math.round(image.height),cardHeight:Math.round(card.getBoundingClientRect().height)}})',
                );
                assert.equal(
                    boxes.every((box) => box.width === box.height && box.width === boxes[0].width && box.cardHeight === boxes[0].cardHeight),
                    true,
                );
                assert.equal(
                    await evaluate('[...document.querySelectorAll(".product-card img")].every(img=>getComputedStyle(img).objectFit==="contain")'),
                    true,
                );
                await screenshot('product-cards-desktop');
                await click('.product-card h2 button');
                await until(
                    () => evaluate('document.querySelector("[role=dialog]")?.textContent.includes("Synthetic product details")'),
                    'product details modal',
                );
                await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });

                await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'close product details');
                await delay(250);
                await click('.product-card button[aria-label^="Save "]');
                await until(
                    () => evaluate('!!document.querySelector(' + JSON.stringify('.product-card button[aria-pressed="true"]') + ')'),
                    'saved wishlist heart',
                );
                await navigate('/wishlist');
                assert.equal(await evaluate('document.querySelectorAll(".product-card").length'), 1);
                await click('.product-card button[aria-label^="Remove "]');
                await until(() => evaluate('document.querySelectorAll(".product-card").length === 0'), 'remove saved product');
                await navigate('/shop');
                await click('.product-card button[aria-label^="Add "]');
                await until(() => evaluate('document.body.textContent.includes("Cart updated")'), 'card cart mutation');
                await viewport(390, 900);
                assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
                assert.equal(await evaluate('getComputedStyle(document.querySelector(".product-grid")).gridTemplateColumns.split(" ").length'), 2);
                await screenshot('product-cards-mobile');
                await evaluate('document.documentElement.classList.add("dark")');
                await screenshot('product-cards-mobile-dark');
                await evaluate('document.documentElement.classList.remove("dark")');

                await evaluate('document.querySelector(".product-card img").dispatchEvent(new Event("error"))');
                await until(() => evaluate('document.body.textContent.includes("Photo unavailable")'), 'image fallback');
                await viewport(1440, 1000);
                await navigate('/dashboard/buyer');
                record(
                    'Shared product cards, wishlist and shopping actions',
                    'Mixed photo orientations have equal square containers/card heights; save/remove persists; cart mutation works; mobile grid and image fallback work',
                );
            }
            if (role === 'sorting_center') {
                for (const stage of ['pickups', 'incoming', 'sorting', 'dispatch', 'monitoring']) {
                    assert.equal(
                        await evaluate('!!document.querySelector(' + JSON.stringify('a[href="/deliveries?stage=' + stage + '"]') + ')'),
                        true,
                    );
                    await navigate('/deliveries?stage=' + stage);
                    await until(() => evaluate('!!document.querySelector("main h1")'), 'logistics stage ' + stage);
                    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
                }
                for (const url of [
                    '/reviews',
                    '/logistics/riders',
                    '/accounts',
                    '/reports',
                    '/logistics/shipping-rates',
                    '/support?kind=message',
                    '/settings/profile',
                ]) {
                    await navigate(url);
                    await until(() => evaluate('!!document.querySelector("main h1")'), 'logistics workspace ' + url);
                    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
                }
                await navigate('/dashboard/sorting_center');
                await click('[aria-label="Search logistics workspace"]');
                await until(() => evaluate('!!document.querySelector("#logistics-search")'), 'logistics search dialog');
                await set('#logistics-search-target', 'riders');
                await set('#logistics-search', 'Browser');
                await click('[role="dialog"] button[type="submit"]');
                await until(() => evaluate('location.pathname === "/accounts"'), 'logistics rider search');
                await navigate('/accounts?search=Browser');
                const accountData = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.accounts.data');
                assert.equal(
                    accountData.every((account) => account.role === 'courier'),
                    true,
                );
                await navigate('/dashboard/sorting_center');
                await click('[aria-label="Open logistics queues"]');
                await until(() => evaluate('!!document.querySelector("[role=menu]")'), 'logistics queues');
                assert.equal(await evaluate('!!document.querySelector(' + JSON.stringify('[role=menu] a[href="/reviews"]') + ')'), true);
                await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
                await click('[aria-label="Open account menu"]');
                await until(() => evaluate('document.querySelector("[role=menu]")?.textContent.includes("Log out")'), 'logistics account menu');
                assert.equal(await evaluate('document.querySelector("[role=menu]").textContent.includes("Log out")'), true);
                await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
                record(
                    'Logistics workflow navigation and rider-only search',
                    'Every parcel stage and workspace page opens; search returns Rider accounts; queues and logout menu are available',
                );
            }
            await viewport(768, 1024);
            await delay(300);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            await screenshot(role + '-tablet');
            await viewport(844, 390);
            await delay(300);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            record(role + ' tablet and landscape reflow', '768px tablet and 844px landscape have no document overflow');
            await viewport(320, 900);
            await delay(400);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            const mobileMenu = '[aria-label="Expand navigation"]';
            await click(mobileMenu);
            await until(() => evaluate(`!!document.querySelector('[role="dialog"]')`), 'mobile sidebar ' + role);
            assert.equal(await evaluate(`!!document.querySelector('[role="dialog"] a[href="/dashboard"][aria-current="page"]')`), true);
            await cdp('Page.bringToFront');
            await evaluate(`document.querySelector('[role="dialog"][data-state="open"]').focus()`);
            await cdp('Input.dispatchKeyEvent', {
                type: 'keyDown',
                key: 'Escape',
                code: 'Escape',
                windowsVirtualKeyCode: 27,
                nativeVirtualKeyCode: 27,
            });
            await cdp('Input.dispatchKeyEvent', {
                type: 'keyUp',
                key: 'Escape',
                code: 'Escape',
                windowsVirtualKeyCode: 27,
                nativeVirtualKeyCode: 27,
            });
            await until(() => evaluate(`!document.querySelector('[role="dialog"][data-state="open"]')`), 'dismiss mobile sidebar');
            await delay(400);
            await click(mobileMenu);
            await until(() => evaluate(`!!document.querySelector('[role="dialog"][data-state="open"]')`), 'reopen sidebar');
            const closeButton = await evaluate(
                `(() => { const button=[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close'); return !!button && getComputedStyle(button).display!=='none'; })()`,
            );
            assert.equal(closeButton, true, 'Mobile sidebar close button is visible');
            await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
            await until(() => evaluate(`!document.querySelector('[role="dialog"][data-state="open"]')`), 'close sidebar button');
            await delay(400);
            await screenshot(role + '-mobile');
            record(role + ' 320px navigation and reflow', 'No horizontal overflow; mobile navigation opens; Escape and visible Close dismiss it');
            await evaluate('document.documentElement.classList.add("dark")');
            await delay(350);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            await screenshot(role + '-mobile-dark');
            record(role + ' dark theme', 'Dark semantic tokens and mobile layout rendered');
            await evaluate('document.documentElement.classList.remove("dark")');
            if (['buyer', 'seller', 'courier'].includes(role)) {
                await click('[aria-label="Open account menu"]');
                await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'account menu');
                assert.equal(await evaluate(`document.querySelector('[role="menu"]').textContent.includes("Log out")`), true);
                record(role + ' account menu', 'Topbar account menu exposes existing logout action');
            }
        }
        if (process.env.LUBOSMART_BROWSER_ROLES) {
            assert.deepEqual(errors, []);
            assert.deepEqual(consoleErrors, []);
            record('Dashboard runtime errors', 'Zero browser runtime exceptions or console errors');
            return;
        }
        await viewport(1440, 1000);
        for (const url of [
            '/reviews',
            '/accounts',
            '/admin/compliance',
            '/admin/commission',
            '/reports',
            '/admin/platform',
            '/support?kind=message',
            '/support?kind=complaint',
            '/admin/audit-log',
        ]) {
            await navigate(url);
            await until(() => evaluate('!!document.querySelector("main h1")'), 'admin page ' + url);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            record('Admin page ' + url, 'Page renders without horizontal overflow');
        }
        await navigate('/accounts');
        assert.equal(await evaluate(`Array.from(document.querySelectorAll('select option')).some(el=>el.value==='courier')`), false);
        await click('[aria-label="Search Admin Workspace"]');
        await until(() => evaluate(`!!document.querySelector('input[aria-label="Search term"]')`), 'search dialog');
        await set('input[aria-label="Search term"]', 'Browser');
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] li')`), 'search results');
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Browser courier')`), false);
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        record('Admin role filters and workspace search', 'Rider option and Rider search results are absent');
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='View details').click()`);
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] dl')`), 'account details');
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Manage Access')`), false);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Role details')`), false);
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Supporting documents').click()`);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('View identity')`), true);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('bir 2303')`), false);
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        record('Admin account details', 'Details open without access mutation controls');
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close account details');
        await delay(250);
        await click('[aria-label^="Notifications,"]');
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'notification menu');
        assert.equal(await evaluate(`document.querySelector('[role="menu"]').textContent.includes("You're all caught up.")`), true);
        assert.equal(await evaluate(`document.querySelectorAll('[role="menuitem"]').length`), 4);
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await until(() => evaluate(`!document.querySelector('[role="menu"]')`), 'close notifications');
        record('Admin notifications', 'Live notification menu loads with keyboard accessible destinations and an empty state');
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Manage access').click()`);
        await until(() => evaluate(`document.querySelectorAll('[role="dialog"] select').length===2`), 'access modal');
        await evaluate(
            `(() => { const el=document.querySelectorAll('[role="dialog"] select')[1]; const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(el,el.options[1].value); el.dispatchEvent(new Event('change',{bubbles:true})); })()`,
        );
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Review Action').click()`);
        await until(() => evaluate(`document.querySelectorAll('[role="dialog"]').length===2`), 'access confirmation');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Cancel').click()`);
        await until(() => evaluate(`document.querySelectorAll('[role="dialog"]').length===1`), 'cancel confirmation');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'dismiss access modal');
        assert.equal(await evaluate(`document.activeElement.textContent.trim()`), 'Manage access');
        record('Admin access modal', 'Allowed actions load, confirmation opens, cancellation preserves account state and focus returns to trigger');
        await navigate('/reviews?status=approved');
        await evaluate(
            `[...document.querySelectorAll('li')].find(el=>el.textContent.includes('Browser buyer') && el.querySelector('button')).querySelector('button').click()`,
        );
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] dl')`), 'buyer registration review');
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Role details')`), false);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Seller type')`), false);
        await screenshot('buyer-registration-review');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close buyer review');
        await evaluate(
            `[...document.querySelectorAll('li')].find(el=>el.textContent.includes('Browser seller') && el.querySelector('button')).querySelector('button').click()`,
        );
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] dl')`), 'seller registration review');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Role details').click()`);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Seller type')`), true);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Service regions')`), false);
        await screenshot('seller-registration-review');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        record(
            'Role-specific registration review',
            'Buyer review omits business fields; Seller review shows seller information without Logistics fields',
        );
        await navigate('/dashboard/admin');
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Commission').click()`);
        await until(() => evaluate(`document.body.textContent.includes('Daily commission')`), 'commission chart');
        await click('[aria-label="Switch to dark mode"]');
        assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), true);
        await click('[aria-label="Switch to light mode"]');
        assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), false);
        await screenshot('admin-verified-desktop');
        record('Admin chart and theme controls', 'Chart measure switches and sidebar theme toggle changes both modes');
        await cdp('Page.navigate', { url: env.APP_URL + '/settings/profile' });
        await until(() => evaluate(`!!document.querySelector('#name')`), 'profile name field');
        await set('#name', 'A');
        assert.equal(await evaluate(`document.querySelector('#name').checkValidity()`), false);
        await set('#name', 'A.');
        assert.equal(await evaluate(`document.querySelector('#name').checkValidity()`), false);
        await set('#name', 'John123');
        assert.equal(await evaluate(`document.querySelector('#name').checkValidity()`), false);
        await set('#name', "Niño Dela-Cruz O'Neil Jr.");
        assert.equal(await evaluate(`document.querySelector('#name').checkValidity()`), true);
        record('Profile name validation', 'Browser rejects short and numeric names and accepts supported Filipino names without submitting');
        assert.deepEqual(errors, []);
        assert.deepEqual(consoleErrors, []);
        record('Dashboard runtime errors', 'Zero browser runtime exceptions or console errors');
    } catch (error) {
        checks.push({ name: 'Browser run', status: 'FAIL', details: error.message });
        console.error(error.stack ?? error.message);
        if (inspect) {
            try {
                console.error(
                    await inspect(
                        'JSON.stringify({title:document.title,body:document.body.innerText.slice(0,160),errors:Array.from(document.querySelectorAll("[role=alert]")).map(el=>el.textContent),fields:Array.from(document.querySelectorAll("input")).filter(el=>el.name&&!el.name.includes("password")).map(el=>({name:el.name,value:el.value,checked:el.checked})),scripts:Array.from(document.scripts).map(s=>s.src)})',
                    ),
                );
                console.error(JSON.stringify(runtimeErrors));
            } catch {
                /* Preserve the original failure if diagnostics are unavailable. */
            }
        }
        process.exitCode = 1;
    } finally {
        fs.writeFileSync(
            path.join(output, 'results.json'),
            JSON.stringify({ date: '2026-10-14', isolation: 'temporary SQLite, fake notifications and PSGC', checks }, null, 2),
        );
        if (socket) socket.close();
        for (const process of processes.reverse()) process.kill();
        // Keep disposable profile/database for diagnosis; no customer data used.
    }
})();
