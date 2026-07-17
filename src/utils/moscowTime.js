/** Naive UTC ISO из БД (без Z/offset) и отображение в Europe/Moscow. */
export const MOSCOW_TZ = 'Europe/Moscow';

export function parseApiDateTime(value) {
    if (value == null || value === '') return null;
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
        const t = new Date(`${s}Z`).getTime();
        return Number.isFinite(t) ? t : null;
    }
    const t = new Date(s).getTime();
    return Number.isFinite(t) ? t : null;
}

export function formatMoscowTime(value = new Date(), options = {}) {
    const ms = typeof value === 'number' ? value : parseApiDateTime(value) ?? new Date(value).getTime();
    if (!Number.isFinite(ms)) return '—';
    return new Date(ms).toLocaleTimeString('ru-RU', {
        timeZone: MOSCOW_TZ,
        hour: '2-digit',
        minute: '2-digit',
        second: options.second ? '2-digit' : undefined,
        hour12: false,
    });
}

export function formatMoscowDate(value = new Date()) {
    const ms = typeof value === 'number' ? value : parseApiDateTime(value) ?? new Date(value).getTime();
    if (!Number.isFinite(ms)) return '—';
    return new Date(ms).toLocaleDateString('ru-RU', {
        timeZone: MOSCOW_TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function formatMoscowDateTime(value = new Date()) {
    const ms = typeof value === 'number' ? value : parseApiDateTime(value) ?? new Date(value).getTime();
    if (!Number.isFinite(ms)) return '—';
    return new Date(ms).toLocaleString('ru-RU', {
        timeZone: MOSCOW_TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}
