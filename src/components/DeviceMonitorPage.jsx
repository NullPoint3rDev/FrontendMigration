import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import {FaBell} from "react-icons/fa";
import UserProfile from '../components/UserProfile';

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
    { key: 'radiatorTemp', label: 'Темп. радиатора', color: '#66d1ff' },
    { key: 'inverterTemp', label: 'Темп. инвертора', color: '#7cffb2' },
    { key: 'chillerTempIn', label: 'Вход. темп. охл. жидкости', color: '#f1ca06' },
    { key: 'chillerTempOut', label: 'Исход. темп. охл. жидкости', color: '#ffd95a' },
    { key: 'powerConsumption', label: 'Потр. мощность', color: '#6d8bff' }
];

const DEFAULT_TELEMETRY_SERIES = TELEMETRY_CHANNELS_CONFIG.reduce((acc, channel) => {
    acc[channel.key] = [];
    return acc;
}, { mainsVoltageA: [], mainsVoltageB: [], mainsVoltageC: [] });

const DAILY_WIRE_LINEAR_DENSITY_KG_PER_METER = 0.000089;
const DAILY_ACTIVITY_INITIAL = {
    offMs: 0,
    standbyMs: 0,
    onMs: 0,
    weldingMs: 0,
};

const getDayStartTimestamp = (ts = Date.now()) => {
    const dayStart = new Date(ts);
    dayStart.setHours(0, 0, 0, 0);
    return dayStart.getTime();
};

const formatMsToClock = (ms) => {
    const safeMs = Math.max(0, Number(ms) || 0);
    const totalSeconds = Math.floor(safeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

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
        chillerTempOut: getStateNumberByKeys(wrappedState, ['Температура охлаждающей жидкости на выходе', 'ChillerTemperature2', 'chillerTemperature2']) ?? 0,
        powerConsumption: 0
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
        next.push({ x: xPoll, y: y });
        lastYRef.current = y;
    } else if (wasWelding && !nowWelding) {
        const last = lastYRef.current ?? y;
        next.push({ x: xPoll, y: last });
        next.push({ x: xPoll, y: 0 });
        lastYRef.current = 0;
    }

    return next;
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
    /** Масштаб по оси X: 1 — весь диапазон; больше — «приближение» к последним точкам (окно справа). */
    const [telemetryChartZoom, setTelemetryChartZoom] = useState({ top: 1, bottom: 1 });
    const [telemetryYZoom, setTelemetryYZoom] = useState(1);
    const [timelineSamples, setTimelineSamples] = useState([]);
    const [timeWindow, setTimeWindow] = useState({ start: null, end: null, touched: false });
    const [draggingPin, setDraggingPin] = useState(null);
    const timelineRulerRef = useRef(null);
    const activeTabRef = useRef(activeTab);
    const historyModeRef = useRef(false);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);
    const [dailyActivity, setDailyActivity] = useState(DAILY_ACTIVITY_INITIAL);
    const [dailyWireConsumptionKg, setDailyWireConsumptionKg] = useState(0);
    const dailyActivityRef = useRef(DAILY_ACTIVITY_INITIAL);
    const dailyWireConsumptionRef = useRef(0);
    const dailyStatsDayStartRef = useRef(getDayStartTimestamp(Date.now()));
    const lastDailySampleRef = useRef({ timestamp: null, mode: 'off', wireFeedMpm: 0 });

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
    const [hoverCursor, setHoverCursor] = useState({ active: false, ts: null, percent: 0, xPx: 0, flip: false });
    const [plotArea, setPlotArea] = useState({ leftPx: 0, rightPx: 0, widthPx: 0 });
    const [welderNameByRfid, setWelderNameByRfid] = useState({});
    const welderNameFetchInFlightRef = useRef(new Set());
    const telemetryHistoryStoreRef = useRef({ series: DEFAULT_TELEMETRY_SERIES, timeline: [], lastStoredTs: 0 });
    const historyCacheRef = useRef({ date: null, dayStart: null, dayEnd: null, pointsByTs: new Map() });
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
        return {
            ...DEFAULT_TELEMETRY_SERIES,
            weldingCurrent: points.map((p) => ({
                x: p.ts,
                y: p.current === null || p.current === undefined ? null : Number(p.current),
            })),
            // Voltage из истории: в десятых долях → делим на 10
            weldingVoltage: points.map((p) => ({
                x: p.ts,
                y: p.voltage === null || p.voltage === undefined ? null : (Number(p.voltage) || 0) / 10,
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

        const cache = historyCacheRef.current;
        for (const ts of Array.from(cache.pointsByTs.keys())) {
            if (ts >= fromMs && ts <= toMs) cache.pointsByTs.delete(ts);
        }

        const pts = await archiveDeviceApi.getArchiveTelemetryHistory(machineMac, fromMs, toMs);
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

    useEffect(() => {
        if (!selectedGraphDate) return;
        if (isTodayDateStr(selectedGraphDate)) {
            // Live режим по умолчанию (пятиминутка); суточный просмотр — только через пины (todayPinExplore).
            setIsHistoryMode(false);
            setTodayPinExplore(false);
            todayPinExploreRef.current = false;
            todayDayBoundsRef.current = null;
            setHistoryDayBounds({ start: null, end: null });
            historyCacheRef.current = { date: null, dayStart: null, dayEnd: null, pointsByTs: new Map() };
            pinDragPreviewRef.current = null;
            setPinDragPreview(null);
            setDraggingPin(null);
            return;
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

            const window = await pickDefaultHourWithData(selectedGraphDate);
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
    }, [selectedGraphDate, isTodayDateStr, HISTORY_MAX_MS, pickDefaultHourWithData, buildHistorySeriesForWindow, buildHistoryTimelineForWindow]);

    const getDayBoundsForDateStr = useCallback((dateStr) => {
        const [yyyy, mm, dd] = String(dateStr).split('-').map((x) => parseInt(x, 10));
        const dayStart = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime();
        return { dayStart, dayEnd: dayStart + HISTORY_MAX_MS };
    }, [HISTORY_MAX_MS]);

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
                })
                .catch(() => setHistoryError('Не удалось загрузить историю с сервера.'));
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

    useEffect(() => {
        resetDailyStats(Date.now());
    }, [machineMac]);

    // Получаем ID аппарата по MAC адресу при загрузке страницы
    useEffect(() => {
        const fetchMachineId = async () => {
            if (!machineMac || machineMac === 'Неизвестный MAC') return;
            try {
                const machines = await getAllWeldingMachines();
                const machine = Array.isArray(machines)
                    ? machines.find(m => m.mac === machineMac)
                    : null;
                if (machine && machine.id) {
                    setMachineId(machine.id);
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

    function resetDailyStats(timestamp = Date.now()) {
        dailyActivityRef.current = { ...DAILY_ACTIVITY_INITIAL };
        dailyWireConsumptionRef.current = 0;
        dailyStatsDayStartRef.current = getDayStartTimestamp(timestamp);
        lastDailySampleRef.current = { timestamp: timestamp, mode: 'off', wireFeedMpm: 0 };
        setDailyActivity({ ...DAILY_ACTIVITY_INITIAL });
        setDailyWireConsumptionKg(0);
    }

    function updateDailyStatsFromTelemetry(panelState, timestamp = Date.now()) {
        const dayStart = getDayStartTimestamp(timestamp);
        if (dailyStatsDayStartRef.current !== dayStart) {
            resetDailyStats(timestamp);
        }

        const mode = getMachineActivityModeFromPanelState(panelState);
        const wrappedState = {
            ...panelState,
            properties: flattenPanelState(panelState),
        };
        const wireFeedMpm = getStateNumberByKeys(wrappedState, [
            'WireFeedSpeed',
            'wireFeedSpeed',
            'State.WireFeedSpeed',
            'Скорость подачи проволоки',
            'Подача проволоки',
            'WireFeed',
            'wireFeed'
        ]) ?? 0;

        const prevSample = lastDailySampleRef.current;
        if (prevSample.timestamp != null) {
            const deltaMs = Math.max(0, timestamp - prevSample.timestamp);
            const nextActivity = { ...dailyActivityRef.current };
            if (prevSample.mode === 'welding') nextActivity.weldingMs += deltaMs;
            else if (prevSample.mode === 'standby') nextActivity.standbyMs += deltaMs;
            else if (prevSample.mode === 'on') nextActivity.onMs += deltaMs;
            else nextActivity.offMs += deltaMs;
            dailyActivityRef.current = nextActivity;
            setDailyActivity(nextActivity);

            if (prevSample.mode === 'welding' && prevSample.wireFeedMpm > 0) {
                const minutes = deltaMs / 60000;
                const kgDelta = prevSample.wireFeedMpm * DAILY_WIRE_LINEAR_DENSITY_KG_PER_METER * minutes;
                const nextWire = dailyWireConsumptionRef.current + kgDelta;
                dailyWireConsumptionRef.current = nextWire;
                setDailyWireConsumptionKg(nextWire);
            }
        }

        lastDailySampleRef.current = { timestamp, mode, wireFeedMpm };
    }

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
                updateDailyStatsFromTelemetry(response, sampleTs);
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

                if (!historyModeRef.current && !todayPinExploreRef.current && activeTabRef.current === 'graphs') {
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
                updateDailyStatsFromTelemetry(null, Date.now());
                // Нет данных - просто обновляем состояние
                updateConnectionStatus(false, false);
                setError('Устройство не найдено');
            }
        } catch (err) {
            console.error('Ошибка получения состояния устройства:', err);
            updateDailyStatsFromTelemetry(null, Date.now());
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

                // Сохраняем errorCode из корня state, если он есть
                if (data.state.errorCode !== undefined && data.state.errorCode !== null) {
                    params.errorCode = data.state.errorCode;
                }

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
    const handleOpenEditModal = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        setEditModalOpen(true);
    };

    // Сохранение из модалки: обновить наименование и подразделение аппарата
    const handleSaveEquipmentEdit = async (payload) => {
        let id = payload?.machineId ?? machineId;
        if (!id && machineMac && machineMac !== 'Неизвестный MAC') {
            const machines = await getAllWeldingMachines().catch(() => []);
            const machineByMac = Array.isArray(machines)
                ? machines.find((m) => (m.mac || '').toLowerCase() === String(machineMac).toLowerCase())
                : null;
            if (machineByMac?.id) {
                id = machineByMac.id;
                setMachineId(machineByMac.id);
            }
        }
        if (!id) {
            const err = new Error('Не удалось определить аппарат для сохранения.');
            err.errors = { api: err.message };
            throw err;
        }
        const { name, department } = payload || {};
        const trimmedName = (name || '').trim();
        if (!trimmedName) {
            const err = new Error('Название не может быть пустым.');
            err.errors = { name: err.message };
            throw err;
        }
        try {
            const machine = await getWeldingMachineById(id);
            if (!machine || !machine.id) {
                throw new Error('Аппарат не найден');
            }
            const unitsSource = organizationUnits.length > 0
                ? organizationUnits
                : (await getAllOrganizationUnits().catch(() => []));
            const unit = unitsSource.find((u) => (u.name || '') === (department || ''));
            const organizationUnitForApi = unit
                ? { id: unit.id, name: unit.name || '' }
                : (machine.organizationUnit || null);
            // Отправляем только поля WeldingMachineDTO, чтобы не тащить тяжелые вложенные структуры.
            const updateData = {
                id,
                name: trimmedName,
                mac: machine.mac || machineMac,
                deviceModel: machine.deviceModel || 'Core Pulse',
                serialNumber: machine.serialNumber ?? null,
                inventoryNumber: machine.inventoryNumber ?? null,
                commissionDate: machine.commissionDate ?? null,
                manufactureYear: machine.manufactureYear ?? null,
                lastService: machine.lastService ?? null,
                weldingMachineType: machine.weldingMachineType ?? null,
                organizationUnit: organizationUnitForApi,
            };
            await updateWeldingMachine(id, updateData);
            setDisplayName(trimmedName);
            const newParams = new URLSearchParams(searchParams);
            newParams.set('name', trimmedName);
            newParams.set('organizationUnit', department || '');
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

    // Равномерные деления осей (одинаковый gap между подписями)
    const LEFT_Y_TICKS = [0, 100, 200, 300, 400, 500];
    const RIGHT_Y_TICKS = [0, 10, 20, 30, 40, 50];

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
                    min: 0,
                    max: 500,
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
                        callback: (v) => (LEFT_Y_TICKS.includes(v) ? v : '')
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        axis.ticks = LEFT_Y_TICKS.map((v) => ({ value: v }));
                    }
                },
                yRight: {
                    min: 0,
                    max: 50,
                    position: 'right',
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: { size: 11 },
                        padding: 8,
                        callback: (v) => (RIGHT_Y_TICKS.includes(v) ? v : '')
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        axis.ticks = RIGHT_Y_TICKS.map((v) => ({ value: v }));
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

    const resolveMainsVoltageSeriesKey = (slotName) => {
        const phase = telemetryPhaseSelection[slotName] || 'A';
        return phase === 'C' ? 'mainsVoltageC' : (phase === 'B' ? 'mainsVoltageB' : 'mainsVoltageA');
    };

    const buildTelemetryDataset = (slotName, slotKey) => {
        if (!slotKey) return null;
        const channel = TELEMETRY_CHANNELS_CONFIG.find(item => item.key === slotKey);
        if (!channel) return null;
        const sourceSeriesKey = slotKey === 'mainsVoltage' ? resolveMainsVoltageSeriesKey(slotName) : slotKey;
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
            yAxisID: slotKey === 'weldingVoltage' ? 'yRight' : 'y'
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
            return '#0cff00'; // Зеленый
        }

        // Аппарат включен - зеленый
        if (stateLower.includes('включен') || stateLower.includes('on') || stateLower === 'аппарат включен') {
            return '#65d66f';
        }

        // Сварка - желтый
        if (stateLower.includes('сварка') || stateLower.includes('welding') || stateLower.includes('weld')) {
            return '#fbb56b'; // Желтый
        }

        // Авария - красный
        if (stateLower.includes('авария') || stateLower.includes('error') || stateLower.includes('ошибка') ||
            stateLower.includes('emergency') || stateLower.includes('failure')) {
            return '#f06c7b';
        }

        // Дежурный режим - зеленый
        if (stateLower.includes('дежурн') || stateLower.includes('standby') || stateLower === 'дежурный режим') {
            return '#0cff00'; // Зеленый
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

        // Ошибки: приоритет у свойства "Ошибки" — там полный список от парсера (несколько через запятую/точку с запятой).
        // Если "Ошибки" нет — показываем одну по errorCode (первый код от аппарата).
        const errorCode = data['errorCode'] || data.errorCode;
        const errorsProperty = data['Ошибки'] || data['Errors'] || data.errors;
        const hasErrorsText = errorsProperty &&
            errorsProperty !== 'Нет ошибок' &&
            errorsProperty !== 'No errors' &&
            String(errorsProperty).trim() !== '' &&
            String(errorsProperty).toLowerCase() !== 'null';

        if (hasErrorsText) {
            // Парсер отдаёт несколько ошибок через ", " или "; " — показываем каждую отдельной карточкой
            const parts = String(errorsProperty).split(/,|;/).map(s => s.trim()).filter(Boolean);
            parts.forEach((message) => {
                errors.push({ code: 'ERR', time: timeStr, date: dateStr, severity: 'error', message });
            });
        } else {
            const resolvedFromCode = (errorCode !== undefined && errorCode !== null && errorCode !== 'null' && String(errorCode).trim() !== '' && String(errorCode) !== '0')
                ? getEquipmentErrorName(errorCode)
                : null;
            if (resolvedFromCode) {
                errors.push({ code: 'ERR', time: timeStr, date: dateStr, severity: 'error', message: resolvedFromCode });
            }
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

    const handleTelemetryTileClick = (channelKey, slot) => {
        setTelemetrySelection(prev => {
            const next = { ...prev };
            const slotName = slot === 1 ? 'slot1' : 'slot2';
            const otherSlotName = slot === 1 ? 'slot2' : 'slot1';
            next[slotName] = prev[slotName] === channelKey ? null : channelKey;
            // Разрешаем один и тот же канал "Напряжение сети" в обоих слотах,
            // чтобы показывать разные фазы на разных графиках.
            if (next[slotName] && next[otherSlotName] === next[slotName] && channelKey !== 'mainsVoltage') {
                next[otherSlotName] = null;
            }
            return next;
        });
    };
    const handleMainsPhaseChange = (slotName, phase) => {
        setTelemetryPhaseSelection(prev => ({ ...prev, [slotName]: phase }));
    };

    const telemetryChannels = TELEMETRY_CHANNELS_CONFIG.map(channel => ({
        ...channel,
        active: telemetrySelection.slot1 === channel.key || telemetrySelection.slot2 === channel.key,
        tile1: telemetrySelection.slot1 === channel.key,
        tile2: telemetrySelection.slot2 === channel.key,
    }));

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
        (display.weldingCurrent || []).forEach((p) => {
            if (typeof p.x === 'number' && Number.isFinite(p.x)) xs.push(p.x);
        });
        (display.weldingVoltage || []).forEach((p) => {
            if (typeof p.x === 'number' && Number.isFinite(p.x)) xs.push(p.x);
        });
        return xs.sort((a, b) => a - b);
    }, [telemetrySeries.weldingCurrent, telemetrySeries.weldingVoltage, historySeriesSnapshot, graphUsesServerData]);

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
        const z = Math.max(1, Math.min(telemetryYZoom || 1, 10));
        const yMax = 500 / z;
        const leftTicks = LEFT_Y_TICKS.filter((v) => v <= yMax + 1e-9);
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
                    min: 0,
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
                        callback: (v) => (LEFT_Y_TICKS.includes(v) ? v : '')
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        axis.ticks = leftTicks.map((v) => ({ value: v }));
                    }
                }
            },
            animation: { duration: 0 },
            elements: { point: { radius: 0, hoverRadius: 4 }, line: { tension: 0, borderWidth: graphUsesServerData ? 1.5 : 2 } },
            interaction: { intersect: false, mode: 'index' },
            layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } }
        };
    }, [activeWindow.start, activeWindow.end, graphUsesServerData, telemetryYZoom]);

    const topChartData = useMemo(() => {
        const src = graphUsesServerData ? historySeriesSnapshot : telemetrySeries;
        let wcRaw = src.weldingCurrent || [];
        let wvRaw = src.weldingVoltage || [];
        if (graphUsesServerData) {
            const dec = decimateAlignedXYPairs(wcRaw, wvRaw, HISTORY_CHART_MAX_POINTS);
            wcRaw = dec.weldingCurrent;
            wvRaw = dec.weldingVoltage;
        }
        const mapPt = (d) => {
            const y = d?.y;
            const ny = y === null || y === undefined || Number.isNaN(Number(y)) ? null : Number(y);
            return { x: d.x, y: ny };
        };
        const wc = wcRaw.map(mapPt);
        const wv = wvRaw.map(mapPt);

        return {
            datasets: [
                {
                    label: 'Сварочный ток',
                    data: wc,
                    borderColor: '#3ec7ff',
                    backgroundColor: graphUsesServerData
                        ? 'rgba(62,199,255,0.12)'
                        : (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return 'rgba(62,199,255,0.2)';
                            return createGradient(ctx, chartArea, 'rgba(62,199,255,0.55)', 'rgba(62,199,255,0.02)');
                        },
                    fill: graphUsesServerData ? 'origin' : true,
                    yAxisID: 'y'
                },
                {
                    label: 'Сварочное напряжение',
                    data: wv,
                    borderColor: '#ff61c8',
                    backgroundColor: graphUsesServerData
                        ? 'rgba(255,97,200,0.10)'
                        : (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return 'rgba(255,97,200,0.2)';
                            return createGradient(ctx, chartArea, 'rgba(255,97,200,0.48)', 'rgba(255,97,200,0.02)');
                        },
                    fill: graphUsesServerData ? 'origin' : true,
                    yAxisID: 'y'
                }
            ]
        };
    }, [telemetrySeries.weldingCurrent, telemetrySeries.weldingVoltage, historySeriesSnapshot, graphUsesServerData]);

    const timelineInWindow = useMemo(
        () => (graphUsesServerData ? historyTimelineSnapshot : timelineSamples).filter((s) => s.x >= activeWindow.start && s.x <= activeWindow.end),
        [timelineSamples, historyTimelineSnapshot, graphUsesServerData, activeWindow.start, activeWindow.end]
    );

    const buildSegments = (samples, predicate, valueGetter) => {
        const segments = [];
        if (!samples.length) return segments;
        let current = null;
        samples.forEach((s, idx) => {
            const v = valueGetter ? valueGetter(s) : null;
            const active = predicate(s);
            if (active) {
                if (!current || (valueGetter && current.value !== v)) {
                    if (current) segments.push(current);
                    current = { start: s.x, end: s.x, value: v };
                } else {
                    current.end = s.x;
                }
            } else if (current) {
                segments.push(current);
                current = null;
            }
            if (idx === samples.length - 1 && current) segments.push(current);
        });
        return segments;
    };

    const timelineRows = useMemo(() => {
        const online = buildSegments(timelineInWindow, (s) => Boolean(s.isOnline));
        const welding = buildSegments(timelineInWindow, (s) => Boolean(s.isWelding));
        const errors = buildSegments(
            timelineInWindow,
            (s) => Number.isFinite(Number(s.errorCode)) && Number(s.errorCode) > 0,
            (s) => Number(s.errorCode)
        ).map((seg) => ({ ...seg, label: formatErrorCodeLabel(seg.value) }));
        const welder = buildSegments(
            timelineInWindow,
            (s) => Boolean(s.rfid),
            (s) => String(s.rfid)
        );
        return { online, welding, errors, welder };
    }, [timelineInWindow]);

    const toPercent = useCallback((x) => {
        const range = Math.max(activeWindow.end - activeWindow.start, 1);
        return ((x - activeWindow.start) / range) * 100;
    }, [activeWindow.end, activeWindow.start]);
    const toDayPercent = useCallback((x) => {
        const range = Math.max(chartBounds.dayEnd - chartBounds.dayStart, 1);
        return ((x - chartBounds.dayStart) / range) * 100;
    }, [chartBounds.dayEnd, chartBounds.dayStart]);

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

    const hoverInfo = useMemo(() => {
        if (!hoverCursor.active || !Number.isFinite(hoverCursor.ts)) return null;
        const displaySeries = graphUsesServerData ? historySeriesSnapshot : telemetrySeries;
        const current = findNearestPointValue(displaySeries.weldingCurrent || [], hoverCursor.ts);
        const voltage = findNearestPointValue(displaySeries.weldingVoltage || [], hoverCursor.ts);
        const errorSeg = findSegmentAtTs(timelineRows.errors, hoverCursor.ts);
        const welderSeg = findSegmentAtTs(timelineRows.welder, hoverCursor.ts);

        const welderLabel = welderSeg?.value ? welderNameByRfid[welderSeg.value] || null : null;

        return {
            current,
            voltage,
            errorLabel: errorSeg?.label || null,
            welderLabel,
            welderRfid: welderSeg?.value || null,
        };
    }, [hoverCursor, graphUsesServerData, historySeriesSnapshot, telemetrySeries, findNearestPointValue, timelineRows, findSegmentAtTs, welderNameByRfid]);

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
    const syncPlotAreaFromChart = useCallback(() => {
        const chart = currentChartInstanceRef.current;
        if (!chart || !chart.chartArea || !Number.isFinite(chart.width)) return;
        const leftPx = Math.max(0, chart.chartArea.left || 0);
        const rightPx = Math.max(0, chart.width - (chart.chartArea.right || chart.width));
        const widthPx = Math.max((chart.chartArea.right || 0) - (chart.chartArea.left || 0), 1);
        setPlotArea({ leftPx, rightPx, widthPx });
    }, []);

    useEffect(() => {
        if (activeTab !== 'graphs') return undefined;
        syncPlotAreaFromChart();
        const onResize = () => syncPlotAreaFromChart();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [activeTab, syncPlotAreaFromChart, topChartData, activeWindow.start, activeWindow.end]);

    const handleSharedHoverMove = useCallback((event) => {
        if (!chartWrapperRef.current) return;
        const rect = chartWrapperRef.current.getBoundingClientRect();
        if (!rect.width) return;
        const left = Number.isFinite(plotArea.leftPx) ? plotArea.leftPx : 0;
        const width = Number.isFinite(plotArea.widthPx) && plotArea.widthPx > 0 ? plotArea.widthPx : rect.width;
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - left) / width));
        const xPx = left + ratio * width;
        const ts = activeWindow.start + ratio * (activeWindow.end - activeWindow.start);
        const tooltipW = 240;
        const flip = xPx > (left + width - tooltipW);
        setHoverCursor({
            active: true,
            ts,
            percent: ratio * 100,
            xPx,
            flip,
        });
    }, [activeWindow.start, activeWindow.end, plotArea.leftPx, plotArea.widthPx]);

    const handleSharedHoverLeave = useCallback(() => {
        setHoverCursor({ active: false, ts: null, percent: 0, xPx: 0 });
    }, []);

    const handleTimelinePinMouseDown = (pin) => {
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
    }, [draggingPin, chartBounds.dayStart, chartBounds.dayEnd, activeWindow.start, activeWindow.end]);

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

    const handlePrevDay = () => setSelectedGraphDate((d) => shiftDateByDays(d || toLocalDateInput(new Date()), -1));
    const handleNextDay = () => {
        if (isNextDayDisabled) return;
        setSelectedGraphDate((d) => shiftDateByDays(d || toLocalDateInput(new Date()), 1));
    };
    const handleOpenCalendar = () => datePickerInputRef.current?.showPicker?.() || datePickerInputRef.current?.click?.();

    return (
        <main className="main-panel">
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
                                className="monitor-page-top-tab monitor-page-top-tab--placeholder"
                                disabled
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
                        <div className="machine-info-row">
                            <span className="machine-info-label">Имя:</span>
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
                        <div className="machine-info-row">
                            <span className="machine-info-label">Подразделение:</span>
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
                                <span className="status-value numeric status-value-success">{formatMsToClock(dailyActivity.onMs)}</span>
                            </div>
                            <div className="status-row">
                                <span className="status-label">Сварка:</span>
                                <span className="status-value numeric status-value-accent">{formatMsToClock(dailyActivity.weldingMs)}</span>
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

            <section className="bottom-panel">
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
                                            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                                            title="Выбрать дату"
                                        >
                                            {selectedGraphDate || toLocalDateInput(new Date())}
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
                                        <React.Fragment key={channel.key}>
                                            <div
                                                className={`telemetry-item ${channel.active ? 'active' : ''}`}
                                            >
                                                <span className="telemetry-label">{channel.label}</span>
                                                <div className="telemetry-tiles">
                                                    <button
                                                        type="button"
                                                        className={`telemetry-tile ${channel.active && channel.tile1 ? 'active' : ''}`}
                                                        style={{ color: channel.active && channel.tile1 ? channel.color : 'rgba(188, 183, 197, 0.4)' }}
                                                        onClick={() => handleTelemetryTileClick(channel.key, 1)}
                                                    >
                                                        <span className="wave-icon">~</span>
                                                    </button>
                                                </div>
                                            </div>
                                            {channel.key === 'mainsVoltage' && (channel.tile1 || channel.tile2) && (
                                                <div className="telemetry-item" style={{ paddingTop: 4, paddingBottom: 4 }}>
                                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                        {channel.tile1 && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                {['A', 'B', 'C'].map((phase) => (
                                                                    <button
                                                                        key={`slot1_${phase}`}
                                                                        type="button"
                                                                        className={`telemetry-tile ${telemetryPhaseSelection.slot1 === phase ? 'active' : ''}`}
                                                                        style={{ color: telemetryPhaseSelection.slot1 === phase ? channel.color : 'rgba(188, 183, 197, 0.4)' }}
                                                                        onClick={() => handleMainsPhaseChange('slot1', phase)}
                                                                    >
                                                                        <span className="tile-number">{phase}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {channel.tile2 && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                {['A', 'B', 'C'].map((phase) => (
                                                                    <button
                                                                        key={`slot2_${phase}`}
                                                                        type="button"
                                                                        className={`telemetry-tile ${telemetryPhaseSelection.slot2 === phase ? 'active' : ''}`}
                                                                        style={{ color: telemetryPhaseSelection.slot2 === phase ? channel.color : 'rgba(188, 183, 197, 0.4)' }}
                                                                        onClick={() => handleMainsPhaseChange('slot2', phase)}
                                                                    >
                                                                        <span className="tile-number">{phase}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
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
                                    {hoverCursor.active && (
                                        <div
                                            className="monitor-hover-crosshair monitor-hover-crosshair--full"
                                            style={{ left: `${hoverCursor.xPx}px` }}
                                        />
                                    )}
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
                                    <div className="chart-canvas">
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
                                        {hoverCursor.active && hoverInfo && (
                                            <div
                                                className="monitor-hover-tooltip"
                                                style={{
                                                    left: `${hoverCursor.xPx}px`,
                                                    transform: hoverCursor.flip ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)'
                                                }}
                                            >
                                                {hoverInfo.current != null && <div><span className="monitor-hover-current">Сварочный ток: {hoverInfo.current.toFixed(1)}</span></div>}
                                                {hoverInfo.voltage != null && <div><span className="monitor-hover-voltage">Сварочное напряжение: {hoverInfo.voltage.toFixed(1)}</span></div>}
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className="monitor-lanes"
                                        style={{
                                            paddingLeft: `${plotArea.leftPx}px`,
                                            paddingRight: `${plotArea.rightPx}px`,
                                        }}
                                    >
                                        <div className="monitor-lane-row">
                                            <span className="monitor-lane-label">Состояние</span>
                                            <div className="monitor-lane-track monitor-lane-track--state">
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
                                            <div className="monitor-lane-track">
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
                                    </div>
                                </div>
                                <div className="chart-controls" aria-label="Управление графиком">
                                    <button
                                        type="button"
                                        className="chart-control-btn"
                                        onClick={() => setTelemetryYZoom((z) => Math.min(10, Math.round((Math.max(1, z) * 1.25) * 100) / 100))}
                                        title="Увеличить (Y)"
                                    >
                                        <span aria-hidden>＋</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="chart-control-btn"
                                        onClick={() => setTelemetryYZoom((z) => Math.max(1, Math.round((Math.max(1, z) / 1.25) * 100) / 100))}
                                        title="Уменьшить (Y)"
                                    >
                                        <span aria-hidden>－</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="chart-control-btn"
                                        onClick={() => {
                                            setTelemetryYZoom(1);
                                            if (selectedGraphDate && isTodayDateStr(selectedGraphDate)) {
                                                setTodayPinExplore(false);
                                                todayPinExploreRef.current = false;
                                                todayDayBoundsRef.current = null;
                                                setHistoryDayBounds({ start: null, end: null });
                                                historyCacheRef.current = { date: null, dayStart: null, dayEnd: null, pointsByTs: new Map() };
                                                setHistorySeriesSnapshot(DEFAULT_TELEMETRY_SERIES);
                                                setHistoryTimelineSnapshot([]);
                                                setPinDragPreview(null);
                                                pinDragPreviewRef.current = null;
                                                setDraggingPin(null);
                                                setTimeWindow({ start: null, end: null, touched: false });
                                            }
                                        }}
                                        title="Сброс зума (Y) и интервала за сегодня (пятиминутный live)"
                                    >
                                        <span aria-hidden>⟲</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <AddEquipmentModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={handleSaveEquipmentEdit}
                welders={[]}
                organizationUnits={organizationUnits}
                editMode={true}
                initialData={editModalOpen ? { machineId, name: displayName, department: organizationUnit } : null}
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