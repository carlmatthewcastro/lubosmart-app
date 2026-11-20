const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, '../.tools/development-artifacts/storage-app/product-card-ui-check');
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
        const variantSeed = path.join(stage, 'variants.php');
        fs.writeFileSync(
            variantSeed,
            '<?php require ' +
                JSON.stringify(root.replaceAll('\\', '/') + '/vendor/autoload.php') +
                '; $app = require ' +
                JSON.stringify(root.replaceAll('\\', '/') + '/bootstrap/app.php') +
                '; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); App\\Models\\ProductVariant::create(["product_id" => App\\Models\\Product::first()->id, "name" => "Small / purple", "stock" => 3, "is_active" => true]);',
        );
        fs.appendFileSync(
            variantSeed,
            ' foreach (App\\Models\\Product::orderBy("id", "desc")->get() as $index => $product) { $names = ["Phone Grip Ring", "Travel Gadget Storage Pouch", "Wired Earphones 3.5mm", "Adjustable Tablet Stand"]; $images = ["grip.jpg", "gadgetpouch.jpg", "earphones.jpg", "tablet.jpg"]; $prices = [85, 245, 185, 295]; $product->update(["name" => $names[$index], "image_path" => $images[$index], "price" => $prices[$index]]); }',
        );
        const seeded = spawnSync('php', [variantSeed], { cwd: root, env, encoding: 'utf8', windowsHide: true });
        assert.equal(seeded.status, 0, seeded.stdout + seeded.stderr);
        const appPort = await port(),
            debugPort = await port();
        env.APP_URL = 'http://127.0.0.1:' + appPort;
        // Keep the acceptance run independent of other workspace builds.
        const browserPublic = path.join(stage, 'public');
        fs.mkdirSync(browserPublic);
        fs.cpSync(path.join(root, 'public/build'), path.join(browserPublic, 'build'), { recursive: true });
        fs.cpSync(path.join(root, 'public/images'), path.join(browserPublic, 'images'), { recursive: true });
        for (const file of ['grip.jpg', 'gadgetpouch.jpg', 'earphones.jpg', 'tablet.jpg'])
            fs.copyFileSync(path.join(root, 'database/demo/assets/photos', file), path.join(browserPublic, 'images/products/samples', file));
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

        for (const route of ['/', '/shop']) {
            await viewport(1440, 1000);
            await navigate(route);
            await until(() => evaluate('!!document.querySelector(".product-card")'), 'cards');
            for (const width of [320, 540, 800, 1100, 1440, 1920]) {
                await viewport(width, 1000);
                await delay(250);
                const result = await evaluate(
                    `(()=>{const grid=document.querySelector('.product-grid');return {overflow:document.documentElement.scrollWidth>innerWidth,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,cards:[...grid.querySelectorAll('.product-card')].map(card=>{const box=card.querySelector('.product-card-image'),img=box.querySelector('img'),r=box.getBoundingClientRect(),c=card.getBoundingClientRect();return {compact:Math.abs(r.height-160)<1,white:getComputedStyle(box).backgroundColor,fit:img&&getComputedStyle(img).objectFit,title:card.querySelector('h2').getBoundingClientRect().height,top:Math.round(c.top),height:c.height,action:card.querySelector('.mt-auto').getBoundingClientRect().bottom};})};})()`,
                );
                assert.equal(result.overflow, false, route + ' overflow ' + width);
                for (const card of result.cards) {
                    assert.ok(card.compact, JSON.stringify(card));
                    assert.equal(card.white, 'rgb(255, 255, 255)');
                    assert.equal(card.title, 44);
                    if (card.fit) assert.equal(card.fit, 'contain');
                    const row = result.cards.filter((c) => c.top === card.top);
                    assert.ok(row.every((c) => Math.abs(c.height - card.height) < 1));
                    assert.ok(row.every((c) => Math.abs(c.action - card.action) < 1));
                }
                const unusedRight = await evaluate(
                    "(()=>{const grid=document.querySelector('.product-grid'),cards=[...grid.querySelectorAll('.product-card')],top=cards[0].getBoundingClientRect().top,row=cards.filter(c=>Math.abs(c.getBoundingClientRect().top-top)<1);return grid.getBoundingClientRect().right-Math.max(...row.map(c=>c.getBoundingClientRect().right));})()",
                );
                assert.ok(unusedRight < 2, route + ' unused row width at ' + width + ': ' + unusedRight);
                assert.ok(result.columns >= 1 && result.columns <= 5);
                record(route + ' ' + width, result);
                if ([320, 1440].includes(width)) await screenshot((route === '/' ? 'home' : 'shop') + '-cards-' + width);
            }
        }
        await viewport(1440, 1000);
        await navigate('/shop');
        await click('.product-card-variants button');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'variant dialog');
        const option = await evaluate('document.querySelector("[role=dialog] select").options[1].value');
        await set('[role=dialog] select', option);
        await evaluate('Array.from(document.querySelectorAll("[role=dialog] button")).find(b=>b.textContent.trim()==="Done").click()');
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'variant closes');
        assert.equal(await evaluate('document.querySelector(".product-card-variants button").textContent'), 'Small / purple');
        record('Variant selector', 'Dialog selection retained beneath title');
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
                    date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
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
