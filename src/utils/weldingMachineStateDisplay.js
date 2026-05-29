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

/** Дежурный режим (не для страницы мониторинга — там показываем как приходит с аппарата). */
export function isStandbyMachineState(state) {
    if (state == null || state === '') return false;
    const stateLower = String(state).toLowerCase().trim();
    return stateLower.includes('дежурн')
        || stateLower.includes('standby')
        || stateLower === 'дежурный режим';
}

/** Ожидание и дежурный режим в списках отображаем как «Включен». */
export function isOnLikeMachineStateForList(state) {
    return isWaitingMachineState(state) || isStandbyMachineState(state);
}

/** Только страница мониторинга: ожидание → «Включен», дежурный режим без переименования. */
export function formatWeldingMachineStateDisplay(state) {
    if (state == null || state === '') return state ?? '';
    if (isWaitingMachineState(state)) return 'Включен';
    const trimmed = String(state).trim();
    if (trimmed === 'Авария') return 'Ошибка';
    return state;
}

/** Бейдж статуса в списках оборудования / у сварщика */
export function getMachineStatusBadge(status, rawState) {
    if (rawState !== null && rawState !== undefined && rawState !== '') {
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
