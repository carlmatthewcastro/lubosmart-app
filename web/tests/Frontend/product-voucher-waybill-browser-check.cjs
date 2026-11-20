const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, '../.tools/development-artifacts/storage-app/product-voucher-waybill-ui-check');
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
        const inboxSeed = spawnSync('php', ['tests/Fixtures/finance-browser-seed.php'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
        assert.equal(inboxSeed.status, 0, inboxSeed.stdout + inboxSeed.stderr);
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
                            ', location.origin); const actual = new URL(location.href); expected.searchParams.sort(); actual.searchParams.sort(); return actual.pathname === expected.pathname && actual.search === expected.search && !!document.querySelector("#app") && !!document.querySelector("h1"); })()',
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

        await viewport(1440, 1000);
        await navigate('/login');
        await set('#login-email', 'seller@dashboard.example.com');
        await set('#login-password', 'Browser@2026');
        await click('form:has(#login-email) button[type=submit]');
        await until(() => evaluate('location.pathname.startsWith("/dashboard")'), 'seller login');
        const clickText = async (text) =>
            evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()===' + JSON.stringify(text) + ').click()');
        await navigate('/inventory');
        await clickText('Add product');
        await until(() => evaluate('!!document.querySelector("input[type=file]")'), 'shared product form');
        for (const width of [320, 768, 1440]) {
            await viewport(width, 1000);
            await delay(200);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'product overflow ' + width);
            await screenshot('product-' + width);
        }
        record('Shared product form', 'Add form renders without overflow at 320, 768, 1440px');
        await navigate('/seller/vouchers');
        assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'), false);
        await clickText('Usage history');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'history panel');
        for (const width of [320, 768, 1440]) {
            await viewport(width, 1000);
            await delay(550);
            const bounds = await evaluate(
                '(()=>{const d=document.querySelector("[role=dialog]"); const r=d.getBoundingClientRect(); return {right:r.right,width:r.width,overflow:d.scrollWidth>d.clientWidth+1};})()',
            );
            assert.ok(Math.abs(bounds.right - width) < 2, 'history aligned right');
            assert.ok(bounds.width <= Math.min(width, 512) + 1, 'history panel width');
            assert.equal(bounds.overflow, false, 'history panel overflow');
            await screenshot('voucher-history-' + width);
        }
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'history Escape');
        assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Usage history');
        record('Voucher history panel', 'Right drawer at 320/768/1440px, no overflow, Escape and trigger focus restoration');

        await clickText('Create voucher');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'voucher dialog');
        await set('[role=dialog] input[type=number]', '20');
        const nums = await evaluate('Array.from(document.querySelectorAll("[role=dialog] input[type=number]")).map(el=>el.id)');
        await set('[id="' + nums[2] + '"]', '5');
        assert.equal(
            await evaluate('document.querySelector("[role=dialog] [aria-live=polite]").innerText.includes("100.00")'),
            true,
            'budget preview',
        );
        for (const width of [320, 768, 1440]) {
            await viewport(width, 1000);
            await delay(200);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'voucher overflow ' + width);
            assert.equal(
                await evaluate('document.querySelector("[role=dialog]").scrollWidth <= document.querySelector("[role=dialog]").clientWidth+1'),
                true,
                'dialog overflow',
            );
            await screenshot('voucher-' + width);
        }
        await evaluate('document.documentElement.classList.add("dark")');
        await screenshot('voucher-dark');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'dialog Escape');
        record('Voucher dialog', 'Live 20 x 5 budget, responsive layouts, dark capture, Escape');
        await clickText(
            '' +
                (await evaluate(
                    'Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("20 uses")&&b.textContent.includes("200.00")).textContent.trim()',
                )),
        );
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'template dialog');
        assert.equal(await evaluate('document.querySelector("[role=dialog] input[type=number]").value'), '10.00');
        record('Voucher template', 'Template fills dialog without activation');

        await evaluate('document.querySelector("[role=dialog] form button").click()');
        await until(
            () => evaluate('Array.from(document.querySelectorAll("[role=dialog] button")).some(b=>b.textContent.trim()==="Activate voucher")'),
            'activation confirmation',
        );
        await clickText('Activate voucher');
        await until(() => evaluate('!document.querySelector("[role=dialog]") && document.body.innerText.includes("SHOP-")'), 'voucher created');
        await clickText('Hide from buyers');
        await until(() => evaluate('document.body.innerText.includes("Hidden from buyer voucher lists")'), 'visibility updated');
        await clickText('Pause voucher');
        await until(
            () => evaluate('Array.from(document.querySelectorAll("[role=dialog] button")).some(b=>b.textContent.trim()==="Update voucher")'),
            'pause confirmation',
        );
        await clickText('Update voucher');
        await until(() => evaluate('document.body.innerText.includes("Resume voucher")'), 'voucher paused');
        assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).some(b => b.textContent.trim() === "All")'), false);
        record('Voucher mutations', 'Confirmed activation, public visibility update and pause');
        await navigate('/orders/1/waybill');
        await until(() => evaluate('!!document.querySelector(".shipping-label-qr svg")'), 'QR rendered');
        await viewport(560, 800);
        await cdp('Emulation.setEmulatedMedia', { media: 'print' });
        const qr = await evaluate('document.querySelector(".shipping-label-qr svg").getBoundingClientRect().width');
        assert.ok(qr >= 143 && qr <= 145, '38mm QR');
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".shipping-label-brand")).color'), 'rgb(0, 0, 0)');

        const { MultiFormatReader, BinaryBitmap, HybridBinarizer, RGBLuminanceSource } = require('@zxing/library');
        for (const selector of ['.shipping-label-qr svg', '.shipping-label-barcode svg']) {
            const pixels = await evaluate(
                '(async () => {const el=document.querySelector(' +
                    JSON.stringify(selector) +
                    '); const rect=el.getBoundingClientRect(); const svg=el.cloneNode(true); const w=Math.round(rect.width*3.125),h=Math.round(rect.height*3.125);svg.setAttribute("width",w);svg.setAttribute("height",h);svg.setAttribute("xmlns","http://www.w3.org/2000/svg");const img=new Image();img.src="data:image/svg+xml;base64,"+btoa(new XMLSerializer().serializeToString(svg));await img.decode();const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d");ctx.fillStyle="white";ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);return {w,h,png:canvas.toDataURL(),data:Array.from(ctx.getImageData(0,0,w,h).data)};})()',
            );
            fs.writeFileSync(
                path.join(output, selector.includes('barcode') ? 'barcode.png' : 'qr.png'),
                Buffer.from(pixels.png.split(',')[1], 'base64'),
            );
            console.log(selector, pixels.w, pixels.h);
            const rgb = new Int32Array(pixels.w * pixels.h);
            for (let i = 0; i < rgb.length; i++) rgb[i] = (pixels.data[i * 4] << 16) | (pixels.data[i * 4 + 1] << 8) | pixels.data[i * 4 + 2];
            const result = new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(rgb, pixels.w, pixels.h))));
            const expected = await evaluate('document.querySelector(".shipping-label-barcode figcaption").textContent');
            assert.equal(result.getText(), expected);
            record(selector + ' decode', 'Rendered SVG rasterized at 300dpi decodes to actual parcel tracking reference');
        }
        const pdf = await cdp('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
        const pdfBytes = Buffer.from(pdf.data, 'base64');
        fs.writeFileSync(path.join(output, 'waybill.pdf'), pdfBytes);
        assert.equal((pdfBytes.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1, 'one page per parcel');
        await screenshot('waybill-print');
        record('Waybill print', 'SVG QR at 38mm, monochrome wordmark, A5 PDF generated');
        assert.deepEqual(runtimeErrors, []);
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
