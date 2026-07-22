import { isStandbyMachineState } from './weldingMachineStateDisplay.js';

/** Числовой код ошибки из плоского panel-state / deviceData (>0 = активная ошибка). */
export function parseActiveErrorCode(data) {
    if (!data || typeof data !== 'object') return null;

    const parseRaw = (direct) => {
        if (direct === undefined || direct === null) return null;
        const raw = String(direct).trim();
        if (!raw || raw.toLowerCase() === 'null' || raw === '0') return null;
        const firstPart = raw.split(/[;,]/).map((s) => s.trim()).find(Boolean) || raw;
        const numeric = parseInt(firstPart, 10);
        if (Number.isFinite(numeric) && numeric > 0) return numeric;
        return null;
    };

    const direct = data.errorCode ?? data.ErrorCode ?? data.error_code
        ?? data['State.Error'] ?? data['Ошибка'] ?? data['Ошибки'];
    const fromDirect = parseRaw(direct);
    if (fromDirect != null) return fromDirect;

    const props = data.properties;
    if (props && typeof props === 'object') {
        for (const key of ['ErrorCode', 'errorCode', 'State.Error', 'Ошибка', 'Ошибки', 'Errors']) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
            const v = props[key];
            const raw = v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'value')
                ? v.value
                : v;
            const parsed = parseRaw(raw);
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

/** По прошивке: при активной ошибке сварки быть не может. */
export function hasActiveEquipmentError(data, weldingMachineState, status) {
    if (parseActiveErrorCode(data) != null) return true;
    return isErrorMachineState(weldingMachineState, status);
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
