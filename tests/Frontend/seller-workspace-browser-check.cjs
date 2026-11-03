const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'storage/app/seller-workspace-ui-check');
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
        const seed = spawnSync('php', ['tests/Fixtures/seller-workspace-seed.php'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
        assert.equal(seed.status, 0, seed.stderr);
        const fixtures = JSON.parse(fs.readFileSync(path.join(stage, 'operations.json'), 'utf8'));
        console.log('Seller fixtures ready');
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
        await until(async () => {
            try {
                return (await fetch(env.APP_URL + '/login', { signal: AbortSignal.timeout(2000) })).ok;
            } catch {
                return false;
            }
        }, 'fixture server ready');
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
        const inventoryRequests = [];
        const checkoutRequests = [];
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.id) {
                const entry = pending.get(message.id);
                if (entry) {
                    pending.delete(message.id);
                    if (message.error) entry.reject(Error(message.error.message));
                    else entry.resolve(message.result);
                }
            } else if (message.method === 'Network.requestWillBeSent') {
                const request = message.params.request;
                const pathname = new URL(request.url).pathname;
                if (request.postData && pathname.startsWith('/inventory')) inventoryRequests.push(JSON.parse(request.postData));
                if (request.postData && pathname === '/checkout') checkoutRequests.push(JSON.parse(request.postData));
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
        const acceptConfirmation = async (label) => {
            await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'confirmation modal');
            if (label === 'Place COD order') await screenshot('buyer-checkout-confirmation-mobile');
            if (label === 'Request print') {
                await cdp('Emulation.setEmulatedMedia', { media: 'print' });
                assert.equal(await evaluate('getComputedStyle(document.querySelector("[role=dialog]")).display'), 'none');
                assert.equal(await evaluate('getComputedStyle(document.querySelector("[role=dialog]").previousElementSibling).display'), 'none');
                assert.equal(await evaluate(`getComputedStyle(document.querySelector('[aria-label="Action notifications"]')).display`), 'none');
                await cdp('Emulation.setEmulatedMedia', { media: 'screen' });
            }

            await evaluate(
                `[...document.querySelectorAll('[role=dialog] button')].find(el=>el.textContent.trim()===${JSON.stringify(label)}).click()`,
            );
        };
        const navigate = async (route) => {
            await cdp('Page.bringToFront');
            await cdp('Page.navigate', { url: env.APP_URL + route });
            await until(() => evaluate('!!document.querySelector("#app") && !!document.querySelector("h1")'), 'render ' + route);
            await delay(250);
        };
        const viewport = async (width, height) =>
            cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
        const screenshot = async (name) => {
            await evaluate('window.scrollTo(0,0)');
            await delay(100);
            const data = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
            fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(data.data, 'base64'));
        };
        const record = (name, details) => {
            checks.push({ name, status: 'PASS', details });
            console.log('PASS: ' + name);
        };
        const click = async (selector) => {
            const point = await evaluate(
                `(() => { const el = document.querySelector(${JSON.stringify(selector)}); const target = el.type === 'radio' ? el.closest('label') : el; target.scrollIntoView({block:'center'}); const rect=target.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`,
            );
            await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
            await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
        };
        const set = async (selector, value) => {
            await until(
                () =>
                    evaluate(
                        `(() => { const el=document.querySelector(${JSON.stringify(selector)}); return !!el && (!(el instanceof HTMLSelectElement) || [...el.options].some(option=>option.value===${JSON.stringify(value)})); })()`,
                    ),
                'input ready: ' + selector,
            );
            return evaluate(
                `(() => { const el=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement?HTMLSelectElement.prototype:el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.focus();el.blur(); })()`,
            );
        };

        const byLabel = async (text) =>
            evaluate(
                `'[id='+JSON.stringify([...document.querySelectorAll('label')].find(el=>el.textContent.startsWith(${JSON.stringify(text)})).htmlFor)+']'`,
            );
        await navigate('/login');
        await set('input[type=email]', 'seller@example.test');
        await set('input[type=password]', 'Browser@2026');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname !== "/login"'), 'seller login');
        await viewport(1280, 900);
        await navigate('/dashboard/seller');
        assert.equal(await evaluate(`document.querySelectorAll('nav[aria-label="Seller order queues"] a').length`), 8);
        await screenshot('seller-dashboard-desktop');
        record('Seller dashboard', 'Real order queues, proceeds, and shared operational charts render');
        await click('button[aria-label^="Seller notifications"]');
        await until(
            () => evaluate(`!!document.querySelector('[role="menu"]') && !document.body.innerText.includes("Loading notifications")`),
            'notification counts',
        );
        assert.equal(await evaluate(`document.querySelector('[role="menu"]').innerText.includes("Low stock")`), true);
        await screenshot('seller-notifications');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        record('Live seller tasks', 'Notifications display store-scoped preparation and inventory queues');
        await click('button[aria-label="Search seller workspace"]');
        await set('#logistics-search', fixtures.pending.tracking);
        await evaluate(`document.querySelector('[role="dialog"] form').requestSubmit()`);
        await until(() => evaluate(`location.pathname==="/orders" && !document.querySelector('[role="dialog"]')`), 'seller search');
        assert.equal(await evaluate('document.body.innerText.includes("1 matching parcel")'), true);
        await evaluate(
            '(()=>{const button=[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Start preparing"));button.focus();button.click()})()',
        );
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'preparation confirmation');
        await screenshot('seller-preparation-confirmation');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'cancel preparation confirmation');
        assert.equal(await evaluate('document.activeElement.textContent.includes("Start preparing")'), true);
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Start preparing")).click()');
        await acceptConfirmation('Start preparing');
        await until(() => evaluate('document.body.innerText.includes("Mark ready for pickup")'), 'start preparation');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Mark ready for pickup")).click()');
        await acceptConfirmation('Mark ready for pickup');
        await until(() => evaluate('document.body.innerText.includes("Parcel ready for logistics company pickup")'), 'ready for pickup');
        await navigate('/orders?stage=ready');
        assert.equal(await evaluate('document.body.innerText.includes("2 matching parcels")'), true);
        record('Order search and preparation', 'Search finds one parcel; preparation and ready actions update the pickup queue');
        await navigate('/inventory?status=low-stock');
        assert.equal(await evaluate('document.body.innerText.includes("Browser tote")'), true);
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Edit").click()');
        const stockSelector = await evaluate(
            '"[id="+JSON.stringify([...document.querySelectorAll("label")].find(el=>el.textContent.includes("Available stock")).htmlFor)+"]"',
        );
        await set(stockSelector, '12');
        const weightSelector = await evaluate(
            '"[id="+JSON.stringify([...document.querySelectorAll("label")].find(el=>el.textContent.includes("Packed weight per item")).htmlFor)+"]"',
        );
        await set(weightSelector, '250');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Save product")).click()');
        await acceptConfirmation('Save product');
        await until(() => evaluate('document.body.innerText.includes("No matching products")'), 'restock removes low stock');
        await navigate('/inventory');
        assert.equal(
            await evaluate('document.body.innerText.includes("12 in stock") && document.body.innerText.includes("250 g packed weight")'),
            true,
        );
        record('Inventory restock and weight', 'Saving stock and packed weight updates inventory and removes the low-stock result');
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent==='Size/color options').click()`);
        for (const [index, name] of ['Small / Purple', 'Large / Orange'].entries()) {
            await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Add option').click()`);
            await set(`fieldset:nth-of-type(${index + 1}) input`, name);
            await set(`fieldset:nth-of-type(${index + 1}) input[type=number]`, '6');
        }
        await viewport(320, 800);
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
        await screenshot('seller-variants-mobile');
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Save options').click()`);
        await acceptConfirmation('Save variants');
        await until(() => evaluate('document.body.innerText.includes("Size/color options saved")'), 'save seller variants');
        await navigate('/seller/vouchers');
        await set(await byLabel('Voucher code'), 'BROWSER-25');
        await set(await byLabel('Discount (PHP)'), '25');
        await set(await byLabel('Minimum store subtotal'), '100');
        await set(await byLabel('Expires at'), new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Create voucher').click()`);
        await until(() => evaluate('document.body.innerText.includes("Voucher created")'), 'save seller voucher');
        record('Seller variants and vouchers', 'Seller saves two option stock counts and creates a fixed peso voucher');
        await navigate('/orders/' + fixtures.pending.id + '/waybill');
        assert.equal(await evaluate('!!document.querySelector("svg")'), true);
        await evaluate('window.__printed=0;window.print=()=>window.__printed++');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Print waybill")).click()');
        await acceptConfirmation('Request print');
        await until(() => evaluate('window.__printed===1'), 'audited waybill print');
        const labelPdf = await cdp('Page.printToPDF', { printBackground: true });
        fs.writeFileSync(path.join(output, 'seller-waybill-print.pdf'), Buffer.from(labelPdf.data, 'base64'));
        record('Waybill', 'Barcode renders and audited print roundtrip succeeds');
        await navigate('/reports');
        assert.equal(await evaluate('document.body.innerText.includes("Seller Proceeds")'), true);
        await navigate('/support?kind=message');
        await navigate('/settings/profile');
        await evaluate('document.querySelector(\'a[href="#business-details"]\').click()');
        await until(() => evaluate('document.body.innerText.includes("Bank account details")'), 'seller bank settings');
        await evaluate('document.querySelector(\'a[href="#contact-details"]\').click()');
        await until(() => evaluate('!!document.querySelector("#name")'), 'seller contact settings');
        await set('#name', 'Seller Updated');
        const passwordSelector = await evaluate(
            '"[id="+JSON.stringify([...document.querySelectorAll("label")].find(el=>el.textContent.includes("Current password")).htmlFor)+"]"',
        );
        await set(passwordSelector, 'Browser@2026');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Save changes")).click()');
        await until(() => evaluate('document.body.innerText.includes("Changes saved")'), 'seller contact save');
        record('Reports messages settings', 'Existing seller reports, messaging, and profile pages load');
        for (const route of ['/dashboard/seller', '/orders?stage=ready', '/inventory']) {
            for (const width of [320, 768, 1280]) {
                await viewport(width, 800);
                await navigate(route);
                for (const theme of ['light', 'dark']) {
                    await evaluate('document.documentElement.classList.toggle("dark",' + (theme === 'dark') + ')');
                    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, route + ' ' + width + ' ' + theme);
                    if (width === 320) await screenshot('seller-' + route.split('?')[0].replaceAll('/', '-') + '-' + theme + '-320');
                }
            }
        }
        record('Responsive themes', 'Dashboard, orders and inventory fit 320px, 768px and 1280px in light and dark themes');
        await evaluate(
            `fetch('/logout', {method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(value=>value.startsWith('XSRF-TOKEN=')).slice('XSRF-TOKEN='.length))}}).then(response=>{if(!response.ok)throw Error('Logout failed')})`,
        );
        await navigate('/login');
        await set('input[type=email]', 'buyer@example.test');
        await set('input[type=password]', 'Browser@2026');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname !== "/login"'), 'buyer login');
        await viewport(1280, 900);
        await navigate('/dashboard/buyer');
        assert.equal(
            await evaluate(`!!document.querySelector('a[href="/wishlist"]') && !!document.querySelector('a[href="/orders?stage=issues"]')`),
            true,
        );
        await screenshot('buyer-dashboard-desktop');
        await navigate('/orders?search=' + fixtures.pending.tracking);
        assert.equal(await evaluate('document.body.innerText.includes("1 matching parcel")'), true);
        await evaluate(`[...document.querySelectorAll('summary')].find(el=>el.textContent.includes('Parcel handover history')).click()`);
        assert.equal(
            await evaluate('document.body.innerText.includes("Not recorded") && document.body.innerText.includes("Collected from seller")'),
            true,
        );
        const queueSelector = await evaluate(
            `'[id='+JSON.stringify([...document.querySelectorAll('label')].find(el=>el.textContent==='Order queue').htmlFor)+']'`,
        );
        await set(queueSelector, 'completed');
        await evaluate(`document.querySelector('input[type=search]').closest('form').requestSubmit()`);
        await until(() => evaluate('document.body.innerText.includes("No matching orders")'), 'buyer combined search and queue');
        await navigate('/orders?stage=completed');
        assert.equal(
            await evaluate('document.body.innerText.includes("1 matching parcel") && document.body.innerText.includes("Delivered successfully")'),
            true,
        );
        record('Buyer dashboard and tracking', 'Owned purchase search, combined filters, completed queue and recorded handover history render');
        await evaluate(`[...document.querySelectorAll('summary')].find(el=>el.textContent.includes('Rate your purchase')).click()`);
        await set(await byLabel('Your experience'), 'Comfortable and well made.');
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Save review').click()`);
        await until(() => evaluate('document.body.innerText.includes("Your verified-purchase review was saved")'), 'save verified review');
        await navigate('/products/' + fixtures.product.id);
        assert.equal(
            await evaluate(
                'document.body.innerText.includes("Comfortable and well made.") && document.body.innerText.includes("Verified purchase reviews (1)")',
            ),
            true,
        );
        // A separate authenticated seller session writes while the buyer page stays open.
        const sellerCookies = new Map();
        const sessionRequest = async (cookies, route, data) => {
            const response = await fetch(env.APP_URL + route, {
                method: data ? 'POST' : 'GET',
                redirect: 'manual',
                headers: {
                    Accept: 'text/html',
                    Cookie: [...cookies].map(([key, value]) => key + '=' + value).join('; '),
                    ...(data ? { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(cookies.get('XSRF-TOKEN')) } : {}),
                },
                ...(data ? { body: JSON.stringify(data) } : {}),
            });
            for (const cookie of response.headers.getSetCookie()) {
                const pair = cookie.split(';')[0],
                    split = pair.indexOf('=');
                cookies.set(pair.slice(0, split), pair.slice(split + 1));
            }
            return response;
        };
        const sellerRequest = (route, data) => sessionRequest(sellerCookies, route, data);
        assert.equal((await sellerRequest('/login')).status, 200);
        assert.equal((await sellerRequest('/login', { email: 'seller@example.test', password: 'Browser@2026' })).status, 302);
        await navigate('/orders?search=' + fixtures.processing.id);
        await evaluate(`[...document.querySelectorAll('summary')].find(el=>el.textContent.includes('Order conversation')).click()`);
        const draftSelector = await byLabel('Your message');
        await set(draftSelector, 'Keep this unfinished buyer message.');
        // Start after the initial status baseline is present.
        await until(() => evaluate(`!!document.querySelector('a[aria-label^="Open shopping bag,"]')`), 'buyer workspace baseline');
        const liveStarted = Date.now();
        assert.equal(
            (await sellerRequest('/orders/' + fixtures.processing.id + '/messages', { body: 'Live seller update from another account.' })).status,
            302,
        );
        await until(() => evaluate('document.body.innerText.includes("Live seller update from another account.")'), 'cross-account message refresh');
        const liveElapsed = Date.now() - liveStarted;
        assert.ok(liveElapsed <= 5000, 'Cross-account update took ' + liveElapsed + 'ms');
        assert.equal(await evaluate('document.querySelector(' + JSON.stringify(draftSelector) + ').value'), 'Keep this unfinished buyer message.');
        record(
            'Live cross-account updates',
            'A separate signed-in seller message appeared after ' + liveElapsed + 'ms; the buyer draft stayed intact.',
        );
        await navigate('/products/' + fixtures.product.id);
        for (const name of ['Small / Purple', 'Large / Orange']) {
            const option = await evaluate(
                `[...document.querySelectorAll('article select option')].find(el=>el.textContent.includes(${JSON.stringify(name)})).value`,
            );
            await set('article select', option);
            await click('button[aria-label^="Add Browser tote"]');
            await until(() => evaluate('document.body.innerText.includes("Added to cart")'), 'add variant to cart');
            await navigate('/products/' + fixtures.product.id);
        }
        await navigate('/cart');
        assert.equal(
            await evaluate('document.body.innerText.includes("Small / Purple") && document.body.innerText.includes("Large / Orange")'),
            true,
        );
        for (const [label, value] of Object.entries({
            'Recipient name': 'Browser buyer',
            'Phone number': '09123456789',
            'Street, house': 'Test street',
            Barangay: 'Test barangay',
            'City / municipality': 'Manila',
            Province: 'Metro Manila',
            Region: 'NCR',
            'Postal code': '1000',
        })) {
            await set(await byLabel(label), value);
        }
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Save address').click()`);
        await until(() => evaluate('!!document.querySelector(\'input[name="delivery-address"]:checked\')'), 'new address selected');
        await set(await byLabel('Store voucher code'), 'BROWSER-25');
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Apply voucher').click()`);
        await until(() => evaluate('document.body.innerText.includes("BROWSER-25 applied")'), 'voucher preview');
        assert.equal(await evaluate('document.body.innerText.includes("225.00")'), true);
        await viewport(320, 800);
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
        await screenshot('buyer-variant-voucher-cart-mobile');
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Place COD order').click()`);
        await acceptConfirmation('Place COD order');
        await until(
            () => evaluate('location.pathname==="/orders" && document.body.innerText.includes("placed. Pay cash upon delivery")'),
            'discounted COD checkout',
        );
        assert.equal(await evaluate('document.body.innerText.includes("Voucher BROWSER-25") && document.body.innerText.includes("225.00")'), true);
        record(
            'Buyer variants voucher checkout and review',
            'Verified review is public; two options remain separate; first saved address selects automatically; voucher total is confirmed at checkout',
        );
        for (const route of ['/dashboard/buyer', '/orders?stage=ready']) {
            for (const width of [320, 768, 1280]) {
                await viewport(width, 800);
                await navigate(route);
                for (const theme of ['light', 'dark']) {
                    await evaluate('document.documentElement.classList.toggle("dark",' + (theme === 'dark') + ')');
                    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, route + ' ' + width + ' ' + theme);
                    if (width === 320 && theme === 'dark') await screenshot('buyer-' + route.split('?')[0].split('/')[1] + '-mobile-dark');
                }
            }
        }
        record('Buyer responsive themes', 'Buyer dashboard and tracking reflow at 320px, 768px and 1280px in light and dark themes');
        await evaluate(
            `fetch('/logout', {method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(value=>value.startsWith('XSRF-TOKEN=')).slice('XSRF-TOKEN='.length))}}).then(response=>{if(!response.ok)throw Error('Logout failed')})`,
        );
        await navigate('/login');
        await set('input[type=email]', 'admin@example.test');
        await set('input[type=password]', 'Browser@2026');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname!=="/login"'), 'admin login');
        await navigate('/admin/product-reviews');
        assert.equal(await evaluate('document.body.innerText.includes("Comfortable and well made.")'), true);
        await viewport(320, 800);
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
        await screenshot('admin-review-moderation-mobile');
        await set(await byLabel('Review visibility'), 'hidden');
        await set(await byLabel('Moderation reason'), 'Private details removed after review.');
        await evaluate(`[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Save moderation decision').click()`);
        await until(() => evaluate('document.body.innerText.includes("Review visibility updated")'), 'admin moderation save');
        await navigate('/products/' + fixtures.product.id);
        assert.equal(
            await evaluate(
                '!document.body.innerText.includes("Comfortable and well made.") && document.body.innerText.includes("Verified purchase reviews (0)")',
            ),
            true,
        );
        record('Admin review moderation', 'Admin hides a review with a reason; the public product page removes it from reviews and ratings');
        const signIn = async (email) => {
            await evaluate(
                `fetch('/logout', {method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(value=>value.startsWith('XSRF-TOKEN=')).slice('XSRF-TOKEN='.length))}}).then(response=>{if(!response.ok)throw Error('Logout failed')})`,
            );
            await navigate('/login');
            await set('input[type=email]', email);
            await set('input[type=password]', 'Browser@2026');
            await click('button[type=submit]');
            await until(() => evaluate('location.pathname!=="/login"'), 'login ' + email);
        };
        const openAction = async (title) =>
            evaluate(`[...document.querySelectorAll('summary, button')].find(el=>el.textContent.trim()===${JSON.stringify(title)}).click()`);
        const confirmAction = async (title) =>
            evaluate(
                `[...document.querySelectorAll('button')].find(el=>el.textContent.trim()===${JSON.stringify('Confirm: ' + title.toLowerCase())}).click()`,
            );
        await navigate('/settlements');
        await openAction('Record seller payout');
        await set(await byLabel('Unique payment reference'), 'BROWSER-SELLER-PAY');
        await confirmAction('Record seller payout');
        await until(() => evaluate('document.body.innerText.includes("Manual seller payout recorded")'), 'record seller payout');
        await signIn('buyer@example.test');
        await navigate('/returns?parcel=' + fixtures.completed.id);
        await openAction('Request a return');
        await set(await byLabel('Return reason'), 'The whole parcel needs to be returned.');
        await confirmAction('Request a return');
        await until(() => evaluate('document.body.innerText.includes("Return requested for the whole parcel")'), 'buyer return request');
        await signIn('admin@example.test');
        await navigate('/returns');
        await openAction('Approve return');
        await set(await byLabel('Reason / handover notes'), 'Approved after buyer and seller review.');
        await confirmAction('Approve return');
        await until(() => evaluate('document.body.innerText.includes("Return action recorded")'), 'return approval');
        await signIn('logistics@example.test');
        await navigate('/returns');
        await openAction('Assign return rider');
        const riderValue = await evaluate(`[...document.querySelectorAll('select option')].find(el=>el.textContent==='Browser Rider').value`);
        await set(await byLabel('Return rider'), riderValue);
        await set(await byLabel('Reason / handover notes'), 'Assigning our rider for approved return.');
        await confirmAction('Assign return rider');
        await until(() => evaluate('document.body.innerText.includes("Return action recorded")'), 'return rider assignment');
        await navigate('/rider-payments');
        await openAction('Record rider fee');
        await set(await byLabel('Rider'), riderValue);
        await set(await byLabel('Completed work'), 'delivery');
        await set(await byLabel('Agreed fee'), '45');
        await set(await byLabel('Fee agreement'), 'Agreed completed delivery fee.');
        await confirmAction('Record rider fee');
        await until(() => evaluate('document.body.innerText.includes("Rider fee recorded by Logistics")'), 'rider fee');
        await openAction('Record rider payment');
        await set(await byLabel('Actual payment reference'), 'BROWSER-RIDER-PAY');
        await confirmAction('Record rider payment');
        await until(() => evaluate('document.body.innerText.includes("Manual rider payment recorded by Logistics")'), 'rider payment');
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
        await screenshot('logistics-rider-payments-mobile');
        await signIn('rider@example.test');
        await navigate('/rider-payments');
        assert.equal(
            await evaluate(
                'document.body.innerText.includes("45.00") && document.body.innerText.includes("BROWSER-RIDER-PAY") && !document.querySelector("form")',
            ),
            true,
        );
        await navigate('/returns');
        await openAction('Confirm return collection');
        await set(await byLabel('Scan or enter'), fixtures.completed.tracking);
        await set(await byLabel('Reason / handover notes'), 'Collected the physical return from buyer.');
        await confirmAction('Confirm return collection');
        await until(() => evaluate('document.body.innerText.includes("Return action recorded")'), 'return physical collection');
        await signIn('seller@example.test');
        await navigate('/returns');
        await openAction('Confirm returned goods receipt');
        await set(await byLabel('Scan or enter'), fixtures.completed.tracking);
        await set(await byLabel('Returned goods condition'), 'damaged');
        await set(await byLabel('Reason / handover notes'), 'Received the damaged return without restocking.');
        await confirmAction('Confirm returned goods receipt');
        await until(() => evaluate('document.body.innerText.includes("Return action recorded")'), 'seller return receipt');
        await navigate('/seller/costs');
        await openAction('Record seller cost');
        await set(await byLabel('Cost date'), '2026-10-25');
        await set(await byLabel('Cost category'), 'packaging');
        await set(await byLabel('Cost description'), 'Actual packaging materials cost.');
        await set(await byLabel('Cost (PHP)'), '20');
        await confirmAction('Record seller cost');
        await until(() => evaluate('document.body.innerText.includes("Seller cost recorded")'), 'seller cost');
        await signIn('admin@example.test');
        await navigate('/returns');
        await openAction('Record manual refund');
        await set(await byLabel('Unique refund payment reference'), 'BROWSER-REFUND');
        await set(await byLabel('Reason / handover notes'), 'Actual approved product refund paid manually.');
        await confirmAction('Record manual refund');
        await until(() => evaluate('document.body.innerText.includes("Recorded manual refund")'), 'manual refund recorded');
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
        await screenshot('admin-return-refund-mobile');
        await signIn('seller@example.test');
        await navigate('/seller/costs');
        assert.equal(
            await evaluate(`document.body.innerText.includes(new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(-90))`),
            true,
        );
        await screenshot('seller-costs-refund-balance-mobile');
        record(
            'Cross-role finance and returns',
            'Admin seller payout, Logistics-only rider fee/payment, buyer request, approved return assignment, rider collection, seller receipt, manual refund and seller debt all complete through real forms',
        );
        assert.ok(
            inventoryRequests.some((request) => request.expected_stock === 3 && request.stock === 12),
            'Product edit sends the original stock snapshot',
        );
        assert.ok(
            inventoryRequests.some((request) => request.expected_stock === 12 && request.variants?.length === 2),
            'Variant creation sends the original product stock snapshot',
        );
        assert.ok(
            checkoutRequests.some(
                (request) =>
                    request.expected_shipping_total === '50.00' &&
                    request.expected_items_subtotal === '200.00' &&
                    request.expected_discount_total === '25.00',
            ),
            'Flat-fee checkout sends reviewed shipping, item subtotal and voucher discount',
        );
        record(
            'Reviewed checkout and inventory snapshots',
            'Real forms send original stock and reviewed flat shipping totals alongside subtotal and voucher snapshots',
        );
        await navigate('/inventory');
        const integrityCategory = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.categories[0].id');
        assert.equal(
            (
                await sellerRequest('/inventory', {
                    name: 'Stock integrity bag',
                    category_id: integrityCategory,
                    price: '120.00',
                    stock: 5,
                    status: 'active',
                })
            ).status,
            302,
        );
        await navigate('/inventory');
        const integrityProduct = await evaluate(
            'JSON.parse(document.querySelector("#app").dataset.page).props.products.data.find(product=>product.name==="Stock integrity bag").id',
        );
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Edit").click()');
        const integrityStockInput = await byLabel('Available stock');
        assert.equal(await evaluate('document.querySelector(' + JSON.stringify(integrityStockInput) + ').value'), '5');
        const buyerCookies = new Map();
        const buyerRequest = (route, data) => sessionRequest(buyerCookies, route, data);
        assert.equal((await buyerRequest('/login')).status, 200);
        assert.equal((await buyerRequest('/login', { email: 'buyer@example.test', password: 'Browser@2026' })).status, 302);
        assert.equal((await sessionRequest(buyerCookies, '/cart/' + integrityProduct, { _method: 'PUT', quantity: 2 })).status, 302);
        assert.equal(
            (
                await buyerRequest('/checkout', {
                    address_id: checkoutRequests[0].address_id,
                    checkout_key: require('node:crypto').randomUUID(),
                    expected_items_subtotal: '240.00',
                    expected_shipping_total: '50.00',
                })
            ).status,
            302,
        );
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Save product").click()');
        await acceptConfirmation('Save product');
        await until(() => evaluate('document.body.innerText.includes("Stock changed while this form was open")'), 'stale seller stock rejected');
        assert.equal(await evaluate('document.querySelector(' + JSON.stringify(integrityStockInput) + ').value'), '5');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Cancel").click()');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Edit").click()');
        const refreshedStockInput = await byLabel('Available stock');
        assert.equal(await evaluate('document.querySelector(' + JSON.stringify(refreshedStockInput) + ').value'), '3');
        await set(refreshedStockInput, '8');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Save product").click()');
        await acceptConfirmation('Save product');
        await until(() => evaluate('document.body.innerText.includes("8 in stock")'), 'reviewed seller stock retry');
        record(
            'Buyer purchase protects an open seller stock editor',
            'A separate buyer purchases two units; the stale seller form is rejected, reopening shows three units and an intentional restock succeeds',
        );
        assert.equal((await buyerRequest('/cart/' + integrityProduct, { _method: 'PUT', quantity: 5 })).status, 302);
        await signIn('buyer@example.test');
        await navigate('/cart');
        assert.equal(await evaluate('document.querySelector("li .min-w-7").textContent'), '5');
        assert.equal(
            (
                await sellerRequest('/inventory/' + integrityProduct, {
                    _method: 'PUT',
                    name: 'Stock integrity bag',
                    category_id: integrityCategory,
                    price: '120.00',
                    stock: 2,
                    expected_stock: 8,
                    status: 'active',
                })
            ).status,
            302,
        );
        await until(() => evaluate('document.body.innerText.includes("Some items are unavailable")'), 'reduced seller stock reaches buyer');
        await click('button[aria-label="Decrease Stock integrity bag quantity"]');
        await until(() => evaluate('document.querySelector("li .min-w-7").textContent === "2"'), 'cart quantity recovers to available stock');
        assert.equal(await evaluate('document.body.innerText.includes("Some items are unavailable")'), false);
        record(
            'Buyer recovers a cart after seller stock falls',
            'Stock falls from eight to two while five units are in the cart; the minus control saves two units and clears the stock warning',
        );
        assert.deepEqual(runtimeErrors, []);
        assert.deepEqual(consoleErrors, []);
    } catch (error) {
        checks.push({ name: 'Browser check', status: 'FAIL', details: error.message });
        console.error(error);
        if (inspect) console.error(await inspect('document.body.innerText.slice(0,800)'));
        process.exitCode = 1;
    } finally {
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks }, null, 2));
        if (socket) socket.close();
        for (const child of processes.reverse()) child.kill();
    }
})();
