const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = process.env.LUBOSMART_SCANNER_OUTPUT || path.join(root, '../.tools/development-artifacts/storage-app/qr-pod-ui-check');
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
        const seed = spawnSync('php', ['tests/Fixtures/logistics-operations-seed.php'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
        assert.equal(seed.status, 0, seed.stderr);
        const fixtures = JSON.parse(fs.readFileSync(path.join(stage, 'operations.json'), 'utf8'));
        console.log('Logistics fixtures ready');
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
                        `(() => { var el=document.querySelector(${JSON.stringify(selector)}); return !!el && (!(el instanceof HTMLSelectElement) || [...el.options].some(option=>option.value===${JSON.stringify(value)})); })()`,
                    ),
                'input ready: ' + selector,
            );
            return evaluate(
                `(() => { var el=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.focus();el.blur(); })()`,
            );
        };

        await navigate('/login');
        await set('input[type=email]', 'demo-logistics-1-rider@example.invalid');
        await set('input[type=password]', 'Browser@2026');
        await evaluate('document.querySelector("#login-email").closest("form").requestSubmit()');
        await until(() => evaluate('location.pathname !== "/login"'), 'rider login');
        const parcel = fixtures['monitoring recipient'];
        assert.ok(parcel, 'monitoring fixture');
        await navigate('/deliveries?search=' + parcel.tracking);
        const choose = async (value) => {
            await evaluate(
                'document.querySelectorAll("select")[0].value=' +
                    JSON.stringify(value) +
                    ';document.querySelectorAll("select")[0].dispatchEvent(new Event("change",{bubbles:true}))',
            );
            await delay(150);
        };
        const button = async (text) =>
            evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()===' + JSON.stringify(text) + ').click()');
        assert.equal(await evaluate('document.querySelectorAll("select")[0].value'), '');
        assert.equal(await evaluate('document.body.innerText.includes("Scan with camera")'), false);
        await choose('delivered');
        assert.equal(await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Confirm delivery").disabled'), true);
        record('No fourth scan and explicit outcome', 'Completion has no scanner and requires an explicit outcome and note.');
        await evaluate(
            'Object.defineProperty(navigator.mediaDevices,"getUserMedia",{configurable:true,value:async()=>{throw new DOMException("Permission denied","NotAllowedError")}})',
        );
        await button('Open camera');
        await until(() => evaluate('document.body.innerText.includes("Allow camera access")'), 'camera denial');
        record('POD camera permission denied', 'Permission denial shows actionable feedback without completing delivery.');
        await evaluate(
            'Object.defineProperty(navigator.mediaDevices,"getUserMedia",{configurable:true,value:async()=>{const c=document.createElement("canvas");c.width=640;c.height=480;c.getContext("2d").fillRect(0,0,640,480);window.__proofStream=c.captureStream(10);return window.__proofStream}})',
        );
        await button('Open camera');
        await until(() => evaluate('!!document.querySelector("video:not(.hidden)")'), 'proof camera preview');
        await button('Capture photo');
        await until(() => evaluate('[...document.images].some(img=>img.alt==="Captured delivery proof")'), 'captured photo');
        assert.equal(await evaluate('window.__proofStream.getTracks().every(t=>t.readyState==="ended")'), true);
        await button('Retake photo');
        await until(() => evaluate('!!document.querySelector("video:not(.hidden)")'), 'retake preview');
        assert.equal(await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Confirm delivery").disabled'), true);
        await button('Capture photo');
        await until(() => evaluate('[...document.images].some(img=>img.alt==="Captured delivery proof")'), 'retaken photo');
        await evaluate(
            'var el=document.querySelectorAll("select")[1];el.value="Other / Custom notes";el.dispatchEvent(new Event("change",{bubbles:true}))',
        );
        await delay(150);
        assert.equal(await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Confirm delivery").disabled'), true);
        await evaluate(
            'var el=document.querySelector("textarea");Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(el,"Received by approved caretaker.");el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))',
        );
        await click('input[type=checkbox]');
        await until(
            () => evaluate('![...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Confirm delivery").disabled'),
            'valid completion',
        );
        for (const width of [320, 768, 1280]) {
            await viewport(width, 900);
            for (const dark of [false, true]) {
                await evaluate('document.documentElement.classList.toggle("dark",' + dark + ')');
                assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
                await screenshot('pod-' + width + '-' + (dark ? 'dark' : 'light'));
            }
        }
        record(
            'Camera capture, retake and completion gating',
            'Canvas test stream exercises camera capture and retake; required photo, custom notes and COD gate submission. Light/dark reflow fits 320/768/1280px.',
        );
        await button('Confirm delivery');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'delivery confirmation');
        await button('Confirm parcel action');
        await until(() => evaluate('document.body.innerText.includes("Delivery completed. Proof and COD payment recorded.")'), 'delivery success');
        assert.equal(await evaluate('document.body.innerText.includes("Received by approved caretaker.")'), true);
        record('Delivery completion', 'The captured photo uploads and server completion displays success and saved notes.');
        assert.deepEqual(runtimeErrors, []);
        assert.deepEqual(consoleErrors, []);
    } catch (error) {
        checks.push({ name: 'Browser check', status: 'FAIL', details: error.message });
        console.error(error);
        if (inspect) console.error(await inspect('document.body.innerText.slice(-1600)'));
        process.exitCode = 1;
    } finally {
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks }, null, 2));
        if (socket) socket.close();
        for (const child of processes.reverse()) child.kill();
    }
})();
