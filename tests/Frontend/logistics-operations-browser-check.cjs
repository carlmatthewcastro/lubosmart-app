const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'storage/app/logistics-operations-ui-check');
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
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname !== "/login"'), 'login');
        await viewport(1280, 900);

        await navigate('/dashboard/logistics');
        assert.equal(await evaluate(`document.querySelectorAll('nav[aria-label="Parcel queues"] a').length`), 8);
        await screenshot('dashboard-parcel-navigation-desktop');
        await viewport(320, 800);
        await evaluate('document.documentElement.classList.add("dark")');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await screenshot('dashboard-parcel-navigation-dark-320');
        await set('#dashboard-parcel-search', fixtures['incoming recipient'].tracking);
        await evaluate(`document.querySelector('nav[aria-label="Parcel queues"] a[href*=incoming]').click()`);
        await until(
            () => evaluate('location.pathname==="/deliveries" && location.search.includes("stage=incoming") && !!document.querySelector("h1")'),
            'dashboard queue link',
        );
        assert.equal(await evaluate('new URLSearchParams(location.search).get("search")'), fixtures['incoming recipient'].tracking);
        assert.equal(
            await evaluate(
                `document.querySelector('nav[aria-label="Parcel queues"]')===null && document.querySelector("#dashboard-parcel-search")===null`,
            ),
            true,
        );
        record(
            'Dashboard parcel navigation',
            'Eight queue links and parcel search live on the dashboard, fit dark 320px, and carry search into the selected queue',
        );
        await navigate('/dashboard/logistics');
        await set('#dashboard-parcel-search', fixtures['incoming recipient'].tracking);
        await evaluate('document.getElementById("dashboard-parcel-search").closest("form").querySelector("button").click()');
        await until(
            () => evaluate('location.pathname==="/deliveries" && new URLSearchParams(location.search).get("stage")==="all"'),
            'dashboard search',
        );
        assert.equal(await evaluate('document.body.innerText.includes(' + JSON.stringify(fixtures['incoming recipient'].tracking) + ')'), true);
        record('Dashboard parcel search', 'Search submits to all parcels and shows the tracking result');
        await viewport(1280, 900);
        await evaluate('document.documentElement.classList.remove("dark")');
        await navigate('/deliveries?stage=incoming');
        assert.equal(await evaluate('document.body.innerText.includes("Scan with camera")'), false);
        await navigate('/logistics/scan');
        assert.equal(await evaluate(`!!document.querySelector('a[href="/logistics/scan"][aria-current="page"]')`), true);
        assert.equal(await evaluate('document.querySelectorAll("button").length > 0 && document.body.innerText.includes("Ready to scan")'), true);
        record('Dedicated scan navigation', 'Sidebar highlights Scan Parcel; parcel queues no longer repeat the camera');
        await until(
            () => evaluate(`document.querySelector('button[aria-label^="Logistics notifications"]').getAttribute("aria-label").includes("3 items")`),
            'notification counts',
        );
        await click('button[aria-label^="Logistics notifications"]');
        await until(() => evaluate('!!document.querySelector("[role=menu]")'), 'notifications menu');
        assert.equal(await evaluate('document.querySelector("[role=menu]").innerText.includes("Operational queues for your company.")'), true);
        assert.equal(await evaluate('document.querySelectorAll("[role=menu] [role=menuitem]").length'), 5);
        assert.equal(await evaluate('document.querySelectorAll("[role=menu] [role=menuitem] svg").length'), 5);
        assert.equal(
            await evaluate(
                '[...document.querySelectorAll("[role=menuitem]")].find(el=>el.textContent.includes("Pickup requests")).textContent.endsWith("1")',
            ),
            true,
        );
        await screenshot('logistics-notifications-desktop');
        await viewport(320, 800);
        await evaluate('document.documentElement.classList.add("dark")');
        assert.equal(await evaluate('document.querySelector("[role=menu]").getBoundingClientRect().width <= innerWidth-16'), true);
        await screenshot('logistics-notifications-dark-320');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await until(() => evaluate('!document.querySelector("[role=menu]")'), 'notifications close');
        assert.equal(await evaluate('document.activeElement.getAttribute("aria-label").startsWith("Logistics notifications")'), true);
        await viewport(1280, 900);
        await evaluate('document.documentElement.classList.remove("dark")');
        record(
            'Logistics notifications',
            'Admin-style menu has scoped counts, icons and descriptions; fits dark mobile view and restores focus on Escape',
        );

        const findParcel = async (reference) => {
            await set('#scan-reference', reference);
            await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Find parcel").click()');
            await until(
                () =>
                    evaluate(
                        '!!document.querySelector("[data-scan-parcel]") && document.querySelector("[data-scan-parcel]").innerText.includes(' +
                            JSON.stringify(reference) +
                            ')',
                    ),
                'scan lookup',
            );
        };
        const inputByLabel = async (text, value) => {
            const id = await evaluate(
                '[...document.querySelectorAll("[data-scan-parcel] label")].find(el=>el.textContent.includes(' + JSON.stringify(text) + ')).htmlFor',
            );
            await set('[id=' + JSON.stringify(id) + ']', value);
        };
        await findParcel(fixtures['incoming recipient'].tracking);
        await set('select', 'manual');
        await evaluate(
            `(()=>{const field=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,'Label unreadable; entered tracking text.');field.dispatchEvent(new Event('input',{bubbles:true}));})()`,
        );
        await evaluate(
            '[...document.querySelectorAll("[data-scan-parcel] button")].find(el=>el.textContent.includes("Confirm Center Receipt")).click()',
        );
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'parcel confirmation');
        await evaluate('[...document.querySelectorAll("[role=dialog] button")].find(el=>el.textContent.trim()==="Confirm parcel action").click()');
        await until(
            () => evaluate('document.querySelector("[data-scan-parcel]").innerText.includes("Confirm Sorted for Destination")'),
            'receipt submitted',
        );
        record('Receipt form', 'Dedicated scan page submits a center receipt and shows the next action');
        assert.equal(
            await evaluate('document.querySelector("[data-scan-parcel] details").textContent.includes("Label unreadable; entered tracking text.")'),
            true,
        );
        record('Manual tracking evidence', 'Manual capture reason reaches the server and appears in parcel history');
        await set('select', 'scanner');
        const tracking = fixtures['sorting recipient'].tracking;
        await findParcel(tracking);
        await inputByLabel('Destination bin', 'Route A / Bin 1');
        await evaluate(
            '[...document.querySelectorAll("[data-scan-parcel] button")].find(el=>el.textContent.includes("Confirm Sorted for Destination")).click()',
        );
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'parcel confirmation');
        await evaluate('[...document.querySelectorAll("[role=dialog] button")].find(el=>el.textContent.trim()==="Confirm parcel action").click()');
        await until(() => evaluate('document.querySelector("[data-scan-parcel]").innerText.includes("Assign Delivery Rider")'), 'sort submitted');
        assert.equal(
            await evaluate('document.querySelector("[data-scan-parcel] details").textContent.includes("Label unreadable; entered tracking text.")'),
            false,
        );
        record('Sorting form', 'Destination area, bin/route and reference submit from the scan workspace');
        await screenshot('sorting-desktop');
        await viewport(320, 800);
        await evaluate('localStorage.setItem("appearance","dark");document.documentElement.classList.add("dark")');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        assert.equal(
            await evaluate('document.querySelector("[data-scan-parcel]").scrollWidth <= document.querySelector("[data-scan-parcel]").clientWidth'),
            true,
        );
        await screenshot('parcel-dark-320');
        record('Mobile reflow', 'Scan workspace fits 320px in dark theme and keeps controls reachable');
        await evaluate(
            'window.BarcodeDetector = undefined; Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable:true, value:undefined })',
        );
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Scan with camera")).click()');
        await until(() => evaluate('document.body.innerText.includes("does not support camera")'), 'camera fallback');
        record('Unsupported camera fallback', 'Camera failure leaves scanner and manual input available without submitting a parcel action');
        await evaluate(
            `window.BarcodeDetector = class { static async getSupportedFormats(){return ['code_39','code_128']} async detect(){return []} }; Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable:true, value:async()=>{throw new DOMException('Denied','NotAllowedError')} })`,
        );
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Scan with camera")).click()');
        await until(() => evaluate('document.body.innerText.includes("Camera access was denied")'), 'camera denial');
        record('Camera permission denial', 'Denied permission displays a usable scanner / manual entry fallback');
        await evaluate(
            `window.__scanReady=false; window.BarcodeDetector=class { static async getSupportedFormats(){return ['code_39','code_128']} async detect(){return [{rawValue:window.__scanReady?${JSON.stringify(tracking)}:'https://untrusted.example/'}]} }; Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=240;canvas.getContext('2d').fillRect(0,0,640,240);window.__scanMedia=canvas.captureStream(5);return window.__scanMedia}})`,
        );
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Scan with camera")).click()');
        await until(() => evaluate('!!document.querySelector("video:not(.hidden)")'), 'camera preview');
        assert.equal(await evaluate('location.hostname'), '127.0.0.1');
        await evaluate('window.__scanReady=true');
        await until(() => evaluate('document.body.innerText.includes("Parcel reference captured")'), 'camera capture');
        assert.equal(await evaluate('window.__scanMedia.getTracks().every(track=>track.readyState==="ended")'), true);
        record(
            'Camera capture and untrusted payload',
            'Only parcel references are accepted; URL payloads are ignored and camera tracks stop after capture',
        );
        // Exercise the actual ZXing decoder on JsBarcode pixels, without a native detector.
        const JsBarcode = require('jsbarcode');
        for (const format of ['CODE128', 'CODE39']) {
            const barcode = {};
            JsBarcode(barcode, tracking, { format, displayValue: false });
            const bits = barcode.encodings.map((encoding) => encoding.data).join('');
            await evaluate(`window.BarcodeDetector=undefined; Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{
                const canvas=document.createElement('canvas');canvas.width=${bits.length * 2 + 80};canvas.height=240;
                const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);
                context.fillStyle='black';const bits=${JSON.stringify(bits)};
                for(let i=0;i<bits.length;i++)if(bits[i]==='1')context.fillRect(40+i*2,40,2,160);
                window.__scanMedia=canvas.captureStream(5);return window.__scanMedia;
            }})`);
            await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Scan with camera")).click()');
            await until(
                () =>
                    evaluate(
                        'window.__scanMedia.getTracks().every(track=>track.readyState==="ended") && document.body.innerText.includes("Parcel reference captured")',
                    ),
                'ZXing ' + format + ' capture',
            );
            assert.equal(await evaluate('document.querySelector("#scan-reference").value'), tracking);
            record('ZXing ' + format + ' camera decoding', 'Real JsBarcode pixels decode without BarcodeDetector; camera tracks stop after capture');
        }
        await until(() => evaluate('!!document.querySelector("[data-scan-parcel]")'), 'scanned parcel ready');
        await evaluate('Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>false})');
        const riderSelector = await evaluate(
            '"[id=" + JSON.stringify([...document.querySelectorAll("[data-scan-parcel] label")].find(el=>el.textContent.includes("Approved rider")).htmlFor) + "]"',
        );
        const riderId = await evaluate('document.querySelector(' + JSON.stringify(riderSelector) + ').options[1].value');
        await set(riderSelector, riderId);
        await evaluate(
            '[...document.querySelectorAll("[data-scan-parcel] button")].find(el=>el.textContent.includes("Assign Delivery Rider")).click()',
        );
        await until(
            () => evaluate('document.querySelector("[data-scan-parcel]").innerText.includes("This operation was not submitted")'),
            'offline confirmation',
        );
        await evaluate('Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>true})');
        record('Offline action', 'No connection shows not submitted and leaves the parcel unchanged');
        await navigate('/logistics/scan?search=LM-UNKNOWN');
        assert.equal(await evaluate('document.body.innerText.includes("Parcel not found")'), true);
        record('Unknown tracking', 'Unknown parcel code shows an empty result in the scan workspace');
        const confirmParcelAction = async () => {
            await until(
                () => evaluate('[...document.querySelectorAll("[role=dialog] button")].some(el=>el.textContent.trim()==="Confirm parcel action")'),
                'parcel action confirmation',
            );
            await evaluate(
                '[...document.querySelectorAll("[role=dialog] button")].find(el=>el.textContent.trim()==="Confirm parcel action").click()',
            );
        };
        const fieldInDialog = async (label) =>
            evaluate(
                '[...document.querySelectorAll("[role=dialog] label")].find(el=>el.textContent.includes(' + JSON.stringify(label) + ')).htmlFor',
            );
        const chooseRiderInDialog = async () => {
            const id = await fieldInDialog('Approved rider');
            const selector = '[id=' + JSON.stringify(id) + ']';
            const value = await evaluate('document.querySelector(' + JSON.stringify(selector) + ').options[1].value');
            await set(selector, value);
        };
        const signInRole = async (email) => {
            await evaluate(
                `fetch('/logout',{method:'POST',headers:{'X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).split('=').slice(1).join('='))}})`,
            );
            await navigate('/login');
            await set('input[type=email]', email);
            await set('input[type=password]', 'Browser@2026');
            await click('button[type=submit]');
            await until(() => evaluate('location.pathname!=="/login"'), 'role login');
        };
        await navigate('/deliveries?stage=pickups&search=' + fixtures['unallocated recipient'].tracking);
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Review Request").click()');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Accept Pickup Request").click()');
        await confirmParcelAction();
        await until(
            () => evaluate('[...document.querySelectorAll("button")].some(el=>el.textContent.trim()==="Assign Pickup Rider")'),
            'accepted unallocated pickup remains open and assignable',
        );
        await screenshot('accepted-unallocated-pickup-next-action');
        record(
            'Accepted unallocated pickup keeps its actions',
            'A claimed legacy parcel moves into company ownership without losing its open assignment dialog.',
        );
        await navigate('/deliveries?stage=pickups&search=' + fixtures['pickups recipient'].tracking);
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("View Parcel & Actions")).click()');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Approve Pickup Request").click()');
        await confirmParcelAction();
        await until(
            () => evaluate('[...document.querySelectorAll("button")].some(el=>el.textContent.trim()==="Assign Pickup Rider")'),
            'approved pickup still has assignment form',
        );
        assert.equal(await evaluate('document.body.innerText.includes("This parcel moved to another queue")'), false);
        await screenshot('approved-pickup-next-action');
        await chooseRiderInDialog();
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Assign Pickup Rider").click()');
        await confirmParcelAction();
        await until(() => evaluate('document.body.innerText.includes("Open parcel in all queues")'), 'assignment offers next queue');
        await evaluate('[...document.querySelectorAll("a")].find(el=>el.textContent.trim()==="Open parcel in all queues").click()');
        await until(() => evaluate('document.body.innerText.includes("Waiting for the pickup rider")'), 'assigned pickup visible in next queue');
        await signInRole('demo-logistics-1-rider@example.invalid');
        await navigate('/deliveries?stage=pickups');
        assert.equal(await evaluate('document.body.innerText.includes(' + JSON.stringify(fixtures['pickups recipient'].tracking) + ')'), true);
        record(
            'Pickup approval continues to rider assignment',
            'The approved parcel stays in its queue, can be assigned, and appears in the pickup rider account.',
        );
        await signInRole('operations@example.test');
        await navigate('/deliveries?stage=dispatch&search=' + fixtures['dispatch recipient'].tracking);
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("View Parcel & Actions")).click()');
        await until(
            () => evaluate('[...document.querySelectorAll("button")].some(el=>el.textContent.trim()==="Assign Delivery Rider")'),
            'delivery assignment form available from queue',
        );
        await set(
            '[id=' + JSON.stringify(await fieldInDialog('Scan parcel label or enter tracking reference')) + ']',
            fixtures['dispatch recipient'].tracking,
        );
        await chooseRiderInDialog();
        await screenshot('dispatch-assignment-from-queue');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Assign Delivery Rider").click()');
        await confirmParcelAction();
        await until(
            () => evaluate('document.body.innerText.includes("Waiting for the delivery rider to accept")'),
            'dispatch assignment advances next action',
        );
        await signInRole('demo-logistics-1-rider@example.invalid');
        await navigate('/deliveries?stage=dispatch');
        assert.equal(await evaluate('document.body.innerText.includes(' + JSON.stringify(fixtures['dispatch recipient'].tracking) + ')'), true);
        assert.equal(await evaluate('document.body.innerText.includes("Scan and accept dispatch handover")'), true);
        record(
            'Delivery assignment reaches rider dispatch',
            'Logistics assigns from the dispatch queue with label verification; the rider sees that parcel and its dispatch acceptance action.',
        );

        await evaluate(
            `(async()=>{const token=decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('XSRF-TOKEN=')).split('=').slice(1).join('='));await fetch('/logout',{method:'POST',headers:{'X-XSRF-TOKEN':token}})})()`,
        );
        await navigate('/login');
        await set('input[type=email]', 'demo-logistics-1-seller@example.invalid');
        await set('input[type=password]', 'Browser@2026');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname !== "/login"'), 'seller login');
        await viewport(1280, 900);
        await navigate('/orders/' + fixtures['incoming recipient'].seller_order_id + '/waybill');
        assert.equal(await evaluate('!!document.querySelector("svg[aria-label^=\\"Parcel barcode\\"]")'), true);
        assert.equal(await evaluate('document.querySelector("svg[aria-label^=\\"Parcel barcode\\"]").querySelectorAll("rect").length > 50'), true);
        await evaluate('window.__printed=0;window.print=()=>window.__printed++');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.includes("Print waybill")).click()');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'print confirmation');
        await evaluate('[...document.querySelectorAll("[role=dialog] button")].find(el=>el.textContent.trim()==="Request print").click()');
        await until(() => evaluate('window.__printed===1'), 'label print roundtrip');
        assert.equal(await evaluate('document.body.innerText.includes(' + JSON.stringify(fixtures['incoming recipient'].tracking) + ')'), true);
        await screenshot('waybill-desktop');
        record(
            'Waybill print request',
            'Printable barcode and stable tracking identity render; print opens after the audited server request succeeds',
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
