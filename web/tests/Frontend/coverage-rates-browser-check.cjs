const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = process.env.LUBOSMART_SCANNER_OUTPUT || path.join(root, '../.tools/development-artifacts/storage-app/coverage-rates-ui-check');
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
        const seed = spawnSync('php', ['tests/Fixtures/coverage-rates-browser-seed.php'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
        assert.equal(seed.status, 0, seed.stderr);
        console.log('Logistics fixtures ready');
        const appPort = await port(),
            debugPort = await port();
        env.APP_URL = 'http://127.0.0.1:' + appPort;
        // Keep the acceptance run independent of other workspace builds.
        const browserPublic = path.join(stage, 'public');
        fs.mkdirSync(browserPublic);
        fs.symlinkSync(path.join(root, 'public/build'), path.join(browserPublic, 'build'), 'junction');
        fs.symlinkSync(path.join(root, 'public/images'), path.join(browserPublic, 'images'), 'junction');
        assert.ok(fs.existsSync(path.join(browserPublic, 'build/manifest.json')), 'Completed production build required');
        let fixture = fs
            .readFileSync(path.join(root, 'tests/Fixtures/auth-browser-router.php'), 'utf8')
            .replace('$root = dirname(__DIR__, 2);', "$root = getenv('LUBOSMART_AUTH_BROWSER_ROOT');")
            .replaceAll("$root.'/public'", "$stage.'/public'")
            .replace(
                "$app = require $root.'/bootstrap/app.php';",
                "$app = require $root.'/bootstrap/app.php';\n$app->usePublicPath($stage.DIRECTORY_SEPARATOR.'public');",
            );
        fixture = fixture.replace(
            "str_starts_with($asset, realpath($stage.'/public').DIRECTORY_SEPARATOR)",
            "(str_starts_with($asset, realpath($stage.'/public').DIRECTORY_SEPARATOR) || str_starts_with($asset, realpath($root.'/public').DIRECTORY_SEPARATOR))",
        );
        fixture = fixture.replace(
            "[['code' => '043428001', 'name' => 'Test Barangay']]",
            "[['code' => '043428001', 'name' => 'Test Barangay'], ['code' => '043428002', 'name' => 'Second Barangay'], ['code' => '043428003', 'name' => 'Third Barangay']]",
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
                    '--disable-component-update',
                    '--disk-cache-size=1048576',
                    '--media-cache-size=1048576',
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
            if (!name.includes('1672') && !name.includes('320-dark')) return;
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
        await set('input[type=email]', 'operations@example.test');
        await set('input[type=password]', 'Browser@2026');
        await click('form:has(input[type=email]) button[type=submit]');
        await until(() => evaluate('location.pathname !== "/login"'), 'login');

        const button = async (text, scope = 'document') => {
            await evaluate(
                `(() => { const el=[...${scope}.querySelectorAll('button')].find(el=>el.textContent.trim()===${JSON.stringify(text)}); if(!el) throw Error('Missing button '+${JSON.stringify(text)}); el.setAttribute('data-test-action','current'); })()`,
            );
            await click('[data-test-action=current]');
            await delay(100);
            await evaluate("document.querySelector('[data-test-action=current]')?.removeAttribute('data-test-action')");
        };
        const field = async (label, value) => {
            await evaluate(
                `(() => { const label=[...document.querySelectorAll('[role=dialog] label')].find(el=>el.textContent.trim()===${JSON.stringify(label)}); if(!label) throw Error('Missing label '+${JSON.stringify(label)}); document.getElementById(label.htmlFor).setAttribute('data-test-field','current'); })()`,
            );
            await set('[data-test-field=current]', value);
            await evaluate("document.querySelector('[data-test-field=current]').removeAttribute('data-test-field')");
        };
        const escape = async () => {
            await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
            await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
            await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'dialog closes');
        };
        const reflow = async (label) => {
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, label + ' document overflow');
            assert.equal(await evaluate('document.querySelectorAll("h1").length'), 1);
            if (await evaluate('!!document.querySelector("[role=dialog]")')) {
                assert.equal(
                    await evaluate('document.querySelector("[role=dialog]").getBoundingClientRect().width <= innerWidth'),
                    true,
                    label + ' dialog overflow',
                );
                assert.equal(await evaluate('document.activeElement.closest("[role=dialog]") !== null'), true, label + ' focus contained');
            }
        };
        for (const width of [320, 768, 1440, 1672]) {
            await viewport(width, width === 1672 ? 941 : 900);
            for (const dark of [false, true]) {
                for (const route of ['/logistics/rider-coverage', '/logistics/shipping-rates']) {
                    await navigate(route);
                    await evaluate('document.documentElement.classList.toggle("dark", ' + dark + ')');
                    await reflow(route);
                    if (route.includes('rider-coverage')) {
                        assert.equal(await evaluate('document.querySelectorAll("button[aria-expanded]").length > 0'), true);
                        await click('article button[aria-expanded]');
                        await click('article button[aria-expanded]');
                        assert.equal(await evaluate('document.querySelector("article button[aria-expanded]").getAttribute("aria-expanded")'), 'true');
                        await screenshot('riders-' + width + (dark ? '-dark' : '-light'));
                        await button('Assign Rider Coverage');
                    } else {
                        await screenshot('rates-' + width + (dark ? '-dark' : '-light'));
                        await button('Add Shipping Rates');
                    }
                    await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'open modal');
                    await reflow('modal ' + route);
                    if (width >= 1280)
                        assert.equal(
                            await evaluate('document.querySelector("[role=dialog]").getBoundingClientRect().top >= 0'),
                            true,
                            'dialog top visible',
                        );
                    await screenshot(
                        'modal-' + (route.includes('rider-coverage') ? 'coverage' : 'rates') + '-' + width + (dark ? '-dark' : '-light'),
                    );
                    await escape();
                    assert.equal(await evaluate('document.activeElement.tagName'), 'BUTTON');
                    record(route + ' ' + width + (dark ? ' dark' : ' light'), 'Heading, reflow, expansion, dialog focus and Escape restoration');
                }
            }
        }
        await viewport(1672, 941);
        await navigate('/logistics/shipping-rates');
        const before = await evaluate('document.querySelectorAll("tbody tr").length');
        assert.equal(before, 1);
        await button('Add Shipping Rates');
        await field('Province', '043400000');
        await field('Municipality / City', '043428000');
        await until(() => evaluate('document.querySelectorAll("[role=dialog] [role=group] input[type=checkbox]").length===3'), 'barangays load');
        assert.equal(
            await evaluate('[...document.querySelectorAll("[role=dialog] [role=group] input[type=checkbox]")].filter(el=>el.disabled).length'),
            1,
            'existing rate excluded',
        );
        await button('Select All');
        assert.equal(await evaluate('document.querySelectorAll("[role=dialog] [role=group] input[type=checkbox]:checked").length'), 2);
        await button('Deselect All');
        assert.equal(await evaluate('document.querySelectorAll("[role=dialog] [role=group] input[type=checkbox]:checked").length'), 0);
        await button('Select All');
        await field('Base fee (₱)', '38');
        await field('Extra kilogram fee (₱)', '12');
        assert.equal(await evaluate('document.querySelector("section[aria-label]").textContent.includes("City of Santa Rosa")'), true);
        assert.equal(
            await evaluate(
                "[...document.querySelectorAll('[role=dialog] button')].find(el=>el.textContent.trim()==='Apply rates to 2 barangays').getBoundingClientRect().bottom <= innerHeight",
            ),
            true,
            'Apply action visible without scrolling',
        );
        await screenshot('modal-rates-1672-filled');
        await button('Apply rates to 2 barangays');
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'bulk saves');
        assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), before + 2);
        record('Bulk creation', 'Existing rate excluded, select/deselect all and two independent rows after submission');
        await click('tbody tr button[aria-label^="Actions"]');
        await until(() => evaluate('!!document.querySelector("[role=menuitem]")'), 'rate action menu');
        await click('[role=menuitem]');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'individual edit');
        await field('Base fee (₱)', '45');
        await button('Apply Rates');
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'edit saves');
        assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), before + 2);
        record('Individual edit', 'Existing rate updated independently through compact action menu');
        await click('tbody tr button[aria-label^="Actions"]');
        await until(() => evaluate('document.querySelectorAll("[role=menuitem]").length === 2'), 'publish menu');
        await click('[role=menuitem]:last-child');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'publish confirmation');
        await button('Confirm');
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'published');
        assert.equal(await evaluate('document.querySelector("tbody tr").textContent.toLowerCase().includes("published")'), true);
        await click('tbody tr button[aria-label^="Actions"]');
        await until(() => evaluate('document.querySelectorAll("[role=menuitem]").length === 2'), 'pause menu');
        await click('[role=menuitem]:last-child');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'pause confirmation');
        await button('Confirm');
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'paused');
        assert.equal(await evaluate('document.querySelector("tbody tr").textContent.toLowerCase().includes("draft")'), true);
        record('Publication controls', 'Publish and pause confirmations persist the selected status');
        await screenshot('rates-after-bulk');
        await navigate('/logistics/rider-coverage');
        const coverageBefore = await evaluate('document.querySelectorAll("article tbody tr").length');
        await button('Assign Rider Coverage');
        const riderValue = await evaluate(
            '[...document.querySelectorAll("[role=dialog] select")].find(el=>el.labels[0].textContent.trim()==="Approved rider").options[1].value',
        );
        await field('Approved rider', riderValue);
        await field('Province', '043400000');
        await field('Municipality / City', '043428000');
        await field('Barangay', '043428002');
        await screenshot('modal-coverage-1672-filled');
        await button('Save Coverage');
        await until(
            () => evaluate('[...document.querySelectorAll("button")].some(el=>el.textContent.trim()==="Assign coverage")'),
            'assignment confirmation',
        );
        await button('Assign coverage');
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'coverage saved');
        assert.equal(await evaluate('document.querySelectorAll("article tbody tr").length'), coverageBefore + 1);
        record('Rider assignment modal', 'Dependent locations and approved rider submitted through the existing confirmation workflow');
        assert.deepEqual(runtimeErrors, []);
        assert.deepEqual(consoleErrors, []);
    } catch (error) {
        checks.push({ name: 'Browser check', status: 'FAIL', details: error.message });
        console.error(error);
        console.error({ runtimeErrors });
        if (inspect) console.error(await inspect('document.body.innerText.slice(0,800)'));
        process.exitCode = 1;
    } finally {
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks }, null, 2));
        if (socket) socket.close();
        for (const child of processes.reverse()) child.kill();
    }
})();
