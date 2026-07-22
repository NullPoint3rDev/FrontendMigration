import { isStandbyMachineState } from './weldingMachineStateDisplay.js';

const NUMERIC_ERROR_CODE_KEYS = ['errorCode', 'ErrorCode', 'error_code', 'State.Error'];

/** Только целое >0; текст «Ошибки» / «Нет ошибок» не трогаем. */
function parseNumericErrorCodeValue(raw) {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).trim();
    if (!s || s.toLowerCase() === 'null' || s === '0') return null;
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/** Числовой код ошибки из panel-state / deviceData (>0 = активная ошибка). */
export function parseActiveErrorCode(data) {
    if (!data || typeof data !== 'object') return null;

    for (const key of NUMERIC_ERROR_CODE_KEYS) {
        const parsed = parseNumericErrorCodeValue(data[key]);
        if (parsed != null) return parsed;
    }

    const props = data.properties;
    if (props && typeof props === 'object') {
        for (const key of NUMERIC_ERROR_CODE_KEYS) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
            const v = props[key];
            const raw = v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'value')
                ? v.value
                : v;
            const parsed = parseNumericErrorCodeValue(raw);
            if (parsed != null) return parsed;
        }
    }

    return null;
}

/** Авария/ошибка: аппарат в сети — зелёная «Состояние» + красная «Ошибки» (как staging). */
export function isErrorMachineState(weldingMachineState, status) {
    const stateLower = String(weldingMachineState || '').toLowerCase().trim();
    const statusLower = String(status || '').toLowerCase().trim();
    return stateLower === 'авария'
        || stateLower.includes('ошибк') || stateLower.includes('error')
        || stateLower.includes('emergency') || stateLower.includes('failure')
        || statusLower === 'error' || statusLower.includes('error');
}

/** По прошивке: при активной ошибке сварки быть не может. Только числовой code или явная «Авария». */
export function hasActiveEquipmentError(data, weldingMachineState, status) {
    if (parseActiveErrorCode(data) != null) return true;
    const stateLower = String(weldingMachineState || '').toLowerCase().trim();
    if (stateLower === 'авария') return true;
    const statusLower = String(status || '').toLowerCase().trim();
    return statusLower === 'error';
}

/**
 * Режим для дорожки «Состояние»: on | welding | off.
 * Зелёный при on/welding (Включен, ожидание, Сварка, ошибка при живой связи). Иначе серый.
 */
export function getMachineActivityModeFromTextAndStatus(weldingMachineState, status, { weldingHint, errorCode } = {}) {
    const errorData = errorCode != null ? { errorCode } : null;
    if (hasActiveEquipmentError(errorData, weldingMachineState, status)) return 'on';

    if (weldingHint === true) return 'welding';

    const stateLower = String(weldingMachineState || '').toLowerCase().trim();
    const statusLower = String(status || '').toLowerCase().trim();

    if (isStandbyMachineState(weldingMachineState)) return 'off';

    if (isErrorMachineState(weldingMachineState, status)) return 'on';

    if (stateLower === 'сварка' || stateLower === 'welding'
        || stateLower.includes('сварка') || stateLower.includes('welding')
        || statusLower === 'welding' || statusLower === 'сварка'
        || statusLower.includes('сварка') || statusLower.includes('welding')) {
        return 'welding';
    }

    // Текст состояния приоритетнее корневого status (часто Offline при живом «Включен»).
    if (stateLower.includes('waiting') || stateLower.includes('ожидан')
        || stateLower.includes('включ') || stateLower === 'on'
        || stateLower.includes('idle') || stateLower.includes('ready')) {
        return 'on';
    }
    if (stateLower.includes('выключ') || stateLower === 'выкл' || stateLower.startsWith('выкл')
        || stateLower.includes('не в сети') || stateLower.includes('offline')) {
        return 'off';
    }
    if (!stateLower && (statusLower === 'off' || statusLower.includes('offline') || statusLower.includes('не в сети'))) {
        return 'off';
    }
    if (!stateLower && (statusLower.includes('waiting') || statusLower === 'on' || statusLower.includes('idle'))) {
        return 'on';
    }
    // Нет явного Включен/Сварка — не зелёный.
    return 'off';
}

/** Зелёная (и жёлтая поверх) дорожка — только Включен / Сварка. */
export function isStateLaneOnlineMode(mode) {
    return mode === 'on' || mode === 'welding';
}

/** ponytail: smoke — node -e "import('./src/utils/weldingMachineActivityMode.js').then(m=>m.__errorCodeSelfCheck())" */
export function __errorCodeSelfCheck() {
    const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
    ok(parseActiveErrorCode({ errorCode: '4' }) === 4, 'numeric code');
    ok(parseActiveErrorCode({ errorCode: 0 }) === null, 'zero');
    ok(parseActiveErrorCode({ Ошибки: 'Нет ошибок' }) === null, 'text Ошибки ignored');
    ok(parseActiveErrorCode({ Ошибки: ' 1. foo' }) === null, 'text prefix ignored');
    ok(!hasActiveEquipmentError({}, 'Сварка', 'Welding'), 'welding without code');
    ok(hasActiveEquipmentError({ errorCode: '2' }, 'Сварка', 'Welding'), 'code blocks welding');
    ok(!hasActiveEquipmentError({}, 'Аппарат включен', 'Offline'), 'offline not error');
}
