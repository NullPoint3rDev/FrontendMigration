import { isStandbyMachineState } from './weldingMachineStateDisplay';

const CORE_UPTIME_SEC_TO_MS = 1000;
const WORK_TIME_SINCE_POWER_ON_KEYS = ['Core.WorkTimeSincePowerOn', 'Время работы с включения'];

function parsePanelNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const normalized = raw.replace(',', '.').replace(/[^\d.+-]/g, '');
    const decimal = parseFloat(normalized);
    return Number.isFinite(decimal) ? decimal : null;
}

function getPanelNumberByKeys(stateObj, keys) {
    if (!stateObj) return null;
    const props = stateObj.properties || {};
    for (const key of keys) {
        const fromPropValue = parsePanelNumber(props?.[key]?.value);
        if (fromPropValue != null) return fromPropValue;
        const fromPropDirect = parsePanelNumber(props?.[key]);
        if (fromPropDirect != null) return fromPropDirect;
        const fromStateDirect = parsePanelNumber(stateObj?.[key]);
        if (fromStateDirect != null) return fromStateDirect;
    }
    return null;
}

export function getRawMachineStateFromPanelState(stateObj) {
    if (!stateObj) return null;
    const props = stateObj.properties || {};
    return props?.WeldingMachineState?.value
        || props?.WeldingMachineState
        || props?.['Состояние аппарата']?.value
        || props?.['Состояние аппарата']
        || stateObj?.WeldingMachineState
        || stateObj?.['Состояние аппарата']
        || null;
}

function isMachineStateExplicitlyOff(rawState) {
    if (rawState == null || rawState === '') return true;
    const stateLower = String(rawState).toLowerCase().trim();
    return stateLower.includes('выключ')
        || stateLower === 'off'
        || stateLower.includes('offline')
        || stateLower.includes('не в сети')
        || stateLower.includes('заблок')
        || stateLower.includes('block')
        || stateLower.includes('блокиров');
}

/** Обновлять «последнее включение» по Core.WorkTimeSincePowerOn (Включен, Сварка, Ошибка). */
export function shouldRefreshLastPowerOnFromPanelState(stateObj) {
    if (!stateObj) return false;
    const rawState = getRawMachineStateFromPanelState(stateObj);
    if (isMachineStateExplicitlyOff(rawState)) return false;
    if (isStandbyMachineState(rawState)) return false;
    return true;
}

/** Время последнего включения по телеметрии (мс) при активном состоянии (не дежурный/выкл). */
export function computeLastPowerOnFromPanelState(stateObj, nowMs = Date.now()) {
    const workSec = getPanelNumberByKeys(stateObj, WORK_TIME_SINCE_POWER_ON_KEYS);
    if (workSec == null) return null;
    return nowMs - workSec * CORE_UPTIME_SEC_TO_MS;
}

export function formatLastPowerOnDisplay(timestampMs) {
    if (timestampMs == null || !Number.isFinite(timestampMs)) return null;
    return new Date(timestampMs).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function parseDbLastPoweredOnMs(item) {
    const raw = item?.lastPoweredOnAt;
    if (raw == null || raw === '') return null;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : null;
}

/** Заполняет ref/state из lastPoweredOnAt в ответе API. */
export function seedLastPowerOnFromMachines(machines, lastPowerOnByMacRef, setLastPowerOnByMac) {
    if (!Array.isArray(machines) || machines.length === 0) return;
    const updates = {};
    machines.forEach((m) => {
        const ts = parseDbLastPoweredOnMs(m);
        if (ts != null && m.mac) {
            if (lastPowerOnByMacRef) {
                lastPowerOnByMacRef.current[m.mac] = ts;
            }
            updates[m.mac] = ts;
        }
    });
    if (Object.keys(updates).length > 0 && setLastPowerOnByMac) {
        setLastPowerOnByMac((prev) => ({ ...prev, ...updates }));
    }
}

export function resolveLastPowerOnDisplay(item, lastPowerOnByMac = {}, lastPowerOnByMacRef = null) {
    const mac = item?.mac;
    let timestampMs = null;
    if (mac) {
        timestampMs = lastPowerOnByMac[mac] ?? lastPowerOnByMacRef?.current?.[mac];
    }
    if (timestampMs == null) {
        timestampMs = parseDbLastPoweredOnMs(item);
    }
    return formatLastPowerOnDisplay(timestampMs);
}
