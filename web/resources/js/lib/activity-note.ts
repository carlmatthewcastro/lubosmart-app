/** Present human notes without exposing embedded historical audit payloads. */
export function activityNote(value: string | null | undefined): string {
    if (!value) return '';
    let result = '';
    for (let index = 0; index < value.length; ) {
        if (value[index] !== '{' && value[index] !== '[') {
            result += value[index++];
            continue;
        }
        const start = index;
        const stack: string[] = [];
        let quoted = false;
        let escaped = false;
        for (; index < value.length; index++) {
            const character = value[index];
            if (quoted) {
                if (escaped) escaped = false;
                else if (character === '\\') escaped = true;
                else if (character === '"') quoted = false;
            } else if (character === '"') quoted = true;
            else if (character === '{' || character === '[') stack.push(character);
            else if (character === '}' || character === ']') {
                stack.pop();
                if (!stack.length) {
                    index++;
                    break;
                }
            }
        }
        const fragment = value.slice(start, index);
        try {
            const data: unknown = JSON.parse(fragment);
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                const note = data as Record<string, unknown>;
                for (const key of ['notes', 'note', 'reason', 'message']) {
                    if (typeof note[key] === 'string') result += ` ${activityNote(note[key])} `;
                }
            }
        } catch {
            // Keep ordinary bracketed prose; omit malformed technical payloads.
            if (!/"[\w_]+"\s*:/.test(fragment)) result += fragment;
        }
    }
    return result.replace(/[ \t]+/g, ' ').trim();
}
