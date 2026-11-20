const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, '../.tools/development-artifacts/storage-app/refund-ui-check');
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
        const seed = spawnSync('php', ['tests/Fixtures/refund-browser-seed.php'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
        assert.equal(seed.status, 0, seed.stdout + seed.stderr);
        const seeded = JSON.parse(seed.stdout);
        const proofFile = path.join(stage, 'handover.png');
        fs.writeFileSync(
            proofFile,
            Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII=', 'base64'),
        );
        const appPort = await port(),
            debugPort = await port();
        env.APP_URL = 'http://127.0.0.1:' + appPort;
        // Keep the acceptance run independent of other workspace builds.
        const browserPublic = path.join(stage, 'public');
        fs.mkdirSync(browserPublic);
        fs.cpSync(path.join(root, 'public/build'), path.join(browserPublic, 'build'), { recursive: true });
        fs.cpSync(path.join(root, 'public/images'), path.join(browserPublic, 'images'), { recursive: true });
        assert.ok(fs.existsSync(path.join(browserPublic, 'build/manifest.json')), 'Completed production build required');
        const fixture = fs
            .readFileSync(path.join(root, 'tests/Fixtures/auth-browser-router.php'), 'utf8')
            .replace('$root = dirname(__DIR__, 2);', "$root = getenv('LUBOSMART_AUTH_BROWSER_ROOT');")
            .replaceAll("$root.'/public'", "$stage.'/public'")
            .replace(
                "$app = require $root.'/bootstrap/app.php';",
                "$app = require $root.'/bootstrap/app.php';\n$app->usePublicPath($stage.DIRECTORY_SEPARATOR.'public');",
            );
        const browserRouter = path.join(stage, 'router.php');
        fs.writeFileSync(browserRouter, fixture);
        env.LUBOSMART_AUTH_BROWSER_ROOT = root;
        processes.push(
            spawn('php', ['-S', '127.0.0.1:' + appPort, '-t', browserPublic, browserRouter], {
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
                    '--use-fake-device-for-media-stream',
                    '--use-fake-ui-for-media-stream',
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
        globalThis.financeConsoleErrors = consoleErrors;
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
            } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')
                consoleErrors.push(JSON.stringify(message.params.args));
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
                        '(() => { const expected = new URL(' +
                            JSON.stringify(route) +
                            ', location.origin); const actual = new URL(location.href); expected.searchParams.sort(); actual.searchParams.sort(); const boot=JSON.parse(document.querySelector("#app")?.dataset.page ?? "{}");const rendered=new URL(boot.url ?? "/", location.origin);return actual.pathname === expected.pathname && rendered.pathname === expected.pathname && actual.search === expected.search && !!document.querySelector("#app") && !!document.querySelector("h1"); })()',
                    ),
                'render ' + route,
            );
            await delay(250);
        };
        const viewport = async (width, height) =>
            cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
        const screenshot = async (name) => {
            // Theme and button transitions should finish before visual evidence is captured.
            await delay(250);
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
        const set = async (selector, value) => {
            await until(() => evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')'), 'field ' + selector);
            return evaluate(
                `(() => { const el=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement?HTMLSelectElement.prototype:el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.focus();el.blur(); })()`,
            );
        };
        const byText = async (text) =>
            evaluate(
                '(() => { const scope=document.querySelector("[role=dialog]")??document;const e=Array.from(scope.querySelectorAll("button")).find(e=>e.textContent.trim()===' +
                    JSON.stringify(text) +
                    '); if(!e)throw Error("Missing button: "+' +
                    JSON.stringify(text) +
                    ');e.click();})()',
            );
        const field = async (label) =>
            evaluate(
                '(() => {const e=Array.from(document.querySelectorAll("[role=dialog] label")).find(e=>e.textContent.trim()===' +
                    JSON.stringify(label) +
                    ');if(!e)throw Error("Missing label: "+' +
                    JSON.stringify(label) +
                    ');return "#"+CSS.escape(e.htmlFor);})()',
            );
        const fill = async (label, value) => set(await field(label), value);
        const login = async (role) => {
            await cdp('Page.navigate', { url: 'about:blank' });
            await until(() => evaluate('location.href==="about:blank"'), 'stop previous role');
            await delay(300);
            await cdp('Network.clearBrowserCookies');
            await cdp('Network.clearBrowserCache');
            await viewport(1440, 1000);
            await navigate('/login');
            await set('#login-email', role + '@dashboard.example.com');
            await set('#login-password', 'Browser@2026');
            await click('form:has(#login-email) button[type=submit]');
            await until(() => evaluate('location.pathname.startsWith("/dashboard")'), 'login ' + role);
            await delay(400);
            await navigate('/returns');
            assert.equal(await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.auth.user.role'), role, 'authenticated role');
        };
        const dialog = async () => until(() => evaluate('!!document.querySelector("[role=dialog] form")'), 'open action dialog');
        const submit = async (label) => {
            await byText(label);
            await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'saved ' + label);
        };
        const upload = async () => {
            await byText('Open camera');
            await until(
                () => evaluate('Array.from(document.querySelectorAll("[role=dialog] button")).some(e=>e.textContent.trim()==="Capture photo")'),
                'camera active',
            );
            await delay(300);
            await byText('Capture photo');
            await until(() => evaluate('!!document.querySelector("[role=dialog] img")'), 'camera captured proof');
        };
        const responsive = async (name) => {
            for (const width of [320, 768, 1440]) {
                await viewport(width, 1000);
                await delay(150);
                assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, name + ' overflow at ' + width);
                await screenshot(name + '-' + width);
            }
            await evaluate('document.documentElement.classList.add("dark")');
            await viewport(320, 1000);
            await screenshot(name + '-dark-320');
            await evaluate('document.documentElement.classList.remove("dark")');
            await viewport(1440, 1000);
        };
        await login('buyer');
        await navigate('/returns');
        await byText('Request a refund / return');
        await dialog();
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        assert.equal(await evaluate('!!document.activeElement.closest("[role=dialog]")'), true, 'dialog contains keyboard focus');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await until(
            () => evaluate('!document.querySelector("[role=dialog]") && document.activeElement.textContent.trim()==="Request a refund / return"'),
            'Escape restores trigger focus',
        );
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await dialog();
        record('Keyboard dialog controls', 'Tab stays in the dialog; Escape closes and restores trigger focus; Enter reopens the request.');
        await fill('Quantity', '1');
        await fill('Describe the issue', 'The item does not match the listing.');
        await submit('Submit request');
        assert.equal(await evaluate('document.querySelector("main").innerText.includes("Awaiting admin review")'), true);
        record('Buyer request', 'Actual partial item selection and request saved through Inertia with CSRF.');
        await login('admin');
        await navigate('/returns');
        await byText('Review and approve refund');
        await dialog();
        await byText('Approve and credit Lubos Coins');
        assert.equal(await evaluate('!!document.querySelector("[data-client-invalid]")'), true, 'validation is visible');
        await fill('Refund responsibility', 'seller');
        await fill('Return shipping responsibility', 'platform');
        await fill('Evidence reviewed and decision reason', 'Reviewed the actual purchase and submitted evidence.');
        await responsive('admin-approval-dialog');
        await submit('Approve and credit Lubos Coins');
        assert.equal(await evaluate('document.querySelector("main").innerText.includes("Lubos Coins credited and spendable")'), true);
        record('Admin approval', 'One approval credits coins immediately; missing decision fields produce visible validation.');
        await login('buyer');
        await navigate('/wallet');
        assert.equal(await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.balance_cents'), 10000);
        await responsive('buyer-wallet-before-collection');
        record('Spendable balance', 'Buyer wallet shows 10000 centavos before any physical collection.');
        await login('logistics');
        await navigate('/returns');
        await byText('Assign collection rider');
        await dialog();
        await fill('Eligible rider', String(seeded.rider));
        await fill('Handover notes', 'Assigned the eligible rider for this return.');
        await submit('Assign collection rider');
        await responsive('logistics-return');
        await login('rider');
        await navigate('/returns');
        await byText('Record buyer collection');
        await dialog();
        await upload();
        await fill('Person handing over / receiving the return', 'Buyer');
        await fill('Handover notes', 'Actual collection from buyer.');
        await submit('Record buyer collection');
        await login('logistics');
        await navigate('/returns');
        await byText('Confirm facility receipt');
        await dialog();
        await fill('Handover notes', 'Actual facility receipt recorded.');
        await submit('Confirm facility receipt');
        await login('rider');
        await navigate('/returns');
        await byText('Accept seller dispatch');
        await dialog();
        await fill('Handover notes', 'Actual seller dispatch accepted.');
        await submit('Accept seller dispatch');
        await byText('Record seller delivery');
        await dialog();
        await upload();
        await fill('Person handing over / receiving the return', 'Seller');
        await fill('Handover notes', 'Actually delivered to seller.');
        await submit('Record seller delivery');
        record(
            'Return transport',
            'Same eligible rider, actual facility receipt, and simulated-camera collection/delivery proof saved through multipart PATCH actions.',
        );
        await login('seller');
        await navigate('/returns');
        await byText('Confirm Received');
        await dialog();
        assert.equal(await evaluate('Array.from(document.querySelectorAll("[role=dialog] input")).some(e=>/tracking|scan/i.test(e.name))'), false);
        await fill('Handover notes', 'Received the returned item.');
        await responsive('seller-receipt-dialog');
        await submit('Confirm Received');
        assert.equal(await evaluate('document.querySelector("main").innerText.includes("Seller confirmed receipt")'), true);
        assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).some(e=>e.textContent.trim()==="Confirm Received")'), false);
        await byText('Report return discrepancy');
        await dialog();
        await fill('Describe the delivery or item discrepancy', 'Packaging issue needs review.');
        await submit('Report return discrepancy');
        await responsive('seller-confirmed');
        record('Seller receipt', 'No tracking/scanner input; receipt action disappears after success. Discrepancy saves separately.');
        await login('buyer');
        await navigate('/wallet');
        assert.equal(await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.balance_cents'), 10000);
        await navigate('/returns');
        await responsive('buyer-return-after-receipt');
        assert.deepEqual(runtimeErrors, []);
        record(
            'Final wallet and browser checks',
            'Wallet unchanged by assignment, delivery, receipt or discrepancy; light/dark 320/768/1440px checks passed with zero uncaught browser exceptions.',
        );
    } catch (error) {
        checks.push({ name: 'Browser run', status: 'FAIL', details: error.message });
        console.error(error.stack ?? error.message);
        console.error(JSON.stringify(globalThis.financeConsoleErrors));
        if (inspect) {
            try {
                console.error(
                    await inspect(
                        'JSON.stringify({url:location.href,h1:document.querySelectorAll("h1").length,title:document.title,body:document.body.innerText.slice(0,1000),errors:Array.from(document.querySelectorAll("[role=alert]")).map(el=>el.textContent),fields:Array.from(document.querySelectorAll("input")).filter(el=>el.name&&!el.name.includes("password")).map(el=>({name:el.name,value:el.value,checked:el.checked})),scripts:Array.from(document.scripts).map(s=>s.src)})',
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
            JSON.stringify(
                {
                    date: new Date().toISOString().slice(0, 10),
                    isolation: 'temporary SQLite, synthetic financial records, fake notifications and PSGC',
                    checks,
                },
                null,
                2,
            ),
        );
        if (socket) socket.close();
        for (const process of processes.reverse()) process.kill();
        // Keep disposable profile/database for diagnosis; no customer data used.
    }
})();
