export async function accountApi<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
    const token = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')
        .slice(1)
        .join('=');
    const form = body instanceof FormData;
    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
            ...(!form && body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? (form ? body : JSON.stringify(body)) : undefined,
    });
    const data = await response.json();
    if (!response.ok)
        throw new Error(
            Object.values(data.errors ?? {})
                .flat()
                .join(' ') ||
                data.message ||
                'Unable to complete this request.',
        );
    return data;
}

export type AccountChange = {
    id: number;
    account_id: number;
    field: string;
    old_value: unknown;
    new_value: unknown;
    status: string;
    reason: string | null;
    document_urls?: { kind: string; url: string }[];
};
export type Region = { code: string; name: string };
export type AccountAddress = {
    region_code: string;
    region_name?: string;
    province_code: string;
    province_name?: string;
    city_code: string;
    city_name?: string;
    barangay_code: string;
    barangay_name?: string;
    postal_code: string;
    house_number: string;
    street: string;
};

export function displayValue(value: unknown, regions: Region[] = []): string {
    if (Array.isArray(value))
        return value
            .map((item) => (typeof item === 'string' ? (regions.find((region) => region.code === item)?.name ?? item) : displayValue(item, regions)))
            .join(', ');
    if (value && typeof value === 'object')
        return Object.entries(value)
            .filter(([key]) => !key.endsWith('_code'))
            .map(([key, item]) => `${key.replaceAll('_', ' ')}: ${displayValue(item, regions)}`)
            .join('\n');
    return String(value ?? 'Not provided');
}
