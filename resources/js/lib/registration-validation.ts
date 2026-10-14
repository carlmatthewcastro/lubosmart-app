export const registrationLabels: Record<string, string> = {
    first_name: 'First name',
    last_name: 'Last name',
    email: 'Email address',
    phone: 'Mobile number',
    birthday: 'Date of birth',
    business_name: 'Business name',
    business_category_id: 'Shop category',
    seller_type: 'Seller type',
    sec_number: 'SEC registration number',
    position: 'Contact person position',
    tin: 'TIN',
    service_regions: 'Service areas',
    region_code: 'Region',
    province_code: 'Province',
    city_code: 'City / municipality',
    barangay_code: 'Barangay',
    line1: 'Street address',
    zip: 'Postal code',
    identity: 'Government-issued ID',
    dti_certificate: 'DTI certificate',
    sec_certificate: 'SEC certificate',
    bir_2303: 'BIR Form 2303',
    business_permit: 'Mayor’s / business permit',
    password: 'Password',
    password_confirmation: 'Confirm password',
    policy_accepted: 'Terms and Privacy Policy',
    code: 'Verification code',
    google: 'Google sign-in',
    role: 'Account role',
    sex: 'Sex',
    vehicle_type: 'Vehicle',
    plate_number: 'Plate number',
    sorting_center_id: 'Logistics center',
    license: "Driver's license",
    vehicle_registration: 'Vehicle OR/CR',
    middle_initial: 'Middle initial',
    house_number: 'House / unit number',
    street: 'Street / subdivision',
};

export function passwordRequirements(password: string) {
    return [
        { label: 'At least 8 characters', met: Array.from(password).length >= 8 },
        { label: 'An uppercase letter', met: /\p{Lu}/u.test(password) },
        { label: 'A lowercase letter', met: /\p{Ll}/u.test(password) },
        { label: 'A number', met: /\p{N}/u.test(password) },
        { label: 'A special character', met: /[\p{P}\p{S}]/u.test(password) },
    ];
}

export function uploadError(file: { name: string; size: number; type: string } | null): string | undefined {
    if (!file) return 'Choose the required document.';
    if (!/\.(jpe?g|png|pdf)$/i.test(file.name) || (file.type && !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)))
        return 'Choose a JPG, PNG or PDF file.';
    if (file.size > 5242880) return 'Choose a file no larger than 5 MB.';
}

export function registrationFieldError(field: string, value: unknown, data: Record<string, unknown>): string | undefined {
    const text = typeof value === 'string' ? value.trim() : '';
    if (field === 'sex') return ['female', 'male', 'prefer_not_to_say'].includes(text) ? undefined : 'Select your sex.';
    if (field === 'policy_accepted') return value === true ? undefined : 'Accept the Terms and Privacy Policy to continue.';
    if (field === 'service_regions') return Array.isArray(value) && value.length ? undefined : 'Select at least one service area.';
    if (field === 'middle_initial') {
        if (!text) return undefined;
        if (Array.from(text).length > 10) return 'Use no more than 10 characters.';
        if (!/^(?=[^\p{L}]*\p{L})[\p{L}\p{M} .'-]+$/u.test(text)) return 'Use letters only. Spaces, hyphens, apostrophes and periods are allowed.';
        return undefined;
    }
    if (['identity', 'license', 'vehicle_registration', 'dti_certificate', 'sec_certificate', 'bir_2303', 'business_permit'].includes(field))
        return uploadError(value as Parameters<typeof uploadError>[0]);
    if (!text) return `Enter or select your ${registrationLabels[field]?.toLowerCase() ?? 'information'}.`;
    if (field === 'first_name' || field === 'last_name') {
        if (Array.from(text).length < 2 || Array.from(text).length > 50) return 'Use between 2 and 50 characters.';
        if (!/^(?=(?:[^\p{L}]*\p{L}){2})[\p{L}\p{M} .'-]+$/u.test(text))
            return 'Use at least two letters. Spaces, hyphens, apostrophes and periods are allowed.';
    }
    if (field === 'email' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || text.length > 160)) return 'Enter a valid email address.';
    if (field === 'phone' && !/^(09\d{9}|\+?639\d{9})$/.test(text))
        return 'Enter a Philippine mobile number beginning with 639, followed by 9 digits.';
    if (field === 'birthday') {
        const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts();
        const today = ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)?.value).join('-');
        const date = new Date(text + 'T00:00:00Z');
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
            Number.isNaN(date.valueOf()) ||
            date.toISOString().slice(0, 10) !== text ||
            text > today ||
            text <= '1900-01-01'
        )
            return 'Enter a valid date of birth.';
        const [year, month, day] = today.split('-').map(Number);
        const oldestDay = Math.min(day, new Date(Date.UTC(year - 18, month, 0)).getUTCDate());
        const cutoff = `${year - 18}-${String(month).padStart(2, '0')}-${String(oldestDay).padStart(2, '0')}`;
        if (text > cutoff) return 'You must be at least 18 years old.';
    }
    if (field === 'password' && passwordRequirements(String(value)).some((rule) => !rule.met))
        return 'Use at least 8 characters with uppercase, lowercase, a number and a special character.';
    if (field === 'password_confirmation' && value !== data.password) return 'Passwords do not match.';
    if (field === 'tin' && !/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(text)) return 'Use TIN format 000-000-000-000.';
    if (field === 'sec_number' && !/^[A-Z]{2}\d{9}$/i.test(text)) return 'Use 2 letters followed by 9 digits.';
    if (field === 'zip' && !/^\d{4}$/.test(text)) return 'Enter a 4-digit postal code.';
    if (
        field === 'business_name' &&
        (Array.from(text).length > (data.role === 'sorting_center' ? 160 : 30) || Array.from(text).length < (data.role === 'sorting_center' ? 1 : 3))
    )
        return data.role === 'sorting_center' ? 'Use no more than 160 characters.' : 'Use between 3 and 30 characters.';
}

export function registrationErrors(errors: Record<string, string | undefined>): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const [key, message] of Object.entries(errors)) {
        if (!message) continue;
        const field = key.split('.')[0];
        mapped[field === 'password' && /confirmation|do not match|don.t match/i.test(message) ? 'password_confirmation' : field] = message;
    }
    return mapped;
}
