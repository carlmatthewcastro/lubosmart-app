// Real HTTP smoke check using the repository's guarded disposable SQLite fixture server.
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'lubosmart-auth-browser-'));
const database = path.join(stage, 'test.sqlite');
fs.writeFileSync(database, '');
const env = {
    ...process.env,
    APP_ENV: 'testing',
    APP_DEBUG: 'false',
    APP_CONFIG_CACHE: path.join(stage, 'config.php'),
    APP_KEY: 'base64:' + Buffer.alloc(32, 7).toString('base64'),
    DB_URL: '',
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: database,
    MAIL_MAILER: 'array',
    MAIL_SECURITY_MAILER: 'array',
    QUEUE_CONNECTION: 'sync',
    CACHE_STORE: 'array',
    SESSION_DRIVER: 'array',
    LUBOSMART_AUTH_BROWSER_STAGE: stage,
};
const checks = [];

async function freePort() {
    const listener = net.createServer();
    await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
    const port = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    return port;
}

async function run() {
    let server;
    try {
        for (const args of [
            ['artisan', 'migrate', '--force'],
            ['tests/Fixtures/auth-browser-router.php', 'dashboard-seed'],
        ]) {
            const result = spawnSync('php', args, { cwd: root, env, encoding: 'utf8', windowsHide: true });
            assert.equal(result.status, 0, result.stderr);
        }
        env.APP_URL = 'http://127.0.0.1:' + (await freePort());
        const base = env.APP_URL + '/api/v1';
        // XAMPP may have an inaccessible global upload_tmp_dir. Keep uploads isolated
        // and startup diagnostics out of JSON, as on the production server.
        server = spawn(
            'php',
            [
                '-d',
                'upload_tmp_dir="' + stage + '"',
                '-d',
                'display_startup_errors=0',
                '-d',
                'display_errors=0',
                '-S',
                new URL(env.APP_URL).host,
                '-t',
                'public',
                'tests/Fixtures/auth-browser-router.php',
            ],
            {
                cwd: root,
                env,
                stdio: 'ignore',
                windowsHide: true,
            },
        );
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
            try {
                ready = (await fetch(base + '/products', { signal: AbortSignal.timeout(1000) })).ok;
                if (ready) break;
            } catch {
                // Startup retry only; never replay a mutation here.
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        assert.ok(ready, 'Disposable API server did not start');
        const request = async (method, endpoint, body, token, status = 200) => {
            const response = await fetch(base + endpoint, {
                method,
                redirect: 'manual',
                signal: AbortSignal.timeout(10000),
                headers: {
                    ...(body ? { 'Content-Type': 'application/json' } : {}),
                    ...(token ? { Authorization: 'Bearer ' + token } : {}),
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            assert.equal(response.status, status, method + ' ' + endpoint);
            if (status === 204) return null;
            assert.ok(response.headers.get('content-type').includes('application/json'));
            assert.ok(response.headers.get('cache-control').includes('no-store'));
            return response.json();
        };
        const record = (name) => {
            checks.push({ name, status: 'PASS' });
            console.log('PASS: ' + name);
        };
        const products = await request('GET', '/products');
        const product = products.data[0];
        assert.ok(product);
        record('Public JSON catalog over real HTTP');
        const credentials = { email: 'buyer@dashboard.example.com', password: 'Browser@2026', device_name: 'Disposable HTTP test' };
        const login = await request('POST', '/auth/tokens', credentials, null, 201);
        const token = login.data.access_token;
        assert.equal((await request('GET', '/me', null, token)).data.role, 'buyer');
        record('Device login and bearer identity without session cookies or Accept header');
        await request('GET', '/cart', null, null, 401);
        record('Protected request rejects missing bearer');
        const address = await request(
            'POST',
            '/addresses',
            {
                label: 'Synthetic',
                recipient_name: 'Synthetic Buyer',
                phone: '09171234567',
                line1: '5 Synthetic Street',
                barangay: 'Test',
                city: 'Manila',
                province: 'Metro Manila',
                region: 'NCR',
                zip: '1000',
            },
            token,
            201,
        );
        await request('PUT', '/cart/items/' + product.id, { quantity: 1 }, token);
        assert.equal((await request('GET', '/cart', null, token)).data.items[0].quantity, 1);
        record('Address and absolute cart write without a CSRF/session dependency');
        const checkout = {
            address_id: address.data.id,
            checkout_key: randomUUID(),
            expected_items_subtotal: product.price,
            expected_shipping_total: '50.00',
        };
        const purchase = await request('POST', '/orders', checkout, token, 201);
        const replay = await request('POST', '/orders', checkout, token, 201);
        assert.equal(replay.data.id, purchase.data.id);
        assert.equal((await request('GET', '/products/' + product.id)).data.stock, product.stock - 1);
        record('Reviewed checkout and identical UUID retry deduct stock once');
        await request('POST', '/orders/' + purchase.data.id + '/cancel', null, token);
        await request('POST', '/orders/' + purchase.data.id + '/cancel', null, token, 409);
        assert.equal((await request('GET', '/products/' + product.id)).data.stock, product.stock);
        record('Cancellation restores stock once over HTTP');
        const seller = await request('POST', '/auth/tokens', { ...credentials, email: 'seller@dashboard.example.com' }, null, 201);
        await request('GET', '/cart', null, seller.data.access_token, 403);
        record('Role isolation over bearer HTTP');
        assert.ok((await request('GET', '/workspace', null, token)).data);
        await request('GET', '/settings/profile', null, token);
        record('Role workspace and safe profile over HTTP');
        await request('PUT', '/wishlist/' + product.id, { saved: true }, token);
        await request('GET', '/wishlist', null, token);
        await request('PUT', '/wishlist/' + product.id, { saved: false }, token);
        record('Buyer wishlist writes and reads without cookies');
        const concern = await request(
            'POST',
            '/support',
            { kind: 'complaint', subject: 'Synthetic HTTP concern', body: 'Disposable transport check.' },
            token,
            201,
        );
        await request('GET', '/support/' + concern.data.id, null, token);
        await request('POST', '/support/' + concern.data.id + '/messages', { body: 'Synthetic follow-up.' }, token);
        record('Private support creation, conversation and reply');
        await request('GET', '/seller/products', null, seller.data.access_token);
        await request('GET', '/seller/costs', null, seller.data.access_token);
        await request('GET', '/seller/reports', null, seller.data.access_token);
        record('Seller inventory and financial read boundaries');
        await request('DELETE', '/auth/token', null, token, 204);
        await request('GET', '/me', null, token, 401);
        record('Logout revokes the actual device bearer token');
        const session = await request('POST', '/auth/session', credentials, null, 201);
        const profile = (await request('GET', '/settings/profile', null, session.data.access_token)).data.user;
        const form = new FormData();
        form.set('_method', 'PATCH');
        form.set('name', profile.name);
        form.set('email', profile.email);
        form.set(
            'identity',
            new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64')], {
                type: 'image/png',
            }),
            'synthetic.png',
        );
        const upload = await fetch(base + '/settings/profile', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + session.data.access_token },
            body: form,
            signal: AbortSignal.timeout(10000),
        });
        assert.equal(upload.status, 200);
        assert.equal((await upload.json()).requires_sign_in, true);
        await request('GET', '/me', null, session.data.access_token, 401);
        record('Real multipart PATCH override stores private identity and revokes bearer for re-review');
    } finally {
        if (server) server.kill();
    }
}

run()
    .catch((error) => {
        checks.push({ name: 'HTTP smoke run', status: 'FAIL', details: error.message });
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => {
        const output = path.join(root, 'storage/app/mobile-api-http-check');
        fs.mkdirSync(output, { recursive: true });
        fs.writeFileSync(
            path.join(output, 'results.json'),
            JSON.stringify({ isolation: 'temporary SQLite, synthetic accounts, real local HTTP; no configured DB/mail', checks }, null, 2),
        );
    });
