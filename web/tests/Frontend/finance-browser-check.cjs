const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, '../.tools/development-artifacts/storage-app/finance-ui-check');
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
const captureBaseline = process.argv.includes('--capture-baseline');
const adminRefinement = process.argv.includes('--admin-refinement');
const baselineFile = path.join(output, 'phase2-baseline.json');
const financeSnapshots = {};
const previousSnapshots = !captureBaseline && fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : null;
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
        for (const role of ['admin', 'logistics', 'seller', 'rider']) {
            console.log('Checking finance surfaces: ' + role);
            await cdp('Network.clearBrowserCookies');
            await viewport(1440, 1000);
            await navigate('/login');
            await set('#login-email', role + '@dashboard.example.com');
            await set('#login-password', 'Browser@2026');
            await click('form:has(#login-email) button[type=submit]');
            await until(() => evaluate('location.pathname.startsWith("/dashboard")'), 'login ' + role);
            await navigate('/finance');
            assert.equal(await evaluate('document.querySelectorAll("h1").length'), 1);
            financeSnapshots[role] = await evaluate(
                '(() => { const p=JSON.parse(document.querySelector("#app").dataset.page).props; return {amounts:p.amounts,discrepancies:p.discrepancies,legacy_rates:p.legacy_rates,transactions:p.transactions.data.map(({tracking_reference,collection_reference,handover_reference,placed_at,...row})=>row)}; })()',
            );
            if (previousSnapshots && !adminRefinement)
                assert.deepEqual(financeSnapshots[role], previousSnapshots[role], role + ' financial baseline');
            assert.equal(financeSnapshots[role].amounts['COD collected'], 98000, role + ' fixture COD total');
            assert.equal(financeSnapshots[role].transactions[0].expected_cash_cents, 98000, role + ' fixture expected cash');
            if (!captureBaseline) {
                const financeProps = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props');
                assert.equal(await evaluate('!!document.querySelector("table caption")'), true, role + ' transaction table');
                if (role === 'logistics') assert.equal(await evaluate(`document.querySelectorAll('nav[aria-label="Finance Center"] a').length`), 4);
                await click('tbody button[aria-label^="View details:"]');
                await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'financial details drawer');
                await viewport(320, 1000);
                assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, role + ' drawer overflow');
                await delay(600);
                await screenshot(role + '-transaction-drawer-320');
                await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
                await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
                await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'drawer Escape close');
                assert.equal(
                    await evaluate('document.activeElement.getAttribute("aria-label")?.startsWith("View details:")'),
                    true,
                    'drawer restores focus',
                );
                const tracking = financeProps.transactions.data[0].tracking_reference;
                if (tracking) {
                    await navigate('/finance?tab=transactions&reference=' + encodeURIComponent(tracking));
                    assert.equal(
                        await evaluate(`document.querySelector('nav[aria-label="Finance Center"] [aria-current="page"]').textContent`),
                        'Transactions',
                    );
                    assert.equal(
                        await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.transactions.data.length'),
                        1,
                        'exact-reference filter',
                    );
                    assert.equal(
                        await evaluate(`document.querySelector('nav[aria-label="Finance Center"] a').href.includes("reference=")`),
                        true,
                        'tab keeps filters',
                    );
                    await click('main form button');
                    await until(() => evaluate('!document.querySelector("main form button").disabled'), 'apply finance filters');
                    assert.equal(await evaluate('new URLSearchParams(location.search).get("tab")'), 'transactions', 'apply keeps selected tab');
                }
                await navigate('/finance?tab=transactions&reference=PHASE2-NO-MATCH');
                assert.equal(await evaluate('document.querySelector("main").innerText.includes("No matching transaction references")'), true);
                await navigate('/finance');
            }

            for (const width of [320, 768, 1440]) {
                await viewport(width, 1000);
                await delay(150);
                assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, role + ' overflow ' + width);
                await screenshot(role + '-finance-' + width);
            }
            await evaluate('document.documentElement.classList.add("dark")');
            await screenshot(role + '-finance-dark');
            if (role === 'admin') {
                await navigate('/logistics-settlements');
                if (!captureBaseline) await click('tbody button[aria-label^="View details:"]');

                await evaluate(
                    'Array.from(document.querySelectorAll("main button, [role=dialog] button")).find(b=>b.textContent.includes("Confirm product remittance receipt")).click()',
                );
                await until(
                    () =>
                        evaluate(
                            '!!Array.from(document.querySelectorAll("[role=dialog] label")).find(l=>l.textContent.includes("External payment or physical receipt reference"))',
                        ),
                    'receipt dialog',
                );
                await viewport(320, 1000);
                await screenshot('admin-remittance-dialog-320');
                assert.equal(
                    await evaluate('Array.from(document.querySelectorAll("[role=dialog]")).every(el => el.scrollWidth <= el.clientWidth + 1)'),
                    true,
                    'remittance dialog content fits mobile width',
                );
                const field = async (label, value) => {
                    const selector = await evaluate(
                        `(() => {const label=Array.from(document.querySelectorAll('[role=dialog] label')).find(l=>l.textContent.includes(${JSON.stringify(label)})); return '#'+CSS.escape(label.htmlFor);})()`,
                    );
                    return set(selector, value);
                };
                await field('External payment or physical receipt reference', 'BROWSER-ACTUAL-PRODUCT-RECEIPT');
                await field('Actual receipt date', '2026-11-11');
                await evaluate(
                    `(() => {const el=document.querySelector('[role=dialog] textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(el,'Synthetic actual cash receipt evidence.');el.dispatchEvent(new Event('input',{bubbles:true}));})()`,
                );
                await evaluate('document.querySelector("[role=dialog] form").requestSubmit()');
                await until(
                    () => evaluate('!document.querySelector("[role=dialog]") && document.querySelector("main").innerText.includes("LMRC-")'),
                    'recorded product remittance',
                );
                await screenshot('admin-remittance-recorded');
                await navigate('/settlements');
                assert.equal(await evaluate('document.querySelector("main").innerText.includes("Eligible for a recorded manual payout")'), true);
            }
            if (role === 'seller') {
                await navigate('/orders');
                assert.equal(await evaluate('document.querySelector("main").innerText.includes("09171234567")'), false);
                await navigate('/seller/vouchers');
                assert.equal(await evaluate('document.querySelector("main").innerText.includes("Voucher usage history")'), true);
            }
            const surfaces =
                role === 'admin'
                    ? [
                          '/refund-funding',
                          '/returns',
                          '/reports',
                          '/admin/commission',
                          ...(adminRefinement
                              ? [
                                    '/dashboard/admin',
                                    '/accounts',
                                    '/reviews',
                                    '/admin/compliance',
                                    '/admin/product-reviews',
                                    '/admin/platform',
                                    '/admin/audit-log',
                                    '/settings/profile',
                                    '/settings/password',
                                    '/settings/appearance',
                                    '/admin/change-requests',
                                    '/orders',
                                    '/support',
                                ]
                              : []),
                      ]
                    : role === 'logistics'
                      ? ['/rider-payments', '/logistics/riders', '/logistics-settlements', '/reports']
                      : role === 'seller'
                        ? ['/seller/vouchers', '/settlements', '/seller/costs', '/reports']
                        : ['/rider-payments', '/deliveries', '/reports'];
            for (const surface of surfaces) {
                console.log('Checking ' + role + ' ' + surface);
                await navigate(surface);
                if (!captureBaseline && surface === '/reports' && role === 'logistics') {
                    const csv = await evaluate(
                        '(async () => { const r=await fetch("/logistics/reports/export");return {status:r.status,body:await r.text()}; })()',
                    );
                    assert.equal(csv.status, 200);
                    assert.ok(csv.body.includes('980'), 'delivery CSV preserves COD value');
                }
                if (!captureBaseline && role === 'logistics' && ['/rider-payments', '/logistics-settlements'].includes(surface)) {
                    assert.equal(
                        await evaluate(`document.querySelector('[data-sidebar="menu-button"][href="/finance"]').getAttribute('aria-current')`),
                        'page',
                        'Finance Center active on legacy routes',
                    );
                }
                for (const theme of ['light', 'dark']) {
                    await evaluate('document.documentElement.classList.toggle("dark", ' + (theme === 'dark') + ')');
                    for (const width of [320, 768, 1440]) {
                        await viewport(width, 1000);
                        await delay(150);
                        assert.equal(
                            await evaluate('document.documentElement.scrollWidth <= innerWidth'),
                            true,
                            role + ' ' + surface + ' ' + theme + ' overflow ' + width,
                        );
                        await screenshot(role + surface.replaceAll('/', '-') + '-' + theme + '-' + width);
                    }
                }
                if (!captureBaseline && surface === '/reports') {
                    // Effective CSS viewport widths for a 1280px display at 200% / 400% zoom.
                    // CSS zoom on body does not update media queries like browser zoom does.
                    for (const zoom of [2, 4]) {
                        await viewport(1280 / zoom, 1000);
                        assert.equal(
                            await evaluate('document.documentElement.scrollWidth <= innerWidth'),
                            true,
                            role + ' reports zoom-equivalent viewport ' + zoom,
                        );
                    }
                    await viewport(1440, 1000);
                }
                const trigger = 'button[data-sidebar="trigger"]';
                if (await evaluate('!!document.querySelector(' + JSON.stringify(trigger) + ')')) {
                    await click(trigger);
                    await delay(250);
                    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, role + ' collapsed ' + surface);
                    await click(trigger);
                    await delay(250);
                }
            }
            record(
                'Finance ' + role,
                'Real rendered page at 320/768/1440px, dark screenshot, role scoping; Admin remittance form and Seller privacy/history checks',
            );
        }
        const finalization = spawnSync('php', ['tests/Fixtures/finance-browser-seed.php', 'finalization'], {
            cwd: root,
            env,
            encoding: 'utf8',
            windowsHide: true,
        });
        assert.equal(finalization.status, 0, finalization.stdout + finalization.stderr);
        const login = async (role) => {
            await cdp('Network.clearBrowserCookies');
            await viewport(1440, 1000);
            await navigate('/login');
            await set('#login-email', role + '@dashboard.example.com');
            await set('#login-password', 'Browser@2026');
            await click('form:has(#login-email) button[type=submit]');
            await until(() => evaluate('location.pathname.startsWith("/dashboard")'), 'finalization login ' + role);
        };
        const byLabel = async (container, label, value) => {
            const selector = await evaluate(
                '(() => { const labels=Array.from(document.querySelectorAll(' +
                    JSON.stringify(container + ' label') +
                    ')); const label=labels.find(l=>l.textContent.includes(' +
                    JSON.stringify(label) +
                    ')); if(!label) throw Error("Missing field label"); return "#"+CSS.escape(label.htmlFor); })()',
            );
            await set(selector, value);
        };
        await login('admin');
        if (adminRefinement) {
            await navigate('/returns?exception_search=Browser');
            assert.equal(
                await evaluate('Array.from(document.querySelectorAll("label")).some(e=>e.textContent.includes("Delivered parcel ID"))'),
                false,
            );
            const choices = await evaluate('JSON.parse(document.querySelector("#app").dataset.page).props.exceptionParcels');
            assert.ok(choices.length, 'record search resolves delivered parcel by buyer or shop');
            await byLabel('main', 'Select an existing parcel', String(choices[0].id));
            assert.equal(await evaluate('document.querySelector("main").innerText.includes("Return deadline:")'), true);
            await viewport(320, 1000);
            await screenshot('admin-return-exception-record-320');
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            record(
                'Admin return policy and parcel selector',
                'Existing parcel search resolves delivery deadline, buyer, shop, return and exception state without typed IDs',
            );
        }
        await navigate('/refund-funding');
        await evaluate(
            '(() => { const e=Array.from(document.querySelectorAll("main summary, main button")).find(e=>e.textContent.includes("Record platform advance")); if(e.tagName === "SUMMARY") e.parentElement.open=true; else e.click(); })()',
        );
        await until(() => evaluate('!!document.querySelector("[role=dialog] form, details[open] form")'), 'refund funding form');
        const funding = await evaluate('document.querySelector("[role=dialog] form") ? "[role=dialog]" : "details[open]"');
        await byLabel(funding, 'Actual amount', '200.00');
        await byLabel(funding, 'Unique receipt', 'BROWSER-COIN-BACKING');
        await byLabel(funding, 'Funding evidence', 'Synthetic available platform cash earmarked for this approved refund.');
        await evaluate('document.querySelector(' + JSON.stringify(funding + ' form') + ').requestSubmit()');
        await until(() => evaluate('document.querySelector("main").innerText.includes("BROWSER-COIN-BACKING")'), 'funded reserve');
        await screenshot('admin-refund-backing');
        await login('buyer');
        await until(() => evaluate(`!!document.querySelector('[data-sidebar=menu-button][href="/wallet"]')`), 'buyer wallet sidebar link');
        await click('[data-sidebar=menu-button][href="/wallet"]');
        await until(
            () => evaluate('location.pathname === "/wallet" && document.querySelector("main").innerText.includes("No wallet transactions yet")'),
            'empty wallet via sidebar',
        );
        assert.equal(await evaluate(`document.querySelector('[data-sidebar=menu-button][href="/wallet"]').getAttribute('aria-current')`), 'page');
        for (const width of [320, 768, 1440]) {
            await viewport(width, 1000);
            await delay(150);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'empty wallet overflow ' + width);
            await screenshot('buyer-wallet-empty-' + width);
        }
        record(
            'Buyer wallet navigation and empty state',
            'Buyer sidebar link opens /wallet, active navigation and zero-data state at 320/768/1440px',
        );
        await navigate('/returns');
        await evaluate(
            'Array.from(document.querySelectorAll("main button")).find(e=>e.textContent.trim()==="Accept this Lubos Coins offer").click()',
        );
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'exact coin consent dialog');
        await viewport(320, 1000);
        await screenshot('buyer-coin-consent-320');
        await evaluate('document.querySelector("[role=dialog] form").requestSubmit()');
        await until(
            () =>
                evaluate(
                    '!document.querySelector("[role=dialog]") && document.querySelector("main").innerText.includes("Buyer accepted this exact coin offer")',
                ),
            'accepted coin offer',
        );
        await login('admin');
        await navigate('/returns');
        if (adminRefinement) await click('tbody button[aria-label^="View details:"]');
        await evaluate(
            'Array.from(document.querySelectorAll("main button, [role=dialog] button")).find(e=>e.textContent.trim()==="Issue accepted Lubos Coins").click()',
        );
        const execution = '[role=dialog]:has(> form)';
        await until(() => evaluate('!!document.querySelector(' + JSON.stringify(execution) + ')'), 'coin execution dialog');
        await byLabel(execution, 'Reason / handover notes', 'Execute exact accepted and funded synthetic refund.');
        await evaluate('document.querySelector(' + JSON.stringify(execution + ' form') + ').requestSubmit()');
        await until(
            () => evaluate('!document.querySelector("[role=dialog]") && document.querySelector("main").innerText.includes("refunded")'),
            'issued coin refund',
        );
        if (adminRefinement) {
            await navigate('/refund-funding');
            await click('tbody button[aria-label^="View details: Wallet entry #"]');
            await evaluate(
                'Array.from(document.querySelectorAll("[role=dialog] button")).find(b=>b.textContent.trim()==="Correct this refund credit").click()',
            );
            await until(() => evaluate('!!document.querySelector(' + JSON.stringify(execution) + ')'), 'record-based correction preview');
            assert.equal(
                await evaluate(
                    'Array.from(document.querySelectorAll(' +
                        JSON.stringify(execution + ' label') +
                        ')).some(l=>l.textContent.includes("Wallet transaction ID"))',
                ),
                false,
            );
            await viewport(320, 1000);
            await screenshot('admin-wallet-correction-preview-320');
            await evaluate(
                'Array.from(document.querySelectorAll(' +
                    JSON.stringify(execution + ' button') +
                    ')).find(b=>b.textContent.trim()==="Cancel").click()',
            );
            await until(() => evaluate('!document.querySelector(' + JSON.stringify(execution) + ')'), 'cancel correction');
            record(
                'Contextual wallet correction',
                'Selected credited buyer and linked return produce a signed preview; no typed ledger ID and cancellation preserves the wallet',
            );
        }
        await login('buyer');
        await navigate('/wallet');
        assert.equal(await evaluate('document.querySelector("main").innerText.includes("200.00")'), true);
        for (const width of [320, 768, 1440]) {
            await viewport(width, 1000);
            await delay(150);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'wallet overflow ' + width);
            await screenshot('buyer-wallet-' + width);
        }
        await evaluate('document.documentElement.classList.add("dark")');
        await screenshot('buyer-wallet-dark');
        record(
            'Funded coin refund and buyer wallet',
            'Actual reserve form, exact buyer consent, Admin issuance, buyer ledger, responsive wallet and dark theme',
        );
        if (captureBaseline) fs.writeFileSync(baselineFile, JSON.stringify(financeSnapshots, null, 2));
        if (previousSnapshots && !adminRefinement)
            record('Financial baseline', 'All four role totals, discrepancy counts and representative transaction states unchanged');
        assert.deepEqual(runtimeErrors, []);
        record('Finance browser exceptions', 'Zero uncaught exceptions');
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
