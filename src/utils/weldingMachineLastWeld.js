/** Последний шов на аппарате (список «Сварочное оборудование»). */
import { formatMoscowDateTime, parseApiDateTime } from './moscowTime';
import { hasActiveEquipmentError } from './weldingMachineActivityMode';

export function isWeldingPanelState(stateObj) {
    if (!stateObj) return false;
    const props = stateObj.properties || {};
    const rawState = props?.WeldingMachineState?.value
        || props?.WeldingMachineState
        || props?.['Состояние аппарата']?.value
        || props?.['Состояние аппарата']
        || stateObj?.WeldingMachineState
        || stateObj?.['Состояние аппарата']
        || null;
    const status = stateObj.status || stateObj.Status;
    if (hasActiveEquipmentError(stateObj, rawState, status)) return false;
    if (rawState != null) {
        const stateLower = String(rawState).toLowerCase().trim();
        if (stateLower === 'сварка' || stateLower === 'welding'
            || stateLower.includes('сварка') || stateLower.includes('welding')
            || stateLower.includes('сварочн') || stateLower.includes('weld')) {
            return true;
        }
    }
    if (status) {
        const statusLower = String(status).toLowerCase().trim();
        if (statusLower === 'welding' || statusLower === 'сварка' || statusLower.includes('welding')) {
            return true;
        }
    }
    const currentRaw = props?.Current?.value ?? props?.Current ?? props?.['State.I']?.value ?? props?.['State.I'];
    const current = currentRaw != null ? parseFloat(currentRaw) : 0;
    return !Number.isNaN(current) && current > 1;
}

export function parseDbLastWeldMs(item) {
    return parseApiDateTime(item?.lastWeldAt);
}

export function formatLastWeldDisplay(timestampMs) {
    if (timestampMs == null || !Number.isFinite(timestampMs)) return null;
    return formatMoscowDateTime(timestampMs);
}

export function seedLastWeldFromMachines(machines, lastWeldByMacRef, setLastWeldByMac) {
    if (!Array.isArray(machines) || machines.length === 0) return;
    const updates = {};
    machines.forEach((m) => {
        const ts = parseDbLastWeldMs(m);
        if (ts != null && m.mac) {
            const prev = lastWeldByMacRef?.current?.[m.mac];
            if (prev == null || ts > prev) {
                if (lastWeldByMacRef) {
                    lastWeldByMacRef.current[m.mac] = ts;
                }
                updates[m.mac] = ts;
            }
        }
    });
    if (Object.keys(updates).length > 0 && setLastWeldByMac) {
        setLastWeldByMac((prev) => ({ ...prev, ...updates }));
    }
}

export function resolveLastWeldDisplay(item, lastWeldByMac = {}, lastWeldByMacRef = null) {
    const mac = item?.mac;
    let timestampMs = null;
    if (mac) {
        timestampMs = lastWeldByMac[mac] ?? lastWeldByMacRef?.current?.[mac];
    }
    if (timestampMs == null) {
        timestampMs = parseDbLastWeldMs(item);
    }
    return formatLastWeldDisplay(timestampMs);
}
