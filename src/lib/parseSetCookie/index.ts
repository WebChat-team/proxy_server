export default function parseSetCookie(setCookie: string) {
    const cookies = [];
    let buffer = '';
    let insideExpires = false;

    for (let i = 0; i < setCookie.length; i++) {
        const char = setCookie[i];
        const nextSeven = setCookie.slice(i, i + 7).toLowerCase();

        if (nextSeven === 'expires') {
            insideExpires = true;
        }

        if (char === ',' && !insideExpires) {
            cookies.push(buffer.trim());
            buffer = '';
            continue;
        }

        buffer += char;

        // если нашли конец Expires (обычно ";"), то выходим из режима
        if (insideExpires && char === ';') {
            insideExpires = false;
        }
    }

    if (buffer.trim() !== '') {
        cookies.push(buffer.trim());
    }

    return cookies;
}