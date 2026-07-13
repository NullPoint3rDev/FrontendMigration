/**
 * Нормализация текстовых состояний аппарата для UI (бэкенд/телеметрия не меняются).
 */
export function isWaitingMachineState(state) {
    if (state == null || state === '') return false;
    const stateLower = String(state).toLowerCase().trim();
    return stateLower.includes('ожидан')
        || stateLower.includes('waiting')
        || stateLower === 'режим ожидания'
        || stateLower.includes('аппарат в режиме ожидания');
}

/** Дежурный режим (в т.ч. уже отформатированное «Выкл(деж)»). */
export function isStandbyMachineState(state) {
    if (state == null || state === '') return false;
    const stateLower = String(state).toLowerCase().trim();
    return stateLower.includes('дежурн')
        || stateLower.includes('standby')
        || stateLower === 'дежурный режим'
        || stateLower === 'выкл(деж)'
        || stateLower.includes('выкл(деж)')
        || /\(деж\)/.test(stateLower);
}

export const STANDBY_MACHINE_STATE_DISPLAY = 'Выкл(деж)';

/** Ожидание в списках отображаем как «Включен». */
export function isOnLikeMachineStateForList(state) {
    return isWaitingMachineState(state);
}

/** Страница мониторинга и системные параметры: ожидание → «Включен», дежурный → «Выкл(деж)». */
export function formatWeldingMachineStateDisplay(state) {
    if (state == null || state === '') return state ?? '';
    if (isStandbyMachineState(state)) return STANDBY_MACHINE_STATE_DISPLAY;
    if (isWaitingMachineState(state)) return 'Включен';
    const trimmed = String(state).trim();
    if (trimmed === 'Авария') return 'Ошибка';
    if (trimmed === 'Аппарат включен') return 'Включен';
    const lower = trimmed.toLowerCase();
    if (lower === 'аппарат включен') return 'Включен';
    return state;
}

/** Бейдж статуса в списках оборудования / у сварщика */
export function getMachineStatusBadge(status, rawState) {
    if (rawState !== null && rawState !== undefined && rawState !== '') {
        if (isStandbyMachineState(rawState)) {
            return { text: STANDBY_MACHINE_STATE_DISPLAY, className: 'off', color: '#7B8BA6' };
        }

        if (isOnLikeMachineStateForList(rawState)) {
            return { text: 'Включен', className: 'on', color: '#39956C' };
        }

        const stateLower = String(rawState).toLowerCase().trim();

        if (stateLower.includes('заблок') || stateLower.includes('block')
            || stateLower.includes('заблокирован') || stateLower.includes('blocked')
            || stateLower.includes('lock') || stateLower.includes('блокиров')) {
            return { text: 'Блок', className: 'off', color: '#7B8BA6' };
        }

        if (stateLower.includes('свар') || stateLower.includes('weld')) {
            return { text: 'Сварка', className: 'welding', color: '#FEB63E' };
        }

        if (stateLower.includes('авария') || stateLower.includes('error')
            || stateLower.includes('ошибка') || stateLower.includes('emergency')
            || stateLower.includes('failure')) {
            return { text: 'Ошибка', className: 'error', color: undefined };
        }

        if (stateLower.includes('включен') || stateLower.includes('on')
            || stateLower === 'аппарат включен') {
            return { text: 'Включен', className: 'on', color: '#39956C' };
        }
    }

    switch (status) {
        case 'welding':
            return { text: 'Сварка', className: 'welding', color: '#FEB63E' };
        case 'on':
            return { text: 'Включен', className: 'on', color: '#39956C' };
        case 'error':
            return { text: 'Ошибка', className: 'error', color: undefined };
        case 'off':
        default:
            return { text: 'Выкл', className: 'off', color: '#7B8BA6' };
    }
}

/** Краткий бейдж для таблицы оборудования (Вкл / Выкл) */
export function getMachineStatusBadgeShort(status, rawState) {
    if (rawState !== null && rawState !== undefined && rawState !== '') {
        if (isStandbyMachineState(rawState)) {
            return { text: STANDBY_MACHINE_STATE_DISPLAY, className: 'off', color: 'rgba(188, 183, 197, 0.5)' };
        }

        if (isOnLikeMachineStateForList(rawState)) {
            return { text: 'Включен', className: 'on' };
        }

        const stateLower = String(rawState).toLowerCase().trim();

        if (stateLower.includes('заблокирован') || stateLower.includes('blocked')
            || stateLower.includes('lock') || stateLower.includes('блокиров')) {
            return { text: 'Блок', className: 'off', color: 'rgba(188, 183, 197, 0.5)' };
        }

        if (stateLower.includes('сварка') || stateLower.includes('welding')
            || stateLower.includes('weld') || stateLower.includes('сварочн')) {
            return { text: 'Сварка', className: 'welding' };
        }

        if (stateLower.includes('авария') || stateLower.includes('error')
            || stateLower.includes('ошибка') || stateLower.includes('emergency')
            || stateLower.includes('failure')) {
            return { text: 'Ошибка', className: 'error' };
        }

        if (stateLower.includes('включен') || stateLower.includes('on')
            || stateLower === 'аппарат включен') {
            return { text: 'Включен', className: 'on' };
        }
    }

    switch (status) {
        case 'welding':
            return { text: 'Сварка', className: 'welding' };
        case 'on':
            return { text: 'Включен', className: 'on' };
        case 'error':
            return { text: 'Ошибка', className: 'error' };
        case 'off':
        default:
            return { text: 'Выкл', className: 'off' };
    }
}
