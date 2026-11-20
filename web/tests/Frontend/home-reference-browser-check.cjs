const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const featuredOnly = true;
const actionsOnly = process.env.LUBOSMART_BROWSER_ACTIONS_ONLY === '1';
const authOnly = process.env.LUBOSMART_BROWSER_AUTH_ONLY === '1';
const output = path.join(
    root,
    authOnly
        ? '../.tools/development-artifacts/storage-app/auth-reference-ui-check'
        : featuredOnly
          ? '../.tools/development-artifacts/storage-app/home-reference-match-check'
          : process.env.LUBOSMART_BROWSER_HOME_ONLY === '1'
            ? '../.tools/development-artifacts/storage-app/home-typography-ui-check'
            : '../.tools/development-artifacts/storage-app/reference-design-ui-check',
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
        console.log('Isolated database and fixtures ready');
        const appPort = await port(),
            debugPort = await port();
        env.APP_URL = 'http://127.0.0.1:' + appPort;
        // Isolate public assets from other production builds in this workspace.
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
            await delay(800);
        };
        const viewport = async (width, height) =>
            cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
        const screenshot = async (name) => {
            await evaluate(
                'Promise.all(Array.from(document.images).map(async image => { image.loading="eager"; try { await image.decode(); } catch {} }))',
            );
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

        for (const [width, height] of actionsOnly
            ? []
            : [
                  [1440, 1000],
                  [768, 1000],
                  [320, 900],
                  [360, 900],
                  [844, 390],
              ]) {
            await viewport(width, height);
            for (const page of authOnly
                ? ['/login', '/register', '/register?role=seller']
                : featuredOnly
                  ? ['/']
                  : ['/', '/register', '/login', '/register?role=seller']) {
                await navigate(page);
                assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, page + ' overflow ' + width);
                assert.equal(await evaluate('document.querySelectorAll("h1").length'), 1, 'one page heading: ' + page);
                if (page.startsWith('/login') || page.startsWith('/register')) {
                    assert.equal(await evaluate('!!document.querySelector(".auth-reference-shell")'), true, 'reference auth shell');
                    await evaluate('Promise.all([...document.images].map(image => image.decode().catch(() => {})))');
                    assert.equal(
                        await evaluate('[...document.images].every(image => image.complete && image.naturalWidth > 0)'),
                        true,
                        'auth assets load',
                    );
                }
                if (page === '/login' && width <= 900) {
                    assert.equal(
                        await evaluate('document.querySelector("#login-email").getBoundingClientRect().top < innerHeight || innerHeight < 500'),
                        true,
                        'mobile login field is immediately reachable',
                    );
                }
                if (page === '/') {
                    await evaluate(
                        'new Promise((resolve, reject) => { const image = new Image(); image.onload = resolve; image.onerror = () => reject(Error("Category artwork failed to load")); image.src = "/images/categories/category-atlas-v1.png"; })',
                    );
                    for (const theme of ['light', 'dark']) {
                        await evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'})`);
                        const clip = await evaluate(
                            '(() => { const box = document.querySelector("#shop-categories").getBoundingClientRect(); return {x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height, scale: 1}; })()',
                        );
                        const capture = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
                        fs.writeFileSync(path.join(output, 'categories-' + theme + '-' + width + '.png'), Buffer.from(capture.data, 'base64'));
                    }
                    await evaluate('document.documentElement.classList.remove("dark")');
                    await evaluate(
                        'Promise.all([...document.querySelectorAll(".home-seller img")].map(async image => { image.loading = "eager"; try { await image.decode(); } catch {} }))',
                    );
                    const seller = await evaluate(
                        '(() => { const section = document.querySelector(".home-seller"); const button = section.querySelector("a"); const copy = section.querySelector(":scope > div").getBoundingClientRect(); const photo = section.querySelector("img").getBoundingClientRect(); const bounds = section.getBoundingClientRect(); return { href: button.getAttribute("href"), buttonHeight: button.getBoundingClientRect().height, separated: photo.top >= copy.bottom, clip: { x: bounds.x + scrollX, y: bounds.y + scrollY, width: bounds.width, height: bounds.height, scale: 1 } }; })()',
                    );
                    assert.ok(seller.href.includes('role=seller'), 'seller signup destination remains intact');
                    assert.ok(seller.buttonHeight >= 44, 'seller signup is a comfortable touch target');
                    if (width <= 700) assert.equal(seller.separated, true, 'mobile seller photo follows the text');
                    const sellerImage = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: seller.clip });
                    fs.writeFileSync(path.join(output, 'seller-' + width + '.png'), Buffer.from(sellerImage.data, 'base64'));
                    assert.equal(
                        await evaluate(
                            '(() => { const form = document.querySelector(".home-hero-search").getBoundingClientRect(); const actions = document.querySelector(".reference-actions").getBoundingClientRect(); return form.height > 0 && form.bottom <= actions.top; })()',
                        ),
                        true,
                        'search stays visible above shopping actions',
                    );
                    assert.equal(
                        await evaluate('[...document.querySelectorAll(".product-card")].every(card => card.getBoundingClientRect().width <= 340)'),
                        true,
                        'featured cards stay compact',
                    );
                    assert.equal(
                        await evaluate(
                            '[...document.querySelectorAll(".product-card > div:first-child")].every(image => image.getBoundingClientRect().height <= 120)',
                        ),
                        true,
                        'featured photos stay compact',
                    );
                    if (width <= 700) {
                        assert.equal(
                            await evaluate(
                                '(() => { const cards = document.querySelectorAll(".product-card"); return Math.abs(cards[0].getBoundingClientRect().top - cards[1].getBoundingClientRect().top) < 1; })()',
                            ),
                            true,
                            'two featured cards per mobile row',
                        );
                    }
                    assert.equal(await evaluate('document.querySelectorAll(".home-footer nav").length'), 3);
                    assert.equal(
                        await evaluate(
                            '!!document.querySelector(".home-seller") && !document.querySelector(".home-how") && !document.querySelector(\'a[href="#how-it-works"]\')',
                        ),
                        true,
                    );
                    assert.equal(await evaluate('document.querySelectorAll(".product-card").length'), 8);
                    assert.equal(await evaluate('document.body.textContent.includes("\\uFFFD")'), false);
                    assert.equal(
                        await evaluate(
                            'getComputedStyle(document.querySelector(".reference-hero h1")).fontFamily.includes("sans") || getComputedStyle(document.querySelector(".reference-hero h1")).fontFamily.includes("Sans")',
                        ),
                        true,
                    );
                    await evaluate('document.querySelector(".home-footer").scrollIntoView({block:"end"})');
                    const footer = await cdp('Page.captureScreenshot', { format: 'png' });
                    fs.writeFileSync(path.join(output, 'footer-' + width + '.png'), Buffer.from(footer.data, 'base64'));
                }
                if (page === '/') {
                    await evaluate('document.documentElement.classList.add("dark")');
                    await screenshot('dark-home-' + width);
                    await evaluate('document.documentElement.classList.remove("dark")');
                }
                await screenshot('reference-' + (page === '/' ? 'home' : page.replace(/[^a-z]/g, '')) + '-' + width);
            }
        }
        await viewport(1440, 1000);
        for (const page of authOnly ? ['/register', '/login'] : featuredOnly ? ['/'] : ['/', '/register', '/login']) {
            await navigate(page);
            await evaluate('document.documentElement.classList.add("dark")');
            await delay(700);
            await screenshot('reference-dark-' + (page === '/' ? 'home' : page.slice(1)));
        }
        if (featuredOnly) {
            await viewport(320, 900);
            await navigate('/');
            await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
            assert.equal(await evaluate('document.querySelector(".home-hero-art").getAnimations().length'), 0);
            assert.equal(await evaluate('document.querySelector(".home-art-motion-toggle")'), null);
            await cdp('DOM.enable');
            await cdp('CSS.enable');
            const { root: documentNode } = await cdp('DOM.getDocument');
            const selectors = [
                '.reference-actions .reference-button',
                '.reference-actions .reference-button-outline',
                '.home-hero-search .reference-button',
                '.home-seller .reference-button',
            ];
            for (const selector of selectors) {
                const { nodeId } = await cdp('DOM.querySelector', { nodeId: documentNode.nodeId, selector });
                const style = () =>
                    evaluate(
                        `(() => { const s = getComputedStyle(document.querySelector(${JSON.stringify(selector)})); return { transform: s.transform, transition: s.transitionDuration, decoration: s.textDecorationLine }; })()`,
                    );
                await cdp('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover', 'active'] });
                await delay(250);
                assert.notEqual((await style()).transform, 'none', selector + ' provides press feedback');
                assert.notEqual((await style()).transition, '0s', selector + ' animates smoothly');
                assert.equal((await style()).decoration, 'none', selector + ' has no inherited underline');
                await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
                await delay(250);
                assert.equal((await style()).transform, 'none', selector + ' honors reduced motion');
                assert.ok((await style()).transition.split(',').every((duration) => parseFloat(duration) <= 0.001));
                await cdp('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
                await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
                await delay(250);
            }
            await evaluate('document.querySelector("#home-search").focus()');
            await delay(250);
            assert.equal(
                await evaluate(
                    'getComputedStyle(document.querySelector(".home-hero-search")).borderColor === getComputedStyle(document.querySelector(".home-hero-search .reference-button")).backgroundColor',
                ),
                true,
                'search focus border uses the primary color',
            );
            record(
                'Homepage action motion',
                'All four buttons animate press feedback, avoid underlines, and honor reduced motion; search focus styling applies; artwork stays static',
            );
            if (actionsOnly) return;
            assert.equal(
                await evaluate('getComputedStyle(document.querySelector(".reference-categories")).gridTemplateColumns.split(" ").length'),
                4,
            );
            assert.equal(await evaluate('getComputedStyle(document.querySelector(".reference-services")).gridTemplateColumns.split(" ").length'), 4);
            await click('.home-menu-toggle');
            assert.equal(await evaluate('document.querySelector(".home-menu-toggle").getAttribute("aria-expanded")'), 'true');
            assert.equal(await evaluate('getComputedStyle(document.querySelector("#home-navigation")).display'), 'grid');
            await click('.home-menu-toggle');
            assert.equal(
                await evaluate('!!document.querySelector(".home-search-panel") && !document.querySelector("details.home-search-disclosure")'),
                true,
            );
            await set('#home-search', '  headphones  ');
            await click('.home-hero-search button');
            await until(() => evaluate('location.pathname === "/shop"'), 'search navigation');
            assert.equal(await evaluate('new URLSearchParams(location.search).get("search")'), 'headphones');
            await navigate('/');
            await click('.home-footer-group summary');
            assert.equal(await evaluate('document.querySelector(".home-footer-group").open'), true);
            assert.equal(errors.length, 0, JSON.stringify(errors));
            record(
                'Compact featured products',
                'Cards stay below 340px and photos at most 120px across desktop, tablet, mobile and landscape; mobile shows two per row; dark screenshot captured',
            );
            return;
        }
    } catch (error) {
        checks.push({ name: 'Browser run', status: 'FAIL', details: error.message });
        console.error(error.message);
        if (inspect) {
            try {
                console.error(
                    await inspect(
                        'JSON.stringify({title:document.title,visibility:document.visibilityState,focus:document.activeElement?.name,body:document.body.innerText.slice(0,160),errors:Array.from(document.querySelectorAll("[role=alert]")).map(el=>el.textContent),fields:Array.from(document.querySelectorAll("input")).filter(el=>el.name&&!el.name.includes("password")).map(el=>({name:el.name,value:el.value,checked:el.checked})),scripts:Array.from(document.scripts).map(s=>s.src)})',
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
            JSON.stringify({ date: '2026-11-11', isolation: 'temporary SQLite, fake notifications and PSGC', checks }, null, 2),
        );
        if (socket) socket.close();
        for (const process of processes.reverse()) process.kill();
        // Keep disposable profile/database for diagnosis; no customer data used.
    }
})();
