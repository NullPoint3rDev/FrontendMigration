import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import '../styles/mainContentNew.css';
import * as archiveDeviceApi from '../api/archiveDeviceApi';
import { deleteWeldingMachine, getAllWeldingMachines, updateWeldingMachine, getWeldingMachineById, getAllOrganizationUnits } from '../api/weldingMachineApi';
import { getWelderByRfidCode } from '../api/welderApi';
import machineImage from '../images/Untitled 3 копия.png';
import WelderIcon from '../images/WelderIcon.png';
import AddEquipmentModal from './AddEquipmentModal';
import { RiRfidFill } from 'react-icons/ri';
import { FaBell, FaCompress, FaExpand } from 'react-icons/fa';
import UserProfile from '../components/UserProfile';
import MonitorWeldersTab from './MonitorWeldersTab';
import '../styles/monitorWeldersTab.css';

// Названия ошибок по коду 1–23 (синхронно с EquipmentErrorMessages и протоколом аппарата: 1–10, 17–21)
const EQUIPMENT_ERROR_MESSAGES = [
    'Ошибка драйвера подающего механизма',          // 1
    'Реверс энкодера подающего механизма',          // 2
    'Нет сигнала от энк. подающего механизма',      // 3
    'Отказ связи с подающим механизмом',            // 4
    'Ошибка ограничения драйвера платы сварки',     // 5
    'Отказ связи с платой сварки',                  // 6
    'Ошибка превышения макс. тока платы сварки',   // 7
    'Ошибка калибровки датчиков платы сварки',      // 8
    'Ошибка обратной связи по напряжению платы сварки',   // 9
    'Ошибка обратной связи по мощности платы сварки',     // 10
    'Ошибка 11', 'Ошибка 12', 'Ошибка 13', 'Ошибка 14', 'Ошибка 15', 'Ошибка 16',
    'Перегрев БВО',                                 // 17
    'Отказ связи с БВО',                            // 18
    'Пустая помпа БВО (нет жидкости)',               // 19
    'Обрыв датчика температуры жидкости БВО',       // 20
    'КЗ датчика температуры жидкости БВО',          // 21
    'Ошибка 22', 'Ошибка 23'
];

const TELEMETRY_CHANNELS_CONFIG = [
    { key: 'weldingCurrent', label: 'Сварочный ток', color: '#3ec7ff' },
    { key: 'weldingVoltage', label: 'Сварочное напряжение', color: '#ff61c8' },
    { key: 'gasFlow', label: 'Расход газа', color: '#2fe4a8' },
    { key: 'wireConsumption', label: 'Расход проволоки', color: '#ffae64' },
    { key: 'mainsVoltage', label: 'Напряжение сети', color: '#a07dff' },
    { key: 'radiatorTemp', label: 'Темп. первич.', color: '#66d1ff' },
    { key: 'inverterTemp', label: 'Темп. вторич.', color: '#7cffb2' },
    { key: 'chillerTempIn', label: 'Вход. темп. охл. жидкости', color: '#f1ca06' },
    { key: 'chillerTempOut', label: 'Исход. темп. охл. жидкости', color: '#ffd95a' }
];

const TELEMETRY_NO_DRAW_KEYS = new Set(['gasFlow', 'wireConsumption']);

/** Сколько каналов (кроме сети по фазам) одновременно на основном графике — при заполнении остальные в списке тусклые, переключение только после снятия выбора. */
const TELEMETRY_GRAPH_SLOT_COUNT = 2;

/** Каналы, привязанные к правой оси Y (0–50). */
const RIGHT_Y_AXIS_CHANNEL_KEYS = new Set([
    'weldingVoltage',
    'radiatorTemp',
    'inverterTemp',
    'chillerTempIn',
    'chillerTempOut',
]);

const MAINS_VOLTAGE_PHASES = ['A', 'B', 'C'];

const resolveMainsPhaseSeriesKey = (phase) => {
    if (phase === 'C') return 'mainsVoltageC';
    if (phase === 'B') return 'mainsVoltageB';
    return 'mainsVoltageA';
};

/**
 * Левая ось Y: на графике от 0 (ток в простое), зум меняет max: 750 → … → 50.
 * MIN_ZOOM_MAX — нижний предел max при полном приближении, не нижняя граница шкалы.
 */
const Y_AXIS_LEFT = { AXIS_MIN: 0, MIN_ZOOM_MAX: 50, MAX: 750, STEP: 50 };
/** Правая ось Y: min 5, max 100, шаг зума 5. */
const Y_AXIS_RIGHT = { MIN: 5, MAX: 100, STEP: 5 };

const clampLeftYMax = (value) => {
    const n = Number(value);
    const base = Number.isFinite(n) ? n : Y_AXIS_LEFT.MAX;
    const stepped = Math.round(base / Y_AXIS_LEFT.STEP) * Y_AXIS_LEFT.STEP;
    return Math.max(Y_AXIS_LEFT.MIN_ZOOM_MAX, Math.min(Y_AXIS_LEFT.MAX, stepped));
};

const clampRightYMax = (value) => {
    const n = Number(value);
    const base = Number.isFinite(n) ? n : Y_AXIS_RIGHT.MAX;
    const stepped = Math.round(base / Y_AXIS_RIGHT.STEP) * Y_AXIS_RIGHT.STEP;
    return Math.max(Y_AXIS_RIGHT.MIN, Math.min(Y_AXIS_RIGHT.MAX, stepped));
};

const stepLeftYMax = (current, zoomIn) => clampLeftYMax(clampLeftYMax(current) + (zoomIn ? -Y_AXIS_LEFT.STEP : Y_AXIS_LEFT.STEP));
const stepRightYMax = (current, zoomIn) => clampRightYMax(clampRightYMax(current) + (zoomIn ? -Y_AXIS_RIGHT.STEP : Y_AXIS_RIGHT.STEP));

const buildAxisTicks = (min, max, step) => {
    const ticks = [];
    for (let v = min; v <= max + 1e-9; v += step) ticks.push(v);
    return ticks;
};

const DEFAULT_TELEMETRY_SERIES = TELEMETRY_CHANNELS_CONFIG.reduce((acc, channel) => {
    acc[channel.key] = [];
    return acc;
}, { mainsVoltageA: [], mainsVoltageB: [], mainsVoltageC: [] });

const DAILY_ACTIVITY_INITIAL = {
    offMs: 0,
    standbyMs: 0,
    onMs: 0,
    weldingMs: 0,
};

/** Суточные плитки (проволока кг, таймеры): опрос API раз в минуту, без привязки к poll panel-state (~1 с). */
const DAILY_STATS_REFRESH_MS = 60000;

function applyDailyStatsDto(setDailyActivity, setDailyWireConsumptionKg, dto) {
    if (!dto) return;
    setDailyActivity({
        offMs: Math.max(0, Number(dto.offMs) || 0),
        standbyMs: Math.max(0, Number(dto.standbyMs) || 0),
        onMs: Math.max(0, Number(dto.onMs) || 0),
        weldingMs: Math.max(0, Number(dto.weldingMs) || 0),
    });
    const kg = dto.wireConsumptionKg != null ? Number(dto.wireConsumptionKg) : 0;
    setDailyWireConsumptionKg(Math.max(0, Number.isFinite(kg) ? kg : 0));
}

const formatMsToClock = (ms) => {
    const safeMs = Math.max(0, Number(ms) || 0);
    const totalSeconds = Math.floor(safeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/** Счётчики Core.WorkTimeSincePowerOn / Core.WeldingTimeSincePowerOn с аппарата: uint32, на фронте считаем секундами (×1000 → formatMsToClock). Если прошивка шлёт миллисекунды — замените на 1. */
const CORE_PACKET_UPTIME_RAW_TO_MS = 1000;

const formatKgValue = (kg) => {
    const value = Math.max(0, Number(kg) || 0);
    return Number(value.toFixed(3)).toString();
};

const parseNumberOrNull = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const raw = String(value).trim();
    if (!raw) return null;

    // 1) HEX (аппарат иногда может присылать значения HEX-строкой)
    const hex = raw.startsWith('0x') ? raw.slice(2) : raw;
    if (/^[0-9A-Fa-f]+$/.test(hex) && /[A-Fa-f]/.test(hex)) {
        const parsedHex = parseInt(hex, 16);
        if (Number.isFinite(parsedHex)) return parsedHex;
    }

    // 1) Обычные числа (в т.ч. с запятой и единицами измерения)
    const normalized = raw.replace(',', '.').replace(/[^\d.+-]/g, '');
    const decimal = parseFloat(normalized);
    if (Number.isFinite(decimal)) return decimal;

    return null;
};

const getStateNumberByKeys = (state, keys) => {
    if (!state) return null;
    const props = state.properties || {};
    for (const key of keys) {
        const fromPropValue = parseNumberOrNull(props?.[key]?.value);
        if (fromPropValue != null) return fromPropValue;

        const fromPropDirect = parseNumberOrNull(props?.[key]);
        if (fromPropDirect != null) return fromPropDirect;

        const fromStateDirect = parseNumberOrNull(state?.[key]);
        if (fromStateDirect != null) return fromStateDirect;
    }
    return null;
};

function getEquipmentErrorName(errorCode) {
    if (errorCode === undefined || errorCode === null || String(errorCode).trim() === '') return null;
    const s = String(errorCode).trim();
    const num = parseInt(s, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= EQUIPMENT_ERROR_MESSAGES.length) {
        return EQUIPMENT_ERROR_MESSAGES[num - 1];
    }
    return s;
}

/** Коды 1–23 из корня state (как EquipmentErrorMessages на бэке); несколько — через запятую, ; или пробел. */
function parseEquipmentErrorCodes(raw) {
    if (raw === undefined || raw === null) return [];
    const s = String(raw).trim();
    if (!s || s.toLowerCase() === 'null' || s === '0') return [];
    const out = [];
    const seen = new Set();
    for (const part of s.split(/[,;\s]+/)) {
        const t = part.trim();
        if (!t) continue;
        const n = parseInt(t, 10);
        if (!Number.isFinite(n) || n < 1 || n > EQUIPMENT_ERROR_MESSAGES.length) continue;
        if (seen.has(n)) continue;
        seen.add(n);
        out.push(n);
    }
    return out;
}

function formatWelderShortName(welder) {
    const full = (welder?.name || '').trim();
    if (!full) return '—';
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    const last = parts[0];
    const fi = parts[1] ? `${parts[1][0].toUpperCase()}.` : '';
    const mi = parts[2] ? `${parts[2][0].toUpperCase()}.` : '';
    const initials = [fi, mi].filter(Boolean).join(' ');
    return initials ? `${last} ${initials}` : last;
}

async function fetchWelderByRfidVariants(rfidRaw) {
    const raw = String(rfidRaw || '').trim();
    if (!raw) return null;
    const compact = raw.replace(/\s+/g, '');
    const variants = [];
    const seen = new Set();
    const push = (v) => {
        if (!v || seen.has(v)) return;
        seen.add(v);
        variants.push(v);
    };
    push(raw);
    push(compact);
    if (compact.toUpperCase() !== compact) push(compact.toUpperCase());
    if (raw.toUpperCase() !== raw && raw.toUpperCase() !== compact.toUpperCase()) push(raw.toUpperCase());

    for (const v of variants) {
        try {
            const w = await getWelderByRfidCode(v);
            if (w && (w.id != null || w.name)) return w;
        } catch (e) {
            // 404/400 — ожидаемо; прочие ошибки не логируем в консоль при polling
        }
    }
    return null;
}

/** Ток и напряжение из сырого panel-state (логика согласована с processStructuredData / getCurrentValue). */
function extractCurrentVoltageFromPanelState(state) {
    if (!state || !state.properties) {
        return { current: 0, voltage: 0 };
    }
    let fromCurrent = null;
    let fromStateI = null;
    let fromVoltage = null;
    let fromStateU = null;
    Object.entries(state.properties).forEach(([key, prop]) => {
        if (!prop || prop.value === undefined || prop.value === null) return;
        if (key === 'Voltage') {
            const decimalValue = parseInt(String(prop.value), 10);
            if (!Number.isNaN(decimalValue)) fromVoltage = decimalValue / 10;
        } else if (key === 'Current') {
            const v = parseFloat(String(prop.value));
            if (!Number.isNaN(v)) fromCurrent = v;
        } else if (key === 'State.I') {
            const decimalValue = parseInt(String(prop.value), 16);
            if (!Number.isNaN(decimalValue)) fromStateI = decimalValue;
        } else if (key === 'State.U') {
            const decimalValue = parseInt(String(prop.value), 16);
            if (!Number.isNaN(decimalValue)) fromStateU = decimalValue / 10;
        }
    });
    const current = fromCurrent != null ? fromCurrent : (fromStateI != null ? fromStateI : 0);
    const voltage = fromVoltage != null ? fromVoltage : (fromStateU != null ? fromStateU : 0);
    return { current, voltage };
}

function extractTelemetrySampleFromPanelState(state) {
    const { current, voltage } = extractCurrentVoltageFromPanelState(state);

    // Нормализуем формат как в processStructuredData/status-card:
    // собираем плоский словарь значений из state + state.properties.
    const flat = { ...(state || {}) };
    if (state?.properties && typeof state.properties === 'object') {
        Object.entries(state.properties).forEach(([key, prop]) => {
            if (prop && typeof prop === 'object' && Object.prototype.hasOwnProperty.call(prop, 'value')) {
                flat[key] = prop.value;
            } else {
                flat[key] = prop;
            }
        });
    }
    const wrappedState = { ...state, properties: flat };

    const phaseA = getStateNumberByKeys(wrappedState, [
        'Напряжение фазы А', 'VoltagePhaseA', 'voltagePhaseA', 'voltage_phase_a', 'Voltage_Phase_A'
    ]) ?? 0;
    const phaseB = getStateNumberByKeys(wrappedState, [
        'Напряжение фазы B', 'Напряжение фазы В', 'VoltagePhaseB', 'voltagePhaseB', 'voltage_phase_b', 'Voltage_Phase_B'
    ]) ?? 0;
    const phaseC = getStateNumberByKeys(wrappedState, [
        'Напряжение фазы С', 'VoltagePhaseC', 'voltagePhaseC', 'voltage_phase_c', 'Voltage_Phase_C'
    ]) ?? 0;

    return {
        weldingCurrent: current,
        weldingVoltage: voltage,
        gasFlow: 0,
        wireConsumption: getStateNumberByKeys(wrappedState, ['Расход проволоки', 'WireConsumption', 'wireConsumption']) ?? 0,
        mainsVoltageA: phaseA,
        mainsVoltageB: phaseB,
        mainsVoltageC: phaseC,
        radiatorTemp: getStateNumberByKeys(wrappedState, ['Температура первичной обмотки', 'PrimaryCoilTemperature', 'primaryCoilTemperature']) ?? 0,
        inverterTemp: getStateNumberByKeys(wrappedState, ['Температура вторичной обмотки', 'SecondaryCoilTemperature', 'secondaryCoilTemperature']) ?? 0,
        chillerTempIn: getStateNumberByKeys(wrappedState, ['Температура охлаждающей жидкости на входе', 'ChillerTemperature1', 'chillerTemperature1']) ?? 0,
        chillerTempOut: getStateNumberByKeys(wrappedState, ['Температура охлаждающей жидкости на выходе', 'ChillerTemperature2', 'chillerTemperature2']) ?? 0
    };
}

/** Плоский объект как в deviceData после processStructuredData (для isWelding). */
function flattenPanelState(state) {
    if (!state) return {};
    const flat = { ...state };
    if (state.properties && typeof state.properties === 'object') {
        Object.entries(state.properties).forEach(([k, v]) => {
            if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'value')) {
                flat[k] = v.value;
            } else {
                flat[k] = v;
            }
        });
    }
    return flat;
}

/** Та же логика, что у isWelding(), но по сырому ответу panel-state (синхронно с poll). */
function isWeldingFromPanelState(state) {
    const data = flattenPanelState(state);
    const weldingMachineState = data['Состояние аппарата'] ||
        data['WeldingMachineState'] ||
        data.weldingMachineState ||
        data['State.WeldingMachineState'] ||
        data.properties?.['WeldingMachineState'] ||
        data.properties?.['Состояние аппарата'];
    if (weldingMachineState) {
        const stateLower = String(weldingMachineState).toLowerCase().trim();
        if (stateLower === 'сварка' || stateLower === 'welding' ||
            stateLower.includes('сварка') || stateLower.includes('welding') ||
            stateLower.includes('сварочн') || stateLower.includes('weld')) {
            return true;
        }
        if (stateLower.includes('ожидан') || stateLower.includes('waiting') ||
            stateLower.includes('выключ') || stateLower.includes('off') ||
            stateLower.includes('включен') || stateLower.includes('on') ||
            stateLower === 'выкл' || stateLower === 'off' ||
            stateLower === 'аппарат включен') {
            return false;
        }
    }
    const status = data.status || data.Status;
    if (status) {
        const statusLower = String(status).toLowerCase().trim();
        if (statusLower === 'welding' || statusLower === 'сварка' ||
            statusLower === 'weld' ||
            statusLower.includes('сварка') ||
            statusLower.includes('welding')) {
            return true;
        }
    }
    const { current: weldCurrent } = extractCurrentVoltageFromPanelState(state);
    if (weldCurrent > 1 && !weldingMachineState) {
        return true;
    }
    return false;
}

function getMachineActivityModeFromPanelState(state) {
    if (!state) return 'off';
    if (isWeldingFromPanelState(state)) return 'welding';

    const data = flattenPanelState(state);
    const weldingMachineState = data['Состояние аппарата'] ||
        data['WeldingMachineState'] ||
        data.weldingMachineState ||
        data['State.WeldingMachineState'] ||
        null;
    const status = data.status || data.Status || null;
    const stateLower = String(weldingMachineState || status || '').toLowerCase().trim();

    if (stateLower.includes('дежур') || stateLower.includes('standby') || stateLower.includes('waiting') || stateLower.includes('ожидан')) {
        return 'standby';
    }
    if (stateLower.includes('выключ') || stateLower === 'off' || stateLower.includes('offline') || stateLower.includes('не в сети')) {
        return 'off';
    }
    if (stateLower.includes('включ') || stateLower === 'on' || stateLower.includes('idle') || stateLower.includes('ready')) {
        return 'on';
    }

    return 'on';
}

const isHistoryPointWelding = (p) => String(p?.status || '').toLowerCase() === 'welding';

/** Вертикальные фронты на старт/стоп сварки: две точки с одним x (дубликат x = вертикаль в Chart.js). */
function appendWeldingPulseSeries(prev, yRaw, wasWelding, nowWelding, lastYRef, xPoll) {
    const y = Math.round(Number(yRaw) * 10) / 10;
    let next = [...prev];

    if (!wasWelding && !nowWelding) {
        next.push({ x: xPoll, y: 0 });
    } else if (!wasWelding && nowWelding) {
        next.push({ x: xPoll, y: 0 });
        next.push({ x: xPoll, y: y });
        lastYRef.current = y;
    } else if (wasWelding && nowWelding) {
        const prevY = lastYRef.current ?? 0;
        if (prevY === 0 && y > 0) {
            next.push({ x: xPoll, y: 0 });
            next.push({ x: xPoll, y: y });
        } else {
            next.push({ x: xPoll, y: y });
        }
        lastYRef.current = y;
    } else if (wasWelding && !nowWelding) {
        const last = lastYRef.current ?? y;
        next.push({ x: xPoll, y: last });
        next.push({ x: xPoll, y: 0 });
        lastYRef.current = 0;
    }

    return next;
}

/** История: те же вертикальные фронты по смене status Welding / не-Welding. */
function buildWeldingPulseSeriesFromHistoryPoints(points, mapY) {
    const series = [];
    if (!points?.length) return series;
    let wasWelding = false;
    let lastY = 0;

    points.forEach((p) => {
        const x = p.ts;
        const nowWelding = isHistoryPointWelding(p);
        const y = Math.round(Number(mapY(p)) * 10) / 10;

        if (!wasWelding && !nowWelding) {
            series.push({ x, y: 0 });
        } else if (!wasWelding && nowWelding) {
            series.push({ x, y: 0 });
            series.push({ x, y });
            lastY = y;
        } else if (wasWelding && nowWelding) {
            if (lastY === 0 && y > 0) {
                series.push({ x, y: 0 });
                series.push({ x, y });
            } else {
                series.push({ x, y });
            }
            lastY = y;
        } else if (wasWelding && !nowWelding) {
            series.push({ x, y: lastY });
            series.push({ x, y: 0 });
            lastY = 0;
        }
        wasWelding = nowWelding;
    });

    return series;
}

/** Прореживание без разрушения пар (x, y1)-(x, y2) — иначе фронт снова становится наклонным. */
function decimateWeldingPulseSeries(points, maxPoints) {
    const n = points?.length || 0;
    if (n <= maxPoints) return points || [];

    const mustKeep = new Set([0, n - 1]);
    for (let i = 0; i < n - 1; i += 1) {
        if (points[i].x === points[i + 1].x) {
            mustKeep.add(i);
            mustKeep.add(i + 1);
        }
    }

    const idxs = new Set(mustKeep);
    const target = Math.min(maxPoints, n);
    for (let k = 0; k < target && idxs.size < maxPoints; k += 1) {
        idxs.add(Math.round((k * (n - 1)) / Math.max(target - 1, 1)));
    }

    return [...idxs].sort((a, b) => a - b).map((j) => points[j]);
}

/**
 * В истории иногда попадает короткий Offline между Welding/Idle и следующим Online — на дорожке «Состояние»
 * серый зазор при включённом аппарате. Такие всплески до maxOfflineMs между двумя онлайн-участками убираем.
 */
function sanitizeBriefOfflineBetweenOnline(samples, windowEnd, maxOfflineMs) {
    if (!Array.isArray(samples) || samples.length < 2 || !Number.isFinite(maxOfflineMs) || maxOfflineMs <= 0) {
        return samples;
    }
    const n = samples.length;
    const out = samples.map((s) => ({ ...s }));
    let changed = false;
    let i = 0;
    while (i < n) {
        if (out[i].isOnline) {
            i += 1;
            continue;
        }
        const runStart = i;
        while (i < n && !out[i].isOnline) i += 1;
        const runEnd = i;
        const beforeOnline = runStart > 0 && out[runStart - 1].isOnline === true;
        const afterOnline = runEnd < n && out[runEnd].isOnline === true;
        if (!beforeOnline || !afterOnline) continue;
        const span = out[runEnd].x - out[runStart].x;
        if (span <= maxOfflineMs) {
            for (let k = runStart; k < runEnd; k += 1) {
                out[k].isOnline = true;
            }
            changed = true;
        }
    }
    return changed ? out : samples;
}

function parseErrorCodeForTimeline(state) {
    const data = flattenPanelState(state);
    const direct = data.errorCode || data.ErrorCode || data['error_code'] || data['State.Error'] || data['Ошибка'] || data['Ошибки'];
    if (direct === undefined || direct === null) return null;
    const raw = String(direct).trim();
    if (!raw || raw.toLowerCase() === 'null' || raw === '0') return null;
    const firstPart = raw.split(/[;,]/).map(s => s.trim()).find(Boolean) || raw;
    const numeric = parseInt(firstPart, 10);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    return null;
}

function formatErrorCodeLabel(errorCode) {
    if (errorCode === undefined || errorCode === null) return '';
    const n = Number(errorCode);
    if (!Number.isFinite(n)) return `ERR ${String(errorCode)}`;
    return `ERR ${String(Math.round(n)).padStart(2, '0')}`;
}

/** Строка в тултипе графика: ERR 05: Ошибка драйвера… */
function formatErrorTooltipLine(errorCode) {
    if (errorCode === undefined || errorCode === null) return null;
    const codeLabel = formatErrorCodeLabel(errorCode);
    if (!codeLabel) return null;
    const num = Number(errorCode);
    const isKnown = Number.isFinite(num) && num >= 1 && num <= EQUIPMENT_ERROR_MESSAGES.length;
    const name = getEquipmentErrorName(errorCode);
    if (isKnown && name) return `${codeLabel}: ${name}`;
    return `${codeLabel}: Неизвестная ошибка`;
}

/** Центр сегмента ошибки в ms. */
function errorSegmentCenterTs(seg) {
    return (seg.start + seg.end) / 2;
}

/** Ближайшая по горизонтали ошибка к позиции курсора (ts под мышью). */
function pickNearestErrorSegmentByPointerTs(errorsSegments, pointerTs) {
    if (!Array.isArray(errorsSegments) || !errorsSegments.length || !Number.isFinite(pointerTs)) {
        return null;
    }
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;
    errorsSegments.forEach((seg) => {
        const center = errorSegmentCenterTs(seg);
        const dist = Math.abs(center - pointerTs);
        if (dist < bestDist) {
            bestDist = dist;
            best = seg;
        }
    });
    return best;
}

function isClientOverRect(clientX, clientY, rect) {
    if (!rect || rect.width < 1) return false;
    return (
        clientY >= rect.top &&
        clientY <= rect.bottom &&
        clientX >= rect.left &&
        clientX <= rect.right
    );
}

function extractRfidFromDeviceData(deviceData, machineMac, hasData) {
    if (Object.keys(deviceData).length === 0 || !hasData) return null;
    const data = deviceData[machineMac];
    if (!data) return null;
    const rfidCode = data.RFID || data.Rfid || data.rfid || data.RFIDCode || data.RfidCode ||
        data.rfidCode || data['RFID'] || data['Rfid'] || data['RFID Code'] ||
        data['RFID.Hex'] ||
        data.properties?.RFID?.value || data.properties?.Rfid?.value || data.properties?.rfid?.value ||
        data.properties?.['RFID.Hex']?.value || data.properties?.['RFID.Hex'] ||
        data.properties?.RFID || data.properties?.Rfid || data.properties?.rfid;
    if (rfidCode && rfidCode !== 'null' && String(rfidCode).trim() !== '') {
        return String(rfidCode).trim();
    }
    return null;
}

/** Одинаковые индексы для двух рядов — ось X не разъезжается после прореживания. */
function decimateAlignedXYPairs(currentPts, voltagePts, maxPoints) {
    const n = Math.min(currentPts?.length || 0, voltagePts?.length || 0);
    if (n <= maxPoints) {
        return { weldingCurrent: currentPts || [], weldingVoltage: voltagePts || [] };
    }
    const idxs = new Set();
    const target = Math.min(maxPoints, n);
    for (let k = 0; k < target; k += 1) {
        idxs.add(Math.round((k * (n - 1)) / Math.max(target - 1, 1)));
    }
    const sortedIdx = [...idxs].sort((a, b) => a - b);
    return {
        weldingCurrent: sortedIdx.map((j) => currentPts[j]),
        weldingVoltage: sortedIdx.map((j) => voltagePts[j]),
    };
}

function decimateSeriesPoints(points, maxPoints) {
    const n = points?.length || 0;
    if (n <= maxPoints) return points || [];
    const idxs = new Set();
    const target = Math.min(maxPoints, n);
    for (let k = 0; k < target; k += 1) {
        idxs.add(Math.round((k * (n - 1)) / Math.max(target - 1, 1)));
    }
    const sortedIdx = [...idxs].sort((a, b) => a - b);
    return sortedIdx.map((j) => points[j]);
}

// Плагин пороговой линии отключён (белую линию на графике убрали по запросу)
const thresholdLinePlugin = {
    id: 'thresholdLinePlugin',
    afterDatasetsDraw: () => {}
};

// Регистрация компонентов Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    thresholdLinePlugin
);

const DeviceMonitorPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const machineName = searchParams.get('machine') || 'Неизвестный аппарат';
    const machineMac = searchParams.get('mac') || 'Неизвестный MAC';
    const equipmentName = searchParams.get('name') || machineName;
    const organizationUnit = searchParams.get('organizationUnit') || '';

    const [deviceData, setDeviceData] = useState({});
    // Удаляем старое состояние
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [messageHistory, setMessageHistory] = useState([]);

    // Состояние для polling
    const [pollingInterval, setPollingInterval] = useState(null);
    const [isPolling, setIsPolling] = useState(false);

    // Реф для дебаунсинга обновлений
    const updateTimeoutRef = useRef(null);

    // Простые состояния как в archive проекте
    const [isConnected, setIsConnected] = useState(false);
    const [hasData, setHasData] = useState(false);

    // Для задержки показа "отключен" при кратковременных паузах
    // Важно: ref вместо state, чтобы не ловить stale closure в polling callbacks
    const disconnectTimeoutRef = useRef(null);

    // Состояние для отображения списка телеметрии
    const [isTelemetryListExpanded, setIsTelemetryListExpanded] = useState(true);

    // Состояние для активной вкладки (Графики/Информация)
    const [activeTab, setActiveTab] = useState('info');
    /** Развернуть область графика на место верхней сетки (только вкладка «Графики»; при «Инфо» сбрасывается). */
    const [graphExpandedLayout, setGraphExpandedLayout] = useState(false);

    // Состояние для хранения ID аппарата (для удаления)
    const [machineId, setMachineId] = useState(null);
    const [rfidLookup, setRfidLookup] = useState({ status: 'idle' });
    /** Кэш поиска по RFID: не перезапрашивать при каждом poll телеметрии, только при смене кода */
    const rfidLookupCacheRef = useRef({ code: null, snapshot: null });
    const rfidFetchInFlightRef = useRef(false);

    /** Строка RFID из телеметрии — отдельно от deviceData, чтобы эффект не перезапускался на каждом poll */
    const telemetryRfidCode = useMemo(
        () => extractRfidFromDeviceData(deviceData, machineMac, hasData),
        [deviceData, machineMac, hasData]
    );

    // Состояние для редактирования названия аппарата (инлайн — оставлено для совместимости, но карандаш открывает модалку)
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(equipmentName);
    const [displayName, setDisplayName] = useState(equipmentName);
    const [isSavingName, setIsSavingName] = useState(false);

    // Модальное окно редактирования аппарата (наименование и подразделение)
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [machineOrganizationUnitId, setMachineOrganizationUnitId] = useState(null);

    // Реф для предотвращения конфликта между кликом на карандаш и onBlur
    const saveTimeoutRef = useRef(null);

    // Состояние для графиков (серии — только telemetrySeries; импульс тока/напряжения по фронту сварки)
    const [telemetrySeries, setTelemetrySeries] = useState(DEFAULT_TELEMETRY_SERIES);
    const LIVE_WINDOW_MS = 5 * 60 * 1000;
    const HISTORY_MAX_MS = 24 * 60 * 60 * 1000;
    const HISTORY_DECIMATION_STEP_MS = 10 * 1000;
    /** Верхний предел точек на линию в режиме истории (рендер Canvas без десятков тысяч сегментов). */
    const HISTORY_CHART_MAX_POINTS = 1200;
    const prevWeldingForChartRef = useRef(null);
    const lastWeldingCurrentChartRef = useRef(0);
    const lastWeldingVoltageChartRef = useRef(0);
    /** Последние ток/напряжение в простое — для колонки «Уст.» на время сварки (заморозка перед дугой). */
    const idleControlMetricsRef = useRef({ current: '0', voltage: '0' });
    const [telemetrySelection, setTelemetrySelection] = useState({
        slot1: 'weldingCurrent',
        slot2: 'weldingVoltage',
    });
    const [telemetryPhaseSelection, setTelemetryPhaseSelection] = useState({
        slot1: 'A',
        slot2: 'B',
    });
    /** Выбранные фазы сети (до 3) — по умолчанию ни одна, пока пользователь не включит A/B/C. */
    const [mainsVoltagePhases, setMainsVoltagePhases] = useState([]);
    /** Масштаб по оси X: 1 — весь диапазон; больше — «приближение» к последним точкам (окно справа). */
    const [telemetryChartZoom, setTelemetryChartZoom] = useState({ top: 1, bottom: 1 });
    const [yAxisLeftMax, setYAxisLeftMax] = useState(Y_AXIS_LEFT.MAX);
    const [yAxisRightMax, setYAxisRightMax] = useState(Y_AXIS_RIGHT.MAX);
    const [chartPlotCursorHidden, setChartPlotCursorHidden] = useState(false);
    const [chartPanActive, setChartPanActive] = useState(false);
    const [timelineSamples, setTimelineSamples] = useState([]);
    const [timeWindow, setTimeWindow] = useState({ start: null, end: null, touched: false });
    const latestTimeWindowRef = useRef(timeWindow);
    latestTimeWindowRef.current = timeWindow;
    const [draggingPin, setDraggingPin] = useState(null);
    const timelineRulerRef = useRef(null);
    const activeTabRef = useRef(activeTab);
    const historyModeRef = useRef(false);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'graphs') setGraphExpandedLayout(false);
    }, [activeTab]);
    const [dailyActivity, setDailyActivity] = useState(DAILY_ACTIVITY_INITIAL);
    const [dailyWireConsumptionKg, setDailyWireConsumptionKg] = useState(0);
    const dailyStatsIntervalRef = useRef(null);

    const [historyError, setHistoryError] = useState(null);
    const [isHistoryMode, setIsHistoryMode] = useState(false);
    /** Сегодня: пользователь тронул пины — суточная шкала, данные с сервера, без авто‑live окна. */
    const [todayPinExplore, setTodayPinExplore] = useState(false);
    const todayPinExploreRef = useRef(false);
    /** Синхронные границы суток при первом касании пина «сегодня» (до ререндера chartBounds). */
    const todayDayBoundsRef = useRef(null);
    const [historySeriesSnapshot, setHistorySeriesSnapshot] = useState(DEFAULT_TELEMETRY_SERIES);
    const [historyTimelineSnapshot, setHistoryTimelineSnapshot] = useState([]);
    const [historyDayBounds, setHistoryDayBounds] = useState({ start: null, end: null });
    const [selectedGraphDate, setSelectedGraphDate] = useState('');
    const selectedGraphDateRef = useRef(selectedGraphDate);
    selectedGraphDateRef.current = selectedGraphDate;
    /** Дата сессии перетаскивания пина (mousedown) — для записи интервала в mouseup при батчинге React. */
    const pinDragSessionDateRef = useRef(null);
    const [hoverCursor, setHoverCursor] = useState({
        active: false,
        ts: null,
        percent: 0,
        xPx: 0,
        flip: false,
    });
    /** Белая точка-курсор в plot: отдельно от crosshair (свой pointermove на .chart-canvas). */
    const [plotDot, setPlotDot] = useState({ visible: false, leftPx: 0, topPx: 0 });
    const [plotArea, setPlotArea] = useState({ leftPx: 0, rightPx: 0, widthPx: 0, topPx: 0, heightPx: 0, chartLeftPx: 0 });
    const chartCanvasRef = useRef(null);
    const plotAreaRef = useRef(plotArea);
    plotAreaRef.current = plotArea;
    const [welderNameByRfid, setWelderNameByRfid] = useState({});
    const welderNameFetchInFlightRef = useRef(new Set());
    const telemetryHistoryStoreRef = useRef({ series: DEFAULT_TELEMETRY_SERIES, timeline: [], lastStoredTs: 0 });
    const historyCacheRef = useRef({ date: null, dayStart: null, dayEnd: null, pointsByTs: new Map() });
    /** Не сбрасывать todayPinExplore при setSelectedGraphDate(сегодня) — кнопка «История». */
    const skipTodayLiveResetRef = useRef(false);
    /** Интервал пинов по дате (YYYY-MM-DD), чтобы при возврате на день восстановить окно. */
    const historyPinWindowsRef = useRef({});
    /** Предыдущая дата графика — для сохранения пинов в useLayoutEffect до эффекта загрузки истории. */
    const prevGraphDateForPinStorageRef = useRef(null);
    /** В режиме истории: превью интервала во время перетаскивания пина (committed окно — timeWindow). */
    const [pinDragPreview, setPinDragPreview] = useState(null);
    const pinDragPreviewRef = useRef(null);
    useEffect(() => {
        historyModeRef.current = isHistoryMode;
    }, [isHistoryMode]);
    useEffect(() => {
        todayPinExploreRef.current = todayPinExplore;
    }, [todayPinExplore]);

    const graphUsesServerData = isHistoryMode || todayPinExplore;
    const graphUsesServerDataRef = useRef(graphUsesServerData);
    useEffect(() => {
        graphUsesServerDataRef.current = graphUsesServerData;
    }, [graphUsesServerData]);

    const toLocalDateInput = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        return `${yyyy}-${mm}-${dd}`;
    };

    const isTodayDateStr = useCallback((dateStr) => {
        if (!dateStr) return false;
        return dateStr === toLocalDateInput(new Date());
    }, []);

    useEffect(() => {
        if (!selectedGraphDate) {
            setSelectedGraphDate(toLocalDateInput(new Date()));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const buildHistorySeriesForWindow = useCallback((windowStart, windowEnd) => {
        const cache = historyCacheRef.current;
        const points = [];
        cache.pointsByTs.forEach((p, ts) => {
            if (ts >= windowStart && ts <= windowEnd) points.push(p);
        });
        points.sort((a, b) => a.ts - b.ts);
        const toNumericOrNull = (value) => {
            if (value === null || value === undefined || value === '') return null;
            const n = Number(value);
            return Number.isFinite(n) ? n : null;
        };
        const mapCurrentY = (p) => (p.current === null || p.current === undefined ? 0 : Number(p.current));
        const mapVoltageY = (p) => (p.voltage === null || p.voltage === undefined ? 0 : (Number(p.voltage) || 0) / 10);

        return {
            ...DEFAULT_TELEMETRY_SERIES,
            weldingCurrent: buildWeldingPulseSeriesFromHistoryPoints(points, mapCurrentY),
            weldingVoltage: buildWeldingPulseSeriesFromHistoryPoints(points, mapVoltageY),
            mainsVoltageA: points.map((p) => ({
                x: p.ts,
                y: toNumericOrNull(p.mainsVoltageA),
            })),
            mainsVoltageB: points.map((p) => ({
                x: p.ts,
                y: toNumericOrNull(p.mainsVoltageB),
            })),
            mainsVoltageC: points.map((p) => ({
                x: p.ts,
                y: toNumericOrNull(p.mainsVoltageC),
            })),
            radiatorTemp: points.map((p) => ({
                x: p.ts,
                y: toNumericOrNull(p.primaryCoilTemperature),
            })),
            inverterTemp: points.map((p) => ({
                x: p.ts,
                y: toNumericOrNull(p.secondaryCoilTemperature),
            })),
            chillerTempIn: points.map((p) => ({
                x: p.ts,
                y: toNumericOrNull(p.chillerTemperatureIn),
            })),
            chillerTempOut: points.map((p) => ({
                x: p.ts,
                y: toNumericOrNull(p.chillerTemperatureOut),
            })),
        };
    }, []);

    const buildHistoryTimelineForWindow = useCallback((windowStart, windowEnd) => {
        const cache = historyCacheRef.current;
        const points = [];
        cache.pointsByTs.forEach((p, ts) => {
            if (ts >= windowStart && ts <= windowEnd) points.push(p);
        });
        points.sort((a, b) => a.ts - b.ts);
        return points.map((p) => {
            const st = String(p.status || '').toLowerCase();
            return {
                x: p.ts,
                isOnline: st !== 'offline',
                isWelding: st === 'welding',
                errorCode: p.errorCode,
                rfid: p.rfid,
            };
        });
    }, []);

    /** Один запрос на весь интервал [fromMs, toMs]: перезаписываем точки в этом диапазоне (без дозагрузки «кусками»). */
    const ensureHistoryIntervalLoaded = useCallback(async (dateStr, fromMs, toMs) => {
        if (!dateStr || !Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return { points: 0 };

        const [yyyy, mm, dd] = String(dateStr).split('-').map((x) => parseInt(x, 10));
        const dayStart = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime();
        const dayEnd = dayStart + HISTORY_MAX_MS;

        if (historyCacheRef.current.date !== dateStr) {
            historyCacheRef.current = { date: dateStr, dayStart, dayEnd, pointsByTs: new Map() };
        }

        const pts = await archiveDeviceApi.getArchiveTelemetryHistory(machineMac, fromMs, toMs);

        const cache = historyCacheRef.current;
        /** Только после успешного ответа: иначе при ошибке/узком окне зума терялись уже загруженные точки и показывалась ложная ошибка. */
        for (const ts of Array.from(cache.pointsByTs.keys())) {
            if (ts >= fromMs && ts <= toMs) cache.pointsByTs.delete(ts);
        }
        let added = 0;
        (pts || []).forEach((p) => {
            const ts = Number(p.ts);
            if (!Number.isFinite(ts)) return;
            cache.pointsByTs.set(ts, p);
            added += 1;
        });
        return { points: added };
    }, [machineMac, HISTORY_MAX_MS]);

    const pickDefaultHourWithData = useCallback(async (dateStr) => {
        const [yyyy, mm, dd] = String(dateStr).split('-').map((x) => parseInt(x, 10));
        const dayStart = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime();
        const ten = dayStart + 10 * 60 * 60 * 1000;
        const eleven = dayStart + 11 * 60 * 60 * 1000;
        // Сначала пробуем 10–11
        await ensureHistoryIntervalLoaded(dateStr, ten, eleven);
        const hasTen = Array.from(historyCacheRef.current.pointsByTs.keys()).some((t) => t >= ten && t <= eleven);
        if (hasTen) return { start: ten, end: eleven };
        // Иначе ищем любой час с данными
        for (let h = 0; h < 24; h += 1) {
            const start = dayStart + h * 60 * 60 * 1000;
            const end = start + 60 * 60 * 1000;
            await ensureHistoryIntervalLoaded(dateStr, start, end);
            const has = Array.from(historyCacheRef.current.pointsByTs.keys()).some((t) => t >= start && t <= end);
            if (has) return { start, end };
        }
        // fallback 10–11 (даже если пусто)
        return { start: ten, end: eleven };
    }, [ensureHistoryIntervalLoaded]);

    const getDayBoundsForDateStr = useCallback((dateStr) => {
        const [yyyy, mm, dd] = String(dateStr).split('-').map((x) => parseInt(x, 10));
        const dayStart = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime();
        return { dayStart, dayEnd: dayStart + HISTORY_MAX_MS };
    }, [HISTORY_MAX_MS]);

    /** Запись интервала пинов для исторической даты (в ref-карту). */
    const persistHistoryPinWindow = useCallback(
        (dateStr, start, end) => {
            if (!dateStr || isTodayDateStr(dateStr)) return;
            if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
            const { dayStart, dayEnd } = getDayBoundsForDateStr(dateStr);
            if (start < dayStart || end > dayEnd) return;
            historyPinWindowsRef.current[dateStr] = { start, end };
        },
        [getDayBoundsForDateStr, isTodayDateStr]
    );

    /** Любое валидное окно в сутках выбранной исторической даты — сразу в карту (колесо X, догрузка и т.д.). */
    useEffect(() => {
        if (!isHistoryMode) return;
        if (!selectedGraphDate || isTodayDateStr(selectedGraphDate)) return;
        const { start, end } = timeWindow;
        persistHistoryPinWindow(selectedGraphDate, start, end);
    }, [isHistoryMode, selectedGraphDate, timeWindow.start, timeWindow.end, isTodayDateStr, persistHistoryPinWindow]);

    /** Сохраняем интервал пинов для предыдущей исторической даты до запуска useEffect загрузки (тот же latestTimeWindowRef, что и на этом рендере). */
    useLayoutEffect(() => {
        const prev = prevGraphDateForPinStorageRef.current;
        if (prev && selectedGraphDate && prev !== selectedGraphDate && !isTodayDateStr(prev)) {
            const tw = latestTimeWindowRef.current;
            if (Number.isFinite(tw.start) && Number.isFinite(tw.end) && tw.end > tw.start) {
                const { dayStart, dayEnd } = getDayBoundsForDateStr(prev);
                const minGap = 60 * 1000;
                if (tw.end > dayStart && tw.start < dayEnd) {
                    const start = Math.max(dayStart, Math.min(tw.start, dayEnd - minGap));
                    const end = Math.min(dayEnd, Math.max(tw.end, dayStart + minGap));
                    if (end > start) {
                        persistHistoryPinWindow(prev, start, end);
                    }
                }
            }
        }
        prevGraphDateForPinStorageRef.current = selectedGraphDate || null;
    }, [selectedGraphDate, getDayBoundsForDateStr, isTodayDateStr, persistHistoryPinWindow]);

    useEffect(() => {
        if (!selectedGraphDate) return;
        if (isTodayDateStr(selectedGraphDate)) {
            setIsHistoryMode(false);
            if (skipTodayLiveResetRef.current) {
                skipTodayLiveResetRef.current = false;
                return undefined;
            }
            // Live режим по умолчанию (пятиминутка); суточный просмотр — только через пины / «История».
            setTodayPinExplore(false);
            todayPinExploreRef.current = false;
            todayDayBoundsRef.current = null;
            setHistoryDayBounds({ start: null, end: null });
            historyCacheRef.current = { date: null, dayStart: null, dayEnd: null, pointsByTs: new Map() };
            pinDragPreviewRef.current = null;
            setPinDragPreview(null);
            setDraggingPin(null);
            return undefined;
        }
        let cancelled = false;
        (async () => {
            setIsHistoryMode(true);
            setTodayPinExplore(false);
            todayPinExploreRef.current = false;
            todayDayBoundsRef.current = null;
            setHistoryError(null);
            const [yyyy, mm, dd] = String(selectedGraphDate).split('-').map((x) => parseInt(x, 10));
            const dayStart = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime();
            const dayEnd = dayStart + HISTORY_MAX_MS;
            setHistoryDayBounds({ start: dayStart, end: dayEnd });

            const minGap = 60 * 1000;
            const saved = historyPinWindowsRef.current[selectedGraphDate];
            let window;
            if (
                saved &&
                Number.isFinite(saved.start) &&
                Number.isFinite(saved.end) &&
                saved.end > saved.start
            ) {
                let start = Math.max(dayStart, Math.min(saved.start, dayEnd - minGap));
                let end = Math.min(dayEnd, Math.max(saved.end, dayStart + minGap));
                if (end - start < minGap) {
                    end = Math.min(dayEnd, start + minGap);
                }
                if (end > dayEnd) {
                    end = dayEnd;
                    start = Math.max(dayStart, end - minGap);
                }
                if (end <= start) {
                    window = await pickDefaultHourWithData(selectedGraphDate);
                } else {
                    window = { start, end };
                }
            } else {
                window = await pickDefaultHourWithData(selectedGraphDate);
            }
            if (cancelled) return;
            try {
                await ensureHistoryIntervalLoaded(selectedGraphDate, window.start, window.end);
            } catch {
                if (!cancelled) setHistoryError('Не удалось загрузить историю с сервера.');
                return;
            }
            if (cancelled) return;
            setTimeWindow({ start: window.start, end: window.end, touched: true });
            setHistorySeriesSnapshot(buildHistorySeriesForWindow(window.start, window.end));
            setHistoryTimelineSnapshot(buildHistoryTimelineForWindow(window.start, window.end));
        })().catch(() => {
            if (!cancelled) setHistoryError('Не удалось загрузить историю с сервера.');
        });
        return () => {
            cancelled = true;
        };
    }, [
        selectedGraphDate,
        isTodayDateStr,
        HISTORY_MAX_MS,
        pickDefaultHourWithData,
        buildHistorySeriesForWindow,
        buildHistoryTimelineForWindow,
        ensureHistoryIntervalLoaded,
    ]);

    const historyFetchDebounceRef = useRef(null);
    useEffect(() => {
        if (!graphUsesServerData) return;
        if (draggingPin) return;
        const start = timeWindow.start;
        const end = timeWindow.end;
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
        if (historyFetchDebounceRef.current) clearTimeout(historyFetchDebounceRef.current);
        historyFetchDebounceRef.current = setTimeout(() => {
            ensureHistoryIntervalLoaded(selectedGraphDate, start, end)
                .then(() => {
                    setHistorySeriesSnapshot(buildHistorySeriesForWindow(start, end));
                    setHistoryTimelineSnapshot(buildHistoryTimelineForWindow(start, end));
                    setHistoryError(null);
                })
                .catch(() => {
                    const cache = historyCacheRef.current;
                    let hasInRange = false;
                    if (cache?.pointsByTs?.size) {
                        for (const ts of cache.pointsByTs.keys()) {
                            if (ts >= start && ts <= end) {
                                hasInRange = true;
                                break;
                            }
                        }
                    }
                    if (hasInRange) {
                        setHistorySeriesSnapshot(buildHistorySeriesForWindow(start, end));
                        setHistoryTimelineSnapshot(buildHistoryTimelineForWindow(start, end));
                        setHistoryError(null);
                    } else {
                        setHistoryError('Не удалось загрузить историю с сервера.');
                    }
                });
        }, 250);
        return () => {
            if (historyFetchDebounceRef.current) clearTimeout(historyFetchDebounceRef.current);
        };
    }, [graphUsesServerData, draggingPin, timeWindow.start, timeWindow.end, ensureHistoryIntervalLoaded, selectedGraphDate, buildHistorySeriesForWindow, buildHistoryTimelineForWindow]);

    /** Как в archive WeldingMachinePanel: при >200 точек оставляем последние 100 */
    const trimChartSeries = (prev, point) => {
        const next = [...prev, point];
        return next.length > 200 ? next.slice(-100) : next;
    };

    const trimSeriesByTime = (prev, point, windowMs) => {
        const cutoff = point.x - windowMs;
        const next = [...prev, point].filter((p) => (typeof p?.x === 'number' ? p.x >= cutoff : true));
        return next.length > 5000 ? next.slice(-5000) : next;
    };

    const appendDecimatedHistory = (prev, point, nowTs) => {
        const cutoff = nowTs - HISTORY_MAX_MS;
        const last = prev.length ? prev[prev.length - 1] : null;
        const canAppend = !last || (typeof last.x === 'number' && point.x - last.x >= HISTORY_DECIMATION_STEP_MS);
        if (!canAppend) return prev.filter((p) => (typeof p?.x === 'number' ? p.x >= cutoff : true));
        const next = [...prev, point].filter((p) => (typeof p?.x === 'number' ? p.x >= cutoff : true));
        return next.length > 9000 ? next.slice(-9000) : next;
    };

    // Состояние для таймера сварки
    const [weldingStartTime, setWeldingStartTime] = useState(null); // Время начала сварки
    const [weldingEndTime, setWeldingEndTime] = useState(null); // Время окончания сварки (для показа еще 2 секунды)
    const [lastWeldingDuration, setLastWeldingDuration] = useState(0); // Последняя длительность сварки
    const [currentTime, setCurrentTime] = useState(Date.now()); // Текущее время для обновления таймера

    // Оптимизированная функция для обновления данных с дебаунсингом
    const updateDeviceData = useCallback((newData) => {
        // Очищаем предыдущий таймаут
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Устанавливаем новый таймаут для обновления (50мс дебаунсинг - уменьшили)
        updateTimeoutRef.current = setTimeout(() => {
            const updateTime = new Date();
            setDeviceData(prev => {
                const updated = { ...prev };
                Object.keys(newData).forEach(mac => {
                    if (updated[mac]) {
                        // Обновляем все данные, но приоритет новым значениям
                        const filteredNewData = Object.fromEntries(
                            Object.entries(newData[mac]).filter(([key, value]) =>
                                key === 'timestamp' || // Всегда обновляем timestamp
                                (value !== undefined && value !== null)
                            )
                        );

                        // Приоритет новым Core данным над старыми State данными
                        const mergedData = { ...updated[mac] };

                        // Сначала добавляем все новые данные
                        Object.entries(filteredNewData).forEach(([key, value]) => {
                            if (key !== 'timestamp') {
                                mergedData[key] = value;
                            }
                        });

                        // Приоритет Core данных над State данными
                        if (mergedData.Current && mergedData['State.I']) {
                            mergedData['State.I'] = mergedData.Current; // Core Current приоритетнее
                        }
                        if (mergedData.Voltage && mergedData['State.U']) {
                            mergedData['State.U'] = mergedData.Voltage; // Core Voltage приоритетнее
                        }

                        mergedData.timestamp = filteredNewData.timestamp || mergedData.timestamp;

                        updated[mac] = mergedData;
                    } else {
                        updated[mac] = newData[mac];
                    }
                });
                return updated;
            });
            setLastUpdate(updateTime);
        }, 50); // Уменьшили дебаунсинг с 100мс до 50мс
    }, []);

    useEffect(() => {
        startPolling();
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machineMac]);

    const refreshDailyStatsFromServer = useCallback(async () => {
        if (!machineMac || machineMac === 'Неизвестный MAC') return;
        try {
            const dto = await archiveDeviceApi.getArchiveDailyStats(machineMac);
            applyDailyStatsDto(setDailyActivity, setDailyWireConsumptionKg, dto);
        } catch (err) {
            console.warn('[DeviceMonitor] daily-stats:', err?.message || err);
        }
    }, [machineMac]);

    useEffect(() => {
        refreshDailyStatsFromServer();
        if (dailyStatsIntervalRef.current) {
            clearInterval(dailyStatsIntervalRef.current);
        }
        dailyStatsIntervalRef.current = setInterval(refreshDailyStatsFromServer, DAILY_STATS_REFRESH_MS);
        return () => {
            if (dailyStatsIntervalRef.current) {
                clearInterval(dailyStatsIntervalRef.current);
                dailyStatsIntervalRef.current = null;
            }
        };
    }, [refreshDailyStatsFromServer]);

    // Получаем ID аппарата по MAC адресу при загрузке страницы
    useEffect(() => {
        const fetchMachineId = async () => {
            if (!machineMac || machineMac === 'Неизвестный MAC') return;
            try {
                const machines = await getAllWeldingMachines();
                const macNorm = String(machineMac).trim().toLowerCase();
                const machine = Array.isArray(machines)
                    ? machines.find((m) => String(m.mac || '').trim().toLowerCase() === macNorm)
                    : null;
                if (machine && machine.id) {
                    setMachineId(machine.id);
                    const unitId = machine.organizationUnit?.id ?? machine.organizationUnitId ?? null;
                    setMachineOrganizationUnitId(unitId);
                }
            } catch (err) {
                console.error('Ошибка получения ID аппарата:', err);
            }
        };
        fetchMachineId();
    }, [machineMac]);

    useEffect(() => {
        const code = telemetryRfidCode;
        if (!code) {
            rfidLookupCacheRef.current = { code: null, snapshot: null };
            rfidFetchInFlightRef.current = false;
            setRfidLookup({ status: 'idle' });
            return;
        }
        const cached = rfidLookupCacheRef.current;
        if (cached.code === code && cached.snapshot) {
            return;
        }
        if (cached.code === code && rfidFetchInFlightRef.current) {
            return;
        }
        rfidLookupCacheRef.current = { code, snapshot: null };
        rfidFetchInFlightRef.current = true;
        let cancelled = false;
        setRfidLookup({ status: 'loading' });
        (async () => {
            try {
                const w = await fetchWelderByRfidVariants(code);
                if (cancelled) return;
                if (rfidLookupCacheRef.current.code !== code) return;
                const snap = w ? { status: 'known', welder: w } : { status: 'unknown' };
                rfidLookupCacheRef.current = { code, snapshot: snap };
                setRfidLookup(snap);
            } catch {
                if (!cancelled && rfidLookupCacheRef.current.code === code) {
                    const snap = { status: 'unknown' };
                    rfidLookupCacheRef.current = { code, snapshot: snap };
                    setRfidLookup(snap);
                }
            } finally {
                if (!cancelled) {
                    rfidFetchInFlightRef.current = false;
                }
            }
        })();
        return () => {
            cancelled = true;
            rfidFetchInFlightRef.current = false;
        };
    }, [telemetryRfidCode]);

    // Обновление текущего времени каждую секунду для таймера
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Очистка таймаутов при размонтировании
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Рефы для экземпляров Chart.js
    const currentChartInstanceRef = useRef(null);
    const voltageChartInstanceRef = useRef(null);

    // Сброс графиков при смене MAC (другой аппарат)
    useEffect(() => {
        prevWeldingForChartRef.current = null;
        lastWeldingCurrentChartRef.current = 0;
        lastWeldingVoltageChartRef.current = 0;
        setTelemetrySeries(DEFAULT_TELEMETRY_SERIES);
        setTelemetryChartZoom({ top: 1, bottom: 1 });
        setTimelineSamples([]);
        setTimeWindow({ start: null, end: null, touched: false });
        historyPinWindowsRef.current = {};
        prevGraphDateForPinStorageRef.current = null;
    }, [machineMac]);

    // Очистка серий при потере связи (не завязываем на deviceData — он обновляется с дебаунсом и мог бы сбрасывать график после poll)
    useEffect(() => {
        if (!hasData) {
            prevWeldingForChartRef.current = null;
            lastWeldingCurrentChartRef.current = 0;
            lastWeldingVoltageChartRef.current = 0;
            setTelemetrySeries(DEFAULT_TELEMETRY_SERIES);
            setTelemetryChartZoom({ top: 1, bottom: 1 });
            setTimelineSamples([]);
            setTimeWindow({ start: null, end: null, touched: false });
        }
    }, [hasData]);

    // Отслеживание состояния сварки для таймера
    useEffect(() => {
        if (Object.keys(deviceData).length === 0 || !hasData) {
            // Нет данных - обнуляем таймер
            if (weldingStartTime) {
                const duration = Date.now() - weldingStartTime;
                setLastWeldingDuration(duration);
                setWeldingEndTime(Date.now());
                setWeldingStartTime(null);
            }
            return;
        }
        const data = deviceData[machineMac];
        if (!data) {
            // Нет данных для этого аппарата - обнуляем таймер
            if (weldingStartTime) {
                const duration = Date.now() - weldingStartTime;
                setLastWeldingDuration(duration);
                setWeldingEndTime(Date.now());
                setWeldingStartTime(null);
            }
            return;
        }

        const isCurrentlyWelding = isWelding();

        if (isCurrentlyWelding) {
            // Сварка началась или продолжается
            if (!weldingStartTime) {
                // Сварка только началась - устанавливаем время начала
                setWeldingStartTime(Date.now());
                setWeldingEndTime(null);
                setLastWeldingDuration(0);
            }
            // Если сварка продолжается, ничего не делаем - таймер уже работает
        } else {
            // Сварка не идет
            if (weldingStartTime) {
                // Сварка только что закончилась
                const duration = Date.now() - weldingStartTime;
                setLastWeldingDuration(duration);
                setWeldingEndTime(Date.now());
                setWeldingStartTime(null);
            } else if (weldingEndTime) {
                // Проверяем, прошло ли 2 секунды после окончания сварки
                const timeSinceEnd = Date.now() - weldingEndTime;
                if (timeSinceEnd >= 2000) {
                    // Прошло 2 секунды, обнуляем таймер
                    setWeldingEndTime(null);
                    setLastWeldingDuration(0);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceData, hasData, machineMac, currentTime]);

    // Простая функция как в archive проекте - просто обновляем состояние
    const updateConnectionStatus = (connected, hasStateData) => {
        // Если устройство подключено - сразу обновляем состояние
        if (connected && hasStateData) {
            // Очищаем таймаут отключения если он есть
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
            }

            setIsConnected(true);
            setHasData(true);
        } else {
            // Если устройство отключено - добавляем небольшую задержку (2 секунды)
            // чтобы избежать мигания при кратковременных паузах
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
            }

            const timeout = setTimeout(() => {
                setIsConnected(false);
                setHasData(false);
                setDeviceData({}); // Очищаем данные
                prevWeldingForChartRef.current = null;
                lastWeldingCurrentChartRef.current = 0;
                lastWeldingVoltageChartRef.current = 0;
                setTelemetrySeries(DEFAULT_TELEMETRY_SERIES);
                setTelemetryChartZoom({ top: 1, bottom: 1 });
                setTimelineSamples([]);
                setTimeWindow({ start: null, end: null, touched: false });
                disconnectTimeoutRef.current = null;
            }, 3000); // 3 секунды задержки

            disconnectTimeoutRef.current = timeout;
        }
    };

    // Функция для опроса состояния устройства (как в archive проекте)
    const startPolling = () => {
        // Останавливаем предыдущий polling если он есть
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }

        setIsConnecting(true);
        setError(null);
        setIsPolling(true);

        // Первый запрос сразу
        fetchDeviceState();

        // Интервал опроса panel-state: 1 с (реалтайм-графики синхронизированы с этим же опросом)
        const interval = setInterval(() => {
            fetchDeviceState();
        }, 1300);

        setPollingInterval(interval);
    };

    // Функция для остановки polling
    const stopPolling = () => {
        setIsPolling(false);
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
    };

    // Функция для получения состояния устройства (точно как в archive проекте)
    const fetchDeviceState = async () => {
        try {
            const response = await archiveDeviceApi.getArchivePanelState(machineMac);

            if (response && response !== null) {
                const sampleTs = Date.now();
                // Обрабатываем данные
                processStructuredData({
                    mac: machineMac,
                    state: response
                });

                // Реалтайм-графики: одна точка на каждый успешный poll (как WeldingMachinePanel.updateChart)
                const { current: iRaw, voltage: uRaw } = extractCurrentVoltageFromPanelState(response);
                const telemetrySample = extractTelemetrySampleFromPanelState(response);
                const xPoll = Date.now();
                const wNow = isWeldingFromPanelState(response);
                const wasWelding = prevWeldingForChartRef.current === true;
                const yi = Math.round(Number(iRaw) * 10) / 10;
                const yu = Math.round(Number(uRaw) * 10) / 10;
                setTelemetrySeries(prev => {
                    const next = { ...prev };
                    TELEMETRY_CHANNELS_CONFIG.forEach(channel => {
                        if (channel.key === 'mainsVoltage') {
                            const yA = Math.round(Number(telemetrySample.mainsVoltageA ?? 0) * 10) / 10;
                            const yB = Math.round(Number(telemetrySample.mainsVoltageB ?? 0) * 10) / 10;
                            const yC = Math.round(Number(telemetrySample.mainsVoltageC ?? 0) * 10) / 10;
                            next.mainsVoltageA = trimSeriesByTime(prev.mainsVoltageA || [], { x: xPoll, y: yA }, LIVE_WINDOW_MS);
                            next.mainsVoltageB = trimSeriesByTime(prev.mainsVoltageB || [], { x: xPoll, y: yB }, LIVE_WINDOW_MS);
                            next.mainsVoltageC = trimSeriesByTime(prev.mainsVoltageC || [], { x: xPoll, y: yC }, LIVE_WINDOW_MS);
                        } else if (channel.key === 'weldingCurrent') {
                            const series = appendWeldingPulseSeries(
                                prev.weldingCurrent || [],
                                yi,
                                wasWelding,
                                wNow,
                                lastWeldingCurrentChartRef,
                                xPoll
                            );
                            next.weldingCurrent = (series || []).filter((p) => typeof p?.x === 'number' && p.x >= xPoll - LIVE_WINDOW_MS);
                        } else if (channel.key === 'weldingVoltage') {
                            const series = appendWeldingPulseSeries(
                                prev.weldingVoltage || [],
                                yu,
                                wasWelding,
                                wNow,
                                lastWeldingVoltageChartRef,
                                xPoll
                            );
                            next.weldingVoltage = (series || []).filter((p) => typeof p?.x === 'number' && p.x >= xPoll - LIVE_WINDOW_MS);
                        } else {
                            const y = Math.round(Number(telemetrySample[channel.key] ?? 0) * 10) / 10;
                            next[channel.key] = trimSeriesByTime(prev[channel.key] || [], { x: xPoll, y }, LIVE_WINDOW_MS);
                        }
                    });
                    return next;
                });
                const flatState = flattenPanelState(response);
                const stateRfid = flatState['RFID.Hex'] ||
                    flatState.RFID ||
                    flatState.Rfid ||
                    flatState.rfid ||
                    null;
                const errorCode = parseErrorCodeForTimeline(response);
                setTimelineSamples(prev => {
                    const next = [
                        ...prev,
                        {
                            x: xPoll,
                            isOnline: true,
                            isWelding: wNow,
                            errorCode,
                            rfid: stateRfid ? String(stateRfid).trim() : null
                        }
                    ];
                    const cutoff = xPoll - LIVE_WINDOW_MS;
                    const clipped = next.filter((s) => (typeof s?.x === 'number' ? s.x >= cutoff : true));
                    return clipped.length > 6000 ? clipped.slice(-6000) : clipped;
                });
                prevWeldingForChartRef.current = wNow;

                if (
                    !historyModeRef.current &&
                    !todayPinExploreRef.current &&
                    activeTabRef.current === 'graphs'
                ) {
                    setTimeWindow({ start: xPoll - LIVE_WINDOW_MS, end: xPoll, touched: true });
                }

                const store = telemetryHistoryStoreRef.current;
                const seriesNext = { ...store.series };
                seriesNext.weldingCurrent = appendDecimatedHistory(store.series.weldingCurrent || [], { x: xPoll, y: yi }, xPoll);
                seriesNext.weldingVoltage = appendDecimatedHistory(store.series.weldingVoltage || [], { x: xPoll, y: yu }, xPoll);
                seriesNext.mainsVoltageA = appendDecimatedHistory(store.series.mainsVoltageA || [], { x: xPoll, y: telemetrySample.mainsVoltageA ?? 0 }, xPoll);
                seriesNext.mainsVoltageB = appendDecimatedHistory(store.series.mainsVoltageB || [], { x: xPoll, y: telemetrySample.mainsVoltageB ?? 0 }, xPoll);
                seriesNext.mainsVoltageC = appendDecimatedHistory(store.series.mainsVoltageC || [], { x: xPoll, y: telemetrySample.mainsVoltageC ?? 0 }, xPoll);
                telemetryHistoryStoreRef.current = {
                    ...store,
                    series: seriesNext,
                    timeline: appendDecimatedHistory(
                        store.timeline || [],
                        {
                            x: xPoll,
                            y: 1,
                            isOnline: true,
                            isWelding: wNow,
                            errorCode,
                            rfid: stateRfid ? String(stateRfid).trim() : null
                        },
                        xPoll
                    ),
                    lastStoredTs: xPoll,
                };

                // Просто обновляем состояние - есть данные
                updateConnectionStatus(true, true);
                setLastUpdate(new Date());
                setError(null);
                setIsConnecting(false);

                // Добавляем в историю сообщений
                setMessageHistory(prev => [
                    {
                        timestamp: new Date(sampleTs),
                        data: JSON.stringify(response),
                        type: 'received'
                    },
                    ...prev.slice(0, 9)
                ]);
            } else {
                // Нет данных - просто обновляем состояние
                updateConnectionStatus(false, false);
                setError('Устройство не найдено');
            }
        } catch (err) {
            console.error('Ошибка получения состояния устройства:', err);
            // При ошибке - нет данных
            updateConnectionStatus(false, false);
            setError('Ошибка подключения: ' + err.message);
            setIsConnecting(false);
        }
    };

    const processDeviceData = (rawData) => {
        try {
            // Формат данных: TIMESTAMP|MAC:PARAM1:VAL1;PARAM2:VAL2;...
            const [timestamp, ...dataParts] = rawData.split('|');
            const dataString = dataParts.join('|');

            if (dataString.includes(':')) {
                const [mac, ...paramsParts] = dataString.split(':');
                const paramsString = paramsParts.join(':');

                const params = {};
                paramsString.split(';').forEach(part => {
                    if (part.includes(':')) {
                        const [key, value] = part.split(':');
                        if (key && value) {
                            const trimmedKey = key.trim();
                            const trimmedValue = value.trim();

                            // Обрабатываем все параметры Core
                            if (trimmedKey === 'Voltage') {
                                // Напряжение в десятых долях вольта
                                const decimalValue = parseInt(trimmedValue, 10);
                                params[trimmedKey] = (decimalValue / 10).toFixed(1);
                            } else if (trimmedKey === 'Current') {
                                // Ток
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey === 'WeldingCurrent') {
                                // Ток сварки
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey === 'WeldingVoltage') {
                                // Напряжение сварки
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey === 'GasFlow') {
                                // Расход газа
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey === 'WeldingMachineState') {
                                // Состояние сварочного аппарата
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey === 'JobNumber') {
                                // Номер работы
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey === 'Inductance') {
                                // Индуктивность
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey.startsWith('Errors')) {
                                // Ошибки
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey.startsWith('VoltagePhase')) {
                                // Напряжения фаз
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey.startsWith('Temperature') || trimmedKey.includes('Temperature')) {
                                // Температуры
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey === 'WireIndex') {
                                // Индекс проволоки
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey === 'Flags') {
                                // Флаги
                                params[trimmedKey] = trimmedValue;
                            } else if (trimmedKey === 'State.I' || trimmedKey === 'State.U') {
                                // Старые параметры (для совместимости)
                                const decimalValue = parseInt(trimmedValue, 16);
                                if (trimmedKey === 'State.U') {
                                    params[trimmedKey] = (decimalValue / 10).toFixed(1);
                                } else {
                                    params[trimmedKey] = decimalValue.toString();
                                }
                            } else {
                                // Все остальные параметры
                                params[trimmedKey] = trimmedValue;
                            }
                        }
                    }
                });

                updateDeviceData({
                    [mac]: {
                        ...params,
                        timestamp: timestamp || new Date().toLocaleTimeString()
                    }
                });
            }
        } catch (err) {
            console.error('Ошибка обработки данных:', err);
        }
    };

    const processStructuredData = (data) => {
        try {
            if (data.state && data.state.properties) {
                const mac = data.mac || machineMac; // берём из payload, fallback на выбранный MAC
                const params = {};

                // Сохраняем status из корня state (это ключевое поле для определения состояния сварки!)
                // status может быть: "Offline", "Welding", "On", "Error" и т.д.
                if (data.state.status !== undefined && data.state.status !== null) {
                    params.status = data.state.status;
                }

                // error_code из корня: всегда кладём в params (пустая строка = нет кода), иначе merge в updateDeviceData
                // оставляет старый errorCode после сброса ошибки на аппарате.
                const rawErrorCode = data.state.errorCode;
                const ecTrim = rawErrorCode === undefined || rawErrorCode === null ? '' : String(rawErrorCode).trim();
                const normalizedErrorCode =
                    ecTrim !== '' && ecTrim.toLowerCase() !== 'null' && ecTrim !== '0' ? ecTrim : '';

                // Извлекаем ВСЕ параметры из структурированных данных
                Object.entries(data.state.properties).forEach(([key, prop]) => {
                    if (prop && prop.value) {
                        // Обрабатываем все параметры Core
                        if (key === 'Voltage') {
                            // Напряжение в десятых долях вольта
                            const decimalValue = parseInt(prop.value, 10);
                            params[key] = (decimalValue / 10).toFixed(1);
                        } else if (key === 'Current') {
                            // Ток
                            params[key] = prop.value;
                        } else if (key === 'WeldingCurrent') {
                            // Ток сварки
                            params[key] = prop.value;
                        } else if (key === 'WeldingVoltage') {
                            // Напряжение сварки
                            params[key] = prop.value;
                        } else if (key === 'GasFlow') {
                            // Расход газа
                            params[key] = prop.value;
                        } else if (key === 'WeldingMachineState') {
                            // Состояние сварочного аппарата
                            params[key] = prop.value;
                        } else if (key === 'JobNumber') {
                            // Номер работы
                            params[key] = prop.value;
                        } else if (key === 'Inductance') {
                            // Индуктивность
                            params[key] = prop.value;
                        } else if (key.startsWith('Errors')) {
                            // Ошибки
                            params[key] = prop.value;
                        } else if (key.startsWith('VoltagePhase')) {
                            // Напряжения фаз
                            params[key] = prop.value;
                        } else if (key.startsWith('Temperature') || key.includes('Temperature')) {
                            // Температуры
                            params[key] = prop.value;
                        } else if (key === 'WireIndex') {
                            // Индекс проволоки
                            params[key] = prop.value;
                        } else if (key === 'Flags') {
                            // Флаги
                            params[key] = prop.value;
                        } else if (key === 'RFID' || key === 'Rfid' || key === 'rfid' || key === 'RFIDCode' || key === 'RfidCode' || key === 'RFID.Hex') {
                            // RFID код
                            params[key] = prop.value;
                            // Также сохраняем как RFID для единообразия
                            params.RFID = prop.value;
                        } else if (key === 'State.I' || key === 'State.U') {
                            // Старые параметры (для совместимости)
                            const decimalValue = parseInt(prop.value, 16);
                            if (key === 'State.U') {
                                params[key] = (decimalValue / 10).toFixed(1);
                            } else {
                                params[key] = decimalValue.toString();
                            }
                        } else {
                            // Все остальные параметры
                            params[key] = prop.value;
                        }
                    }
                });

                params.errorCode = normalizedErrorCode;

                // Если в ответе нет свойства «Ошибки», а код ошибки пуст — явно «Нет ошибок», иначе merge оставит старый текст.
                if (!params['Ошибки'] && normalizedErrorCode === '') {
                    params['Ошибки'] = 'Нет ошибок';
                }

                // Убеждаемся, что status сохраняется (приоритет params.status, если он был установлен выше)
                const finalStatus = params.status || data.state.status || null;

                // Сохраняем RFID код из предыдущих данных, если он не пришел в новом ответе
                const existingData = deviceData[mac];
                if (existingData && existingData.RFID && !params.RFID) {
                    params.RFID = existingData.RFID;
                }
                if (existingData && existingData['RFID.Hex'] && !params['RFID.Hex']) {
                    params['RFID.Hex'] = existingData['RFID.Hex'];
                }

                updateDeviceData({
                    [mac]: {
                        ...params,
                        status: finalStatus, // Сохраняем status для определения состояния сварки
                        timestamp: data.timestamp || new Date().toLocaleTimeString(),
                        lastDatetimeUpdate: data.state.lastDatetimeUpdate || data.state.dateCreated || null,
                        localServerPacketDatetime: data.state.localServerPacketDatetime || null,
                        dateCreated: data.state.dateCreated || null
                    }
                });

            }
        } catch (err) {
            console.error('Ошибка обработки структурированных данных:', err);
        }
    };

    // Функция для конвертации hex в десятичное число
    const hexToDecimal = (hexValue) => {
        try {
            return parseInt(hexValue, 16).toString();
        } catch (err) {
            return hexValue; // Возвращаем исходное значение, если не удалось конвертировать
        }
    };

    // Функция для получения читаемого названия параметра
    const getParameterDisplayName = (key) => {
        switch (key) {
            // Основные параметры
            case 'Voltage': return 'Напряжение (В)';
            case 'Current': return 'Ток (А)';
            case 'WeldingCurrent': return 'Ток сварки (А)';
            case 'WeldingVoltage': return 'Напряжение сварки (В)';
            case 'GasFlow': return 'Расход газа (л/мин)';
            case 'WeldingMachineState': return 'Состояние аппарата';
            case 'JobNumber': return 'Номер работы';
            case 'Inductance': return 'Индуктивность';
            case 'WireIndex': return 'Индекс проволоки';
            case 'Flags': return 'Флаги';

            // Ошибки
            case 'Errors1': return 'Ошибка 1';
            case 'Errors2': return 'Ошибка 2';
            case 'Errors3': return 'Ошибка 3';

            // Напряжения фаз
            case 'VoltagePhaseA': return 'Напряжение фазы A (В)';
            case 'VoltagePhaseB': return 'Напряжение фазы B (В)';
            case 'VoltagePhaseC': return 'Напряжение фазы C (В)';

            // Температуры
            case 'ChillerTemperature1': return 'Температура чиллера 1 (°C)';
            case 'ChillerTemperature2': return 'Температура чиллера 2 (°C)';
            case 'PrimaryCoilTemperature': return 'Температура первичной обмотки (°C)';
            case 'SecondaryCoilTemperature': return 'Температура вторичной обмотки (°C)';

            // Старые параметры (для совместимости)
            case 'State.I': return 'Ток (А)';
            case 'State.U': return 'Напряжение (В)';
            case 'State.Ctrl': return 'Управление';
            case 'State.material': return 'Материал';
            case 'State.Temperature': return 'Температура';
            case 'State.GasFlow': return 'Расход газа';
            case 'VERSION': return 'Версия';
            case 'MODEL': return 'Модель';

            default: return key;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected': return '#4CAF50';
            case 'disconnected': return '#FF6584';
            case 'error': return '#FF9800';
            default: return '#9E9E9E';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected': return '🟢';
            case 'disconnected': return '🔴';
            case 'error': return '🟡';
            default: return '⚪';
        }
    };

    const getParameterIcon = (key) => {
        const lowerKey = key.toLowerCase();

        // Основные параметры
        if (key === 'Voltage') return '🔋';
        if (key === 'Current') return '⚡';
        if (key === 'WeldingCurrent') return '⚡';
        if (key === 'WeldingVoltage') return '🔋';
        if (key === 'GasFlow') return '💨';
        if (key === 'WeldingMachineState') return '⚙️';
        if (key === 'JobNumber') return '📋';
        if (key === 'Inductance') return '⚙️';
        if (key === 'WireIndex') return '📏';
        if (key === 'Flags') return '🚩';

        // Ошибки
        if (key.startsWith('Errors')) return '⚠️';

        // Напряжения фаз
        if (key.startsWith('VoltagePhase')) return '🔌';

        // Температуры
        if (lowerKey.includes('temp') || lowerKey.includes('temperature')) return '🌡️';
        if (key === 'ChillerTemperature1' || key === 'ChillerTemperature2') return '❄️';
        if (key === 'PrimaryCoilTemperature' || key === 'SecondaryCoilTemperature') return '🔥';

        // Старые параметры (для совместимости)
        if (key === 'State.I') return '⚡';
        if (key === 'State.U') return '🔋';
        if (key === 'State.Ctrl') return '🎛️';
        if (key === 'State.material') return '🔧';
        if (key === 'State.Temperature') return '🌡️';
        if (key === 'State.GasFlow') return '💨';
        if (key === 'VERSION') return '📱';
        if (key === 'MODEL') return '🏷️';

        // Общие категории
        if (lowerKey.includes('speed')) return '⚡';
        if (lowerKey.includes('power')) return '🔌';
        if (lowerKey.includes('memory')) return '💾';
        if (lowerKey.includes('status')) return '⚙️';

        return '⚙️';
    };

    const handleReconnect = () => {
        stopPolling();
        startPolling();
    };

    const clearHistory = () => {
        setMessageHistory([]);
    };

    const handleBackToEquipment = () => {
        navigate('/equipment');
    };

    const handleDeleteMachine = async () => {
        if (!machineId) {
            alert('Не удалось определить ID аппарата для удаления');
            return;
        }

        const confirmMessage = `Вы уверены, что хотите удалить аппарат "${equipmentName}"?\n\nЭто действие нельзя отменить.`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            await deleteWeldingMachine(machineId);
            // Перенаправляем на страницу оборудования после успешного удаления
            navigate('/equipment');
        } catch (err) {
            console.error('Ошибка удаления аппарата:', err);
            alert('Ошибка удаления аппарата: ' + (err.message || 'Неизвестная ошибка'));
        }
    };

    // Обработчик редактирования названия аппарата
    const handleEditName = async (e) => {
        // Предотвращаем срабатывание onBlur при клике на кнопку
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (isEditingName) {
            // Сохраняем новое название
            await handleSaveName();
        } else {
            // Очищаем таймаут если есть
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            // Включаем режим редактирования
            setEditedName(displayName);
            setIsEditingName(true);
        }
    };

    // Сохранение нового названия
    const handleSaveName = async (skipValidation = false) => {
        // Очищаем предыдущий таймаут если есть
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        if (isSavingName) {
            return; // Уже идет сохранение
        }

        if (!machineId) {
            alert('Не удалось определить ID аппарата для обновления');
            setIsEditingName(false);
            return;
        }

        const trimmedName = editedName.trim();
        if (!trimmedName) {
            alert('Название не может быть пустым');
            setEditedName(displayName);
            setIsEditingName(false);
            return;
        }

        if (trimmedName === displayName) {
            // Название не изменилось, просто выходим из режима редактирования
            setIsEditingName(false);
            return;
        }

        setIsSavingName(true);
        try {
            // Получаем текущие данные аппарата по ID
            const machine = await getWeldingMachineById(machineId);

            if (!machine || !machine.id) {
                throw new Error('Аппарат не найден');
            }

            // Подготавливаем данные для обновления
            const updateData = {
                ...machine,
                name: trimmedName
            };

            // Обновляем только название
            await updateWeldingMachine(machineId, updateData);

            // Обновляем локальное состояние сразу
            setDisplayName(trimmedName);

            // Обновляем URL с новым названием
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set('name', trimmedName);
            navigate(`?${newSearchParams.toString()}`, { replace: true });

            setIsEditingName(false);
        } catch (err) {
            console.error('❌ Ошибка обновления названия аппарата:', err);
            console.error('❌ Детали ошибки:', {
                message: err.message,
                stack: err.stack,
                name: err.name
            });

            let errorMessage = 'Неизвестная ошибка';
            if (err.message) {
                errorMessage = err.message;
            } else if (err instanceof TypeError && err.message.includes('fetch')) {
                errorMessage = 'Ошибка подключения к серверу. Проверьте подключение к интернету.';
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }

            alert('Ошибка обновления названия: ' + errorMessage);
            setEditedName(displayName);
            setIsEditingName(false);
        } finally {
            setIsSavingName(false);
        }
    };

    // Обработчик нажатия Enter для сохранения
    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            setEditedName(displayName);
            setIsEditingName(false);
        }
    };

    // Обновляем editedName и displayName при изменении equipmentName
    useEffect(() => {
        setDisplayName(equipmentName);
        if (!isEditingName) {
            setEditedName(equipmentName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipmentName]);

    // Загрузка подразделений при открытии модалки редактирования
    useEffect(() => {
        if (editModalOpen && organizationUnits.length === 0) {
            getAllOrganizationUnits()
                .then((data) => setOrganizationUnits(Array.isArray(data) ? data : []))
                .catch(() => setOrganizationUnits([]));
        }
    }, [editModalOpen, organizationUnits.length]);

    // Открыть модалку редактирования (наименование и подразделение)
    const handleOpenEditModal = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        setEditModalOpen(true);

        let id = machineId;
        if (!id && machineMac && machineMac !== 'Неизвестный MAC') {
            try {
                const machines = await getAllWeldingMachines();
                const macNorm = String(machineMac).trim().toLowerCase();
                const found = Array.isArray(machines)
                    ? machines.find((m) => String(m.mac || '').trim().toLowerCase() === macNorm)
                    : null;
                if (found?.id) {
                    id = found.id;
                    setMachineId(found.id);
                    const uid = found.organizationUnit?.id ?? found.organizationUnitId ?? null;
                    if (uid != null) setMachineOrganizationUnitId(uid);
                }
            } catch {
                /* ignore */
            }
        }
        if (id) {
            try {
                const m = await getWeldingMachineById(id);
                const uid = m?.organizationUnit?.id ?? m?.organizationUnitId ?? null;
                if (uid != null) setMachineOrganizationUnitId(uid);
            } catch {
                /* ignore */
            }
        }
    };

    const resolveMachineIdForEdit = async (payloadMachineId) => {
        let id = payloadMachineId ?? machineId;
        if (id) return id;
        if (!machineMac || machineMac === 'Неизвестный MAC') return null;
        const machines = await getAllWeldingMachines().catch(() => []);
        const macNorm = String(machineMac).trim().toLowerCase();
        const machineByMac = Array.isArray(machines)
            ? machines.find((m) => String(m.mac || '').trim().toLowerCase() === macNorm)
            : null;
        if (machineByMac?.id) {
            setMachineId(machineByMac.id);
            setMachineOrganizationUnitId(
                machineByMac.organizationUnit?.id ?? machineByMac.organizationUnitId ?? null
            );
            return machineByMac.id;
        }
        return null;
    };

    const resolveOrganizationUnitForApi = async (payload) => {
        const unitsSource = organizationUnits.length > 0
            ? organizationUnits
            : (await getAllOrganizationUnits().catch(() => []));
        const { organizationUnitId, department } = payload || {};
        if (organizationUnitId != null && organizationUnitId !== '') {
            const byId = unitsSource.find((u) => String(u.id) === String(organizationUnitId));
            if (byId) return { id: byId.id, name: byId.name || '' };
        }
        const deptTrim = (department || '').trim();
        if (deptTrim) {
            const byName = unitsSource.find(
                (u) => (u.name || '').trim().toLowerCase() === deptTrim.toLowerCase()
            );
            if (byName) return { id: byName.id, name: byName.name || '' };
        }
        return null;
    };

    // Сохранение из модалки: обновить наименование и подразделение аппарата
    const handleSaveEquipmentEdit = async (payload) => {
        const id = await resolveMachineIdForEdit(payload?.machineId);
        if (!id) {
            const err = new Error('Не удалось определить аппарат для сохранения.');
            err.errors = { api: err.message };
            throw err;
        }
        const trimmedName = (payload?.name || '').trim();
        if (!trimmedName) {
            const err = new Error('Название не может быть пустым.');
            err.errors = { name: err.message };
            throw err;
        }
        const organizationUnitForApi = await resolveOrganizationUnitForApi(payload);
        if (!organizationUnitForApi) {
            const err = new Error('Выберите подразделение из списка.');
            err.errors = { department: err.message };
            throw err;
        }
        try {
            const machine = await getWeldingMachineById(id);
            if (!machine?.id) {
                throw new Error('Аппарат не найден');
            }
            const updateData = {
                id: machine.id,
                name: trimmedName,
                mac: machine.mac,
                deviceModel: machine.deviceModel,
                serialNumber: machine.serialNumber ?? null,
                inventoryNumber: machine.inventoryNumber ?? null,
                commissionDate: machine.commissionDate ?? null,
                manufactureYear: machine.manufactureYear ?? null,
                lastService: machine.lastService ?? null,
                weldingMachineType: machine.weldingMachineType ?? null,
                status: machine.status ?? null,
                organizationUnit: organizationUnitForApi,
            };
            await updateWeldingMachine(id, updateData);
            setDisplayName(trimmedName);
            setMachineOrganizationUnitId(organizationUnitForApi.id);
            const newParams = new URLSearchParams(searchParams);
            newParams.set('name', trimmedName);
            newParams.set('organizationUnit', organizationUnitForApi.name || '');
            navigate(`?${newParams.toString()}`, { replace: true });
            setEditModalOpen(false);
        } catch (err) {
            console.error('Ошибка сохранения аппарата:', err);
            throw err;
        }
    };

    const toggleTelemetryList = () => {
        setIsTelemetryListExpanded(prev => !prev);
    };

    // Создание градиента для заполнения графика
    const createGradient = (ctx, chartArea, color1, color2) => {
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
    };

    const leftYTicksFull = useMemo(
        () => buildAxisTicks(Y_AXIS_LEFT.AXIS_MIN, Y_AXIS_LEFT.MAX, Y_AXIS_LEFT.STEP),
        []
    );
    const rightYTicksFull = useMemo(
        () => buildAxisTicks(Y_AXIS_RIGHT.MIN, Y_AXIS_RIGHT.MAX, Y_AXIS_RIGHT.STEP),
        []
    );

    /** Ось X: zoom 1 — весь диапазон времени; >1 — окно у правого края (последние точки крупнее). */
    const getTelemetryXViewport = (bounds, zoomLevel) => {
        const fallbackMax = Date.now();
        const minBound = Number.isFinite(bounds?.minX) ? bounds.minX : (fallbackMax - 60_000);
        const maxBound = Number.isFinite(bounds?.maxX) ? bounds.maxX : fallbackMax;
        const safeMax = Math.max(maxBound, minBound + 1);
        const z = Math.max(1, Math.min(zoomLevel ?? 1, 100));
        const fullRange = Math.max(safeMax - minBound, 1);
        const span = fullRange / z;
        const xMin = Math.max(minBound, safeMax - span);
        const xMax = safeMax;
        const range = Math.max(xMax - xMin, 1e-9);
        return { xMin, xMax, range };
    };

    // Реалтайм-графики телеметрии (верх и низ): две оси Y, ось X с реальным временем; zoom только по X
    const getTelemetryLineChartOptions = (timeBounds, zoomLevel) => {
        const { xMin, xMax, range } = getTelemetryXViewport(timeBounds, zoomLevel);
        const xStep = range <= 1 ? 1 : range / 8;
        const showSeconds = range < 10 * 60 * 1000;
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        title: () => '',
                        beforeBody: () => '',
                        afterBody: () => '',
                        footer: () => '',
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: xMin,
                    max: xMax,
                    display: true,
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.15)',
                        lineWidth: 1,
                        borderDash: [4, 4]
                    },
                    ticks: {
                        stepSize: xStep,
                        maxTicksLimit: 9,
                        color: 'rgba(255, 255, 255, 0.6)',
                        font: { size: 10 },
                        padding: 6,
                        callback: function(val) {
                            return new Date(val).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: showSeconds ? '2-digit' : undefined
                            });
                        }
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        if (range <= 1e-9) return;
                        const step = range / 8;
                        axis.ticks = Array.from({ length: 9 }, (_, i) => ({ value: xMin + i * step }));
                    }
                },
                y: {
                    min: Y_AXIS_LEFT.AXIS_MIN,
                    max: Y_AXIS_LEFT.MAX,
                    position: 'left',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.15)',
                        lineWidth: 1,
                        borderDash: [4, 4],
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { size: 11 },
                        padding: 8,
                        callback: (v) => (leftYTicksFull.includes(v) ? v : '')
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        axis.ticks = leftYTicksFull.map((v) => ({ value: v }));
                    }
                },
                yRight: {
                    min: Y_AXIS_RIGHT.MIN,
                    max: Y_AXIS_RIGHT.MAX,
                    position: 'right',
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { size: 11 },
                        padding: 8,
                        callback: (v) => (rightYTicksFull.includes(v) ? v : '')
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        axis.ticks = rightYTicksFull.map((v) => ({ value: v }));
                    }
                }
            },
            animation: { duration: 0 },
            elements: {
                point: { radius: 0, hoverRadius: 4 },
                line: { tension: 0, borderWidth: 1.5 }
            },
            interaction: { intersect: false, mode: 'index' },
            layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } }
        };
    };

    const resolveChannelYAxisId = (channelKey) => (
        RIGHT_Y_AXIS_CHANNEL_KEYS.has(channelKey) ? 'yRight' : 'y'
    );

    const buildTelemetryDataset = (slotName, slotKey) => {
        if (!slotKey) return null;
        const channel = TELEMETRY_CHANNELS_CONFIG.find(item => item.key === slotKey);
        if (!channel) return null;
        const sourceSeriesKey = slotKey;
        const series = telemetrySeries[sourceSeriesKey] || [];
        return {
            label: channel.label,
            data: series.map((d, i) => ({
                x: typeof d.x === 'number' ? d.x : i,
                y: Number(d.y) || 0
            })),
            borderColor: channel.color,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            fill: false,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: channel.color,
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 2,
            tension: 0,
            yAxisID: resolveChannelYAxisId(slotKey)
        };
    };

    const getCurrentChartData = () => {
        const dataset = buildTelemetryDataset('slot1', telemetrySelection.slot1);
        return { datasets: dataset ? [dataset] : [] };
    };

    const getVoltageChartData = () => {
        const dataset = buildTelemetryDataset('slot2', telemetrySelection.slot2);
        return { datasets: dataset ? [dataset] : [] };
    };

    // Функции для форматирования данных
    const getCurrentValue = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '0';
        const data = deviceData[machineMac];
        if (!data) return '0';
        return data.Current || data['State.I'] || '0';
    };

    const getVoltageValue = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '0';
        const data = deviceData[machineMac];
        if (!data) return '0';
        return data.Voltage || data['State.U'] || '0';
    };

    const getWeldingTimer = () => {
        const isCurrentlyWelding = isWelding();

        // Если сварка идет и есть время начала - показываем текущее время
        if (isCurrentlyWelding) {
            if (weldingStartTime) {
                const duration = Date.now() - weldingStartTime;
                return formatDuration(duration);
            } else {
                // Сварка идет, но время начала еще не установлено - показываем 00:00:00
                // Это временное состояние, пока useEffect не обновит weldingStartTime
                return '00:00:00';
            }
        } else if (weldingEndTime && lastWeldingDuration > 0) {
            // Сварка только что закончилась - показываем последнее время еще 2 секунды
            const timeSinceEnd = Date.now() - weldingEndTime;
            if (timeSinceEnd < 2000) {
                return formatDuration(lastWeldingDuration);
            }
        }

        // Сварки нет - показываем нули
        return '00:00:00';
    };

    // Функция для форматирования длительности в формат ЧЧ:ММ:СС
    const formatDuration = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Функция для определения цвета состояния аппарата
    const getStateColor = (state) => {
        if (!state) return null;
        const stateLower = String(state).toLowerCase().trim();

        // Режим ожидания - зеленый
        if (stateLower.includes('ожидан') || stateLower.includes('waiting') || stateLower === 'режим ожидания') {
            return '#65d66f'; // Зеленый
        }

        // Аппарат включен - зеленый
        if (stateLower.includes('включен') || stateLower.includes('on') || stateLower === 'аппарат включен') {
            return '#65d66f';
        }

        // Сварка - желтый
        if (stateLower.includes('сварка') || stateLower.includes('welding') || stateLower.includes('weld')) {
            return '#f6cd4a'; // Желтый
        }

        // Авария - красный
        if (stateLower.includes('авария') || stateLower.includes('error') || stateLower.includes('ошибка') ||
            stateLower.includes('emergency') || stateLower.includes('failure')) {
            return '#f06c7b';
        }

        // Дежурный режим - серый
        if (stateLower.includes('дежурн') || stateLower.includes('standby') || stateLower === 'дежурный режим') {
            return 'rgba(188, 183, 197, 0.5)'; // Серый
        }

        // Аппарат заблокирован - серый
        if (stateLower.includes('заблокирован') || stateLower.includes('blocked') || stateLower.includes('lock') ||
            stateLower.includes('блокиров')) {
            return 'rgba(188, 183, 197, 0.5)'; // Серый
        }

        // По умолчанию - обычный цвет
        return null;
    };

    const getSystemParameters = () => {
        const isDeviceOff = Object.keys(deviceData).length === 0 || !hasData;
        const data = isDeviceOff ? null : deviceData[machineMac];

        const params = [];

        // 1. Состояние аппарата
        const weldingMachineState = data ? (data['Состояние аппарата'] || data['WeldingMachineState'] || data.weldingMachineState) : null;
        if (weldingMachineState || isDeviceOff) {
            const stateColor = weldingMachineState ? getStateColor(weldingMachineState) : null;
            params.push({
                label: 'Состояние аппарата',
                value: isDeviceOff ? 'Не в сети' : weldingMachineState,
                stateColor: stateColor // Добавляем цвет для состояния
            });
        }

        // 2. Режим горелки (вместо Сварочного задания)
        const burnerMode = data ? (data['Режим горелки'] || data.burnerMode) : null;
        params.push({
            label: 'Режим горелки',
            value: isDeviceOff ? '—' : (burnerMode !== undefined && burnerMode !== null ? String(burnerMode) : '—')
        });

        // 3. Индуктивность
        const inductance = data ? (data['Inductance'] || data.inductance) : null;
        params.push({
            label: 'Индуктивность',
            value: isDeviceOff ? '—' : (inductance !== undefined && inductance !== null ? String(inductance) : '—')
        });

        // 4. Напряжение фазы A
        const voltagePhaseA = data ? (
            data['Напряжение фазы А'] ||
            data['VoltagePhaseA'] ||
            data.VoltagePhaseA ||
            data.voltagePhaseA ||
            data['voltagePhaseA'] ||
            data['voltage_phase_a'] ||
            data.voltage_phase_a
        ) : null;
        params.push({
            label: 'Напряжение фазы А',
            value: isDeviceOff ? '—' : (voltagePhaseA !== undefined && voltagePhaseA !== null ? `${voltagePhaseA} В` : '—')
        });

        // 5. Напряжение фазы В - проверяем все возможные варианты ключей
        // ВАЖНО: данные приходят с ключом "Напряжение фазы B" (с английской B, не русской В!)
        const voltagePhaseB = data ? (
            data['Напряжение фазы B'] ||  // Приоритет: английская B (как приходит с бэка)
            data['Напряжение фазы В'] ||  // Русская В (для совместимости)
            data['VoltagePhaseB'] ||
            data.VoltagePhaseB ||
            data.voltagePhaseB ||
            data['voltagePhaseB'] ||
            data['voltage_phase_b'] ||
            data.voltage_phase_b ||
            data['Voltage_Phase_B'] ||
            data.Voltage_Phase_B
        ) : null;

        params.push({
            label: 'Напряжение фазы В',
            value: isDeviceOff ? '—' : (voltagePhaseB !== undefined && voltagePhaseB !== null ? `${voltagePhaseB} В` : '—')
        });

        // 6. Напряжение фазы С
        const voltagePhaseC = data ? (
            data['Напряжение фазы С'] ||
            data['VoltagePhaseC'] ||
            data.VoltagePhaseC ||
            data.voltagePhaseC ||
            data['voltagePhaseC'] ||
            data['voltage_phase_c'] ||
            data.voltage_phase_c
        ) : null;
        params.push({
            label: 'Напряжение фазы С',
            value: isDeviceOff ? '—' : (voltagePhaseC !== undefined && voltagePhaseC !== null ? `${voltagePhaseC} В` : '—')
        });

        // 7. Температура охлаждающей жидкости на входе
        const chillerTemperature1 = data ? (data['Температура охлаждающей жидкости на входе'] ||
            data['ChillerTemperature1'] ||
            data.chillerTemperature1) : null;
        params.push({
            label: 'Входящая темп. охл. жидкости',
            value: isDeviceOff ? '—' : (chillerTemperature1 !== undefined && chillerTemperature1 !== null ? `${chillerTemperature1} °C` : '—')
        });

        // 8. Температура охлаждающей жидкости на выходе
        const chillerTemperature2 = data ? (data['Температура охлаждающей жидкости на выходе'] ||
            data['ChillerTemperature2'] ||
            data.chillerTemperature2) : null;
        params.push({
            label: 'Исходящая темп. охл. жидкости',
            value: isDeviceOff ? '—' : (chillerTemperature2 !== undefined && chillerTemperature2 !== null ? `${chillerTemperature2} °C` : '—')
        });

        // 9. Температура первичной обмотки
        const primaryCoilTemperature = data ? (data['Температура первичной обмотки'] ||
            data['PrimaryCoilTemperature'] ||
            data.primaryCoilTemperature) : null;
        params.push({
            label: 'Температура первичной обмотки',
            value: isDeviceOff ? '—' : (primaryCoilTemperature !== undefined && primaryCoilTemperature !== null ? `${primaryCoilTemperature} °C` : '—')
        });

        // 10. Температура вторичной обмотки
        const secondaryCoilTemperature = data ? (data['Температура вторичной обмотки'] ||
            data['SecondaryCoilTemperature'] ||
            data.secondaryCoilTemperature) : null;
        params.push({
            label: 'Температура вторичной обмотки',
            value: isDeviceOff ? '—' : (secondaryCoilTemperature !== undefined && secondaryCoilTemperature !== null ? `${secondaryCoilTemperature} °C` : '—')
        });

        // 11. Расход проволоки
        const wireConsumption = data ? (data['Расход проволоки'] ||
            data['WireConsumption'] ||
            data.wireConsumption) : null;
        params.push({
            label: 'Расход проволоки',
            value: isDeviceOff ? '—' : (wireConsumption !== undefined && wireConsumption !== null ? `${wireConsumption} м` : '—')
        });

        return params;
    };

    // Функции для получения значений flag numeric
    const getMemoryCellNumber = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '—';
        const data = deviceData[machineMac];
        if (!data) return '—';
        return data['Номер ячейки памяти'] || data.memoryCellNumber || '—';
    };

    const getJobNumberForFlag = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '—';
        const data = deviceData[machineMac];
        if (!data) return '—';
        const jobNumber = data['Номер сварочного задания'] || data['JobNumber'] || data.jobNumber;
        return jobNumber !== undefined && jobNumber !== null ? String(jobNumber) : '—';
    };

    const getWeldingMaterial = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '—';
        const data = deviceData[machineMac];
        if (!data) return '—';
        return data['Материал проволоки'] || data.weldingMaterial || '—';
    };

    const getWeldingMode = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '—';
        const data = deviceData[machineMac];
        if (!data) return '—';
        return data['Метод сварки'] || data.weldingMode || '—';
    };

    const getBurnerMode = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '—';
        const data = deviceData[machineMac];
        if (!data) return '—';
        return data['Режим горелки'] || data.burnerMode || '—';
    };

    const getWeldingGas = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '—';
        const data = deviceData[machineMac];
        if (!data) return '—';
        return data['Газ'] || data.weldingGas || '—';
    };

    const getWeldingWireDiameter = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '—';
        const data = deviceData[machineMac];
        if (!data) return '—';
        return data['Диаметр проволоки'] || data.weldingWireDiameter || '—';
    };

    const getErrors = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return [];
        const data = deviceData[machineMac];
        if (!data) return [];

        const errors = [];

        // Получаем timestamp из данных с правильной обработкой
        const getTimestamp = () => {
            // Пробуем разные источники timestamp
            let timestamp = null;

            if (data.lastDatetimeUpdate) {
                timestamp = data.lastDatetimeUpdate;
            } else if (data.localServerPacketDatetime) {
                timestamp = data.localServerPacketDatetime;
            } else if (data.dateCreated) {
                timestamp = data.dateCreated;
            } else if (data.timestamp) {
                timestamp = data.timestamp;
            }

            if (timestamp) {
                // Если это строка в формате ISO, парсим её
                if (typeof timestamp === 'string') {
                    const parsed = new Date(timestamp);
                    // Проверяем, что дата валидна
                    if (!isNaN(parsed.getTime())) {
                        return parsed;
                    }
                }
                // Если это уже Date объект
                if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
                    return timestamp;
                }
            }

            // Fallback на текущую дату
            return new Date();
        };

        const errorDate = getTimestamp();
        const timeStr = errorDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const dateStr = errorDate.toLocaleDateString('ru-RU');

        // Ошибки: при наличии числового error_code в корне state — только подписи из EQUIPMENT_ERROR_MESSAGES
        // (как EquipmentErrorMessages на бэке), без текста свойства «Ошибки» из другого словаря парсера — иначе
        // формулировки расходятся (напр. код 18). Если кодов нет — fallback на текст «Ошибки».
        const errorCodeRaw = data['errorCode'] || data.errorCode;
        const errorsProperty = data['Ошибки'] || data['Errors'] || data.errors;
        const hasErrorsText = errorsProperty &&
            errorsProperty !== 'Нет ошибок' &&
            errorsProperty !== 'No errors' &&
            String(errorsProperty).trim() !== '' &&
            String(errorsProperty).toLowerCase() !== 'null';

        const codesFromRoot = parseEquipmentErrorCodes(errorCodeRaw);

        if (codesFromRoot.length > 0) {
            codesFromRoot.forEach((num) => {
                const message = getEquipmentErrorName(String(num));
                if (message) {
                    errors.push({
                        code: `ERR ${num}`,
                        time: timeStr,
                        date: dateStr,
                        severity: 'error',
                        message,
                    });
                }
            });
        } else if (hasErrorsText) {
            const parts = String(errorsProperty).split(/,|;/).map(s => s.trim()).filter(Boolean);
            parts.forEach((message, idx) => {
                errors.push({
                    code: `ERR-${idx}`,
                    time: timeStr,
                    date: dateStr,
                    severity: 'error',
                    message,
                });
            });
        }

        // Предупреждения: добавляем отдельные карточки (если парсер прислал "Предупреждения")
        const warningsProperty = data['Предупреждения'] || data['Warnings'] || data.warnings;
        const hasWarningsText = warningsProperty &&
            warningsProperty !== 'Нет предупреждений' &&
            warningsProperty !== 'No warnings' &&
            String(warningsProperty).trim() !== '' &&
            String(warningsProperty).toLowerCase() !== 'null';

        if (hasWarningsText) {
            const parts = String(warningsProperty).split(/,|;/).map(s => s.trim()).filter(Boolean);
            parts.forEach((message) => {
                errors.push({ code: 'WRN', time: timeStr, date: dateStr, severity: 'warning', message });
            });
        }

        return errors;
    };

    const getRfidCode = () => extractRfidFromDeviceData(deviceData, machineMac, hasData);

    const getInputPower = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return '0 кВт';
        const data = deviceData[machineMac];
        if (!data) return '0 кВт';
        // Можно рассчитать из напряжения и тока или взять из данных
        return '5,6 кВт';
    };

    // Функция для определения, идет ли сварка
    const isWelding = () => {
        if (Object.keys(deviceData).length === 0 || !hasData) return false;
        const data = deviceData[machineMac];
        if (!data) return false;

        // 1. ПРИОРИТЕТ: Проверяем состояние аппарата из properties (это основное поле для определения сварки!)
        // status из корня может быть "Offline" даже когда идет сварка, поэтому проверяем WeldingMachineState первым
        const weldingMachineState = data['Состояние аппарата'] ||
            data['WeldingMachineState'] ||
            data.weldingMachineState ||
            data['State.WeldingMachineState'] ||
            data.properties?.['WeldingMachineState'] ||
            data.properties?.['Состояние аппарата'];
        if (weldingMachineState) {
            const stateLower = String(weldingMachineState).toLowerCase().trim();
            // Проверяем, содержит ли состояние информацию о сварке
            // ВАЖНО: только явное указание "Сварка" или "Welding", не "Аппарат включен"
            if (stateLower === 'сварка' || stateLower === 'welding' ||
                stateLower.includes('сварка') || stateLower.includes('welding') ||
                stateLower.includes('сварочн') || stateLower.includes('weld')) {
                return true;
            }
            // Если явно указано, что сварки нет (включен, ожидание, выключен и т.д.)
            if (stateLower.includes('ожидан') || stateLower.includes('waiting') ||
                stateLower.includes('выключ') || stateLower.includes('off') ||
                stateLower.includes('включен') || stateLower.includes('on') ||
                stateLower === 'выкл' || stateLower === 'off' ||
                stateLower === 'аппарат включен') {
                return false;
            }
        }

        // 2. Проверяем status из корня объекта (вторичная проверка)
        // ВАЖНО: status из корня может быть "Offline" даже при сварке, поэтому это вторичная проверка
        const status = data.status || data.Status;
        if (status) {
            const statusLower = String(status).toLowerCase().trim();
            // Проверяем различные варианты статуса "Сварка"
            if (statusLower === 'welding' || statusLower === 'сварка' ||
                statusLower === 'weld' ||
                statusLower.includes('сварка') ||
                statusLower.includes('welding')) {
                return true;
            }
        }

        // 3. Проверяем ток сварки ТОЛЬКО если WeldingMachineState не определен или неоднозначен
        // НЕ используем ток как основной индикатор, так как аппарат может быть включен без сварки
        const current = parseFloat(data.Current || data['State.I'] || 0);
        if (current > 1 && !weldingMachineState) {
            // Только если WeldingMachineState не определен, используем ток как индикатор
            return true;
        }

        return false;
    };

    const handleTelemetryTileClick = (channelKey) => {
        if (channelKey === 'mainsVoltage') return;
        setTelemetrySelection((prev) => {
            if (prev.slot1 === channelKey) {
                return { slot1: prev.slot2 || null, slot2: null };
            }
            if (prev.slot2 === channelKey) {
                return { ...prev, slot2: null };
            }
            if (!prev.slot1) return { ...prev, slot1: channelKey };
            if (!prev.slot2) return { ...prev, slot2: channelKey };
            return prev;
        });
    };

    const handleMainsVoltagePhaseToggle = (phase) => {
        setMainsVoltagePhases((prev) => {
            if (prev.includes(phase)) return prev.filter((p) => p !== phase);
            if (prev.length >= 3) return prev;
            return [...prev, phase];
        });
    };

    const handleMainsPhaseChange = (slotName, phase) => {
        setTelemetryPhaseSelection((prev) => ({ ...prev, [slotName]: phase }));
    };

    const graphTelemetrySlotsFull =
        [telemetrySelection.slot1, telemetrySelection.slot2].filter(Boolean).length >= TELEMETRY_GRAPH_SLOT_COUNT;

    const telemetryChannels = TELEMETRY_CHANNELS_CONFIG.map((channel) => {
        const onGraph =
            channel.key === 'mainsVoltage'
                ? mainsVoltagePhases.length > 0
                : telemetrySelection.slot1 === channel.key || telemetrySelection.slot2 === channel.key;
        const graphPickBlocked =
            channel.key !== 'mainsVoltage' && graphTelemetrySlotsFull && !onGraph;
        return {
            ...channel,
            active: onGraph,
            tile1: telemetrySelection.slot1 === channel.key,
            tile2: telemetrySelection.slot2 === channel.key,
            graphPickBlocked,
        };
    });

    const incidentLog = getErrors();
    const isWeldingActive = isWelding();

    useEffect(() => {
        idleControlMetricsRef.current = { current: '0', voltage: '0' };
    }, [machineMac]);

    useEffect(() => {
        if (Object.keys(deviceData).length === 0 || !hasData) return;
        if (!deviceData[machineMac]) return;
        if (!isWelding()) {
            idleControlMetricsRef.current = {
                current: getCurrentValue(),
                voltage: getVoltageValue(),
            };
        }
    }, [deviceData, machineMac, hasData]);

    const controlFactCurrent = isWeldingActive ? getCurrentValue() : '0';
    const controlFactVoltage = isWeldingActive ? getVoltageValue() : '0';
    const controlSetCurrent = isWeldingActive ? idleControlMetricsRef.current.current : getCurrentValue();
    const controlSetVoltage = isWeldingActive ? idleControlMetricsRef.current.voltage : getVoltageValue();
    const parseProgress = (rawStr, max) => {
        const raw = String(rawStr).replace(',', '.');
        const n = parseFloat(raw);
        if (Number.isNaN(n)) return 0;
        return Math.min((n / max) * 100, 100);
    };
    const currentProgress = parseProgress(controlFactCurrent, 500);
    const voltageProgress = parseProgress(controlFactVoltage, 50);

    const rfidCode = getRfidCode();
    const hasRfidCode = rfidCode !== null;
    const currentStatusData = deviceData[machineMac] || {};
    const machineStateValue = (!hasData || !currentStatusData)
        ? 'Не в сети'
        : (currentStatusData['Состояние аппарата'] || currentStatusData['WeldingMachineState'] || currentStatusData.weldingMachineState || 'Не в сети');
    const machineStateDisplayValue = machineStateValue === 'Авария' ? 'Ошибка' : machineStateValue;
    const machineStateColor = getStateColor(machineStateValue) || 'rgba(242, 241, 244, 0.9)';
    const statusPhaseA = parseNumberOrNull(
        currentStatusData['Напряжение фазы А'] ??
        currentStatusData['VoltagePhaseA'] ??
        currentStatusData['voltagePhaseA']
    ) ?? 0;
    const statusPhaseB = parseNumberOrNull(
        currentStatusData['Напряжение фазы B'] ??
        currentStatusData['Напряжение фазы В'] ??
        currentStatusData['VoltagePhaseB'] ??
        currentStatusData['voltagePhaseB']
    ) ?? 0;
    const statusPhaseC = parseNumberOrNull(
        currentStatusData['Напряжение фазы С'] ??
        currentStatusData['VoltagePhaseC'] ??
        currentStatusData['voltagePhaseC']
    ) ?? 0;
    const statusChillerIn = parseNumberOrNull(
        currentStatusData['Температура охлаждающей жидкости на входе'] ??
        currentStatusData['ChillerTemperature1'] ??
        currentStatusData['chillerTemperature1']
    ) ?? 0;
    const statusChillerOut = parseNumberOrNull(
        currentStatusData['Температура охлаждающей жидкости на выходе'] ??
        currentStatusData['ChillerTemperature2'] ??
        currentStatusData['chillerTemperature2']
    ) ?? 0;
    const statusPrimaryCoilTemp = parseNumberOrNull(
        currentStatusData['Температура первичной обмотки'] ??
        currentStatusData['PrimaryCoilTemperature'] ??
        currentStatusData['primaryCoilTemperature']
    ) ?? 0;
    const statusSecondaryCoilTemp = parseNumberOrNull(
        currentStatusData['Температура вторичной обмотки'] ??
        currentStatusData['SecondaryCoilTemperature'] ??
        currentStatusData['secondaryCoilTemperature']
    ) ?? 0;

    const wrappedForCoreUptime = { properties: currentStatusData };
    const coreWorkTimeSincePowerOn = getStateNumberByKeys(wrappedForCoreUptime, [
        'Core.WorkTimeSincePowerOn',
        'Время работы с включения',
    ]);
    const coreWeldingTimeSincePowerOn = getStateNumberByKeys(wrappedForCoreUptime, [
        'Core.WeldingTimeSincePowerOn',
        'Время сварки с включения',
    ]);
    const statusOnActiveClock =
        coreWorkTimeSincePowerOn != null
            ? formatMsToClock(coreWorkTimeSincePowerOn * CORE_PACKET_UPTIME_RAW_TO_MS)
            : formatMsToClock(dailyActivity.onMs);
    const statusWeldingClock =
        coreWeldingTimeSincePowerOn != null
            ? formatMsToClock(coreWeldingTimeSincePowerOn * CORE_PACKET_UPTIME_RAW_TO_MS)
            : formatMsToClock(dailyActivity.weldingMs);

    // Форматирование даты
    const formatDate = () => {
        if (lastUpdate) {
            return lastUpdate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handleNavigateCreateWelderFromRfid = () => {
        navigate('/welders/add', {
            state: {
                prefilledRfidCode: rfidCode,
                prefilledMachineId: machineId,
            },
        });
    };

    const timelineXs = useMemo(() => {
        const xs = [];
        const display = graphUsesServerData ? historySeriesSnapshot : telemetrySeries;
        const selectedKeys = [telemetrySelection.slot1, telemetrySelection.slot2].filter(Boolean);

        const pushSeriesKey = (sourceKey) => {
            if (!sourceKey) return;
            (display[sourceKey] || []).forEach((p) => {
                if (typeof p.x === 'number' && Number.isFinite(p.x)) xs.push(p.x);
            });
        };

        mainsVoltagePhases.forEach((phase) => pushSeriesKey(resolveMainsPhaseSeriesKey(phase)));
        [telemetrySelection.slot1, telemetrySelection.slot2].forEach((channelKey) => {
            if (!channelKey || channelKey === 'mainsVoltage' || TELEMETRY_NO_DRAW_KEYS.has(channelKey)) return;
            pushSeriesKey(channelKey);
        });

        // fallback для пустого выбора/пустых рядов
        if (xs.length === 0 && selectedKeys.length) {
            (display.weldingCurrent || []).forEach((p) => {
                if (typeof p.x === 'number' && Number.isFinite(p.x)) xs.push(p.x);
            });
            (display.weldingVoltage || []).forEach((p) => {
                if (typeof p.x === 'number' && Number.isFinite(p.x)) xs.push(p.x);
            });
        }

        return xs.sort((a, b) => a - b);
    }, [
        telemetrySelection.slot1,
        telemetrySelection.slot2,
        mainsVoltagePhases,
        telemetrySeries,
        historySeriesSnapshot,
        graphUsesServerData
    ]);

    const chartBounds = useMemo(() => {
        const fallbackEnd = Date.now();
        const fallbackStart = fallbackEnd - LIVE_WINDOW_MS;
        const dataMax = timelineXs.length ? timelineXs[timelineXs.length - 1] : fallbackEnd;

        if (graphUsesServerData && Number.isFinite(historyDayBounds.start) && Number.isFinite(historyDayBounds.end)) {
            const start = historyDayBounds.start;
            const end = Math.max(historyDayBounds.end, start + 1);
            return { dayStart: start, dayEnd: end, dataMax: end };
        }

        const start = Number.isFinite(timeWindow.start) ? timeWindow.start : fallbackStart;
        const end = Number.isFinite(timeWindow.end) ? timeWindow.end : fallbackEnd;
        return { dayStart: start, dayEnd: Math.max(end, start + 1), dataMax };
    }, [timelineXs, timeWindow.start, timeWindow.end, LIVE_WINDOW_MS, graphUsesServerData, historyDayBounds.start, historyDayBounds.end]);

    useEffect(() => {
        if (timeWindow.touched) return;
        const end = Math.min(chartBounds.dataMax, chartBounds.dayEnd);
        const start = Math.max(chartBounds.dayStart, end - LIVE_WINDOW_MS);
        setTimeWindow({ start, end, touched: false });
    }, [chartBounds, timeWindow.touched, LIVE_WINDOW_MS]);

    const activeWindow = useMemo(() => {
        const minGap = 60 * 1000;
        const fallbackEnd = Math.min(chartBounds.dataMax, chartBounds.dayEnd);
        const fallbackSpan = graphUsesServerData ? Math.max(chartBounds.dayEnd - chartBounds.dayStart, minGap) : LIVE_WINDOW_MS;
        const fallbackStart = Math.max(chartBounds.dayStart, fallbackEnd - fallbackSpan);
        let start = Number.isFinite(timeWindow.start) ? timeWindow.start : fallbackStart;
        let end = Number.isFinite(timeWindow.end) ? timeWindow.end : fallbackEnd;
        start = Math.max(chartBounds.dayStart, Math.min(start, chartBounds.dayEnd - minGap));
        end = Math.min(chartBounds.dayEnd, Math.max(end, chartBounds.dayStart + minGap));
        if (end - start < minGap) end = Math.min(chartBounds.dayEnd, start + minGap);
        return { start, end, minGap };
    }, [chartBounds, timeWindow.start, timeWindow.end, graphUsesServerData, LIVE_WINDOW_MS]);

    const rulerPinBounds = useMemo(() => {
        if (graphUsesServerData && draggingPin && pinDragPreview && Number.isFinite(pinDragPreview.start) && Number.isFinite(pinDragPreview.end)) {
            return { start: pinDragPreview.start, end: pinDragPreview.end };
        }
        return { start: activeWindow.start, end: activeWindow.end };
    }, [graphUsesServerData, draggingPin, pinDragPreview, activeWindow.start, activeWindow.end]);

    const formatHistoryPinHintTime = useCallback((ts) => {
        if (!Number.isFinite(ts)) return '';
        const step = 5 * 60 * 1000;
        const snapped = Math.round(ts / step) * step;
        return new Date(snapped).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }, []);

    const telemetryOverlayChartOptions = useMemo(() => {
        const windowStart = activeWindow.start;
        const windowEnd = activeWindow.end;
        const range = Math.max(windowEnd - windowStart, 1);
        const xStep = range / 8;
        const yMax = clampLeftYMax(yAxisLeftMax);
        const yMaxRight = clampRightYMax(yAxisRightMax);
        const leftTicks = buildAxisTicks(Y_AXIS_LEFT.AXIS_MIN, yMax, Y_AXIS_LEFT.STEP);
        const rightTicks = buildAxisTicks(Y_AXIS_RIGHT.MIN, yMaxRight, Y_AXIS_RIGHT.STEP);
        return {
            responsive: true,
            maintainAspectRatio: false,
            /** Уже отдаём {x,y} и сортировку по времени — меньше работы парсеру и масштабу. */
            parsing: false,
            normalized: graphUsesServerData,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        title: () => '',
                        beforeBody: () => '',
                        afterBody: () => '',
                        footer: () => '',
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: windowStart,
                    max: windowEnd,
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.15)',
                        lineWidth: 1,
                        borderDash: [4, 4]
                    },
                    ticks: {
                        stepSize: xStep,
                        maxTicksLimit: 9,
                        color: 'rgba(255, 255, 255, 0.6)',
                        font: { size: 10 },
                        padding: 6,
                        callback(val) {
                            return new Date(val).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        }
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        const step = range / 8;
                        axis.ticks = Array.from({ length: 9 }, (_, i) => ({ value: windowStart + i * step }));
                    }
                },
                y: {
                    min: Y_AXIS_LEFT.AXIS_MIN,
                    max: yMax,
                    position: 'left',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.15)',
                        lineWidth: 1,
                        borderDash: [4, 4],
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { size: 11 },
                        padding: 8,
                        callback: (v) => (leftTicks.includes(v) ? v : '')
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        axis.ticks = leftTicks.map((v) => ({ value: v }));
                    }
                },
                yRight: {
                    min: Y_AXIS_RIGHT.MIN,
                    max: yMaxRight,
                    position: 'right',
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { size: 11 },
                        padding: 8,
                        callback: (v) => (rightTicks.includes(v) ? v : '')
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        axis.ticks = rightTicks.map((v) => ({ value: v }));
                    }
                }
            },
            animation: { duration: 0 },
            elements: { point: { radius: 0, hoverRadius: 0, hitRadius: 0 }, line: { tension: 0, borderWidth: graphUsesServerData ? 1.5 : 2 } },
            /** Без mousemove — Chart.js не рисует hover-точки по index (их путают с курсором). */
            events: ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'],
            layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } }
        };
    }, [activeWindow.start, activeWindow.end, graphUsesServerData, yAxisLeftMax, yAxisRightMax]);

    const topChartData = useMemo(() => {
        const src = graphUsesServerData ? historySeriesSnapshot : telemetrySeries;
        const mapPt = (d) => {
            const y = d?.y;
            const ny = y === null || y === undefined || Number.isNaN(Number(y)) ? null : Number(y);
            return { x: d.x, y: ny };
        };
        const mainsChannel = TELEMETRY_CHANNELS_CONFIG.find((c) => c.key === 'mainsVoltage');

        const buildMainsDataset = (phase) => {
            if (!mainsChannel) return null;
            const sourceKey = resolveMainsPhaseSeriesKey(phase);
            let raw = src[sourceKey] || [];
            if (graphUsesServerData) raw = decimateSeriesPoints(raw, HISTORY_CHART_MAX_POINTS);
            return {
                label: `${mainsChannel.label} (${phase})`,
                data: raw.map(mapPt),
                borderColor: mainsChannel.color,
                backgroundColor: 'rgba(255,255,255,0.04)',
                fill: false,
                yAxisID: 'y',
            };
        };

        const buildDataset = (channelKey) => {
            if (!channelKey || channelKey === 'mainsVoltage' || TELEMETRY_NO_DRAW_KEYS.has(channelKey)) return null;
            const channel = TELEMETRY_CHANNELS_CONFIG.find((c) => c.key === channelKey);
            if (!channel) return null;
            let raw = src[channelKey] || [];
            const isCurrent = channelKey === 'weldingCurrent';
            const isVoltage = channelKey === 'weldingVoltage';
            if (graphUsesServerData) {
                raw = isCurrent || isVoltage
                    ? decimateWeldingPulseSeries(raw, HISTORY_CHART_MAX_POINTS)
                    : decimateSeriesPoints(raw, HISTORY_CHART_MAX_POINTS);
            }
            const data = raw.map(mapPt);

            return {
                label: channel.label,
                data,
                borderColor: channel.color,
                backgroundColor: graphUsesServerData
                    ? (isCurrent ? 'rgba(62,199,255,0.12)' : (isVoltage ? 'rgba(255,97,200,0.10)' : 'rgba(255,255,255,0.05)'))
                    : (isCurrent || isVoltage)
                        ? (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return isCurrent ? 'rgba(62,199,255,0.2)' : 'rgba(255,97,200,0.2)';
                            return isCurrent
                                ? createGradient(ctx, chartArea, 'rgba(62,199,255,0.55)', 'rgba(62,199,255,0.02)')
                                : createGradient(ctx, chartArea, 'rgba(255,97,200,0.48)', 'rgba(255,97,200,0.02)');
                        }
                        : 'rgba(255,255,255,0.04)',
                fill: isCurrent || isVoltage ? (graphUsesServerData ? 'origin' : true) : false,
                yAxisID: resolveChannelYAxisId(channelKey),
                ...(isCurrent || isVoltage ? { stepped: 'after' } : {}),
            };
        };

        const datasets = [
            ...mainsVoltagePhases.map(buildMainsDataset),
            buildDataset(telemetrySelection.slot1),
            buildDataset(telemetrySelection.slot2),
        ].filter(Boolean);

        return { datasets };
    }, [
        graphUsesServerData,
        historySeriesSnapshot,
        telemetrySeries,
        telemetrySelection.slot1,
        telemetrySelection.slot2,
        mainsVoltagePhases,
        HISTORY_CHART_MAX_POINTS
    ]);

    const timelineInWindow = useMemo(
        () => (graphUsesServerData ? historyTimelineSnapshot : timelineSamples).filter((s) => s.x >= activeWindow.start && s.x <= activeWindow.end),
        [timelineSamples, historyTimelineSnapshot, graphUsesServerData, activeWindow.start, activeWindow.end]
    );

    /** Дорожка «Состояние»: убрать ложные короткие Offline из истории (см. sanitizeBriefOfflineBetweenOnline). */
    const timelineForStateLane = useMemo(
        () => sanitizeBriefOfflineBetweenOnline(timelineInWindow, activeWindow.end, 5000),
        [timelineInWindow, activeWindow.end]
    );

    /**
     * Сегмент дорожки держит состояние до следующей точки опроса (как stepped: 'after' на графике),
     * иначе «сварка» обрывается на предыдущем ts — под ней виден зелёный online и кажется рассинхрон.
     */
    const buildSegments = (samples, predicate, valueGetter, windowEnd) => {
        const segments = [];
        if (!samples.length) return segments;
        let current = null;
        samples.forEach((s) => {
            const v = valueGetter ? valueGetter(s) : null;
            const active = predicate(s);
            if (active) {
                const needNew = !current || (valueGetter && current.value !== v);
                if (needNew) {
                    if (current) {
                        current.end = s.x;
                        segments.push(current);
                    }
                    current = { start: s.x, end: s.x, value: v };
                } else {
                    current.end = s.x;
                }
            } else if (current) {
                current.end = s.x;
                segments.push(current);
                current = null;
            }
        });
        if (current) {
            const endCap = Number.isFinite(windowEnd) ? Math.max(current.end, windowEnd) : current.end;
            current.end = endCap;
            segments.push(current);
        }
        return segments;
    };

    const timelineRows = useMemo(() => {
        const wEnd = activeWindow.end;
        const offline = buildSegments(timelineForStateLane, (s) => !s.isOnline, null, wEnd);
        const online = buildSegments(timelineForStateLane, (s) => Boolean(s.isOnline), null, wEnd);
        const welding = buildSegments(timelineForStateLane, (s) => Boolean(s.isWelding), null, wEnd);
        const errors = buildSegments(
            timelineInWindow,
            (s) => Number.isFinite(Number(s.errorCode)) && Number(s.errorCode) > 0,
            (s) => Number(s.errorCode),
            wEnd
        ).map((seg) => ({ ...seg, label: formatErrorCodeLabel(seg.value) }));
        const welder = buildSegments(
            timelineInWindow,
            (s) => Boolean(s.rfid),
            (s) => String(s.rfid),
            wEnd
        );
        return { offline, online, welding, errors, welder };
    }, [timelineInWindow, timelineForStateLane, activeWindow.end]);

    const toPercent = useCallback((x) => {
        const range = Math.max(activeWindow.end - activeWindow.start, 1);
        return ((x - activeWindow.start) / range) * 100;
    }, [activeWindow.end, activeWindow.start]);
    const toDayPercent = useCallback((x) => {
        const range = Math.max(chartBounds.dayEnd - chartBounds.dayStart, 1);
        return ((x - chartBounds.dayStart) / range) * 100;
    }, [chartBounds.dayEnd, chartBounds.dayStart]);

    /** Время под вертикалью — то же в тултипе графика и на дорожке «Состояние». */
    const hoverCursorTimeLabel = useMemo(() => {
        if (!hoverCursor.active || !Number.isFinite(hoverCursor.ts)) return '';
        return new Date(hoverCursor.ts).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }, [hoverCursor.active, hoverCursor.ts]);

    const findSegmentAtTs = useCallback((segments, ts) => {
        if (!Array.isArray(segments) || !Number.isFinite(ts)) return null;
        return segments.find((seg) => ts >= seg.start && ts <= seg.end) || null;
    }, []);

    const findNearestPointValue = useCallback((series, ts) => {
        if (!Array.isArray(series) || series.length === 0 || !Number.isFinite(ts)) return null;
        let nearest = null;
        let nearestDiff = Number.POSITIVE_INFINITY;
        for (const p of series) {
            if (!p || !Number.isFinite(p.x)) continue;
            if (p.y === null || p.y === undefined || Number.isNaN(Number(p.y))) continue;
            const diff = Math.abs(p.x - ts);
            if (diff < nearestDiff) {
                nearest = p;
                nearestDiff = diff;
            }
        }
        if (!nearest) return null;
        const val = Number(nearest.y);
        return Number.isFinite(val) ? val : null;
    }, []);

    /** Совпадает с Chart.js stepped: 'after' — без «наклонных» участков между дискретными точками. */
    const valueAtTsSteppedAfter = useCallback((series, ts) => {
        if (!Array.isArray(series) || !Number.isFinite(ts)) return null;
        const pts = series
            .filter((p) => p && Number.isFinite(p.x) && p.y !== null && p.y !== undefined && !Number.isNaN(Number(p.y)))
            .map((p) => ({ x: p.x, y: Number(p.y) }))
            .sort((a, b) => a.x - b.x || a.y - b.y);
        if (!pts.length) return null;
        if (ts < pts[0].x) return pts[0].y;
        let value = pts[0].y;
        for (let i = 0; i < pts.length; i += 1) {
            const p = pts[i];
            if (p.x > ts) break;
            value = p.y;
        }
        return Number.isFinite(value) ? value : null;
    }, []);

    const hoverInfo = useMemo(() => {
        if (!hoverCursor.active || !Number.isFinite(hoverCursor.ts)) return null;
        const displaySeries = graphUsesServerData ? historySeriesSnapshot : telemetrySeries;
        const selectedRows = [];
        const mainsChannel = TELEMETRY_CHANNELS_CONFIG.find((c) => c.key === 'mainsVoltage');
        mainsVoltagePhases.forEach((phase) => {
            const sourceKey = resolveMainsPhaseSeriesKey(phase);
            const value = findNearestPointValue(displaySeries[sourceKey] || [], hoverCursor.ts);
            if (value == null || !mainsChannel) return;
            selectedRows.push({
                key: `mains-${phase}`,
                label: `${mainsChannel.label} (${phase})`,
                color: mainsChannel.color,
                value,
            });
        });
        const addSelectedRow = (channelKey, slotName) => {
            if (!channelKey || channelKey === 'mainsVoltage') return;
            const raw = displaySeries[channelKey] || [];
            const value =
                channelKey === 'weldingCurrent' || channelKey === 'weldingVoltage'
                    ? valueAtTsSteppedAfter(raw, hoverCursor.ts)
                    : findNearestPointValue(raw, hoverCursor.ts);
            if (value == null) return;
            const channel = TELEMETRY_CHANNELS_CONFIG.find((c) => c.key === channelKey);
            if (!channel) return;
            selectedRows.push({
                key: `${slotName}-${channelKey}`,
                label: channel.label,
                color: channel.color,
                value,
            });
        };
        addSelectedRow(telemetrySelection.slot1, 'slot1');
        addSelectedRow(telemetrySelection.slot2, 'slot2');
        const errorSeg = findSegmentAtTs(timelineRows.errors, hoverCursor.ts);
        const welderSeg = findSegmentAtTs(timelineRows.welder, hoverCursor.ts);

        const welderLabel = welderSeg?.value ? welderNameByRfid[welderSeg.value] || null : null;
        const errorTooltipLine =
            errorSeg?.value !== undefined && errorSeg?.value !== null
                ? formatErrorTooltipLine(errorSeg.value)
                : null;

        return {
            selectedRows,
            errorLabel: errorSeg?.label || null,
            errorTooltipLine,
            welderLabel,
            welderRfid: welderSeg?.value || null,
        };
    }, [
        hoverCursor,
        graphUsesServerData,
        historySeriesSnapshot,
        telemetrySeries,
        telemetrySelection.slot1,
        telemetrySelection.slot2,
        mainsVoltagePhases,
        findNearestPointValue,
        valueAtTsSteppedAfter,
        timelineRows,
        findSegmentAtTs,
        welderNameByRfid
    ]);

    useEffect(() => {
        const rfid = hoverInfo?.welderRfid;
        if (!rfid || welderNameByRfid[rfid] || welderNameFetchInFlightRef.current.has(rfid)) return;
        welderNameFetchInFlightRef.current.add(rfid);
        fetchWelderByRfidVariants(rfid)
            .then((welder) => {
                if (welder?.name) {
                    setWelderNameByRfid((prev) => ({ ...prev, [rfid]: formatWelderShortName(welder) }));
                } else {
                    setWelderNameByRfid((prev) => ({ ...prev, [rfid]: null }));
                }
            })
            .finally(() => {
                welderNameFetchInFlightRef.current.delete(rfid);
            });
    }, [hoverInfo?.welderRfid, welderNameByRfid]);

    const chartWrapperRef = useRef(null);
    /** Дорожка «Ошибки» — hit-test, snap crosshair и зум. */
    const errorsLaneTrackRef = useRef(null);

    /** Белая точка на линии графика в момент ts (для snap на дорожке «Ошибки»). */
    const setPlotDotAtTimelineTs = useCallback((ts) => {
        const el = chartCanvasRef.current;
        const chart = currentChartInstanceRef.current;
        if (!el || !chart?.chartArea || !chart.canvas || !Number.isFinite(ts)) {
            setPlotDot({ visible: false, leftPx: 0, topPx: 0 });
            return;
        }
        const displaySeries = graphUsesServerData ? historySeriesSnapshot : telemetrySeries;
        const slots = [telemetrySelection.slot1, telemetrySelection.slot2];
        let yVal = null;
        let yAxisId = 'y';
        for (const key of slots) {
            if (!key || key === 'mainsVoltage' || TELEMETRY_NO_DRAW_KEYS.has(key)) continue;
            const raw = displaySeries[key] || [];
            const val =
                key === 'weldingCurrent' || key === 'weldingVoltage'
                    ? valueAtTsSteppedAfter(raw, ts)
                    : findNearestPointValue(raw, ts);
            if (val != null && Number.isFinite(val)) {
                yVal = val;
                yAxisId = resolveChannelYAxisId(key);
                break;
            }
        }
        if (yVal == null) {
            setPlotDot({ visible: false, leftPx: 0, topPx: 0 });
            return;
        }
        const yScale = chart.scales[yAxisId];
        const xScale = chart.scales.x;
        if (!yScale || !xScale) {
            setPlotDot({ visible: false, leftPx: 0, topPx: 0 });
            return;
        }
        const canvasRect = chart.canvas.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const scaleX = chart.width > 0 ? canvasRect.width / chart.width : 1;
        const scaleY = chart.height > 0 ? canvasRect.height / chart.height : 1;
        const xPixel = xScale.getPixelForValue(ts);
        const yPixel = yScale.getPixelForValue(yVal);
        setPlotDot({
            visible: true,
            leftPx: canvasRect.left - elRect.left + xPixel * scaleX,
            topPx: canvasRect.top - elRect.top + yPixel * scaleY,
        });
    }, [
        graphUsesServerData,
        historySeriesSnapshot,
        telemetrySeries,
        telemetrySelection.slot1,
        telemetrySelection.slot2,
        valueAtTsSteppedAfter,
        findNearestPointValue,
    ]);
    const chartPanSessionRef = useRef(null);
    const chartPanSuppressWheelRef = useRef(false);
    const chartPanMoveHandlerRef = useRef(null);
    const chartPanUpHandlerRef = useRef(null);
    const syncPlotAreaFromChart = useCallback(() => {
        const chart = currentChartInstanceRef.current;
        const wrapper = chartWrapperRef.current;
        if (!chart?.chartArea || !chart.canvas || !wrapper || !Number.isFinite(chart.width)) return;
        const ca = chart.chartArea;
        const canvasRect = chart.canvas.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const chartCanvasEl = chart.canvas.parentElement;
        const chartCanvasRect = chartCanvasEl?.getBoundingClientRect?.() || canvasRect;
        const scaleX = chart.width > 0 ? canvasRect.width / chart.width : 1;
        const scaleY = chart.height > 0 ? canvasRect.height / chart.height : 1;
        const leftPx = canvasRect.left - wrapperRect.left + ca.left * scaleX;
        const widthPx = Math.max((ca.right - ca.left) * scaleX, 1);
        const rightPx = Math.max(0, wrapperRect.width - (leftPx + widthPx));
        const chartLeftPx = Math.max(0, canvasRect.left - chartCanvasRect.left + ca.left * scaleX);
        const topPx = Math.max(0, canvasRect.top - chartCanvasRect.top + ca.top * scaleY);
        const heightPx = Math.max((ca.bottom - ca.top) * scaleY, 1);
        setPlotArea({ leftPx, rightPx, widthPx, topPx, heightPx, chartLeftPx });
    }, []);

    useEffect(() => {
        if (activeTab !== 'graphs') return undefined;
        syncPlotAreaFromChart();
        const onResize = () => syncPlotAreaFromChart();
        window.addEventListener('resize', onResize);
        const t = window.setTimeout(() => {
            syncPlotAreaFromChart();
            try {
                currentChartInstanceRef.current?.resize?.();
            } catch {
                /* noop */
            }
        }, 60);
        return () => {
            window.removeEventListener('resize', onResize);
            window.clearTimeout(t);
        };
    }, [activeTab, syncPlotAreaFromChart, topChartData, activeWindow.start, activeWindow.end, graphExpandedLayout]);

    const isEventOnChartAxis = useCallback((event) => {
        const chart = currentChartInstanceRef.current;
        if (!chart?.chartArea || !chart.canvas) return false;
        const ca = chart.chartArea;
        const canvasRect = chart.canvas.getBoundingClientRect();
        const axisPad = 30;
        const scaleX = chart.width > 0 ? canvasRect.width / chart.width : 1;
        const scaleY = chart.height > 0 ? canvasRect.height / chart.height : 1;
        const plotLeft = canvasRect.left + ca.left * scaleX;
        const plotRight = canvasRect.left + ca.right * scaleX;
        const plotTop = canvasRect.top + ca.top * scaleY;
        const plotBottom = canvasRect.top + ca.bottom * scaleY;
        const isOnYAxisLeft =
            event.clientX >= plotLeft - axisPad &&
            event.clientX <= plotLeft &&
            event.clientY >= plotTop &&
            event.clientY <= plotBottom;
        const isOnYAxisRight =
            event.clientX >= plotRight &&
            event.clientX <= plotRight + axisPad &&
            event.clientY >= plotTop &&
            event.clientY <= plotBottom;
        const isOnXAxis =
            event.clientX >= plotLeft &&
            event.clientX <= plotRight &&
            event.clientY >= plotBottom &&
            event.clientY <= plotBottom + axisPad;
        return isOnYAxisLeft || isOnYAxisRight || isOnXAxis;
    }, []);

    const pickPanYAxisSideAtEvent = useCallback((event) => {
        const chart = currentChartInstanceRef.current;
        if (!chart?.canvas) return 'left';
        try {
            const hits = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
            if (!hits?.length) return 'left';
            const ds = chart.data.datasets[hits[0].datasetIndex];
            return ds?.yAxisID === 'yRight' ? 'right' : 'left';
        } catch {
            return 'left';
        }
    }, []);

    const endChartPanSession = useCallback(() => {
        if (chartPanMoveHandlerRef.current) {
            window.removeEventListener('mousemove', chartPanMoveHandlerRef.current);
            chartPanMoveHandlerRef.current = null;
        }
        if (chartPanUpHandlerRef.current) {
            window.removeEventListener('mouseup', chartPanUpHandlerRef.current);
            chartPanUpHandlerRef.current = null;
        }
        chartPanSessionRef.current = null;
        chartPanSuppressWheelRef.current = false;
        setChartPanActive(false);
    }, []);

    const handleChartPanMove = useCallback((event) => {
        const session = chartPanSessionRef.current;
        if (!session) return;
        const dx = event.clientX - session.startClientX;
        const dy = event.clientY - session.startClientY;
        if (!session.active) {
            if (Math.hypot(dx, dy) < 3) return;
            session.active = true;
            chartPanSuppressWheelRef.current = true;
            setChartPanActive(true);
            setHoverCursor({ active: false, ts: null, percent: 0, xPx: 0, flip: false });
            setPlotDot({ visible: false, leftPx: 0, topPx: 0 });
        }
        event.preventDefault();

        const span = Math.max(session.originEnd - session.originStart, session.minGap);
        const plotW = session.plotWidth || 1;
        const plotH = session.plotHeight || 1;
        const deltaT = -(dx / plotW) * span;
        let nextStart = session.originStart + deltaT;
        let nextEnd = session.originEnd + deltaT;
        if (nextStart < session.dayStart) {
            nextStart = session.dayStart;
            nextEnd = nextStart + span;
        }
        if (nextEnd > session.dayEnd) {
            nextEnd = session.dayEnd;
            nextStart = nextEnd - span;
        }
        setTimeWindow({ start: nextStart, end: nextEnd, touched: true });

        if (session.axisSide === 'right') {
            const yMin = Y_AXIS_RIGHT.MIN;
            const yRange = session.originRightMax - yMin;
            setYAxisRightMax(clampRightYMax(session.originRightMax + (dy / plotH) * yRange));
        } else {
            const yMin = Y_AXIS_LEFT.AXIS_MIN;
            const yRange = session.originLeftMax - yMin;
            setYAxisLeftMax(clampLeftYMax(session.originLeftMax + (dy / plotH) * yRange));
        }
    }, []);

    const handleChartPanUp = useCallback(() => {
        endChartPanSession();
    }, [endChartPanSession]);

    const handleChartPanMouseDown = useCallback((event) => {
        if (!graphUsesServerDataRef.current) return;
        if (event.button !== 0) return;
        if (isEventOnChartAxis(event)) return;
        if (chartPanSessionRef.current) return;
        event.preventDefault();

        const plotWidth = Number.isFinite(plotArea.widthPx) && plotArea.widthPx > 0 ? plotArea.widthPx : 1;
        const plotHeight = Number.isFinite(plotArea.heightPx) && plotArea.heightPx > 0 ? plotArea.heightPx : 1;
        chartPanSessionRef.current = {
            active: false,
            axisSide: pickPanYAxisSideAtEvent(event),
            startClientX: event.clientX,
            startClientY: event.clientY,
            originStart: activeWindow.start,
            originEnd: activeWindow.end,
            originLeftMax: yAxisLeftMax,
            originRightMax: yAxisRightMax,
            dayStart: chartBounds.dayStart,
            dayEnd: chartBounds.dayEnd,
            minGap: activeWindow.minGap,
            plotWidth,
            plotHeight,
        };
        window.addEventListener('mousemove', handleChartPanMove);
        window.addEventListener('mouseup', handleChartPanUp);
        chartPanMoveHandlerRef.current = handleChartPanMove;
        chartPanUpHandlerRef.current = handleChartPanUp;
    }, [
        isEventOnChartAxis,
        pickPanYAxisSideAtEvent,
        handleChartPanMove,
        handleChartPanUp,
        plotArea.widthPx,
        plotArea.heightPx,
        activeWindow.start,
        activeWindow.end,
        activeWindow.minGap,
        chartBounds.dayStart,
        chartBounds.dayEnd,
        yAxisLeftMax,
        yAxisRightMax,
    ]);

    useEffect(() => () => endChartPanSession(), [endChartPanSession]);

    const handleSharedHoverMove = useCallback((event) => {
        if (chartPanActive || chartPanSessionRef.current?.active) return;
        if (!chartWrapperRef.current) return;
        const rect = chartWrapperRef.current.getBoundingClientRect();
        if (!rect.width) return;
        const left = Number.isFinite(plotArea.leftPx) ? plotArea.leftPx : 0;
        const width = Number.isFinite(plotArea.widthPx) && plotArea.widthPx > 0 ? plotArea.widthPx : rect.width;
        const xPxRaw = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        let plotCursorX = Math.max(left, Math.min(left + width, xPxRaw));
        let ratio = Math.max(0, Math.min(1, (plotCursorX - left) / width));
        let ts = activeWindow.start + ratio * (activeWindow.end - activeWindow.start);

        const errorsTrackRect = errorsLaneTrackRef.current?.getBoundingClientRect?.();
        const overErrorsLane = isClientOverRect(event.clientX, event.clientY, errorsTrackRect);
        const errorsInView = timelineRows.errors;
        if (overErrorsLane && errorsInView?.length) {
            const snapSeg = pickNearestErrorSegmentByPointerTs(errorsInView, ts);
            if (snapSeg) {
                ts = errorSegmentCenterTs(snapSeg);
                ratio = Math.max(0, Math.min(1, (ts - activeWindow.start) / Math.max(activeWindow.end - activeWindow.start, 1)));
                plotCursorX = left + ratio * width;
                setPlotDotAtTimelineTs(ts);
            }
        } else {
            const chartEl = chartCanvasRef.current;
            const pa = plotAreaRef.current;
            const plotLeft = Number.isFinite(pa.chartLeftPx) ? pa.chartLeftPx : pa.leftPx;
            const plotWidth = Number.isFinite(pa.widthPx) && pa.widthPx > 0 ? pa.widthPx : 0;
            const plotHeight = Number.isFinite(pa.heightPx) && pa.heightPx > 0 ? pa.heightPx : 0;
            let inChartPlot = false;
            if (chartEl && plotWidth > 0 && plotHeight > 0) {
                const elRect = chartEl.getBoundingClientRect();
                const xLocal = event.clientX - elRect.left;
                const yLocal = event.clientY - elRect.top;
                inChartPlot =
                    xLocal >= plotLeft &&
                    xLocal <= plotLeft + plotWidth &&
                    yLocal >= pa.topPx &&
                    yLocal <= pa.topPx + plotHeight;
            }
            if (!inChartPlot) {
                setPlotDot((prev) => (prev.visible ? { visible: false, leftPx: 0, topPx: 0 } : prev));
            }
        }

        const tooltipW = 240;
        const flip = plotCursorX > (rect.width - tooltipW);

        const onAxis = isEventOnChartAxis(event);
        setChartPlotCursorHidden(!onAxis);

        setHoverCursor({
            active: true,
            ts,
            percent: ratio * 100,
            xPx: plotCursorX,
            flip,
        });
    }, [
        activeWindow.start,
        activeWindow.end,
        plotArea.leftPx,
        plotArea.widthPx,
        isEventOnChartAxis,
        chartPanActive,
        timelineRows.errors,
        setPlotDotAtTimelineTs,
    ]);

    const handleSharedHoverLeave = useCallback(() => {
        if (!chartPanSessionRef.current?.active) {
            setChartPlotCursorHidden(false);
            setHoverCursor({ active: false, ts: null, percent: 0, xPx: 0, flip: false });
        }
    }, []);

    useEffect(() => {
        if (activeTab !== 'graphs') return undefined;
        const el = chartCanvasRef.current;
        if (!el) return undefined;

        const updatePlotDot = (event) => {
            if (chartPanActive || chartPanSessionRef.current?.active) {
                setPlotDot((prev) => (prev.visible ? { visible: false, leftPx: 0, topPx: 0 } : prev));
                return;
            }
            if (isEventOnChartAxis(event)) {
                setPlotDot((prev) => (prev.visible ? { visible: false, leftPx: 0, topPx: 0 } : prev));
                return;
            }
            const pa = plotAreaRef.current;
            const plotLeft = Number.isFinite(pa.chartLeftPx) ? pa.chartLeftPx : pa.leftPx;
            const plotWidth = Number.isFinite(pa.widthPx) && pa.widthPx > 0 ? pa.widthPx : 0;
            const plotHeight = Number.isFinite(pa.heightPx) && pa.heightPx > 0 ? pa.heightPx : 0;
            if (plotWidth <= 0 || plotHeight <= 0) {
                setPlotDot((prev) => (prev.visible ? { visible: false, leftPx: 0, topPx: 0 } : prev));
                return;
            }
            const rect = el.getBoundingClientRect();
            const xLocal = event.clientX - rect.left;
            const yLocal = event.clientY - rect.top;
            const plotRight = plotLeft + plotWidth;
            const plotBottom = pa.topPx + plotHeight;
            const inPlot =
                xLocal >= plotLeft &&
                xLocal <= plotRight &&
                yLocal >= pa.topPx &&
                yLocal <= plotBottom;
            if (!inPlot) {
                setPlotDot((prev) => (prev.visible ? { visible: false, leftPx: 0, topPx: 0 } : prev));
                return;
            }
            setPlotDot({
                visible: true,
                leftPx: xLocal,
                topPx: yLocal,
            });
        };

        const hidePlotDot = () => setPlotDot({ visible: false, leftPx: 0, topPx: 0 });

        el.addEventListener('pointermove', updatePlotDot);
        el.addEventListener('pointerleave', hidePlotDot);
        el.addEventListener('pointercancel', hidePlotDot);
        return () => {
            el.removeEventListener('pointermove', updatePlotDot);
            el.removeEventListener('pointerleave', hidePlotDot);
            el.removeEventListener('pointercancel', hidePlotDot);
        };
    }, [activeTab, chartPanActive, isEventOnChartAxis]);

    const handleChartWheel = useCallback((event) => {
        if (chartPanSuppressWheelRef.current || chartPanSessionRef.current?.active) return;

        const applyPlotTimeZoomAtRatio = (ratio, zoomIn) => {
            const span = Math.max(activeWindow.end - activeWindow.start, activeWindow.minGap);
            const minSpanX = activeWindow.minGap;
            const maxSpanX = graphUsesServerData
                ? Math.max(chartBounds.dayEnd - chartBounds.dayStart, minSpanX)
                : Math.max(LIVE_WINDOW_MS, minSpanX);

            const factor = zoomIn ? 0.88 : 1.12;
            let nextSpan = span * factor;
            nextSpan = Math.max(minSpanX, Math.min(maxSpanX, nextSpan));

            const tsAtCursor = activeWindow.start + ratio * span;
            let nextStart = tsAtCursor - ratio * nextSpan;
            let nextEnd = nextStart + nextSpan;

            if (nextStart < chartBounds.dayStart) {
                nextStart = chartBounds.dayStart;
                nextEnd = nextStart + nextSpan;
            }
            if (nextEnd > chartBounds.dayEnd) {
                nextEnd = chartBounds.dayEnd;
                nextStart = nextEnd - nextSpan;
            }

            setTimeWindow({ start: nextStart, end: nextEnd, touched: true });
        };

        const trackEl = errorsLaneTrackRef.current;
        const trackRect = trackEl?.getBoundingClientRect?.();
        const overErrorTrack = isClientOverRect(event.clientX, event.clientY, trackRect);

        if (overErrorTrack) {
            const errorsInView = timelineRows.errors;
            if (!errorsInView?.length || !graphUsesServerData) return;

            const range = Math.max(activeWindow.end - activeWindow.start, 1);
            const ratioMouse = Math.max(0, Math.min(1, (event.clientX - trackRect.left) / trackRect.width));
            const mouseTs = activeWindow.start + ratioMouse * range;
            const snapSeg = pickNearestErrorSegmentByPointerTs(errorsInView, mouseTs);
            if (!snapSeg) return;

            event.preventDefault();
            const centerTs = errorSegmentCenterTs(snapSeg);
            const ratioCenter = Math.max(0, Math.min(1, (centerTs - activeWindow.start) / range));
            applyPlotTimeZoomAtRatio(ratioCenter, event.deltaY < 0);
            return;
        }

        const chart = currentChartInstanceRef.current;
        if (!chart?.chartArea || !chart.canvas) return;

        const ca = chart.chartArea;
        const canvasRect = chart.canvas.getBoundingClientRect();
        const axisPad = 30;

        const isOnXAxis =
            event.clientX >= canvasRect.left + ca.left &&
            event.clientX <= canvasRect.left + ca.right &&
            event.clientY >= canvasRect.top + ca.bottom &&
            event.clientY <= canvasRect.top + ca.bottom + axisPad;

        const isOnYAxisLeft =
            event.clientX >= canvasRect.left + ca.left - axisPad &&
            event.clientX <= canvasRect.left + ca.left &&
            event.clientY >= canvasRect.top + ca.top &&
            event.clientY <= canvasRect.top + ca.bottom;

        const isOnYAxisRight =
            event.clientX >= canvasRect.left + ca.right &&
            event.clientX <= canvasRect.left + ca.right + axisPad &&
            event.clientY >= canvasRect.top + ca.top &&
            event.clientY <= canvasRect.top + ca.bottom;

        const zoomIn = event.deltaY < 0;

        if (isOnYAxisLeft) {
            event.preventDefault();
            setYAxisLeftMax((prev) => stepLeftYMax(prev, zoomIn));
            return;
        }

        if (isOnYAxisRight) {
            event.preventDefault();
            setYAxisRightMax((prev) => stepRightYMax(prev, zoomIn));
            return;
        }

        if (isOnXAxis) {
            event.preventDefault();
            const ratio = Math.max(0, Math.min(1, (event.clientX - (canvasRect.left + ca.left)) / Math.max(ca.right - ca.left, 1)));
            applyPlotTimeZoomAtRatio(ratio, zoomIn);
        }
    }, [
        activeWindow.start,
        activeWindow.end,
        activeWindow.minGap,
        graphUsesServerData,
        chartBounds.dayStart,
        chartBounds.dayEnd,
        LIVE_WINDOW_MS,
        timelineRows.errors,
    ]);

    /** React вешает onWheel как passive — preventDefault для зума не срабатывает; нужен нативный listener. */
    useLayoutEffect(() => {
        if (activeTab !== 'graphs') return undefined;
        const el = chartWrapperRef.current;
        if (!el) return undefined;
        el.addEventListener('wheel', handleChartWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleChartWheel);
    }, [activeTab, handleChartWheel]);

    const handleTimelinePinMouseDown = (pin) => {
        pinDragSessionDateRef.current = selectedGraphDateRef.current;
        if (selectedGraphDate && isTodayDateStr(selectedGraphDate) && !todayPinExploreRef.current) {
            const db = getDayBoundsForDateStr(selectedGraphDate);
            todayPinExploreRef.current = true;
            todayDayBoundsRef.current = db;
            setTodayPinExplore(true);
            setHistoryDayBounds({ start: db.dayStart, end: db.dayEnd });
        }
        if (!selectedGraphDate || !isTodayDateStr(selectedGraphDate)) {
            todayDayBoundsRef.current = null;
        }
        setDraggingPin(pin);
        setTimeWindow((prev) => ({ ...prev, touched: true }));
        const useDayPinDrag = historyModeRef.current || todayPinExploreRef.current;
        if (useDayPinDrag) {
            const b = { start: activeWindow.start, end: activeWindow.end };
            pinDragPreviewRef.current = b;
            setPinDragPreview(b);
        } else {
            pinDragPreviewRef.current = null;
            setPinDragPreview(null);
        }
    };

    useEffect(() => {
        if (!draggingPin) return undefined;
        const onMove = (event) => {
            if (!timelineRulerRef.current) return;
            const rect = timelineRulerRef.current.getBoundingClientRect();
            if (!rect.width) return;
            const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
            const dayStart = todayPinExploreRef.current && todayDayBoundsRef.current
                ? todayDayBoundsRef.current.dayStart
                : chartBounds.dayStart;
            const dayEnd = todayPinExploreRef.current && todayDayBoundsRef.current
                ? todayDayBoundsRef.current.dayEnd
                : chartBounds.dayEnd;
            const rawTs = dayStart + ratio * (dayEnd - dayStart);
            const snapped = Math.round(rawTs / 60_000) * 60_000;
            const minGap = 60 * 1000;
            if (historyModeRef.current || todayPinExploreRef.current) {
                const prev = pinDragPreviewRef.current;
                let nextStart = Number.isFinite(prev?.start) ? prev.start : activeWindow.start;
                let nextEnd = Number.isFinite(prev?.end) ? prev.end : activeWindow.end;
                if (draggingPin === 'start') {
                    nextStart = Math.max(dayStart, Math.min(snapped, nextEnd - minGap));
                } else {
                    nextEnd = Math.min(dayEnd, Math.max(snapped, nextStart + minGap));
                }
                const next = { start: nextStart, end: nextEnd };
                pinDragPreviewRef.current = next;
                setPinDragPreview(next);
            } else {
                setTimeWindow((prev) => {
                    let nextStart = Number.isFinite(prev.start) ? prev.start : activeWindow.start;
                    let nextEnd = Number.isFinite(prev.end) ? prev.end : activeWindow.end;
                    if (draggingPin === 'start') {
                        nextStart = Math.max(dayStart, Math.min(snapped, nextEnd - minGap));
                    } else {
                        nextEnd = Math.min(dayEnd, Math.max(snapped, nextStart + minGap));
                    }
                    return { ...prev, start: nextStart, end: nextEnd, touched: true };
                });
            }
        };
        const onUp = () => {
            if ((historyModeRef.current || todayPinExploreRef.current) && pinDragPreviewRef.current) {
                const p = pinDragPreviewRef.current;
                persistHistoryPinWindow(pinDragSessionDateRef.current, p.start, p.end);
                setTimeWindow((prev) => ({ ...prev, start: p.start, end: p.end, touched: true }));
            }
            pinDragPreviewRef.current = null;
            setPinDragPreview(null);
            setDraggingPin(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [draggingPin, chartBounds.dayStart, chartBounds.dayEnd, activeWindow.start, activeWindow.end, persistHistoryPinWindow]);

    const datePickerInputRef = useRef(null);
    const shiftDateByDays = useCallback((dateStr, deltaDays) => {
        if (!dateStr) return toLocalDateInput(new Date());
        const [yyyy, mm, dd] = String(dateStr).split('-').map((x) => parseInt(x, 10));
        const base = new Date(yyyy, (mm || 1) - 1, dd || 1);
        base.setDate(base.getDate() + deltaDays);
        return toLocalDateInput(base);
    }, []);

    const todayDateStr = toLocalDateInput(new Date());
    const currentDateStr = selectedGraphDate || todayDateStr;
    const isNextDayDisabled = currentDateStr >= todayDateStr;

    /** Две буквы дня недели (пн…вс) для строки даты календаря графика — локальная дата YYYY-MM-DD. */
    const graphCalendarLabelParts = useMemo(() => {
        const ds = selectedGraphDate || todayDateStr;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return { dateStr: ds, weekday: '' };
        const [y, m, d] = ds.split('-').map((x) => parseInt(x, 10));
        const dt = new Date(y, (m || 1) - 1, d || 1);
        if (dt.getFullYear() !== y || dt.getMonth() !== (m || 1) - 1 || dt.getDate() !== (d || 1)) {
            return { dateStr: ds, weekday: '' };
        }
        const ruShort = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
        return { dateStr: ds, weekday: ruShort[dt.getDay()] || '' };
    }, [selectedGraphDate, todayDateStr]);

    const handlePrevDay = () => setSelectedGraphDate((d) => shiftDateByDays(d || toLocalDateInput(new Date()), -1));
    const handleNextDay = () => {
        if (isNextDayDisabled) return;
        setSelectedGraphDate((d) => shiftDateByDays(d || toLocalDateInput(new Date()), 1));
    };
    const handleOpenCalendar = () => datePickerInputRef.current?.showPicker?.() || datePickerInputRef.current?.click?.();

    /** Сброс Y-зума: левая max=750, правая max=100. */
    const handleGraphYZoomReset = useCallback(() => {
        setYAxisLeftMax(Y_AXIS_LEFT.MAX);
        setYAxisRightMax(Y_AXIS_RIGHT.MAX);
    }, []);

    const exitTodayHistoryToLive = useCallback(() => {
        setTodayPinExplore(false);
        todayPinExploreRef.current = false;
        todayDayBoundsRef.current = null;
        setHistoryDayBounds({ start: null, end: null });
        setTimeWindow({ start: null, end: null, touched: false });
        setHistoryError(null);
    }, []);

    /** Переключатель: live ↔ история за сегодня (последний час). */
    const handleToggleTodayHistory = useCallback(async () => {
        if (todayPinExplore) {
            exitTodayHistoryToLive();
            return;
        }
        const todayStr = toLocalDateInput(new Date());
        const db = getDayBoundsForDateStr(todayStr);
        const now = Date.now();
        const end = Math.min(now, db.dayEnd);
        const start = Math.max(db.dayStart, end - 60 * 60 * 1000);

        if (selectedGraphDateRef.current !== todayStr) {
            skipTodayLiveResetRef.current = true;
            setSelectedGraphDate(todayStr);
        }

        todayPinExploreRef.current = true;
        todayDayBoundsRef.current = db;
        setTodayPinExplore(true);
        setIsHistoryMode(false);
        setHistoryDayBounds({ start: db.dayStart, end: db.dayEnd });
        setTimeWindow({ start, end, touched: true });
        setHistoryError(null);

        try {
            await ensureHistoryIntervalLoaded(todayStr, start, end);
            setHistorySeriesSnapshot(buildHistorySeriesForWindow(start, end));
            setHistoryTimelineSnapshot(buildHistoryTimelineForWindow(start, end));
        } catch {
            setHistoryError('Не удалось загрузить историю с сервера.');
        }
    }, [
        todayPinExplore,
        exitTodayHistoryToLive,
        getDayBoundsForDateStr,
        ensureHistoryIntervalLoaded,
        buildHistorySeriesForWindow,
        buildHistoryTimelineForWindow,
    ]);

    return (
        <main className={`main-panel${activeTab === 'graphs' && graphExpandedLayout ? ' main-panel--graph-expanded-layout' : ''}`}>
            <div className="monitor-page-header-row">
                <div className="monitor-page-brand">
                    <button
                        type="button"
                        className="monitor-page-close-btn"
                        onClick={handleBackToEquipment}
                        title="Вернуться к списку оборудования"
                    >
                        ×
                    </button>
                    <div className="monitor-page-brand-stack">
                        <div className="monitor-page-brand-title">
                            <span className="monitor-page-brand-main">CORE</span>
                            <span className="monitor-page-brand-accent">PULSE</span>
                        </div>
                        <div className="monitor-page-top-tabs" aria-label="Разделы мониторинга">
                            <button
                                type="button"
                                className={`monitor-page-top-tab ${activeTab === 'info' ? 'active' : ''}`}
                                onClick={() => setActiveTab('info')}
                            >
                                Информация
                            </button>
                            <button
                                type="button"
                                className={`monitor-page-top-tab ${activeTab === 'graphs' ? 'active' : ''}`}
                                onClick={() => setActiveTab('graphs')}
                            >
                                Графики
                            </button>
                            <button
                                type="button"
                                className={`monitor-page-top-tab ${activeTab === 'welders' ? 'active' : ''}`}
                                onClick={() => setActiveTab('welders')}
                            >
                                Сварщики
                            </button>
                            <button
                                type="button"
                                className="monitor-page-top-tab monitor-page-top-tab--placeholder"
                                disabled
                            >
                                Ограничения
                            </button>
                        </div>
                    </div>
                </div>
                <div className="monitor-page-header-controls">
                    <button
                        type="button"
                        className="monitor-page-notifications-btn"
                        onClick={() => navigate('/notifications')}
                        title="Уведомления"
                    >
                        <FaBell className="monitor-page-notifications-icon" />
                        <span className="monitor-page-notifications-badge">271</span>
                    </button>
                    <UserProfile />
                </div>
            </div>

            <div className="top-grid">
                <section className="machine-section" aria-label="Сварочный аппарат">
                    <div className="machine-visual-container">
                        <div className="machine-visual">
                            <img
                                src={machineImage}
                                alt="CORE PRO 500 сварочный аппарат"
                                className="machine-image"
                            />
                        </div>
                    </div>
                    <div className="machine-state-block">
                        <div className="machine-state-label">Состояние аппарата:</div>
                        <div className="machine-state-value" style={{ color: machineStateColor }}>
                            {machineStateDisplayValue}
                        </div>
                    </div>
                    <div className="welding-timer">
                        <div className="machine-info-row machine-info-row--multiline">
                            <span className="machine-info-label">Имя:</span>
                            <div className="machine-info-value-slot">
                                <span className="machine-info-text">{displayName || '—'}</span>
                                <button
                                    type="button"
                                    className="machine-info-icon-tile"
                                    onClick={handleOpenEditModal}
                                    title="Редактировать наименование и подразделение"
                                >
                                    <span className="machine-info-icon">✎</span>
                                </button>
                            </div>
                        </div>
                        <div className="machine-info-row machine-info-row--multiline">
                            <span className="machine-info-label">Подразделение:</span>
                            <div className="machine-info-value-slot">
                                <span className="machine-info-text">{organizationUnit || '—'}</span>
                                <button
                                    type="button"
                                    className="machine-info-icon-tile"
                                    onClick={handleOpenEditModal}
                                    title="Редактировать наименование и подразделение"
                                >
                                    <span className="machine-info-icon">✎</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="control-section">
                    <div className="card control-mode-tile">
                        <span className="control-label">Режим работы</span>
                        <span className="control-value">Без ограничений</span>
                    </div>

                    <section className="card control-card" aria-label="Параметры сварки">
                        <div className="control-metrics">
                            <div className="metrics-content">
                                <div className="metric-block">
                                    <div className="metric-header">
                                        <span>Ток сварки</span>
                                    </div>
                                    <div className="metric-dual-row">
                                        <div className="metric-dual-col">
                                            <span className="metric-sub-label">Факт.</span>
                                            <div className="metric-value-dual metric-actual primary numeric">
                                                <span className="value">{controlFactCurrent}</span>
                                                <span className="metric-system-dual primary">A</span>
                                            </div>
                                        </div>
                                        <div className="metric-dual-sep" aria-hidden="true" />
                                        <div className="metric-dual-col">
                                            <span className="metric-sub-label">Уст.</span>
                                            <div className="metric-value-dual primary numeric welding-inactive">
                                                <span className="value">{controlSetCurrent}</span>
                                                <span className="metric-system-dual primary">A</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="metric-scale">
                                        <span className="scale-range-min">5</span>
                                        <div className="scale-bar">
                                            <div className="scale-progress" style={{ width: `${currentProgress}%` }} />
                                        </div>
                                        <span className="scale-range-max">500</span>
                                    </div>
                                    <div className="metric-limits">
                                        <span className="limit-min">&lt; 300 &gt;</span>
                                        <span className="limit-max">&lt; 450 &gt;</span>
                                    </div>
                                </div>

                                <div className="metric-block">
                                    <div className="metric-header">
                                        <span>Напряжение сварки</span>
                                    </div>
                                    <div className="metric-dual-row">
                                        <div className="metric-dual-col">
                                            <span className="metric-sub-label">Факт.</span>
                                            <div className="metric-value-dual metric-actual secondary numeric">
                                                <span className="value">{controlFactVoltage}</span>
                                                <span className="metric-system-dual secondary">B</span>
                                            </div>
                                        </div>
                                        <div className="metric-dual-sep" aria-hidden="true" />
                                        <div className="metric-dual-col">
                                            <span className="metric-sub-label">Уст.</span>
                                            <div className="metric-value-dual secondary numeric welding-inactive">
                                                <span className="value">{controlSetVoltage}</span>
                                                <span className="metric-system-dual secondary">B</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="metric-scale">
                                        <span className="scale-range-min">5</span>
                                        <div className="scale-bar">
                                            <div className="scale-progress secondary" style={{ width: `${voltageProgress}%` }} />
                                        </div>
                                        <span className="scale-range-max">50</span>
                                    </div>
                                    <div className="metric-limits">
                                        <span className="limit-min">&lt; 10 &gt;</span>
                                        <span className="limit-max">&lt; 35 &gt;</span>
                                    </div>
                                </div>
                            </div>

                            <div className="control-flags">
                                <span className="flag numeric">{getMemoryCellNumber()}</span>
                                <span className="flag numeric">{getJobNumberForFlag()}</span>
                                <span className="flag accent numeric">{getWeldingMode()}</span>
                                <span className="flag negative numeric">{getWeldingMaterial()}</span>
                                <span className="flag numeric">{getWeldingGas()}</span>
                                <span className="flag numeric">{getWeldingWireDiameter()}</span>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="status-panel" aria-label="Параметры системы">
                    <div className="status-tiles-grid">
                        <div className="status-tile-block">
                            <div className="status-tile-title">Активность за сутки:</div>
                            <div className="status-row">
                                <span className="status-label">Выкл. состояние:</span>
                                <span className="status-value numeric status-value-danger">{formatMsToClock(dailyActivity.offMs)}</span>
                            </div>
                            <div className="status-row">
                                <span className="status-label">Деж. режим:</span>
                                <span className="status-value numeric status-value-warning">{formatMsToClock(dailyActivity.standbyMs)}</span>
                            </div>
                            <div className="status-row">
                                <span className="status-label">Вкл. состояние:</span>
                                <span className="status-value numeric status-value-success">{statusOnActiveClock}</span>
                            </div>
                            <div className="status-row">
                                <span className="status-label">Сварка:</span>
                                <span className="status-value numeric status-value-accent">{statusWeldingClock}</span>
                            </div>
                        </div>

                        <div className="status-tile-block">
                            <div className="status-tile-title">Расход за сутки</div>
                            <div className="status-subtitle">Газ:</div>
                            <div className="status-row status-row--boxed">
                                <span className="status-label">Ar92/CO2</span>
                                <span className="status-value numeric">0 л</span>
                            </div>
                            <div className="status-subtitle status-subtitle--spaced">Проволока:</div>
                            <div className="status-row status-row--boxed">
                                <span className="status-label">Сталь 1.2</span>
                                <span className="status-value numeric">{formatKgValue(dailyWireConsumptionKg)} кг</span>
                            </div>
                        </div>
                    </div>

                    <div className="status-tile-block status-tile-block--wide">
                        <div className="status-row status-row--compact">
                            <span className="status-label">Напряжение фазы A/B/C</span>
                            <span className="status-value numeric">{`${Math.round(statusPhaseA)}/${Math.round(statusPhaseB)}/${Math.round(statusPhaseC)} В`}</span>
                        </div>
                        <div className="status-row status-row--compact">
                            <span className="status-label">Темп. охл. жидкости Вход./Исх.</span>
                            <span className="status-value numeric">{`${Math.round(statusChillerOut)}/${Math.round(statusChillerIn)} °C`}</span>
                        </div>
                        <div className="status-row status-row--compact">
                            <span className="status-label">Тем. Первич./Вторич.</span>
                            <span className="status-value numeric">{`${Math.round(statusPrimaryCoilTemp)}/${Math.round(statusSecondaryCoilTemp)} °C`}</span>
                        </div>
                    </div>
                </section>

                <div className="welder-section">
                    <div className="card welder-header-tile">
                        <div className="welder-header-main">
                            {hasRfidCode ? (
                                <div className="welder-header-rfid-row">
                                    <div className="rfid-pass-badge" title="RFID">
                                        <RiRfidFill className="rfid-pass-badge-icon" aria-hidden />
                                        <span className="rfid-pass-badge-text">{rfidCode}</span>
                                    </div>
                                    {rfidLookup.status === 'known' && rfidLookup.welder && (
                                        <div className="welder-known-block">
                                            <img src={WelderIcon} alt="" className="welder-header-welder-icon" />
                                            <span className="welder-name-short">{formatWelderShortName(rfidLookup.welder)}</span>
                                        </div>
                                    )}
                                    {rfidLookup.status === 'unknown' && (
                                        <button
                                            type="button"
                                            className="create-welder-from-rfid-btn"
                                            onClick={handleNavigateCreateWelderFromRfid}
                                        >
                                            <img src={WelderIcon} alt="" className="create-welder-from-rfid-icon" />
                                            Создать сварщика
                                        </button>
                                    )}
                                    {rfidLookup.status === 'loading' && (
                                        <span className="welder-rfid-lookup-hint">Проверка пропуска…</span>
                                    )}
                                </div>
                            ) : (
                                <span className="welder-no-rfid-hint">Нет данных RFID</span>
                            )}
                        </div>
                    </div>

                    <section className="card welder-alerts-card" aria-label="Неисправности">
                        <div className="welder-alerts">
                            {incidentLog.length > 0 ? (
                                incidentLog.map((item) => (
                                    <div key={item.code} className={`alert-card ${item.severity}`}>
                                        <div className="alert-code">
                                            <span>{item.code}</span>
                                            <div className="alert-timestamp">
                                                <span>{item.time}</span>
                                                <span>{item.date}</span>
                                            </div>
                                        </div>
                                        <div className="alert-body">
                                            <span className="alert-title">{item.message}</span>
                                            {item.description && <p className="alert-description">{item.description}</p>}
                                        </div>
                                        <button type="button" className="alert-toggle" aria-label="Подробнее" />
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '8px', color: 'rgba(188, 183, 197, 0.5)', fontSize: '11px' }}>
                                    Нет ошибок
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <section className={`bottom-panel${activeTab === 'welders' ? ' bottom-panel--welders' : ''}`}>
                {activeTab === 'welders' ? (
                    <MonitorWeldersTab
                        machineId={machineId}
                        organizationUnit={organizationUnit}
                        onlineWelderId={
                            rfidLookup.status === 'known' && rfidLookup.welder?.id != null
                                ? rfidLookup.welder.id
                                : null
                        }
                    />
                ) : (
                    <div className="bottom-panel__body">
                        <div className="telemetry-controls">

                            {isTelemetryListExpanded && (
                                <>
                                    <div className="machine-info-row" style={{ marginBottom: 10, justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button type="button" className="machine-info-icon-tile" onClick={handlePrevDay} title="Предыдущий день">
                                                <span className="machine-info-icon">‹</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="machine-info-text"
                                                onClick={handleOpenCalendar}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                }}
                                                title="Выбрать дату"
                                            >
                                                <span style={{ textDecoration: 'underline' }}>{graphCalendarLabelParts.dateStr}</span>
                                                {graphCalendarLabelParts.weekday ? (
                                                    <span style={{ marginLeft: '0.35em', opacity: 0.92 }}>{graphCalendarLabelParts.weekday}</span>
                                                ) : null}
                                            </button>
                                            <button
                                                type="button"
                                                className="machine-info-icon-tile"
                                                onClick={handleNextDay}
                                                title={isNextDayDisabled ? 'Будущие даты недоступны' : 'Следующий день'}
                                                disabled={isNextDayDisabled}
                                                style={isNextDayDisabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                                            >
                                                <span className="machine-info-icon">›</span>
                                            </button>
                                            <input
                                                ref={datePickerInputRef}
                                                type="date"
                                                value={selectedGraphDate || ''}
                                                onChange={(e) => setSelectedGraphDate(e.target.value)}
                                                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
                                                aria-hidden
                                                tabIndex={-1}
                                            />
                                        </div>
                                    </div>
                                    <div className="telemetry-list" aria-label="Перечень каналов телеметрии">
                                        {activeTab === 'graphs' && telemetryChannels.map((channel) => (
                                            <div
                                                key={channel.key}
                                                className={`telemetry-item ${channel.active ? 'active' : ''}${channel.key === 'mainsVoltage' ? ' telemetry-item--mains' : ''}${channel.graphPickBlocked ? ' telemetry-item--graph-pool-full' : ''}`}
                                            >
                                                <span className="telemetry-label">{channel.label}</span>
                                                <div className="telemetry-tiles">
                                                    {channel.key === 'mainsVoltage' ? (
                                                        MAINS_VOLTAGE_PHASES.map((phase) => (
                                                            <button
                                                                key={`mains_phase_${phase}`}
                                                                type="button"
                                                                className={`telemetry-tile ${mainsVoltagePhases.includes(phase) ? 'active' : ''}`}
                                                                style={{ color: mainsVoltagePhases.includes(phase) ? channel.color : 'rgba(188, 183, 197, 0.4)' }}
                                                                onClick={() => handleMainsVoltagePhaseToggle(phase)}
                                                            >
                                                                <span className="tile-number">{phase}</span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className={`telemetry-tile ${channel.active ? 'active' : ''}`}
                                                            style={{ color: channel.active ? channel.color : 'rgba(188, 183, 197, 0.4)' }}
                                                            disabled={channel.graphPickBlocked}
                                                            title={
                                                                channel.graphPickBlocked
                                                                    ? 'На графике уже два параметра. Снимите выбор с одного, чтобы добавить этот.'
                                                                    : channel.active
                                                                        ? 'Снять с графика'
                                                                        : 'Показать на графике'
                                                            }
                                                            onClick={() => handleTelemetryTileClick(channel.key)}
                                                        >
                                                        <span className="telemetry-tile-check" aria-hidden>
                                                            ✓
                                                        </span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {activeTab === 'info' && (
                                            <div className="info-content info-content-placeholder">
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        {activeTab === 'info' && (
                            <div className="info-tiles-container">
                                <div className="info-tile">
                                    <div className="info-tile-row info-tile-row-editable">
                                        <span className="info-tile-label">Ответственное лицо</span>
                                        <span className="info-tile-value"></span>
                                        <span className="info-tile-edit" aria-hidden>✎</span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Серийный номер ИП</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Инвентарный номер</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Дата ввода в эксплуатацию</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <button type="button" className="info-tile-btn">Обновление ПО ИП</button>
                                </div>
                                <div className="info-tile">
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">МАС адрес модуля WT</span>
                                        <span className="info-tile-value">{machineMac || '1223 2323 2356 12'}</span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Дата выпуска WT</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Серийный номер</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Версия ПО модуля WT</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <button type="button" className="info-tile-btn">Обновление ПО WT</button>
                                </div>
                                <div className="info-tile">
                                    <div className="info-tile-status-row">
                                        <span className="info-tile-label">Система контроля газа</span>
                                        <span className="info-tile-badge info-tile-badge-active">Неактивно</span>
                                    </div>
                                    <div className="info-tile-status-row">
                                        <span className="info-tile-label">RFID</span>
                                        <span className="info-tile-badge info-tile-badge-inactive">Активно</span>
                                    </div>
                                    <div className="info-tile-status-row">
                                        <span className="info-tile-label">БВО</span>
                                        <span className="info-tile-badge info-tile-badge-active">Активно</span>
                                    </div>
                                    <div className="info-tile-row info-tile-row-editable">
                                        <span className="info-tile-value"></span>
                                        <span className="info-tile-edit" aria-hidden>✎</span>
                                    </div>
                                </div>
                                <div className="info-tile info-tile-software">
                                    <div className="info-tile-row"><span className="info-tile-label">Версия ПО ИП</span><span className="info-tile-value"></span></div>
                                    <div className="info-tile-row"><span className="info-tile-label">Версия ПО Лицовой платы</span><span className="info-tile-value"></span></div>
                                    <div className="info-tile-row"><span className="info-tile-label">Версия ПО БВО</span><span className="info-tile-value"></span></div>
                                    <div className="info-tile-row"><span className="info-tile-label">Версия ПО ИП</span><span className="info-tile-value"></span></div>
                                    <div className="info-tile-row"><span className="info-tile-label">Версия ПО ИП</span><span className="info-tile-value"></span></div>
                                    <div className="info-tile-row"><span className="info-tile-label">Версия ПО ИП</span><span className="info-tile-value"></span></div>
                                </div>
                                <div className="info-tile">
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Дата последнего ТО</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">ФИО проводившего ТО</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Пропуск проводившего ТО</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Время до планового ремонта</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                </div>
                                <div className="info-tile">
                                    <div className="info-tile-row info-tile-row-editable">
                                        <span className="info-tile-label">Наработка между ТО</span>
                                        <span className="info-tile-value"></span>
                                        <span className="info-tile-edit" aria-hidden>✎</span>
                                    </div>
                                    <div className="info-tile-row info-tile-row-editable">
                                        <span className="info-tile-label">Время между ТО</span>
                                        <span className="info-tile-value"></span>
                                        <span className="info-tile-edit" aria-hidden>✎</span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Наработка до ТО</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">Время до ТО</span>
                                        <span className="info-tile-value"></span>
                                    </div>
                                    <button type="button" className="info-tile-btn">История ТО ИП</button>
                                </div>
                                <div className="info-tile">
                                    <div className="info-tile-row">
                                        <span className="info-tile-label">RFID код</span>
                                        <span className="info-tile-value">{getRfidCode() || '—'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'graphs' && (
                            <div className="chart-stack">
                                <div className="chart-card large">
                                    <div
                                        className="chart-wrapper"
                                        ref={chartWrapperRef}
                                        onMouseMove={handleSharedHoverMove}
                                        onMouseLeave={handleSharedHoverLeave}
                                    >
                                        <div className="monitor-overlay-ruler" ref={timelineRulerRef}>
                                            <div className="monitor-overlay-ruler-scale">
                                                {Array.from({ length: 9 }, (_, idx) => {
                                                    const ratio = idx / 8;
                                                    const stamp = chartBounds.dayStart + ratio * (chartBounds.dayEnd - chartBounds.dayStart);
                                                    return (
                                                        <span key={`tick-${idx}`} className="monitor-overlay-ruler-tick-static">
                                                        {new Date(stamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    );
                                                })}
                                            </div>
                                            <div className="monitor-overlay-ruler-track">
                                                <div className="monitor-overlay-ruler-line" />
                                                {graphUsesServerData && draggingPin === 'start' && pinDragPreview && (
                                                    <span
                                                        className="monitor-time-pin-hint"
                                                        style={{ left: `${Math.max(0, Math.min(100, toDayPercent(rulerPinBounds.start)))}%` }}
                                                    >
                                                    {formatHistoryPinHintTime(rulerPinBounds.start)}
                                                </span>
                                                )}
                                                {graphUsesServerData && draggingPin === 'end' && pinDragPreview && (
                                                    <span
                                                        className="monitor-time-pin-hint"
                                                        style={{ left: `${Math.max(0, Math.min(100, toDayPercent(rulerPinBounds.end)))}%` }}
                                                    >
                                                    {formatHistoryPinHintTime(rulerPinBounds.end)}
                                                </span>
                                                )}
                                                <button
                                                    type="button"
                                                    className="monitor-time-pin"
                                                    style={{ left: `${Math.max(0, Math.min(100, toDayPercent(rulerPinBounds.start)))}%` }}
                                                    onMouseDown={() => handleTimelinePinMouseDown('start')}
                                                    title="Начало интервала"
                                                />
                                                <button
                                                    type="button"
                                                    className="monitor-time-pin"
                                                    style={{ left: `${Math.max(0, Math.min(100, toDayPercent(rulerPinBounds.end)))}%` }}
                                                    onMouseDown={() => handleTimelinePinMouseDown('end')}
                                                    title="Конец интервала"
                                                />
                                            </div>
                                        </div>
                                        <div
                                            className={`chart-pan-surface${graphUsesServerData ? ' chart-pan-surface--enabled' : ''}${chartPanActive ? ' chart-pan-surface--grabbing' : ''}`}
                                            onMouseDown={handleChartPanMouseDown}
                                        >
                                            <div className="chart-monitor-stack">
                                                <div
                                                    ref={chartCanvasRef}
                                                    className={`chart-canvas${chartPlotCursorHidden ? ' chart-canvas--plot-cursor-none' : ''}`}
                                                >
                                                    <Line
                                                        data={topChartData}
                                                        options={telemetryOverlayChartOptions}
                                                        ref={(chart) => {
                                                            if (chart && chart.canvas) {
                                                                chart.canvas.id = 'current-chart';
                                                                currentChartInstanceRef.current = chart;
                                                                syncPlotAreaFromChart();
                                                            }
                                                        }}
                                                    />
                                                    {plotDot.visible && !chartPanActive && (
                                                        <span
                                                            className="monitor-plot-cursor-dot"
                                                            style={{
                                                                left: `${plotDot.leftPx}px`,
                                                                top: `${plotDot.topPx}px`,
                                                            }}
                                                            aria-hidden
                                                        />
                                                    )}
                                                    {hoverCursor.active && !chartPanActive && plotArea.heightPx > 0 && (
                                                        <div
                                                            className="monitor-hover-crosshair monitor-hover-crosshair--in-chart"
                                                            style={{
                                                                left: `${(plotArea.chartLeftPx ?? plotArea.leftPx) + (hoverCursor.percent / 100) * plotArea.widthPx}px`,
                                                                top: `${plotArea.topPx}px`,
                                                                height: `${plotArea.heightPx}px`,
                                                                bottom: 'auto',
                                                            }}
                                                        />
                                                    )}
                                                    {hoverCursor.active && !chartPanActive && (hoverCursorTimeLabel || hoverInfo) && (
                                                        <div
                                                            className="monitor-hover-tooltip"
                                                            style={{
                                                                left: `${hoverCursor.xPx}px`,
                                                                transform: hoverCursor.flip ? 'translateX(calc(-100% - 2px))' : 'translateX(2px)'
                                                            }}
                                                        >
                                                            {hoverCursorTimeLabel && (
                                                                <div className="monitor-hover-tooltip-time">{hoverCursorTimeLabel}</div>
                                                            )}
                                                            {hoverInfo?.selectedRows?.map((row) => (
                                                                <div key={row.key}>
                                                                    <span style={{ color: row.color }}>{row.label}: {row.value.toFixed(1)}</span>
                                                                </div>
                                                            ))}
                                                            {hoverInfo?.errorTooltipLine && (
                                                                <div className="monitor-hover-tooltip-error">
                                                                    {hoverInfo.errorTooltipLine}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div
                                                    className="monitor-lanes"
                                                    style={{
                                                        position: 'relative',
                                                        paddingLeft: `${plotArea.leftPx}px`,
                                                        paddingRight: `${plotArea.rightPx}px`,
                                                    }}
                                                >
                                                    <div className="monitor-lane-row">
                                                        <span className="monitor-lane-label">Состояние</span>
                                                        <div className="monitor-lane-track monitor-lane-track--state">
                                                            {timelineRows.offline.map((seg, idx) => (
                                                                <span
                                                                    key={`state-offline-${idx}`}
                                                                    className="monitor-lane-segment monitor-lane-segment-offline"
                                                                    style={{
                                                                        left: `${toPercent(seg.start)}%`,
                                                                        width: `${Math.max(toPercent(seg.end) - toPercent(seg.start), 0.8)}%`
                                                                    }}
                                                                />
                                                            ))}
                                                            {timelineRows.online.map((seg, idx) => (
                                                                <span
                                                                    key={`state-online-${idx}`}
                                                                    className="monitor-lane-segment monitor-lane-segment-online"
                                                                    style={{
                                                                        left: `${toPercent(seg.start)}%`,
                                                                        width: `${Math.max(toPercent(seg.end) - toPercent(seg.start), 0.8)}%`
                                                                    }}
                                                                />
                                                            ))}
                                                            {timelineRows.welding.map((seg, idx) => (
                                                                <span
                                                                    key={`state-weld-${idx}`}
                                                                    className="monitor-lane-segment monitor-lane-segment-welding"
                                                                    style={{
                                                                        left: `${toPercent(seg.start)}%`,
                                                                        width: `${Math.max(toPercent(seg.end) - toPercent(seg.start), 0.8)}%`
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="monitor-lane-row">
                                                        <span className="monitor-lane-label">Ошибки</span>
                                                        <div className="monitor-lane-track" ref={errorsLaneTrackRef}>
                                                            {timelineRows.errors.map((seg, idx) => {
                                                                const width = Math.max(toPercent(seg.end) - toPercent(seg.start), 0.8);
                                                                return (
                                                                    <span
                                                                        key={`error-${idx}`}
                                                                        className="monitor-lane-segment monitor-lane-segment-error"
                                                                        style={{ left: `${toPercent(seg.start)}%`, width: `${width}%` }}
                                                                        title={seg.label}
                                                                    >
                                                            {width > 6 ? seg.label : ''}
                                                        </span>
                                                                );
                                                            })}
                                                            {hoverCursor.active && hoverInfo?.errorLabel && (
                                                                <div className="monitor-lane-hover-badge monitor-lane-hover-badge-error" style={{ left: `${hoverCursor.percent}%` }}>
                                                                    {hoverInfo.errorLabel}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="monitor-lane-row">
                                                        <span className="monitor-lane-label">Сварщик</span>
                                                        <div className="monitor-lane-track">
                                                            {timelineRows.welder.map((seg, idx) => (
                                                                <span
                                                                    key={`welder-${idx}`}
                                                                    className="monitor-lane-segment monitor-lane-segment-welder"
                                                                    style={{
                                                                        left: `${toPercent(seg.start)}%`,
                                                                        width: `${Math.max(toPercent(seg.end) - toPercent(seg.start), 0.8)}%`
                                                                    }}
                                                                    title={seg.value}
                                                                />
                                                            ))}
                                                            {hoverCursor.active && hoverInfo?.welderLabel && (
                                                                <div className="monitor-lane-hover-badge monitor-lane-hover-badge-welder" style={{ left: `${hoverCursor.percent}%` }}>
                                                                    {hoverInfo.welderLabel}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {hoverCursor.active && !chartPanActive && (
                                                        <div
                                                            className="monitor-lanes-crosshair-shell"
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                bottom: 0,
                                                                left: `${plotArea.leftPx}px`,
                                                                right: `${plotArea.rightPx}px`,
                                                                pointerEvents: 'none',
                                                                zIndex: 4,
                                                            }}
                                                        >
                                                            <div
                                                                className="monitor-hover-crosshair monitor-hover-crosshair--in-lanes"
                                                                style={{ left: `${hoverCursor.percent}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-controls" aria-label="Управление графиком">
                                        <button
                                            type="button"
                                            className="chart-control-btn"
                                            onClick={() => setYAxisLeftMax((prev) => stepLeftYMax(prev, true))}
                                            title="Приблизить левую ось Y (−50 к max)"
                                        >
                                            <span aria-hidden>＋</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="chart-control-btn"
                                            onClick={() => setYAxisLeftMax((prev) => stepLeftYMax(prev, false))}
                                            title="Отдалить левую ось Y (+50 к max)"
                                        >
                                            <span aria-hidden>－</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="chart-control-btn"
                                            onClick={handleGraphYZoomReset}
                                            title="Сброс Y-зума (левая max 750, правая max 100)"
                                        >
                                            <span aria-hidden>⟲</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`chart-control-btn chart-control-btn--history${todayPinExplore ? ' chart-control-btn--history-active' : ''}`}
                                            onClick={handleToggleTodayHistory}
                                            title={todayPinExplore ? 'Вернуться в live-режим' : 'История за сегодня (последний час)'}
                                        >
                                            <span className="chart-control-btn-label">{todayPinExplore ? 'Live' : 'История'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`chart-control-btn chart-control-btn--graph-expand${graphExpandedLayout ? ' chart-control-btn--graph-expand-active' : ''}`}
                                            onClick={() => setGraphExpandedLayout((v) => !v)}
                                            title={graphExpandedLayout ? 'Свернуть' : 'На весь экран'}
                                        >
                                            {graphExpandedLayout ? (
                                                <>
                                                    <FaCompress aria-hidden style={{ width: 11, height: 11, flexShrink: 0 }} />
                                                    <span className="chart-control-btn-label">Свернуть</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaExpand aria-hidden style={{ width: 11, height: 11, flexShrink: 0 }} />
                                                    <span className="chart-control-btn-label">На весь экран</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <AddEquipmentModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={handleSaveEquipmentEdit}
                welders={[]}
                organizationUnits={organizationUnits}
                editMode={true}
                initialData={editModalOpen ? {
                    machineId,
                    name: displayName,
                    department: organizationUnit,
                    organizationUnitId: machineOrganizationUnitId,
                } : null}
            />

            {historyError && (
                <div style={{ position: 'fixed', bottom: 12, left: 12, zIndex: 11000, color: '#ff8a96', fontSize: 12 }}>
                    {historyError}
                </div>
            )}
        </main>
    );
};

export default DeviceMonitorPage;