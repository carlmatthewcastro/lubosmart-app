const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function validationModule() {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync('resources/js/lib/registration-validation.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, { exports, Intl, Date });
    return exports;
}

function componentModule(filename) {
    const values = [];
    let cursor = 0;
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
        exports,
        require(name) {
            if (name === 'react')
                return {
                    useState(initial) {
                        const index = cursor++;
                        if (!(index in values)) values[index] = initial;
                        return [
                            values[index],
                            (value) => {
                                values[index] = value;
                            },
                        ];
                    },
                    useEffect() {},
                    useRef: () => ({ current: null }),
                };
            if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
            if (name === '@/lib/registration-validation') return validationModule();
            if (name.startsWith('@/')) return { default: () => null };
            if (name === '@inertiajs/react') return {};
            return require(name);
        },
    });
    return {
        exports,
        render(component, props) {
            cursor = 0;
            return component(props);
        },
    };
}

function elements(element) {
    if (!element || typeof element !== 'object') return [];
    const children = element.props?.children;
    return [element, ...(Array.isArray(children) ? children.flat(Infinity) : [children]).flatMap(elements)];
}

for (const id of ['TC-SEL-027', 'TC-LOG-027']) {
    test(`${id}: changing address parents clears descendants in the actual component handler`, () => {
        const module = componentModule('resources/views/components/auth/seller-registration-fields.tsx');
        const changes = [];
        const tree = module.render(module.exports.default, {
            data: {
                ...module.exports.emptySellerDetails,
                region_code: '130000000',
                province_code: '130000000',
                city_code: '137404000',
                barangay_code: '137404001',
            },
            errors: {},
            disabled: false,
            company: id.includes('LOG'),
            set: (...args) => changes.push(args),
        });
        const region = elements(tree).find((element) => element.type === 'select' && element.props.name === 'region_code');
        region.props.onChange({ target: { value: '070000000' } });
        assert.deepEqual(
            changes.map((value) => Array.from(value)),
            [
                ['region_code', '070000000'],
                ['province_code', ''],
                ['city_code', ''],
                ['barangay_code', ''],
                ['zip', ''],
            ],
        );
    });
}

for (const [type, kinds] of [
    ['individual', ['identity', 'business_permit']],
    ['sole_proprietorship', ['identity', 'business_permit', 'dti_certificate', 'bir_2303']],
    ['corporation', ['identity', 'business_permit', 'sec_certificate', 'bir_2303']],
]) {
    test(`TC-SEL-023: ${type} renders exactly the required document slots`, () => {
        const module = componentModule('resources/views/components/auth/seller-registration-fields.tsx');
        const tree = module.render(module.exports.default, {
            data: { ...module.exports.emptySellerDetails, seller_type: type },
            errors: {},
            disabled: false,
            set() {},
        });
        const uploads = elements(tree).filter((element) => element.props?.kind);
        assert.deepEqual(
            uploads.map((element) => element.props.kind),
            kinds,
        );
        for (const upload of uploads) {
            const input = elements(module.render(upload.type, upload.props)).find((element) => element.type === 'input');
            assert.equal(input.props.required, true);
            assert.equal(input.props.accept, '.jpg,.jpeg,.png,.pdf');
        }
    });
}

for (const id of ['TC-BUY-020', 'TC-SEL-018', 'TC-LOG-018']) {
    test(`${id}: password component state toggles masked/revealed/masked`, () => {
        const module = componentModule('resources/views/components/auth/registration-form.tsx');
        const render = () => elements(module.render(module.exports.Password, { id: 'password', label: 'Password', value: 'Sample@2026' }));
        let tree = render();
        assert.equal(tree.find((element) => element.type === 'input').props.type, 'password');
        tree.find((element) => element.type === 'button').props.onClick();
        tree = render();
        assert.equal(tree.find((element) => element.type === 'input').props.type, 'text');
        tree.find((element) => element.type === 'button').props.onClick();
        assert.equal(render().find((element) => element.type === 'input').props.type, 'password');
    });
}

// Execute the real component's submission handler with isolated Inertia/hook doubles.
// This is a component contract check, not a browser or DOM acceptance test.
function registrationForm(role, processing = false) {
    const posts = [];
    const resets = [];
    const focus = [];
    const defaults = { business_name: '', seller_type: 'individual', service_regions: [] };
    let formCount = 0;
    const formData = [];
    const states = [];
    let stateCursor = 0;
    const inertia = {
        Link: () => null,
        usePage: () => ({ props: { errors: {} } }),
        useForm(data) {
            const index = formCount++;
            if (!formData[index]) formData[index] = data;
            data = formData[index];
            return {
                data,
                errors: {},
                processing: index === 0 && processing,
                clearErrors() {},
                setData(key, value) {
                    data[key] = value;
                },
                reset(...fields) {
                    resets.push(fields);
                },
                post(url, options) {
                    posts.push({ url, options, data });
                },
            };
        },
    };
    const source = fs.readFileSync(path.resolve('resources/views/components/auth/registration-form.tsx'), 'utf8');
    const code = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, {
        exports,
        require(name) {
            if (name === '@inertiajs/react') return inertia;
            if (name === 'react')
                return {
                    useState: (initial) => {
                        const index = stateCursor++;
                        if (!(index in states)) states[index] = initial;
                        return [
                            states[index],
                            (value) => {
                                states[index] = typeof value === 'function' ? value(states[index]) : value;
                            },
                        ];
                    },
                    useRef: () => ({
                        current: {
                            querySelector: (selector) => ({ focus: () => focus.push(selector) }),
                            querySelectorAll: () =>
                                ['first_name', 'last_name', 'phone', 'email'].map((name) => ({
                                    name,
                                    required: true,
                                    type: 'text',
                                    value: formData[0][name],
                                })),
                        },
                    }),
                };
            if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
            if (name.includes('seller-registration-fields'))
                return { default: () => null, Upload: () => null, emptyCompanyDetails: defaults, emptySellerDetails: defaults };
            if (name === '@/lib/registration-validation') return validationModule();
            if (name === '@/hooks/use-auth-request-feedback') return { useAuthRequestFeedback: () => ({ requestError: '', setRequestError() {} }) };
            if (name.startsWith('@/')) return { default: () => null };
            return require(name);
        },
        route: (name) => '/' + name,
        requestAnimationFrame: (callback) => callback(),
        Intl,
    });
    const render = () => {
        stateCursor = 0;
        formCount = 0;
        return exports.default({ initialRole: role });
    };
    return { element: render(), render, posts, resets, focus, roles: exports.registrationRoles };
}

for (const role of ['seller', 'sorting_center']) {
    test(role + ' registration validates its current step before advancing', () => {
        const form = registrationForm(role);
        form.element.props.onSubmit({ preventDefault() {} });
        assert.equal(form.posts.length, 0);
        assert.equal(form.focus[0], '[name="first_name"]');
        assert.ok(elements(form.render()).some((el) => el.props?.['aria-label'] === 'Registration progress'));
    });
}

test('registration displays Buyer Seller Rider and Logistics in order', () => {
    const { element, roles } = registrationForm('buyer');
    assert.deepEqual(
        Array.from(roles, (role) => role.title),
        ['Buyer', 'Seller', 'Rider', 'Logistics'],
    );
    assert.equal(elements(element).filter((element) => element.type === 'input' && element.props.type === 'radio').length, 4);
});

test('registration shows password guidance only while entered password needs correction', () => {
    const form = registrationForm('buyer');
    const feedback = () => elements(form.render()).find((el) => el.props?.name === 'password').props.error;
    assert.equal(feedback(), undefined);
    elements(form.render())
        .find((el) => el.props?.name === 'password')
        .props.onChange({ target: { value: 'weak' } });
    assert.match(feedback(), /Your password still needs/);
    elements(form.render())
        .find((el) => el.props?.name === 'password')
        .props.onChange({ target: { value: 'Strong@2026' } });
    assert.equal(feedback(), undefined);
    assert.equal(
        elements(form.render()).find((el) => el.props?.['aria-label'] === 'Password requirements'),
        undefined,
    );
});

for (const value of ['9171234567', '09171234567', '+639171234567']) {
    test('PH phone field accepts national or pasted international number: ' + value, () => {
        const form = registrationForm('buyer');
        elements(form.render())
            .find((element) => element.props?.name === 'phone')
            .props.onChange({ target: { value } });
        const updated = form.render();
        assert.equal(elements(updated).find((element) => element.props?.name === 'phone').props.value, '9171234567');
        updated.props.onSubmit({ preventDefault() {} });
        assert.equal(form.posts.length, 0);
    });
}

test('Rider choice submits public signup and explains Logistics approval', () => {
    const form = registrationForm('buyer');
    elements(form.element)
        .find((element) => element.type === 'input' && element.props.value === 'courier')
        .props.onChange();
    const rider = form.render();
    assert.ok(elements(rider).some((element) => element.props?.name === 'phone' && element.props.value === '' && element.props.phonePrefix));
    assert.ok(elements(rider).some((element) => element.props?.['aria-label'] === 'Rider registration progress'));
    assert.ok(elements(rider).some((element) => element.props?.name === 'birthday'));
    assert.equal(elements(rider).filter((element) => element.type === 'button' && element.props.type === 'submit').length, 1);
    rider.props.onSubmit({ preventDefault() {} });
    assert.equal(form.posts.length, 0);
    assert.equal(form.focus[0], '[name="first_name"]');
    elements(rider)
        .find((element) => element.type === 'input' && element.props.value === 'buyer')
        .props.onChange();
    form.render().props.onSubmit({ preventDefault() {} });
    assert.equal(form.posts.length, 0);
    assert.equal(form.focus.at(-1), '[name="first_name"]');
});

for (const [role, id] of [
    ['buyer', 'TC-BUY-002'],
    ['courier', 'Public rider signup'],
]) {
    test(`${id}: empty signup validates its first step before submission`, () => {
        const { element, posts, focus } = registrationForm(role);
        let prevented = false;
        assert.equal(element.type, 'form');
        assert.equal(element.props.noValidate, true);
        element.props.onSubmit({
            preventDefault() {
                prevented = true;
            },
        });
        assert.equal(prevented, true);
        assert.equal(posts.length, 0);
        assert.equal(focus[0], '[name="first_name"]');
    });
    test(`${id}: processing signup prevents a second submission`, () => {
        const { element, posts } = registrationForm(role, true);
        element.props.onSubmit({ preventDefault() {} });
        assert.equal(posts.length, 0);
    });
}

test('untouched registration stays quiet; blur errors clear after a valid correction', () => {
    const form = registrationForm('buyer');
    assert.ok(elements(form.element).every((element) => !element.props?.error));
    const input = elements(form.element).find((element) => element.props?.name === 'first_name');
    input.props.onChange({ target: { value: 'Juan123' } });
    form.render().props.onBlurCapture({ target: { name: 'first_name', type: 'text' } });
    let corrected = form.render();
    assert.match(elements(corrected).find((element) => element.props?.name === 'first_name').props.error, /letters/);
    corrected.props.onChangeCapture({ target: { name: 'first_name', type: 'text', value: 'Juan Miguel' } });
    elements(corrected)
        .find((element) => element.props?.name === 'first_name')
        .props.onChange({ target: { value: 'Juan Miguel' } });
    corrected = form.render();
    const valid = elements(corrected).find((element) => element.props?.name === 'first_name');
    assert.equal(valid.props.error, undefined);
    assert.equal(valid.props.valid, true);
});

for (const [name, value, valid] of [
    ['first_name', 'Ni\u00f1o Angelo', true],
    ['last_name', "Pe\u00f1aflor-O'Hara", true],
    ['first_name', 'J', false],
    ['first_name', 'Maria Cristina Angelica Bernadette Josefina Leonor', true],
    ['first_name', 'Maria Cristina Angelica Bernadette Josefina Leonora', false],
    ['email', ' buyer@example.com ', true],
    ['email', 'buyer@example', false],
    ['phone', '+639171234567', true],
    ['phone', '0917-123-456', false],
    ['tin', '123-456-789-000', true],
    ['sec_number', 'CS202012345', true],
    ['zip', '12345', false],
]) {
    test('local format validation: ' + name + ' ' + (valid ? 'valid' : 'invalid') + ' input', () => {
        assert.equal(validationModule().registrationFieldError(name, value, { role: 'buyer' }) === undefined, valid);
    });
}

test('password checklist and confirmation use the approved complexity rules', () => {
    const rules = validationModule();
    assert.equal(
        rules.passwordRequirements('Bili@202').every((rule) => rule.met),
        true,
    );
    for (const value of ['Bili@26', 'mamimili@2026', 'MAMIMILI@2026', 'Mamimili@abcd', 'Mamimili2026', 'Mamimili 2026'])
        assert.equal(
            rules.passwordRequirements(value).every((rule) => rule.met),
            false,
        );
    assert.equal(rules.registrationFieldError('password_confirmation', 'Rider@2026', { password: 'Rider@2026' }), undefined);
    assert.match(rules.registrationFieldError('password_confirmation', 'Rider@2027', { password: 'Rider@2026' }), /match/);
});

test('upload checks accept the exact limit and reject content hints or size violations', () => {
    const rules = validationModule();
    assert.equal(rules.uploadError({ name: 'document.pdf', type: 'application/pdf', size: 5242880 }), undefined);
    assert.match(rules.uploadError({ name: 'document.pdf', type: 'application/pdf', size: 5242881 }), /5 MB/);
    assert.match(rules.uploadError({ name: 'document.pdf', type: 'application/x-msdownload', size: 10 }), /JPG/);
    assert.match(rules.uploadError({ name: 'document.gif', type: 'image/gif', size: 10 }), /JPG/);
});

test('optional middle initial still validates entered names', () => {
    const rules = validationModule();
    for (const value of ['', 'M', 'M.', 'Peña', "D'Angelo", 'Ann-Marie'])
        assert.equal(rules.registrationFieldError('middle_initial', value, {}), undefined);
    for (const value of ['123', 'M2', '---', 'M😀', 'ABCDEFGHIJK'])
        assert.equal(typeof rules.registrationFieldError('middle_initial', value, {}), 'string');
});

test('nested service-area and password confirmation errors map to visible fields', () => {
    const errors = validationModule().registrationErrors({
        'service_regions.0': 'Select a valid region.',
        password: 'The password field confirmation does not match.',
    });
    assert.equal(errors.service_regions, 'Select a valid region.');
    assert.equal(errors.password_confirmation, 'The password field confirmation does not match.');
});
