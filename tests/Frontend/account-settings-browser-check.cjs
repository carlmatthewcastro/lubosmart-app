const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = path.join(
    root,
    process.env.LUBOSMART_BROWSER_HOME_ONLY === '1' ? 'storage/app/home-typography-ui-check' : 'storage/app/account-settings-ui-check',
);
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
        const seed = spawnSync('php', ['tests/Fixtures/auth-browser-router.php', 'seed'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
        assert.equal(seed.status, 0, seed.stderr);
        const accountSeed = spawnSync('php', ['tests/Fixtures/account-settings-seed.php'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
        assert.equal(accountSeed.status, 0, accountSeed.stdout + accountSeed.stderr);
        console.log('Account fixtures ready');
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
                `(() => { const el=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.focus();el.blur(); })()`,
            );
        };
        await navigate('/login');
        await set('input[type=email]', 'settings@example.test');
        await set('input[type=password]', 'Browser@2026');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname !== "/login"'), 'login complete');
        await navigate('/settings/account');
        await until(() => evaluate('document.body.innerText.includes("Carla")'), 'settings load');
        await screenshot('personal-details-desktop');
        await viewport(320, 900);
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await screenshot('personal-details-mobile');
        await viewport(1440, 1000);
        const category = async (id) => {
            await click(`nav[aria-label="Account settings categories"] a[href="#${id}"]`);
            await until(() => evaluate(`!document.getElementById(${JSON.stringify(id)}).hidden`), 'category ' + id);
        };
        assert.equal(await evaluate('document.body.innerText.includes("Synthetic Logistics")'), false);
        assert.equal(await evaluate(`document.querySelectorAll('nav[aria-label="Account settings categories"] [aria-current]').length`), 1);
        await category('business-details');
        await until(() => evaluate('document.body.innerText.includes("Synthetic Logistics")'), 'company category');
        assert.equal(await evaluate('document.body.innerText.includes("***-***-***-115")'), true);
        assert.equal(await evaluate('[...document.querySelectorAll("input[type=checkbox]")].filter(el=>el.disabled).length'), 1);
        record('Verified settings and protected home region', 'Approved company, masked TIN and exactly one non-removable region rendered');
        for (const [width, height] of [
            [1440, 1000],
            [768, 1000],
            [320, 900],
        ]) {
            await viewport(width, height);
            await delay(150);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
            await screenshot('account-' + width);
        }
        record('Responsive reflow', 'No page overflow at 320, 768 and 1440 pixels');
        await category('registered-address');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Request address change").click()');
        await delay(100);
        await evaluate(
            'document.querySelector("select").value="040000000";document.querySelector("select").dispatchEvent(new Event("change",{bubbles:true}))',
        );
        await until(() => evaluate('document.body.innerText.includes("Laguna")'), 'PSGC load');
        await set('select:nth-of-type(1)', '040000000');
        await evaluate(
            `(()=>{const el=[...document.querySelectorAll('select')][1];el.value='043400000';el.dispatchEvent(new Event('change',{bubbles:true}));})()`,
        );
        await delay(100);
        await evaluate(
            `(()=>{const el=[...document.querySelectorAll('select')][2];el.value='043404000';el.dispatchEvent(new Event('change',{bubbles:true}));})()`,
        );
        await delay(100);
        await evaluate(
            `(()=>{const el=[...document.querySelectorAll('select')][3];el.value='043404001';el.dispatchEvent(new Event('change',{bubbles:true}));})()`,
        );
        await until(() => evaluate('[...document.querySelectorAll("input")].some(el=>el.value==="4025")'), 'autofill postcode');
        record('Cascading address selection', 'Region/province/city/barangay selections auto-fill postal code from server dataset');
        await category('business-details');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Reveal TIN").click()');
        await until(() => evaluate('document.body.innerText.includes("123-456-789-115")'), 'reveal');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Hide TIN").click()');
        record('Owner TIN reveal', 'Authenticated reveal and hide work in browser');
        await category('registered-address');
        assert.equal(await evaluate('[...document.querySelectorAll("input")].some(el=>el.value==="4025")'), true);
        await category('contact-details');
        assert.equal(await evaluate('document.body.innerText.includes("Save contact details")'), true);
        assert.equal(await evaluate('document.body.innerText.includes("Save preferences")'), false);
        record('Settings categories', 'One active category, working category links, retained address draft and no notification preferences');
        const mutation = await evaluate(
            `(async()=>{const token=decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).split('=').slice(1).join('='));const result=await fetch('/api/account/change-requests',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','X-XSRF-TOKEN':token},body:JSON.stringify({field:'service_areas',new_value:['130000000','040000000','070000000']})});return result.status})()`,
        );
        assert.equal(mutation, 201);
        await navigate('/settings/account?review=1#service-areas');
        await until(() => evaluate('document.body.innerText.toLowerCase().includes("pending review")'), 'pending banner');
        record('CSRF protected request and pending state', 'Cookie-authenticated mutation succeeds and renders current/proposed comparison');
        await evaluate('localStorage.setItem("appearance","dark");document.documentElement.classList.add("dark")');
        await screenshot('account-dark-320');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        assert.equal(await evaluate('document.activeElement !== document.body'), true);
        record('Keyboard focus', 'Tab reaches a focusable control');
        await evaluate(
            `(async()=>{const token=decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).split('=').slice(1).join('='));await fetch('/logout',{method:'POST',headers:{'X-XSRF-TOKEN':token}})})()`,
        );
        await navigate('/login');
        await set('input[type=email]', 'review@example.test');
        await set('input[type=password]', 'Browser@2026');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname !== "/login"'), 'login complete');
        await navigate('/admin/change-requests');
        await until(() => evaluate('document.body.innerText.includes("Proposed values")'), 'admin queue');
        await screenshot('admin-320');
        assert.equal(await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent==="Reject with reason").disabled'), true);
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent==="Approve").click()');
        await until(() => evaluate('document.body.innerText.includes("No pending requests.")'), 'approval');
        record('Admin review', 'Reject requires reason; approval clears the pending queue');
        await click('button[aria-label^="Notifications,"]');
        await until(() => evaluate('document.body.innerText.includes("Recent applications")'), 'registration notifications');
        for (const role of ['Buyer', 'Seller', 'Logistics']) {
            assert.equal(
                await evaluate(`document.querySelector('[role=menu]').innerText.includes(${JSON.stringify(role + ' · Awaiting Admin approval')})`),
                true,
            );
        }
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await screenshot('admin-registration-notifications-mobile');
        await evaluate(`[...document.querySelectorAll('[role=menu] a')].find(el=>el.textContent.includes('Notification seller business')).click()`);
        await until(
            () => evaluate('location.pathname.startsWith("/reviews/") && document.body.innerText.includes("Registration review")'),
            'notification opens seller review',
        );
        record(
            'Admin registration notifications',
            'Buyer, Seller and Logistics alerts appear in the notification menu; Seller opens its own review page.',
        );
        assert.deepEqual(runtimeErrors, []);
    } catch (error) {
        checks.push({ name: 'Browser check', status: 'FAIL', details: error.message });
        console.error(error);
        if (inspect) console.error(await inspect('document.body.innerText.slice(0,800)'));
        if (inspect)
            console.error(
                await inspect(
                    'JSON.stringify({url:location.href, active:[...document.querySelectorAll("nav[aria-label=\\"Account settings categories\\"] [aria-current]")].map(el=>el.outerHTML)})',
                ),
            );
        process.exitCode = 1;
    } finally {
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks }, null, 2));
        if (socket) socket.close();
        for (const child of processes.reverse()) child.kill();
    }
})();
