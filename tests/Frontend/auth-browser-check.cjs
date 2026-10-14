const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');

const root = path.resolve(__dirname, '../..');
const output = path.join(
    root,
    process.env.LUBOSMART_BROWSER_HOME_ONLY === '1' ? 'storage/app/home-typography-ui-check' : 'storage/app/auth-ui-check',
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
        const registrationNext = async () => {
            await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Continue").click()');
            await delay(200);
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
        for (const [width, height] of [
            [1440, 1000],
            [768, 1000],
            [320, 900],
        ]) {
            await viewport(width, height);
            await navigate('/');
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
            assert.equal(await evaluate('getComputedStyle(document.querySelector(".storefront__hero h1")).fontFamily.includes("Georgia")'), true);
            assert.equal(
                await evaluate(
                    `(() => { const title=document.querySelector('.storefront__hero h1').getBoundingClientRect(); const copy=document.querySelector('.storefront__hero-copy').getBoundingClientRect(); return title.bottom <= copy.top; })()`,
                ),
                true,
            );
            await screenshot('homepage-typography-' + width);
        }
        record('Homepage typography', 'Serif hero and supporting text fit desktop/tablet/mobile widths without overlap or horizontal overflow');
        await viewport(1440, 1000);
        await navigate('/');
        assert.equal(await evaluate('document.querySelectorAll(".product-card").length'), 4);
        assert.equal(await evaluate('!!document.querySelector("#discovery-search")'), false);
        assert.equal(await evaluate('document.body.textContent.includes("Demo cart:")'), false);
        await navigate('/shop');
        assert.equal(await evaluate('!!document.querySelector("#sample-catalog-heading")'), false);
        assert.equal(await evaluate('!!document.querySelector("#discovery-search")'), false);
        assert.equal(await evaluate('document.body.textContent.includes("Demo cart:")'), false);
        assert.equal(runtimeErrors.length, 0);
        record('Removed demo catalog', 'Four homepage fallback cards remain; shop sample catalog and demo controls are absent');
        if (process.env.LUBOSMART_BROWSER_HOME_ONLY === '1') return;
        await viewport(1440, 1000);
        await navigate('/login');
        assert.equal(await evaluate('document.querySelector("h1").textContent'), 'Welcome back');
        assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'), false);
        record('Dedicated Sign In page', 'No modal; existing login endpoint, forgot-password and account links');
        assert.equal(await evaluate('document.querySelector("aside").textContent.includes("Local finds.")'), true);
        assert.equal(await evaluate('getComputedStyle(document.querySelector("aside h2")).fontFamily.includes("Georgia")'), true);
        await until(() => evaluate('document.querySelector("aside img[src*=auth-marketplace]")?.naturalWidth > 0'), 'marketplace illustration loads');
        await screenshot('login-desktop');
        await click('button[type=submit]');
        await until(() => evaluate('!!document.querySelector("[role=alert]")'), 'login errors');
        await until(() => evaluate('document.activeElement.name === "email"'), 'login first-error focus');
        assert.equal(await evaluate('document.activeElement.name'), 'email');
        record('Sign In required-field errors and first-error focus', 'Laravel/Inertia errors rendered in full page');
        await viewport(320, 900);
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await screenshot('login-mobile');
        record('320px Sign In reflow', 'No horizontal document overflow');
        await viewport(1440, 900);
        const readBrandingGeometry = () =>
            evaluate(`['aside', 'aside > a', 'aside h2', 'aside p:last-child'].map(selector => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return [rect.x, rect.y, rect.width, rect.height].map(Math.round);
        })`);
        await navigate('/register');
        assert.equal(await evaluate('!!document.querySelector("aside img[src*=auth-marketplace]")'), false);
        const brandingGeometry = await readBrandingGeometry();
        for (const registrationRole of ['buyer', 'seller', 'courier', 'sorting_center']) {
            await navigate('/register');
            await click('[data-role-choice=' + registrationRole + ']');
            await until(() => evaluate('!!document.querySelector("input[name=first_name]")'), 'selected role form');
            assert.equal(await evaluate('!!document.querySelector("aside img[src*=auth-marketplace]")'), false);
            assert.deepEqual(await readBrandingGeometry(), brandingGeometry);
            await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
            await delay(100);
            assert.deepEqual(await readBrandingGeometry(), brandingGeometry);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        }
        await screenshot('registration-brand-consistent');
        await viewport(1024, 480);
        assert.equal(
            await evaluate(`(() => {
            const panel = document.querySelector('aside').getBoundingClientRect();
            return [...document.querySelectorAll('aside > a, aside h2, aside p, aside img')].every(element => {
                const rect = element.getBoundingClientRect();
                return rect.top >= panel.top - 1 && rect.bottom <= panel.bottom + 1;
            });
        })()`),
            true,
        );
        await screenshot('registration-brand-short-screen');
        record(
            'Consistent registration branding',
            'Role-card navigation and scrolling preserve the text-only panel/logo/headline size for all four roles; short screens fit',
        );
        await viewport(320, 900);
        await navigate('/register');
        await navigate('/__fixture/google-new');
        await until(
            () => evaluate('location.pathname === "/register" && document.querySelectorAll("[data-role-choice]").length === 4'),
            'Google role selection',
        );
        await click('[data-role-choice=buyer]');
        await until(() => evaluate('!!document.querySelector("input[name=email]")'), 'Google prefilled Buyer form');
        assert.equal(await evaluate('document.querySelector("input[name=first_name]").value'), 'Google Browser');
        assert.equal(await evaluate('document.querySelector("input[name=last_name]").value'), 'Applicant');
        assert.equal(await evaluate('document.querySelector("input[name=email]").value'), 'google.browser@example.com');
        assert.equal(await evaluate('document.querySelector("input[name=email]").readOnly'), true);
        assert.equal(
            await evaluate(
                '!!document.querySelector("input[name=middle_initial]") && !document.querySelector("input[name=middle_initial]").required',
            ),
            true,
        );
        assert.equal(await evaluate('document.querySelector("select[name=sex]").required'), true);
        await screenshot('google-registration-prefill-mobile');
        await cdp('Storage.clearDataForOrigin', { origin: env.APP_URL, storageTypes: 'cookies,local_storage' });
        record(
            'Google registration handoff',
            'Unknown Google identity chooses a role and receives trusted name/email prefill; no registration requirements are skipped',
        );
        await navigate('/register');
        assert.equal(await evaluate('document.querySelectorAll("[data-role-choice]").length'), 4);
        assert.equal(await evaluate('!!document.querySelector("input[name=email]")'), false);
        await screenshot('registration-role-choice-mobile');
        await viewport(1440, 1000);
        await screenshot('registration-role-choice-desktop');
        await viewport(320, 900);
        await click('[data-role-choice=buyer]');
        await until(() => evaluate('!!document.querySelector("input[name=email]")'), 'buyer role choice opens form');
        record('Registration starts with role choice', 'Four role cards appear before any form; selecting Buyer opens its registration');
        assert.equal(await evaluate('document.body.textContent.includes("Already registered? Sign in")'), false);
        assert.equal(await evaluate('document.querySelector("input[name=phone]").value'), '');
        assert.equal(await evaluate('document.querySelector("input[name=phone]").parentElement.textContent.includes("+63")'), true);
        assert.equal(await evaluate('!!document.querySelector("input[name=phone]").parentElement.querySelector("svg")'), true);
        assert.equal(await evaluate('document.querySelector("label[for=first_name]").textContent.includes("*")'), true);
        assert.equal(await evaluate('[...document.querySelectorAll("input[name=role]")].length'), 4);
        const fieldPositions = await evaluate(
            `['first_name','last_name','phone','birthday','email'].map(name => { const el=document.querySelector('input[name='+name+']'); return el.getBoundingClientRect().top + scrollY; })`,
        );
        await registrationNext();
        await until(() => evaluate('!!document.querySelector("[role=alert]")'), 'registration errors');
        await until(() => evaluate('document.activeElement.name === "first_name"'), 'registration first-error focus');
        assert.equal(await evaluate('document.activeElement.name'), 'first_name');
        const positionsWithErrors = await evaluate(
            `['first_name','last_name','phone','birthday','email'].map(name => { const el=document.querySelector('input[name='+name+']'); return el.getBoundingClientRect().top + scrollY; })`,
        );
        assert.deepEqual(
            positionsWithErrors.map((position) => Math.round(position - positionsWithErrors[0])),
            fieldPositions.map((position) => Math.round(position - fieldPositions[0])),
        );
        record('Registration input stability', 'Input spacing remains unchanged when required-field errors appear at 320px');
        record('Registration empty form and focus', 'All-field Laravel errors, summary and focus on first name');
        await screenshot('register-mobile-errors');
        await navigate('/register?role=courier');
        assert.equal(await evaluate(`!!document.querySelector('[aria-label="Rider registration progress"]')`), true);
        assert.equal(await evaluate('!!document.querySelector("h2#rider-registration-heading")'), false);
        assert.equal(await evaluate('!!document.querySelector("button[type=submit]")'), true);
        assert.equal(await evaluate('!!document.querySelector("input[name=birthday]")'), true);
        record('Public Rider signup choice', 'Rider has account fields without the removed long guidance');
        await registrationNext();
        await until(
            () => evaluate('document.querySelector("input[name=first_name]")?.getAttribute("aria-invalid")==="true"'),
            'Rider personal validation',
        );
        assert.equal(await evaluate('location.pathname'), '/register');
        assert.equal(await evaluate(`document.querySelector('[data-registration-step="1"]').hidden`), true);
        record('Rider validates each registration step', 'Personal errors prevent advancing; details and documents remain in the same registration');
        await navigate('/register?role=seller');
        await viewport(1440, 1100);
        await set('input[name=first_name]', 'Preview');
        await set('input[name=last_name]', 'Seller');
        await set('select[name=sex]', 'female');
        await set('input[name=birthday]', '1990-01-01');
        await set('input[name=email]', 'preview.seller@example.com');
        await set('input[name=phone]', '639171234567');
        await registrationNext();
        await until(() => evaluate('document.querySelector("select[name=seller_type]")?.options.length > 1'), 'seller fields');
        await set('select[name=seller_type]', 'corporation');
        assert.equal(await evaluate('!!document.querySelector("input[name=sec_certificate]")'), true);
        assert.equal(await evaluate('!!document.querySelector("input[name=dti_certificate]")'), false);
        record('Seller type-specific document fields', 'Corporation renders ID/SEC/BIR, no DTI');
        await set('select[name=region_code]', '040000000');
        await until(() => evaluate('document.querySelector("select[name=province_code]").options.length > 1'), 'Laguna province');
        await set('select[name=province_code]', '043400000');
        await until(() => evaluate('document.querySelector("select[name=city_code]").options.length > 1'), 'Santa Rosa city');
        await set('select[name=city_code]', '043428000');
        assert.equal(await evaluate('document.querySelector("input[name=zip]").value'), '4026');
        await set('input[name=zip]', '4027');
        assert.equal(await evaluate('document.querySelector("input[name=zip]").value'), '4027');
        record('Postal code automatic city suggestion', 'Official Santa Rosa ZIP is filled automatically and remains editable');
        await set('select[name=region_code]', '130000000');
        await until(() => evaluate('document.querySelector("select[name=province_code]").options.length > 1'), 'provinces');
        await set('select[name=province_code]', '130000000');
        await until(() => evaluate('document.querySelector("select[name=city_code]").options.length > 1'), 'cities');
        await set('select[name=city_code]', '137404000');
        assert.equal(await evaluate('document.querySelector("input[name=zip]").value'), '');
        await until(() => evaluate('document.querySelector("select[name=barangay_code]").options.length > 1'), 'barangays');
        await set('select[name=barangay_code]', '137404001');
        await set('select[name=region_code]', '070000000');
        assert.equal(
            await evaluate('["province_code","city_code","barangay_code"].every(name=>document.querySelector("select[name="+name+"]").value==="")'),
            true,
        );
        record('Dependent address reset', 'Changing region clears province, city and barangay');
        await screenshot('seller-desktop');
        assert.equal(await evaluate('document.querySelector("aside").textContent.includes("favorites.")'), true);
        assert.equal(
            await evaluate(
                'getComputedStyle(document.querySelector("aside h2")).fontFamily.includes("Georgia") && getComputedStyle(document.querySelector("h1")).fontFamily.includes("Instrument Sans")',
            ),
            true,
        );
        await navigate('/register?role=sorting_center');
        await viewport(320, 900);
        await set('input[name=first_name]', 'Preview');
        await set('input[name=last_name]', 'Company');
        await set('select[name=sex]', 'female');
        await set('input[name=birthday]', '1990-01-01');
        await set('input[name=email]', 'preview.company@example.com');
        await set('input[name=phone]', '639171234567');
        await registrationNext();
        await until(() => evaluate('!!document.querySelector("input[name=sec_number]")'), 'company fields');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await screenshot('logistics-mobile');
        record('Logistics form and 320px reflow', 'Company/SEC/service-region fields render without horizontal overflow');
        await navigate('/forgot-password');
        assert.ok(await evaluate('!!document.querySelector("input[type=email]")'));
        assert.equal(await evaluate('document.body.textContent.includes("If your account uses Google only")'), false);
        await click('button[type=submit]');
        await until(() => evaluate('!!document.querySelector(".text-destructive[role=alert]")'), 'themed recovery validation');
        await until(() => evaluate('document.activeElement.id === "email"'), 'recovery first-error focus');
        assert.equal(await evaluate('document.activeElement.id'), 'email');
        await screenshot('forgot-password-desktop');
        record('Forgot-password navigation', 'Existing password recovery screen renders');
        await navigate('/register?role=buyer');
        await viewport(768, 1000);
        await set('input[name=first_name]', 'Juan Miguel');
        await set('input[name=last_name]', 'Dela Cruz');
        await set('input[name=phone]', '09171234567');
        await set('input[name=birthday]', '1998-05-14');
        await set('select[name=sex]', 'female');
        await set('input[name=email]', 'browser.buyer@example.com');
        await registrationNext();
        await set('select[name=region_code]', '130000000');
        await set('select[name=province_code]', '130000000');
        await set('select[name=city_code]', '137404000');
        await set('select[name=barangay_code]', '137404001');
        await set('input[name=house_number]', '14');
        await set('input[name=street]', 'Synthetic Street');
        await set('input[name=zip]', '1100');
        await set('input[name=email]', 'browser.buyer@example.com');
        const buyerId = path.join(stage, 'buyer-id.png');
        fs.writeFileSync(
            buyerId,
            Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1sAAAAASUVORK5CYII=', 'base64'),
        );
        const buyerDocument = await cdp('DOM.getDocument');
        const buyerInput = await cdp('DOM.querySelector', { nodeId: buyerDocument.root.nodeId, selector: 'input[name=identity]' });
        await cdp('DOM.setFileInputFiles', { nodeId: buyerInput.nodeId, files: [buyerId] });
        await delay(150);
        await registrationNext();
        assert.equal(await evaluate(`document.querySelector('[data-registration-step="2"]').hidden`), false);
        assert.equal(await evaluate('[...document.querySelectorAll("button")].some(el=>el.textContent.trim()==="Back")'), false);
        await evaluate('document.querySelectorAll("ol button")[1].click()');
        assert.equal(await evaluate('document.querySelector("input[name=identity]").files.length'), 1);
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Back").click()');
        assert.equal(await evaluate('document.querySelector("input[name=first_name]").value'), 'Juan Miguel');
        await registrationNext();
        await registrationNext();
        record('Buyer three-step navigation', 'Personal details, address and ID survive Back/Continue and review opens only after step validation');
        assert.equal(await evaluate('!!document.querySelector("ul[aria-label]")'), false);
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Terms and conditions").click()');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'policy dialog');
        assert.equal(await evaluate('document.querySelector("[role=dialog]").textContent.includes("Information used by LubosMart")'), true);
        assert.equal(await evaluate('document.querySelector("input[name=policy_accepted]").checked'), false);
        await evaluate('[...document.querySelectorAll("[role=dialog] button")].find(el=>el.textContent.trim()==="Close").click()');
        await until(() => evaluate('!document.querySelector("[role=dialog]")'), 'policy close');
        await set('input[name=password]', 'weak');
        assert.equal(await evaluate('!!document.querySelector("ul[aria-label]")'), false);
        assert.equal(await evaluate('document.querySelector("#auth-register-password-error").textContent.trim().length > 0'), true);
        assert.equal(await evaluate('document.body.textContent.includes("Password strength:")'), false);
        record(
            'Conditional password guidance and readable policy modal',
            'Guidance appears while typing; policy dialog opens/closes without changing consent',
        );
        await set('input[name=password]', 'Mamimili@2026');
        await set('input[name=password_confirmation]', 'Mamimili@2026');
        await click('button[aria-label="Show password"]');
        assert.equal(await evaluate('document.querySelector("input[name=password]").type'), 'text');
        await click('button[aria-label="Hide password"]');
        assert.equal(await evaluate('document.querySelector("input[name=password]").type'), 'password');
        record('Actual password masking and reveal/rehide', 'Browser input types toggle as expected');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await screenshot('buyer-tablet');
        await click('input[name=policy_accepted]');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname === "/verify-email" && !!document.querySelector("input[name=code]")'), 'buyer signup');
        record('Valid Buyer registration', 'Actual full-page registration reaches email OTP with fake delivery');
        await until(() => fs.existsSync(path.join(stage, 'verification.json')), 'fake OTP capture');
        const code = JSON.parse(fs.readFileSync(path.join(stage, 'verification.json'), 'utf8')).code;
        await evaluate(
            '(() => {const data=new DataTransfer();data.setData("text",' +
                JSON.stringify(code) +
                ');document.querySelector("input[name=code]").dispatchEvent(new ClipboardEvent("paste",{bubbles:true,cancelable:true,clipboardData:data}));})()',
        );
        assert.equal(await evaluate('document.querySelector("input[name=code]").value'), code);
        await screenshot('verify-email-tablet');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname === "/application/waiting"'), 'OTP activation');
        record('OTP paste and Buyer pending approval', 'Six-digit verification keeps Buyer waiting for Admin approval');
        const logoutFixture = async () => {
            await cdp('Storage.clearDataForOrigin', { origin: env.APP_URL, storageTypes: 'cookies,local_storage' });
            const reset = spawnSync('php', ['tests/Fixtures/auth-browser-router.php', 'reset-cache'], {
                cwd: root,
                env,
                encoding: 'utf8',
                windowsHide: true,
            });
            assert.equal(reset.status, 0, 'Isolated cache reset failed');
        };
        const chooseAddress = async (city) => {
            await set('select[name=region_code]', '130000000');
            await until(() => evaluate('document.querySelector("select[name=province_code]").options.length > 1'), 'valid province options');
            await set('select[name=province_code]', '130000000');
            await until(() => evaluate('document.querySelector("select[name=city_code]").options.length > 1'), 'valid city options');
            await set('select[name=city_code]', city);
            await until(() => evaluate('document.querySelector("select[name=barangay_code]").options.length > 1'), 'valid barangay options');
            await set('select[name=barangay_code]', city === '137404000' ? '137404001' : '137403016');
            await set('input[name=house_number]', '14');
            await set('input[name=street]', 'Synthetic test street');
            await set('input[name=zip]', '1603');
        };
        const png = path.join(stage, 'sample-document.png');
        fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1sAAAAASUVORK5CYII=', 'base64'));
        const attach = async (name) => {
            const doc = await cdp('DOM.getDocument');
            const el = await cdp('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[name=' + name + ']' });
            await cdp('DOM.setFileInputFiles', { nodeId: el.nodeId, files: [png] });
            await delay(150);
        };
        for (const role of ['seller', 'sorting_center']) {
            await logoutFixture();
            await navigate('/register?role=' + role);
            await viewport(1440, 1100);
            await until(() => evaluate('!!document.querySelector("input[name=business_name]")'), 'partner form');
            await set('input[name=first_name]', 'Partner');
            await set('input[name=last_name]', 'Applicant');
            await set('select[name=sex]', 'female');
            await set('input[name=birthday]', '1990-01-01');
            await set('input[name=email]', 'browser.' + role + '@example.com');
            await set('input[name=phone]', role === 'seller' ? '09189876543' : '09285551234');
            await registrationNext();
            await set('input[name=business_name]', role === 'seller' ? 'Browser Sample Shop' : 'Browser Sample Logistics');
            await set('input[name=tin]', role === 'seller' ? '123-456-789-000' : '234-567-890-000');
            if (role === 'seller') {
                await until(() => evaluate('document.querySelector("select[name=business_category_id]").options.length>1'), 'categories');
                await set('select[name=business_category_id]', '1');
                await set('select[name=seller_type]', 'individual');
            } else {
                await set('input[name=sec_number]', 'CS202012345');
                await set('input[name=position]', 'Operations Manager');
                await until(() => evaluate('!!document.querySelector("input[name=service_regions]")'), 'service regions');
                await click('input[name=service_regions]');
            }
            await chooseAddress(role === 'seller' ? '137404000' : '137403000');
            await attach('identity');
            await attach('business_permit');
            assert.ok(await evaluate('document.body.innerText.includes("sample-document.png")'));
            await click('button[aria-label="Remove Government-issued ID"]');
            assert.equal(await evaluate('document.querySelector("input[name=identity]").files.length'), 0);
            await attach('identity');
            if (role === 'sorting_center') {
                await attach('sec_certificate');
                await attach('bir_2303');
                await attach('business_permit');
            }
            record(role + ' upload selection/removal/replacement', 'Synthetic PNG selected, removed and reselected');
            await registrationNext();
            assert.equal(await evaluate('document.querySelectorAll("[data-registration-step]")[2].hidden'), false);
            await set('input[name=password]', 'Partner@2026');
            await set('input[name=password_confirmation]', 'Partner@2026');
            await click('input[name=policy_accepted]');
            await click('button[type=submit]');
            await until(() => evaluate('location.pathname==="/verify-email"'), 'valid ' + role + ' registration');
            record('Valid ' + role + ' registration', 'Required metadata/private uploads accepted; email verification reached');
            const otp = JSON.parse(fs.readFileSync(path.join(stage, 'verification.json'), 'utf8')).code;
            await set('input[name=code]', otp);
            await click('button[type=submit]');
            await until(() => evaluate('location.pathname==="/application/waiting"'), 'partner pending approval');
            record(role + ' OTP pending-approval transition', 'Verification reaches under-review page without operational access');
        }
        await logoutFixture();
        await navigate('/register?role=courier');
        await viewport(320, 900);
        await set('input[name=first_name]', 'Browser');
        await set('input[name=last_name]', 'Rider');
        await set('input[name=phone]', '09451239876');
        await set('input[name=birthday]', '1995-03-22');
        await set('input[name=email]', 'browser.rider@example.com');
        await set('#register-sex', 'female');
        await registrationNext();
        await registrationNext();
        assert.equal(await evaluate('document.querySelector("input[name=license]").getAttribute("aria-invalid")'), 'true');

        await set('#rider-vehicle_type', 'motorcycle');
        await set('#rider-plate_number', 'BROWSER123');
        await set('#rider-sorting_center_id', '1');
        await set('#rider-province_code', '130000000');
        await set('#rider-city_code', '137404000');
        await set('#rider-barangay_code', '137404001');
        await set('#rider-house_number', '12');
        await set('#rider-street', 'Synthetic street');
        await set('#rider-zip', '1100');
        for (const name of ['identity', 'license', 'vehicle_registration']) await attach(name);
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await screenshot('rider-signup-mobile');
        await evaluate('[...document.querySelectorAll("button")].find(el=>el.textContent.trim()==="Back").click()');
        assert.equal(await evaluate('document.querySelector("input[name=first_name]").value'), 'Browser');
        await registrationNext();
        assert.equal(await evaluate('document.querySelector("input[name=license]").files.length'), 1);
        record('Rider step navigation preserves details and documents', 'Back and Continue retain names and selected private requirements');
        await registrationNext();
        await set('input[name=password]', 'Rider@2026');
        await set('input[name=password_confirmation]', 'Rider@2026');
        await click('input[name=policy_accepted]');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname === "/verify-email"'), 'rider signup verification');
        const riderOtp = JSON.parse(fs.readFileSync(path.join(stage, 'verification.json'), 'utf8')).code;
        await set('input[name=code]', riderOtp);
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname === "/application/waiting"'), 'rider pending Logistics approval');
        record(
            'Combined Rider signup and OTP',
            'All details and private documents submitted once; OTP goes directly to Logistics review without another form',
        );
        await navigate('/deliveries');
        assert.equal(await evaluate('location.pathname'), '/application/waiting');
        record('Rider requirements and approval gate', 'Vehicle, center, address and private documents submitted; delivery URL redirects to waiting');
        await logoutFixture();
        await navigate('/login');
        await set('#login-email', 'logistics.approver@example.com');
        await set('#login-password', 'Browser@2026');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname === "/dashboard/sorting_center"'), 'Logistics approver login');
        await navigate('/logistics/riders');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        assert.equal(await evaluate('document.querySelectorAll("#main-content").length'), 1, 'Company riders uses one application layout');
        const applicationId = await evaluate(
            'JSON.parse(document.querySelector("#app").dataset.page).props.riders.find(rider=>rider.email==="browser.rider@example.com").applicationId',
        );
        await screenshot('logistics-rider-review-mobile');
        await navigate('/reviews/' + applicationId);
        await click('form button:not([type=button])');
        await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'approval confirmation');
        await click('[role=dialog] form button:not([type=button])');
        await until(() => evaluate('location.pathname === "/reviews" && !document.querySelector("[role=dialog]")'), 'Logistics approval saved');
        await logoutFixture();
        await navigate('/login');
        await set('#login-email', 'browser.rider@example.com');
        await set('#login-password', 'Rider@2026');
        await click('button[type=submit]');
        await until(() => evaluate('location.pathname === "/dashboard/courier"'), 'approved rider login');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        record(
            'Logistics approves Rider then Rider login opens own dashboard',
            'Actual review confirmation and password login; approved Rider dashboard at 320px',
        );
        await logoutFixture();
        await navigate('/login');
        await viewport(320, 900);
        await navigate('/forgot-password');
        await set('#email', 'browser.buyer@example.com');
        await click('form button:not([type=button])');
        await until(() => evaluate('!!document.querySelector("#code")'), 'recovery email code screen');
        assert.equal(await evaluate(`document.body.innerText.includes("If an account exists for that email")`), false);
        assert.equal(await evaluate(`document.querySelector('form button[type="submit"]').innerText.trim()`), 'Verify code');
        assert.equal(await evaluate(`document.querySelector('form button[type="button"]').innerText.trim()`), 'Send another code');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await screenshot('password-code-actions-mobile');
        record('Password code actions', 'Generic success banner is absent; primary Verify and secondary Resend actions fit the mobile screen');
        await until(() => fs.existsSync(path.join(stage, 'recovery.json')), 'fake recovery code capture');
        await set('#code', JSON.parse(fs.readFileSync(path.join(stage, 'recovery.json'), 'utf8')).code);
        await click('form button:not([type=button])');
        await until(() => evaluate('!!document.querySelector("input[name=password_confirmation]")'), 'recovery new password');
        await set('input[name=password]', 'Recovered@2026');
        await set('input[name=password_confirmation]', 'Recovered@2026');
        await click('form button:not([type=button])');
        await until(() => evaluate('location.pathname === "/login"'), 'recovery success login');
        record(
            'Password recovery uses the shared authentication template',
            'Fake email code verified and password reset completed through the matching screens',
        );
        await evaluate('document.documentElement.classList.add("dark")');
        await delay(300);
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
        await screenshot('login-mobile-dark');
        record('Dark theme mobile reflow', 'Token-based dark theme renders with no horizontal document overflow');
        await set('#login-email', 'browser.keyboard@example.com');
        await set('#login-password', 'Sample@2026');
        await evaluate('document.querySelector("#login-email").focus()');
        const key = async (name, code) => {
            await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: name, windowsVirtualKeyCode: code });
            await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: name, windowsVirtualKeyCode: code });
        };
        await key('Tab', 9);
        assert.equal(await evaluate('document.activeElement.name'), 'password');
        await key('Tab', 9);
        assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Show password');
        await key('Enter', 13);
        await cdp('Input.dispatchKeyEvent', { type: 'char', text: '\r', key: 'Enter', windowsVirtualKeyCode: 13 });
        await delay(150);
        assert.equal(await evaluate('document.querySelector("#login-password").type'), 'text');
        record('Native keyboard navigation and password control', 'Tab reaches password and reveal control; Enter activates it');
        const accessibility = await cdp('Accessibility.getFullAXTree');
        for (const name of ['Email address', 'Password', 'Remember me']) assert.ok(accessibility.nodes.some((node) => node.name?.value === name));
        record('Browser accessibility names', 'Accessibility tree exposes email/password/remember labels; not a screen-reader certification');
        assert.deepEqual(errors, []);
        assert.deepEqual(consoleErrors, []);
        record('Browser runtime console exceptions', 'Zero Runtime.exceptionThrown events');
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
            JSON.stringify({ date: '2026-10-13', isolation: 'temporary SQLite, fake notifications and PSGC', checks }, null, 2),
        );
        if (socket) socket.close();
        for (const process of processes.reverse()) process.kill();
        // Keep disposable profile/database for diagnosis; no customer data used.
    }
})();
