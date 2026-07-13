import { isStandbyMachineState } from './weldingMachineStateDisplay.js';

/**
 * Режим для дорожки «Состояние»: on | welding | off.
 * Зелёный только при on/welding (Включен, в т.ч. ожидание; Сварка). Иначе серый.
 */
export function getMachineActivityModeFromTextAndStatus(weldingMachineState, status, { weldingHint } = {}) {
    if (weldingHint === true) return 'welding';

    const stateLower = String(weldingMachineState || '').toLowerCase().trim();
    const statusLower = String(status || '').toLowerCase().trim();

    if (isStandbyMachineState(weldingMachineState)) return 'off';

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
