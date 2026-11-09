const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'documentation/api');
const routes = JSON.parse(
    execFileSync('php', ['artisan', 'route:list', '--path=api/v1', '--json'], { cwd: root, encoding: 'utf8', windowsHide: true }),
);
const filename = path.join(directory, 'openapi.json');
const api = JSON.parse(fs.readFileSync(filename, 'utf8'));
api.info.version = '1.1.0';
api.info.description =
    'Buyer, Seller and Rider mobile API. Flutter client: apps/mobile. Shared website validation and authorization apply. Administration, logistics management, invitation activation, refund and payout recording remain website workflows. See ROLE_COVERAGE.md.';
const text = (description) => ({ type: 'string', ...(description ? { description } : {}) });
const id = { type: 'integer', minimum: 1 };
const bool = { type: 'boolean' };
const file = { type: 'string', format: 'binary' };
const money = text('Peso decimal string; maximum two decimal places.');
const object = (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}) });
const ref = (name) => ({ $ref: '#/components/schemas/' + name });
const strings = (names) => Object.fromEntries(names.split(' ').map((name) => [name, text()]));
const address = object(
    { ...strings('label recipient_name phone line1 line2 region_code province_code city_code barangay_code zip'), is_default: bool },
    ['label', 'recipient_name', 'phone', 'line1', 'region_code', 'province_code', 'city_code', 'barangay_code', 'zip'],
);
const enrollment = object(
    {
        ...strings(
            'first_name last_name middle_initial email phone birthday password password_confirmation google_access_token line1 region_code province_code city_code barangay_code zip business_name tin plate_number',
        ),
        role: { type: 'string', enum: ['buyer', 'seller', 'rider'] },
        sex: { type: 'string', enum: ['female', 'male', 'prefer_not_to_say'] },
        policy_accepted: { type: 'boolean', enum: [true] },
        seller_type: { type: 'string', enum: ['individual', 'sole_proprietorship', 'corporation'] },
        business_category_id: id,
        logistics_center_id: id,
        vehicle_type: { type: 'string', enum: ['motorcycle', 'bicycle', 'car', 'van', 'truck'] },
        ...Object.fromEntries(
            'identity business_permit dti_certificate sec_certificate bir_2303 license vehicle_registration'.split(' ').map((name) => [name, file]),
        ),
    },
    [
        'first_name',
        'last_name',
        'email',
        'phone',
        'birthday',
        'sex',
        'role',
        'policy_accepted',
        'line1',
        'province_code',
        'city_code',
        'barangay_code',
        'zip',
        'identity',
    ],
);
enrollment.description =
    'Multipart enrollment; existing role age, location, uniqueness and document requirements apply. Password+confirmation required unless verified google_access_token supplied (then both prohibited). Buyer/Seller require region_code. Seller additionally requires seller_type, business_name, business_category_id, TIN 000-000-000-000 and business_permit; sole proprietor adds dti_certificate/bir_2303, corporation sec_certificate/bir_2303. Rider additionally requires logistics_center_id, vehicle_type, plate_number, license and vehicle_registration. See RegisterAccountRequest, SellerRules and RiderRegistrationRules.';
const inventory = object(
    {
        name: text(),
        description: text(),
        category_id: id,
        price: money,
        stock: { type: 'integer', minimum: 0 },
        weight_grams: { type: 'integer', minimum: 1, maximum: 50000 },
        status: { type: 'string', enum: ['active', 'hidden'] },
        image: file,
        expected_stock: { type: 'integer', minimum: 0, description: 'Required on update: stock from last read.' },
    },
    ['name', 'category_id', 'price', 'stock', 'status'],
);
const message = object({ body: text(), attachment: file }, ['body']);
Object.assign(api.components.schemas, {
    SessionInput: object(strings('email password device_name'), ['email', 'password', 'device_name']),
    EnrollmentInput: enrollment,
    InventoryInput: inventory,
    MobileAddressInput: address,
    ProfileInput: object({ ...strings('name email phone current_password otp_token business_name bank_account plate_number'), identity: file }, [
        'name',
        'email',
    ]),
    VariantsInput: object(
        {
            expected_stock: { type: 'integer', minimum: 0 },
            variants: {
                type: 'array',
                minItems: 1,
                maxItems: 51,
                items: object(
                    {
                        id,
                        name: text(),
                        stock: { type: 'integer', minimum: 0 },
                        expected_stock: { type: 'integer', minimum: 0, description: 'Required with an existing row id.' },
                        is_active: bool,
                    },
                    ['name', 'stock', 'is_active'],
                ),
            },
        },
        ['expected_stock', 'variants'],
    ),
    SupportInput: object(
        {
            kind: { type: 'string', enum: ['complaint', 'message'] },
            subject: text(),
            body: text(),
            seller_order_id: id,
            recipient_email: text(),
            attachment: file,
        },
        ['kind', 'subject', 'body'],
    ),
    MobileSession: object({
        access_token: text('Returned once; OS secure storage required.'),
        token_type: { type: 'string', enum: ['Bearer'] },
        kind: { type: 'string', enum: ['onboarding', 'operational'] },
        expires_at: { type: 'string', format: 'date-time' },
        user: ref('User'),
        verification_mail_sent: bool,
    }),
    RoleResponse: {
        type: 'object',
        additionalProperties: true,
        description:
            'Role-scoped allow-listed response. This is a flexible response schema, not a generated typed client contract. See ROLE_COVERAGE.md and the referenced Laravel action for exact fields. Resource collections: data/links/meta. RoleData paginators: data.data/current_page/last_page.',
    },
});
const codeInput = (purpose, verify = false) =>
    object({ email: text(), purpose: { type: 'string', enum: [purpose] }, ...(verify ? { code: text('Six digits.') } : {}) }, [
        'email',
        'purpose',
        ...(verify ? ['code'] : []),
    ]);
const inputs = {
    'POST /auth/session': ref('SessionInput'),
    'POST /auth/register': ref('EnrollmentInput'),
    'POST /auth/google': object({ access_token: text('Provider access token, not ID token.'), device_name: text() }, ['access_token', 'device_name']),
    'POST /auth/password/code': codeInput('password'),
    'POST /auth/password/verify': codeInput('password', true),
    'POST /auth/password/reset': object(strings('email confirmation_token password password_confirmation'), [
        'email',
        'confirmation_token',
        'password',
        'password_confirmation',
    ]),
    'POST /settings/code': codeInput('profile'),
    'POST /settings/code/verify': codeInput('profile', true),
    'PATCH /settings/profile': ref('ProfileInput'),
    'POST /onboarding/verify': object({ code: text('Six digits.') }, ['code']),
    'POST /onboarding/application': {
        ...enrollment,
        required: [],
        description:
            'Correct existing application. Existing documents retained unless replaced; role cannot change. Shared ApplicationController validation applies. Submission requires subsequent sign-in.',
    },
    'POST /onboarding/application/draft': {
        ...enrollment,
        required: [],
        description: 'Save application draft; does not grant approval. Shared draft validation applies.',
    },
    'PUT /addresses/{address}': ref('MobileAddressInput'),
    'PUT /wishlist/{product}': object({ saved: bool }, ['saved']),
    'POST /vouchers/preview': object({ voucher_code: text() }, ['voucher_code']),
    'PUT /order-items/{item}/review': object(
        { rating: { type: 'integer', minimum: 1, maximum: 5 }, body: { type: 'string', minLength: 3, maxLength: 2000 } },
        ['rating', 'body'],
    ),
    'POST /returns': object({ seller_order_id: id, reason: { type: 'string', minLength: 10, maxLength: 2000 } }, ['seller_order_id', 'reason']),
    'PATCH /returns/{return}': object(
        {
            action: { type: 'string', enum: ['collect', 'receive'] },
            reason: { type: 'string', minLength: 3, maxLength: 500 },
            tracking_reference: text(),
            condition: { type: 'string', enum: ['intact', 'damaged'] },
            restock: bool,
        },
        ['action', 'reason', 'tracking_reference'],
    ),
    'POST /support': ref('SupportInput'),
    'POST /support/{case}/messages': message,
    'POST /parcels/{sellerOrder}/messages': object({ body: text() }, ['body']),
    'POST /seller/products': ref('InventoryInput'),
    'PUT /seller/products/{product}': { allOf: [ref('InventoryInput'), { type: 'object', required: ['expected_stock'] }] },
    'PUT /seller/products/{product}/variants': ref('VariantsInput'),
    'POST /seller/vouchers': object(
        {
            code: text('Unique uppercase letters/digits/hyphens; 3–30 chars.'),
            amount: money,
            minimum: money,
            usage_limit: id,
            expires_at: { type: 'string', format: 'date-time', description: 'Future timestamp.' },
        },
        ['code', 'amount', 'minimum', 'usage_limit', 'expires_at'],
    ),
    'PATCH /seller/vouchers/{voucher}': object({ is_active: bool }, ['is_active']),
    'POST /seller/orders/{sellerOrder}/waybill': object(
        {
            packages: { type: 'integer', enum: [1] },
            request_key: { type: 'string', format: 'uuid', description: 'One UUID per print action; reuse on uncertain retry.' },
        },
        ['packages', 'request_key'],
    ),
    'POST /seller/costs': object(
        {
            incurred_on: { type: 'string', format: 'date', description: 'Not after today in Asia/Manila.' },
            category: { type: 'string', enum: ['goods', 'packaging', 'operations', 'other'] },
            description: text(),
            amount: money,
        },
        ['incurred_on', 'category', 'description', 'amount'],
    ),
    'POST /seller/costs/{cost}/void': object({ reason: text('3–500 chars.') }, ['reason']),
};
const multipart = new Set([
    'POST /auth/register',
    'POST /onboarding/application',
    'POST /onboarding/application/draft',
    'PATCH /settings/profile',
    'POST /seller/products',
    'PUT /seller/products/{product}',
    'POST /support',
    'POST /support/{case}/messages',
]);
const live = new Set();
for (const route of routes) {
    const method = route.method.split('|')[0].toLowerCase();
    const uri = '/' + route.uri.replace(/^api\/v1\/?/, '');
    const key = method.toUpperCase() + ' ' + uri;
    live.add(key);
    const operation = api.paths[uri]?.[method] || {
        operationId: route.name.replace(/\./g, '_'),
        summary: route.name.replace(/^api.v1./, '').replace(/\./g, ' '),
        responses: {
            200: { description: 'Success; see role response documentation.', content: { 'application/json': { schema: ref('RoleResponse') } } },
        },
    };
    operation.security = route.middleware.some((value) => value.includes('Authenticate:')) ? [{ bearerAuth: [] }] : [];
    operation['x-laravel-action'] = route.action;
    operation['x-access-boundary'] = route.middleware.filter((value) => /RequireMobileToken|RequireOnboardingToken|EnsureRole/.test(value));
    operation.tags = [
        uri.startsWith('/seller')
            ? 'Seller'
            : uri.startsWith('/rider') || uri.startsWith('/deliveries')
              ? 'Rider and custody'
              : uri.startsWith('/auth') || uri.startsWith('/onboarding')
                ? 'Authentication and enrollment'
                : 'Marketplace and account',
    ];
    operation.parameters ||= [];
    for (const match of uri.matchAll(/\{(\w+)\}/g))
        if (!operation.parameters.some((value) => value.in === 'path' && value.name === match[1]))
            operation.parameters.push({ in: 'path', name: match[1], required: true, schema: id });
    if (inputs[key]) {
        if (inputs[key].required?.length === 0) delete inputs[key].required;
        operation.requestBody = {
            required: true,
            content: { [multipart.has(key) ? 'multipart/form-data' : 'application/json']: { schema: inputs[key] } },
        };
    }
    if (multipart.has(key))
        operation.description =
            'For multipart PUT/PATCH send POST with _method=PUT/PATCH so PHP parses files. Shared website validation/ownership/approval rules apply.';
    for (const code of ['401', '403', '404', '409', '422', '429'])
        operation.responses[code] ||= {
            description: 'Access, state, validation or rate-limit error; inspect message/code/errors. Respect Retry-After.',
            content: { 'application/json': { schema: ref('Error') } },
        };
    if (['POST /auth/session', 'POST /auth/register', 'POST /auth/google', 'POST /onboarding/verify', 'POST /onboarding/promote'].includes(key)) {
        operation.responses['201'] = {
            description: 'Issued/rotated token: onboarding expires in one hour; operational after configured 30 days.',
            content: { 'application/json': { schema: object({ data: ref('MobileSession') }, ['data']) } },
        };
        if (key !== 'POST /auth/google') delete operation.responses['200'];
        else
            operation.responses['200'] = {
                description: 'data.kind=registration_required and data.profile=name/email; no token issued until enrollment.',
            };
    }
    if (key === 'POST /seller/products' || key === 'POST /support') {
        operation.responses['201'] = operation.responses['200'] || operation.responses['201'];
        delete operation.responses['200'];
    }
    if (key === 'DELETE /onboarding/token') {
        delete operation.responses['200'];
        operation.responses['204'] = { description: 'Token revoked; empty body.' };
    }
    if (key === 'GET /locations') {
        operation.parameters = ['regions', 'categories', 'region', 'province', 'city'].map((name) => ({
            name,
            in: 'query',
            schema: ['regions', 'categories'].includes(name) ? bool : text('Nine-digit location code.'),
        }));
        operation.responses['200'] = {
            description: 'Raw JSON array (no data envelope): code/name; cities may include postal_code. categories=true returns id/name.',
            content: { 'application/json': { schema: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
        };
    }
    if (key === 'GET /seller/reports/export')
        operation.responses['200'] = { description: 'Scoped CSV.', content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } } };
    api.paths[uri] ||= {};
    api.paths[uri][method] = operation;
}
for (const [uri, methods] of Object.entries(api.paths))
    for (const method of Object.keys(methods)) if (!live.has(method.toUpperCase() + ' ' + uri)) throw Error('Stale operation ' + uri);
function verify(value) {
    if (!value || typeof value !== 'object') return;
    if (value.$ref?.startsWith('#/')) {
        let target = api;
        for (const part of value.$ref.slice(2).split('/')) target = target?.[part];
        if (!target) throw Error('Broken reference ' + value.$ref);
    }
    Object.values(value).forEach(verify);
}
verify(api);
fs.writeFileSync(filename, JSON.stringify(api, null, 2) + '\n');
const groups = new Map();
const variables = new Set(['base_url', 'access_token']);
for (const [uri, methods] of Object.entries(api.paths))
    for (const [method, operation] of Object.entries(methods)) {
        const tag = operation.tags[0];
        if (!groups.has(tag)) groups.set(tag, []);
        const raw =
            '{{base_url}}' +
            uri.replace(/\{(\w+)\}/g, (_, name) => {
                variables.add(name);
                return '{{' + name + '}}';
            });
        const request = {
            method: method.toUpperCase(),
            header: [{ key: 'Accept', value: 'application/json' }],
            auth:
                operation.security?.length === 0
                    ? { type: 'noauth' }
                    : { type: 'bearer', bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }] },
            url: raw,
            description:
                (operation.description || '') +
                '\nAccess: ' +
                operation['x-access-boundary'].join(', ') +
                '\nFill examples with synthetic values before sending; see OpenAPI for required fields. Set path IDs from owned returned resources. Reuse action UUIDs on uncertain retries.',
        };
        const input = operation.requestBody?.content;
        if (input) {
            const type = Object.keys(input)[0];
            let schema = input[type].schema;
            if (schema.$ref) schema = api.components.schemas[schema.$ref.split('/').pop()];
            if (schema.allOf) schema = api.components.schemas.InventoryInput;
            const properties = schema.properties || {};
            if (type === 'multipart/form-data') {
                if (['PUT', 'PATCH'].includes(request.method)) request.method = 'POST';
                request.body = {
                    mode: 'formdata',
                    formdata: [
                        ...(['put', 'patch'].includes(method) ? [{ key: '_method', value: method.toUpperCase(), type: 'text' }] : []),
                        ...Object.entries(properties).map(([key, value]) =>
                            value.format === 'binary'
                                ? { key, type: 'file', src: [], disabled: !schema.required?.includes(key) }
                                : { key, value: '', type: 'text', disabled: !schema.required?.includes(key), description: value.description || '' },
                        ),
                    ],
                };
            } else {
                const example = Object.fromEntries(
                    Object.entries(properties).map(([key, value]) => [
                        key,
                        value.example ?? (value.type === 'boolean' ? false : value.type === 'integer' ? 1 : value.type === 'array' ? [] : ''),
                    ]),
                );
                request.header.push({ key: 'Content-Type', value: 'application/json' });
                request.body = { mode: 'raw', raw: JSON.stringify(example, null, 2), options: { raw: { language: 'json' } } };
            }
        }
        const item = { name: method.toUpperCase() + ' ' + uri, request };
        if (['/auth/session', '/auth/tokens', '/auth/google', '/onboarding/verify', '/onboarding/promote'].includes(uri) && method === 'post')
            item.event = [
                {
                    listen: 'test',
                    script: {
                        type: 'text/javascript',
                        exec: [
                            'if (pm.response.code === 201) { const data = pm.response.json().data; if (data.access_token) pm.collectionVariables.set("access_token", data.access_token); }',
                        ],
                    },
                },
            ];
        groups.get(tag).push(item);
    }
fs.writeFileSync(
    path.join(directory, 'lubosmart-v1.postman_collection.json'),
    JSON.stringify(
        {
            info: {
                name: 'LubosMart v1 Buyer Seller Rider',
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
                description:
                    live.size +
                    ' operations. Fill placeholder values and role-specific fields before sending. Generate intent UUIDs once per action and reuse on uncertain retries. Never export populated credentials/tokens.',
            },
            variable: [...variables].map((key) => ({ key, value: key === 'base_url' ? 'http://127.0.0.1:8000/api/v1' : '', type: 'string' })),
            item: [...groups].map(([name, item]) => ({ name, item })),
        },
        null,
        2,
    ) + '\n',
);
fs.writeFileSync(
    path.join(directory, 'ENDPOINTS.md'),
    '# V1 endpoint inventory\n\nGenerated by scripts/generate-mobile-api-contract.cjs from Laravel routes. ' +
        live.size +
        ' operations. Ownership and operational eligibility are checked on every protected request.\n\n| Method | Path | Access middleware | Server action |\n| --- | --- | --- | --- |\n' +
        routes
            .map(
                (route) =>
                    '| ' +
                    route.method.split('|')[0] +
                    ' | ' +
                    route.uri +
                    ' | ' +
                    (route.middleware
                        .filter((value) => /RequireMobileToken|RequireOnboardingToken|EnsureRole/.test(value))
                        .map((value) => value.split('\\').pop())
                        .join('; ') || 'Public') +
                    ' | ' +
                    route.action.split('\\').pop() +
                    ' |',
            )
            .join('\n') +
        '\n',
);
console.log('Verified ' + live.size + ' route operations, local schema references and Postman requests.');
