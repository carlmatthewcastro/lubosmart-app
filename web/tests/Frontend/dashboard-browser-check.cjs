const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = process.env.LUBOSMART_BROWSER_OUTPUT || path.join(root, '../.tools/development-artifacts/storage-app/dashboard-ui-check');
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
        let browserRouter = 'tests/Fixtures/auth-browser-router.php';
        if (process.env.LUBOSMART_WORKSPACE_DESIGN) {
            // Other workspace builds must not remove chunks while this run is navigating.
            fs.cpSync(path.join(root, 'public/build'), path.join(stage, 'public/build'), { recursive: true });
            const fixture = fs.readFileSync(path.join(root, browserRouter), 'utf8');
            const phpRoot = root.replaceAll('\\', '/').replaceAll("'", "\\'");
            browserRouter = path.join(stage, 'workspace-router.php');
            const assetHandler = `
if (PHP_SAPI === 'cli-server' && str_starts_with(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/build/')) {
    $build = realpath($stage.'/public/build');
    $file = realpath($stage.'/public'.parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
    if (! $file || ! str_starts_with($file, $build.DIRECTORY_SEPARATOR) || ! is_file($file)) { http_response_code(404); exit; }
    $types = ['js' => 'text/javascript', 'css' => 'text/css', 'woff2' => 'font/woff2', 'svg' => 'image/svg+xml'];
    header('Content-Type: '.($types[pathinfo($file, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
    readfile($file);
    exit;
}
`;
            fs.writeFileSync(
                browserRouter,
                fixture
                    .replace('$root = dirname(__DIR__, 2);', `$root = '${phpRoot}';\n${assetHandler}`)
                    .replace(
                        "$app = require $root.'/bootstrap/app.php';",
                        "$app = require $root.'/bootstrap/app.php';\n$app->usePublicPath($stage.'/public');",
                    ),
            );
        }
        processes.push(
            spawn('php', ['-S', '127.0.0.1:' + appPort, '-t', 'public', browserRouter], {
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
                    '--disable-background-timer-throttling',
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
            await until(
                () =>
                    evaluate(
                        'location.pathname + location.search === ' +
                            JSON.stringify(route) +
                            ' && !!document.querySelector("#app") && !!document.querySelector("h1")',
                    ),
                'render ' + route,
            );
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
            await evaluate(
                `new Promise(resolve => { document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'}); requestAnimationFrame(() => requestAnimationFrame(resolve)); })`,
            );
            const point = await evaluate(
                `(() => { const element=document.querySelector(${JSON.stringify(selector)}); const rect=element.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`,
            );
            await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
            await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
        };
        const set = async (selector, value) => {
            await until(() => evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')'), 'field ' + selector);
            return evaluate(
                `(() => { const el=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.focus();el.blur(); })()`,
            );
        };
        if (process.env.LUBOSMART_MARKETPLACE_CHECK)
            await require('./marketplace-redesign-check.cjs')({ navigate, viewport, evaluate, until, delay, record, screenshot, click, set, cdp });
        if (process.env.LUBOSMART_LAYOUT_MATRIX)
            await require('./responsive-layout-matrix.cjs')({ navigate, viewport, evaluate, delay, record, screenshot });
        if (process.env.LUBOSMART_BROWSER_PUBLIC_ONLY) {
            assert.deepEqual(errors, []);
            assert.deepEqual(consoleErrors, []);
            record('Public marketplace runtime', 'No runtime exceptions or console errors');
            return;
        }
        for (const role of process.env.LUBOSMART_BROWSER_ROLES
            ? process.env.LUBOSMART_BROWSER_ROLES.split(',')
            : ['buyer', 'seller', 'rider', 'logistics', 'admin']) {
            if (process.env.LUBOSMART_WORKSPACE_DESIGN || process.env.LUBOSMART_RECORD_MENUS) {
                // Stop prior-page polling before clearing cookies for the next synthetic role.
                await cdp('Page.navigate', { url: 'about:blank' });
                await until(() => evaluate('location.href === "about:blank"'), 'Leave previous role');
            }
            await cdp('Network.clearBrowserCookies');
            await viewport(1440, 1000);
            await navigate('/login');
            await set('#login-email', role + '@dashboard.example.com');
            await set('#login-password', 'Browser@2026');
            await click('form:has(#login-email) button[type=submit]');
            await until(() => evaluate('location.pathname === "/dashboard/' + role + '"'), 'dashboard login ' + role);
            await navigate('/dashboard/' + role);
            if (process.env.LUBOSMART_RECORD_MENUS) {
                await require('./record-menu-check.cjs')({ role, navigate, viewport, evaluate, until, delay, record, screenshot, click, cdp });
                continue;
            }
            if (process.env.LUBOSMART_WORKSPACE_DESIGN) {
                if (process.env.LUBOSMART_DASHBOARD_REDESIGN) {
                    await require('./dashboard-redesign-check.cjs')({ role, viewport, evaluate, delay, record, screenshot });
                    continue;
                }
                await require('./workspace-design-check.cjs')({ role, navigate, viewport, evaluate, until, delay, record, screenshot, click });
                continue;
            }
            if (process.env.LUBOSMART_LAYOUT_MATRIX) {
                await require('./responsive-layout-matrix.cjs')({ role, navigate, viewport, evaluate, delay, record, screenshot });
                continue;
            }
            if (process.env.LUBOSMART_BROWSER_ACCOUNT_ACTIONS) continue;
            await until(() => evaluate('!!document.querySelector("main h1")'), 'dashboard content ' + role);
            assert.equal(await evaluate(`!!document.querySelector('nav[aria-label="Logistics mobile navigation"]')`), role === 'logistics');
            await delay(400);
            const page = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props');
            if (role === 'buyer') assert.equal(page.stats['Orders to receive'], 1);
            if (role === 'seller') assert.equal(page.queues.all, 1);
            if (role === 'rider') assert.equal(page.queues.all, 1);
            if (role === 'logistics') assert.equal(page.metrics.incoming, 1);
            if (role === 'admin') assert.equal(page.stats.Accounts, 3);
            if (role === 'buyer' || role === 'seller') {
                await navigate(role === 'buyer' ? '/orders' : '/inventory');
                await set('main input[type=search]', 'Browser');
                await until(
                    () =>
                        evaluate(
                            'new URLSearchParams(location.search).get("search") === "Browser" && !document.querySelector("main form[aria-busy=true]")',
                        ),
                    'automatic list search ' + role,
                );
                record('Automatic list search ' + role, 'Typed search applies without a button');
                if (role === 'seller') {
                    await click('main button[aria-label^="Actions for "]');
                    await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'inventory actions');
                    await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent==='Edit').click()`);
                    await until(() => evaluate(`[...document.querySelectorAll('h2')].some(el=>el.textContent==='Edit product')`), 'inventory editor');
                    await until(() => evaluate(`!document.querySelector('[role="menu"]')`), 'close inventory menu');
                    await delay(250);
                    await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent==='Cancel').click()`);
                    await viewport(320, 900);
                    await delay(250);
                    await click('main button[aria-label^="Actions for "]');
                    await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'inventory options menu');
                    await delay(250);
                    assert.equal(await evaluate(`document.querySelector('[role="menu"]').getBoundingClientRect().right<=innerWidth`), true);
                    await screenshot('seller-inventory-action-menu-mobile');
                    await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent==='Size/color options').click()`);
                    await until(
                        () => evaluate(`[...document.querySelectorAll('h2')].some(el=>el.textContent.startsWith('Size/color options for'))`),
                        'inventory options editor',
                    );
                    await navigate('/dashboard/seller');
                    await viewport(1440, 1000);
                    record(
                        'Seller inventory action menu',
                        'Existing Edit and Size/color options open their editors; mobile menu remains within viewport',
                    );
                }
            }
            if (role !== 'buyer') {
                await navigate('/reports');
                await set('main input[type=date]', '2026-01-01');
                await until(
                    () =>
                        evaluate(
                            'new URLSearchParams(location.search).get("from") === "2026-01-01" && !document.querySelector("main form[aria-busy=true]")',
                        ),
                    'automatic report dates ' + role,
                );
                assert.equal(await evaluate('document.querySelector("main input[type=date]").value'), '2026-01-01');
                record('Automatic report dates ' + role, 'Date changes update report results without Apply');
            }
            await navigate('/dashboard/' + role);

            assert.equal(await evaluate('document.querySelectorAll("h1").length'), 1);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            assert.equal(await evaluate(`!!document.querySelector('a[href="/dashboard"][aria-current="page"]')`), true);
            if (['admin', 'logistics'].includes(role)) {
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
                    await evaluate('[...document.querySelectorAll(".product-card img")].every(img=>getComputedStyle(img).objectFit==="cover")'),
                    true,
                );
                await screenshot('product-cards-desktop');
                assert.equal(await evaluate('!!document.querySelector(".product-card h2 button")'), false);
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
                await until(() => evaluate('document.body.textContent.includes("Added to cart")'), 'card cart mutation');
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
            if (role === 'logistics') {
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
                await navigate('/dashboard/logistics');
                await click('[aria-label="Search logistics workspace"]');
                await until(() => evaluate('!!document.querySelector("#logistics-search")'), 'logistics search dialog');
                await set('#logistics-search-target', 'riders');
                await set('#logistics-search', 'Browser');
                await click('[role="dialog"] button[type="submit"]');
                await until(() => evaluate('location.pathname === "/accounts"'), 'logistics rider search');
                await navigate('/accounts?search=Browser');
                const accountData = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.accounts.data');
                assert.equal(
                    accountData.every((account) => account.role === 'rider'),
                    true,
                );
                await navigate('/dashboard/logistics');
                await click('[aria-label^="Logistics notifications"]');
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
            if (role === 'rider') {
                assert.equal(await evaluate(`!!document.querySelector('a[href="/reviews"]')`), false);
                assert.equal(await evaluate(`!!document.querySelector('a[href="/logistics/scan"]')`), false);
                await click('[aria-label="Search rider workspace"]');
                await until(() => evaluate('!!document.querySelector("#logistics-search")'), 'rider parcel search');
                assert.equal(await evaluate(`document.querySelector('#logistics-search-target option[value="riders"]') === null`), true);
                await set('#logistics-search', 'Browser Store');
                await click('[role="dialog"] button[type="submit"]');
                await until(() => evaluate('location.pathname === "/deliveries" && location.search.includes("search=")'), 'rider search results');
                await until(() => evaluate('document.body.innerText.includes("Browser Store")'), 'rider matching parcel');
                for (const queue of ['pickups', 'dispatch', 'monitoring', 'exceptions', 'cash', 'completed']) {
                    await navigate('/deliveries?stage=' + queue);
                    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
                }
                await navigate('/dashboard/rider');
                await click('[aria-label^="Rider notifications"]');
                await until(
                    () =>
                        evaluate('!!document.querySelector("[role=menu]") && !document.querySelector("[role=menu]").textContent.includes("Loading")'),
                    'rider notifications',
                );
                assert.equal(await evaluate('document.querySelectorAll("[role=menuitem]").length'), 5);
                assert.equal(await evaluate('document.querySelector("[role=menu]").textContent.includes("Rider applications")'), false);
                await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
                record('Rider workflows', 'Assigned-parcel search, six filtered queues and live notifications work without company management links');
                await navigate('/settings/profile');
                await until(() => evaluate('document.body.innerText.includes("Personal details")'), 'rider settings');
                for (const category of ['rider-details', 'registered-address', 'submitted-documents', 'contact-details']) {
                    await click('a[href="#' + category + '"]');
                    await until(() => evaluate('location.hash === "#' + category + '"'), 'rider settings category ' + category);
                    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
                }
                await until(() => evaluate('!!document.querySelector("#name")'), 'rider contact editor');
                await set('#name', 'Browser Rider Updated');
                await click('form[aria-busy] button[type="submit"], form[aria-busy] button:not([type])');
                await until(() => evaluate('document.body.innerText.includes("Changes saved.")'), 'save rider display name');
                await screenshot('rider-settings-desktop');
                await viewport(320, 900);
                assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
                await screenshot('rider-settings-mobile');
                await evaluate('document.documentElement.classList.add("dark")');
                await screenshot('rider-settings-mobile-dark');
                await evaluate('document.documentElement.classList.remove("dark")');
                record(
                    'Rider settings categories and save',
                    'Personal, rider, address, document and contact categories render; display name saves; mobile light/dark layouts have no overflow',
                );
                await viewport(1440, 1000);
                await navigate('/dashboard/rider');
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
            if (['buyer', 'seller', 'rider'].includes(role)) {
                await click('[aria-label="Open account menu"]');
                await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'account menu');
                assert.equal(await evaluate(`document.querySelector('[role="menu"]').textContent.includes("Log out")`), true);
                record(role + ' account menu', 'Topbar account menu exposes existing logout action');
            }
        }
        if (process.env.LUBOSMART_LAYOUT_MATRIX || process.env.LUBOSMART_WORKSPACE_DESIGN || process.env.LUBOSMART_RECORD_MENUS) {
            assert.deepEqual(errors, []);
            assert.deepEqual(consoleErrors, []);
            record('Responsive matrix runtime', 'No runtime exceptions or console errors');
            return;
        }
        // Exercise shared validation through authenticated settings.
        await navigate('/settings/password');
        await evaluate(`document.querySelector('#password').form.requestSubmit()`);
        await until(() => evaluate(`document.querySelectorAll('[data-client-invalid]').length > 0`), 'inline required feedback');
        assert.equal(await evaluate(`document.activeElement === document.querySelector('form :invalid')`), true);
        assert.equal(
            await evaluate(`(() => {
            const field = document.querySelector('[data-client-invalid]');
            const ids = field.getAttribute('aria-describedby').split(/\\s+/);
            return field.getAttribute('aria-invalid') === 'true' && ids.some(id => document.getElementById(id)?.textContent.includes('This field is required.'));
        })()`),
            true,
        );
        await set('#password', 'ValidPassword@2026');
        await until(() => evaluate(`!document.querySelector('#password').hasAttribute('data-client-invalid')`), 'inline feedback clears');
        await screenshot('dashboard-inline-validation');
        record(
            'Dashboard inline validation',
            'Empty submission shows associated inline feedback, focuses the first invalid field, and clears corrected feedback',
        );
        if (process.env.LUBOSMART_BROWSER_ROLES && !process.env.LUBOSMART_BROWSER_ACCOUNT_ACTIONS) {
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
        await viewport(320, 900);
        await navigate('/admin/compliance');
        assert.equal(await evaluate('document.querySelectorAll("[role=dialog]").length'), 0);
        const reviewTrigger = 'button[aria-label^="Review actions for "]';
        const reviewTriggerName = await evaluate('document.querySelector(' + JSON.stringify(reviewTrigger) + ').getAttribute("aria-label")');
        await click(reviewTrigger);
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'compliance action menu');
        await delay(250);
        assert.equal(await evaluate('document.querySelectorAll("[role=menuitem]").length'), 4);
        await screenshot('compact-compliance-menu-mobile');
        await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent==='Send a Warning').click()`);
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] select')`), 'compliance reason dialog');
        assert.equal(
            await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent==='Review Action').disabled`),
            true,
        );
        await set('[role="dialog"] select', 'Product outside the registered category');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent==='Review Action').click()`);
        await until(() => evaluate('document.querySelectorAll("[role=dialog]").length===2'), 'compliance confirmation');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent==='Cancel').click()`);
        await until(() => evaluate('document.querySelectorAll("[role=dialog]").length===1'), 'cancel compliance confirmation');
        await delay(250);
        assert.equal(await evaluate('document.querySelector("[role=dialog] select").value'), 'Product outside the registered category');
        await screenshot('compact-compliance-reason-mobile');
        record('Compliance review menu', 'Four existing actions, required reasons and review/confirmation cancellation preserve the chosen reason');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent==='Review Action').click()`);
        await until(() => evaluate('document.querySelectorAll("[role=dialog]").length===2'), 'confirm warning');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent==='Confirm Action').click()`);
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'saved compliance warning');
        await delay(250);
        assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), reviewTriggerName);
        await until(() => evaluate('!!document.querySelector("main details summary")'), 'saved compliance history');
        await evaluate('document.querySelector("main details summary").click()');
        assert.equal(await evaluate(`document.querySelector('main').innerText.includes('Product outside the registered category')`), true);
        record('Confirmed compliance save', 'Warning saves through existing backend, appears in review history and restores menu focus');
        await viewport(1440, 1000);
        await navigate('/admin/audit-log');
        assert.equal(await evaluate('document.querySelector("main input").getBoundingClientRect().width <= 400'), true);
        assert.equal(await evaluate('document.querySelector("main select").getBoundingClientRect().width <= 208'), true);
        assert.equal(await evaluate('document.querySelector("main input").getBoundingClientRect().height >= 44'), true);
        assert.equal(await evaluate(`document.body.innerText.includes('Filters update automatically.')`), false);
        assert.equal(await evaluate(`[...document.querySelectorAll('main a')].some(el=>el.textContent==='Reset')`), false);
        await screenshot('compact-activity-toolbar-desktop');
        await viewport(320, 900);
        await delay(250);
        assert.equal(
            await evaluate('getComputedStyle(document.querySelector("main select").parentElement.parentElement.parentElement).display'),
            'none',
        );
        await click('main form button[aria-controls]');
        assert.equal(await evaluate('document.querySelector("main form button[aria-controls]").getAttribute("aria-expanded")'), 'true');
        const activityAction = await evaluate('document.querySelector("main select").options[1].value');
        await set('main select', activityAction);
        await until(
            () =>
                evaluate(
                    'new URLSearchParams(location.search).get("action") === ' +
                        JSON.stringify(activityAction) +
                        ' && !document.querySelector("form[aria-busy=true]")',
                ),
            'compact action filter',
        );
        await set('main input', 'Synthetic filter search');
        await until(
            () =>
                evaluate(
                    'new URLSearchParams(location.search).get("search") === "Synthetic filter search" && !document.querySelector("form[aria-busy=true]")',
                ),
            'compact search',
        );
        await click('button[aria-label^="Remove Search:"]');
        await until(
            () => evaluate('!new URLSearchParams(location.search).get("search") && !document.querySelector("form[aria-busy=true]")'),
            'remove filter chip',
        );
        assert.equal(await evaluate('new URLSearchParams(location.search).get("action")'), activityAction);
        await screenshot('compact-activity-toolbar-mobile');
        await evaluate('document.documentElement.classList.add("dark")');
        await delay(300);
        await screenshot('compact-activity-toolbar-mobile-dark');
        await evaluate('document.documentElement.classList.remove("dark")');
        assert.equal(await evaluate(`[...document.querySelectorAll('main a, main button')].some(el=>el.textContent.trim()==='Reset')`), false);
        await set('main select', '');
        await until(
            () => evaluate('!new URLSearchParams(location.search).get("action") && !document.querySelector("form[aria-busy=true]")'),
            'clear compact action filter',
        );
        record(
            'Compact activity filters',
            'Capped desktop controls, mobile disclosure, readable chips, combined filters and automatic updates without Reset',
        );
        await viewport(1440, 1000);
        await navigate('/accounts');
        assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(el=>el.textContent.trim()==='Apply Filters')`), false);
        assert.equal(await evaluate(`!!document.querySelector('[aria-label="Active filters"]')`), false);
        assert.equal(await evaluate(`[...document.querySelectorAll('main a')].some(el=>el.textContent==='Reset')`), false);
        const historyBeforeFilters = await evaluate('history.length');
        await set('main input', 'No matching account');
        await set('main input', 'Browser');
        await until(
            () =>
                evaluate('new URLSearchParams(location.search).get("search") === "Browser" && !document.querySelector("main form[aria-busy=true]")'),
            'automatic account search',
        );
        await set('main select', 'buyer');
        await until(
            () => evaluate('new URLSearchParams(location.search).get("role") === "buyer" && !document.querySelector("main form[aria-busy=true]")'),
            'automatic role filter',
        );
        assert.equal(await evaluate('document.querySelector("main input").value'), 'Browser');
        assert.equal(await evaluate('history.length'), historyBeforeFilters);
        assert.equal(await evaluate('document.querySelector("main").innerText.includes("Browser buyer")'), true);
        assert.equal(await evaluate('document.querySelector("main").innerText.includes("Browser seller")'), false);
        await screenshot('automatic-account-filters-desktop');
        await viewport(320, 900);
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await screenshot('automatic-account-filters-mobile');
        await evaluate('document.documentElement.classList.add("dark")');
        await screenshot('automatic-account-filters-mobile-dark');
        await evaluate('document.documentElement.classList.remove("dark")');
        await viewport(1440, 1000);
        record('Automatic account filters', 'Search and role changes apply without a button, preserve combined values and history, and fit 320px');
        await evaluate(
            `Array.from(document.querySelectorAll('button[aria-pressed]')).find(button => button.textContent.trim() === 'Sellers').click()`,
        );
        await until(
            () => evaluate(`new URLSearchParams(location.search).get('role') === 'seller' && document.querySelector('main input')?.value === ''`),
            'account role tab clears the previous search',
        );
        assert.equal(await evaluate(`new URLSearchParams(location.search).has('search')`), false);
        record('Account tab filters', 'Switching role tabs clears the previous search');
        if (process.env.LUBOSMART_BROWSER_FILTERS_ONLY) {
            assert.deepEqual(errors, []);
            assert.deepEqual(consoleErrors, []);
            record('Filter runtime errors', 'Zero browser runtime exceptions or console errors');
            return;
        }
        if (process.env.LUBOSMART_BROWSER_COMPACT_FILTERS) {
            await navigate('/accounts');
            await click('button[data-account-id="1"]');
            await until(() => evaluate(`!!document.querySelector('[role="dialog"] dl')`), 'account details modal');
            assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Registration: Approved')`), true);
            for (const width of [320, 768, 1440]) {
                await viewport(width, 900);
                await delay(250);
                assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
                await screenshot('compact-account-details-modal-' + width);
            }
            await viewport(320, 900);
            await evaluate('document.documentElement.classList.add("dark")');
            await delay(300);
            await screenshot('compact-account-details-modal-dark');
            await evaluate('document.documentElement.classList.remove("dark")');
            await click('button[role="dialog"] > button');
            await delay(250);
            assert.equal(await evaluate('document.activeElement.getAttribute("data-account-id")'), '1');
            record(
                'Registration status in account summary',
                'Compact status appears in the account details modal, reflows across widths and preserves close/focus behavior',
            );
            assert.deepEqual(errors, []);
            assert.deepEqual(consoleErrors, []);
            record('Dashboard runtime errors', 'Zero browser runtime exceptions or console errors');
            return;
        }
        await navigate('/accounts');
        assert.equal(await evaluate(`Array.from(document.querySelectorAll('select option')).some(el=>el.value==='rider')`), false);
        await click('[aria-label="Search Admin Workspace"]');
        await until(() => evaluate(`!!document.querySelector('input[aria-label="Search term"]')`), 'search dialog');
        await set('input[aria-label="Search term"]', 'Browser');
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] li')`), 'search results');
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Browser rider')`), false);
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        record('Admin role filters and workspace search', 'Rider option and Rider search results are absent');
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close workspace search');
        await delay(250);
        await click('button[aria-label="Actions for Browser buyer"]');
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'account action menu');
        assert.equal(await evaluate(`document.querySelectorAll('[role="menu"]').length`), 1);
        await viewport(320, 900);
        await delay(250);
        assert.equal(
            await evaluate(
                `(() => { const r=document.querySelector('[role="menu"]').getBoundingClientRect(); return r.left>=-1 && r.right<=innerWidth+1 && r.top>=-1 && r.bottom<=innerHeight+1; })()`,
            ),
            true,
        );
        await screenshot('account-action-menu-mobile');
        await viewport(1440, 1000);
        await delay(250);
        assert.equal(
            await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].some(el=>el.textContent.trim()==='View activity history')`),
            true,
        );
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await until(() => evaluate(`!document.querySelector('[role="menu"]')`), 'dismiss account menu');
        assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Actions for Browser buyer');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'keyboard open account menu');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] dl')`), 'account details');
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Manage Access')`), false);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Role details')`), false);
        for (const [width, height] of [
            [1440, 1000],
            [768, 1024],
            [844, 390],
            [320, 900],
        ]) {
            await viewport(width, height);
            await delay(250);
            await screenshot('account-details-' + width + 'x' + height);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            assert.equal(
                await evaluate(
                    `(() => { const r=document.querySelector('[role="dialog"]').getBoundingClientRect(); return r.left>=-1 && r.right<=innerWidth+1 && r.top>=-1 && r.bottom<=innerHeight+1; })()`,
                ),
                true,
            );
        }
        await evaluate('document.documentElement.classList.add("dark")');
        await delay(300);
        await screenshot('account-details-mobile-dark');
        await evaluate('document.documentElement.classList.remove("dark")');
        await viewport(1440, 1000);
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Supporting documents').click()`);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('View identity')`), true);
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('bir 2303')`), false);
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        record('Admin account details', 'Details open without access mutation controls');
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close account details');
        await delay(250);
        assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Actions for Browser buyer');
        await click('button[aria-label="Actions for Browser buyer"]');
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'history action menu');
        await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent.trim()==='View activity history').click()`);
        await until(() => evaluate(`!!document.querySelector('section[aria-label="Activity history"]')`), 'direct account history');
        await screenshot('account-activity-history');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close history');
        await delay(250);
        record('Account action menu', 'Keyboard opening, selection, Escape dismissal, direct activity history and focus restoration work');
        await click('button[aria-label="Actions for Browser buyer"]');
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'outside-dismiss menu');
        await delay(250);
        await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 8, y: 8, button: 'left', clickCount: 1 });
        await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 8, y: 8, button: 'left', clickCount: 1 });
        await until(() => evaluate(`!document.querySelector('[role="menu"]')`), 'outside dismiss');
        await evaluate(
            `window.accountTestFetch = window.fetch; window.fetch = async (...args) => { const response = await window.accountTestFetch(...args); if (String(args[0]).startsWith('/accounts/')) { const payload = await response.json(); payload.applicationId = null; return new Response(JSON.stringify(payload), {headers: {'Content-Type': 'application/json'}}); } return response; };`,
        );
        await click('button[aria-label="Actions for Browser buyer"]');
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'fallback action menu');
        await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent.trim()==='View details').click()`);
        await until(
            () => evaluate(`document.querySelector('[role="dialog"]')?.textContent.includes('No registration application is available')`),
            'saved account fallback',
        );
        assert.equal(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('buyer@dashboard.example.com')`), true);
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Activity history').click()`);
        assert.equal(await evaluate(`!!document.querySelector('section[aria-label="Activity history"]')`), true);
        await evaluate(
            `[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click(); window.fetch = window.accountTestFetch;`,
        );
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close fallback');
        await delay(250);
        record('Saved account fallback', 'Simulated missing application preserves saved information and navigable history');
        await evaluate(`window.fetch = async () => new Response('{}', {status: 403});`);
        await click('button[aria-label="Actions for Browser buyer"]');
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'error action menu');
        await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent.trim()==='View details').click()`);
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] [role="alert"]')`), 'details load error');
        await evaluate(
            `window.fetch = window.accountTestFetch; [...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Try Again').click();`,
        );
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] dl')`), 'details retry');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close retry');
        await delay(250);
        record('Account detail errors', 'Simulated denied response shows an error and retry loads fresh authorized details');
        await click('[aria-label^="Notifications,"]');
        await until(() => evaluate(`!!document.querySelector('ul[aria-label="Notification history"]')`), 'notification popover');
        await until(
            () => evaluate(`document.body.textContent.includes("You're all caught up. New notifications will appear here.")`),
            'notification empty state',
        );
        assert.equal(await evaluate(`!!document.querySelector('a[href="/notifications"]')`), true);
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await until(() => evaluate(`!document.querySelector('ul[aria-label="Notification history"]')`), 'close notifications');
        record('Admin notifications', 'Live notification menu loads with keyboard accessible destinations and an empty state');
        await click('button[aria-label="Actions for Browser buyer"]');
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'access action menu');
        await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent.trim()==='Manage access').click()`);
        await until(() => evaluate(`document.querySelectorAll('[role="dialog"] select').length===2`), 'access modal');
        assert.equal(
            await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Review Action').disabled`),
            true,
        );
        await viewport(320, 900);
        await screenshot('account-access-mobile');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await viewport(1440, 1000);
        await evaluate(
            `(() => { const el=document.querySelectorAll('[role="dialog"] select')[1]; const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(el,el.options[1].value); el.dispatchEvent(new Event('change',{bubbles:true})); })()`,
        );
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Review Action').click()`);
        await until(() => evaluate(`document.querySelectorAll('[role="dialog"]').length===2`), 'access confirmation');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Cancel').click()`);
        await until(() => evaluate(`document.querySelectorAll('[role="dialog"]').length===1`), 'cancel confirmation');
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'dismiss access modal');
        await delay(250);
        assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Actions for Browser buyer');
        record('Admin access modal', 'Allowed actions load, confirmation opens, cancellation preserves account state and focus returns to trigger');
        const changeBuyerAccess = async (status, reason) => {
            await click('button[aria-label="Actions for Browser buyer"]');
            await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'status action menu');
            await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent.trim()==='Manage access').click()`);
            await until(() => evaluate(`document.querySelectorAll('[role="dialog"] select').length===2`), 'status form');
            await set('[role="dialog"] select', status);
            await evaluate(
                `(() => { const el=document.querySelectorAll('[role="dialog"] select')[1]; const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(el,${JSON.stringify(reason)}); el.dispatchEvent(new Event('change',{bubbles:true})); })()`,
            );
            await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Review Action').click()`);
            await until(() => evaluate(`document.querySelectorAll('[role="dialog"]').length===2`), 'status review');
            await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Confirm Action').click()`);
            await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'saved status');
            await delay(250);
            const saved = await evaluate(`fetch('/accounts/1', {headers: {Accept: 'application/json'}}).then(r=>r.json())`);
            assert.equal(saved.account.status, status);
            assert.equal(
                saved.history.some((event) => JSON.parse(event.changes || '{}').reason === reason),
                true,
            );
            assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Actions for Browser buyer');
        };
        await changeBuyerAccess('suspended', 'Platform policy violation');
        await click('button[aria-label="Actions for Browser buyer"]');
        await until(() => evaluate(`!!document.querySelector('[role="menu"]')`), 'suspended details menu');
        await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent.trim()==='View details').click()`);
        await until(() => evaluate(`!!document.querySelector('[role="dialog"] dl')`), 'suspended details');
        assert.equal(
            await evaluate(
                `document.querySelector('[role="dialog"]').textContent.includes('suspended') && document.querySelector('[role="dialog"]').textContent.includes('Registration: Approved')`,
            ),
            true,
        );
        await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent.trim()==='Close').click()`);
        await until(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'close suspended details');
        await delay(250);
        await changeBuyerAccess('approved', 'Account access restored after review');
        record(
            'Confirmed account access saves',
            'Synthetic buyer suspension and reactivation save on server, retain audit reasons, restore focus and keep registration status separate',
        );
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
        await delay(250);
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
            JSON.stringify({ date: new Date().toISOString(), isolation: 'temporary SQLite, fake notifications and PSGC', checks }, null, 2),
        );
        if (socket) socket.close();
        for (const process of processes.reverse()) process.kill();
        // Keep disposable profile/database for diagnosis; no customer data used.
    }
})();
