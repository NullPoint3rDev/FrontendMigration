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

    if (next.length > 200) next = next.slice(-100);
    return next;
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
    const [disconnectTimeout, setDisconnectTimeout] = useState(null);

    // Состояние для отображения списка телеметрии
    const [isTelemetryListExpanded, setIsTelemetryListExpanded] = useState(true);

    // Состояние для активной вкладки (Графики/Информация)
    const [activeTab, setActiveTab] = useState('graphs');

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
    const prevWeldingForChartRef = useRef(null);
    const lastWeldingCurrentChartRef = useRef(0);
    const lastWeldingVoltageChartRef = useRef(0);
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
    /** Как в archive WeldingMachinePanel: при >200 точек оставляем последние 100 */
    const trimChartSeries = (prev, point) => {
        const next = [...prev, point];
        return next.length > 200 ? next.slice(-100) : next;
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
            if (disconnectTimeout) {
                clearTimeout(disconnectTimeout);
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [disconnectTimeout]);

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
    }, [machineMac]);

    // Очистка серий при потере связи (не завязываем на deviceData — он обновляется с дебаунсом и мог бы сбрасывать график после poll)
    useEffect(() => {
        if (!hasData) {
            prevWeldingForChartRef.current = null;
            lastWeldingCurrentChartRef.current = 0;
            lastWeldingVoltageChartRef.current = 0;
            setTelemetrySeries(DEFAULT_TELEMETRY_SERIES);
            setTelemetryChartZoom({ top: 1, bottom: 1 });
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
            if (disconnectTimeout) {
                clearTimeout(disconnectTimeout);
                setDisconnectTimeout(null);
            }

            setIsConnected(true);
            setHasData(true);
        } else {
            // Если устройство отключено - добавляем небольшую задержку (2 секунды)
            // чтобы избежать мигания при кратковременных паузах
            if (disconnectTimeout) {
                clearTimeout(disconnectTimeout);
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
                setDisconnectTimeout(null);
            }, 3000); // 3 секунды задержки

            setDisconnectTimeout(timeout);
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
                            next.mainsVoltageA = trimChartSeries(prev.mainsVoltageA || [], { x: xPoll, y: yA });
                            next.mainsVoltageB = trimChartSeries(prev.mainsVoltageB || [], { x: xPoll, y: yB });
                            next.mainsVoltageC = trimChartSeries(prev.mainsVoltageC || [], { x: xPoll, y: yC });
                        } else if (channel.key === 'weldingCurrent') {
                            next.weldingCurrent = appendWeldingPulseSeries(
                                prev.weldingCurrent || [],
                                yi,
                                wasWelding,
                                wNow,
                                lastWeldingCurrentChartRef,
                                xPoll
                            );
                        } else if (channel.key === 'weldingVoltage') {
                            next.weldingVoltage = appendWeldingPulseSeries(
                                prev.weldingVoltage || [],
                                yu,
                                wasWelding,
                                wNow,
                                lastWeldingVoltageChartRef,
                                xPoll
                            );
                        } else {
                            const y = Math.round(Number(telemetrySample[channel.key] ?? 0) * 10) / 10;
                            next[channel.key] = trimChartSeries(prev[channel.key] || [], { x: xPoll, y });
                        }
                    });
                    return next;
                });
                prevWeldingForChartRef.current = wNow;

                // Просто обновляем состояние - есть данные
                updateConnectionStatus(true, true);
                setLastUpdate(new Date());
                setError(null);
                setIsConnecting(false);

                // Добавляем в историю сообщений
                setMessageHistory(prev => [
                    {
                        timestamp: new Date(),
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
        if (!payload.editMode || !payload.machineId) {
            const err = new Error('Не удалось определить аппарат для сохранения.');
            err.errors = { api: err.message };
            throw err;
        }
        const { machineId: id, name, department } = payload;
        const trimmedName = (name || '').trim();
        if (!trimmedName) {
            return;
        }
        try {
            const machine = await getWeldingMachineById(id);
            if (!machine || !machine.id) {
                throw new Error('Аппарат не найден');
            }
            const unit = organizationUnits.find((u) => (u.name || '') === (department || ''));
            const organizationUnitForApi = unit
                ? { id: unit.id, name: unit.name || '' }
                : (machine.organizationUnit || null);
            const updateData = {
                ...machine,
                name: trimmedName,
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
            return '#0cff00'; // Зеленый
        }

        // Сварка - желтый
        if (stateLower.includes('сварка') || stateLower.includes('welding') || stateLower.includes('weld')) {
            return '#fbb56b'; // Желтый
        }

        // Авария - красный
        if (stateLower.includes('авария') || stateLower.includes('error') || stateLower.includes('ошибка') ||
            stateLower.includes('emergency') || stateLower.includes('failure')) {
            return '#E42F34'; // Красный
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

    const getCurrentProgress = () => {
        const current = parseFloat(getCurrentValue());
        if (isNaN(current)) return 0;
        return Math.min((current / 500) * 100, 100);
    };

    const getVoltageProgress = () => {
        const voltage = parseFloat(getVoltageValue());
        if (isNaN(voltage)) return 0;
        return Math.min((voltage / 50) * 100, 100);
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

    const systemParameters = getSystemParameters();
    const incidentLog = getErrors();
    const currentValue = getCurrentValue();
    const voltageValue = getVoltageValue();
    const weldingTimer = getWeldingTimer();
    const rfidCode = getRfidCode();
    const hasRfidCode = rfidCode !== null;
    const currentProgress = getCurrentProgress();
    const voltageProgress = getVoltageProgress();
    const isWeldingActive = isWelding();

    // Определяем, нужно ли показывать таймер желтым (сварка идет или только что закончилась)
    const isTimerActive = isWeldingActive || (weldingEndTime && (currentTime - weldingEndTime < 2000));

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

    const topChartData = getCurrentChartData();
    const bottomChartData = getVoltageChartData();
    const telemetryChartXs = (chartData) => {
        const ds = chartData.datasets || [];
        return ds.flatMap((d) => (d.data || []).map((p) => (typeof p.x === 'number' ? p.x : 0)));
    };
    const getTimeBounds = (xs) => {
        const finite = xs.filter((x) => Number.isFinite(x));
        if (!finite.length) {
            const now = Date.now();
            return { minX: now - 60_000, maxX: now };
        }
        return { minX: Math.min(...finite), maxX: Math.max(...finite) };
    };
    const topTimeBounds = getTimeBounds(telemetryChartXs(topChartData));
    const bottomTimeBounds = getTimeBounds(telemetryChartXs(bottomChartData));

    const handleTelemetryChartZoom = (panel, direction) => {
        setTelemetryChartZoom((prev) => {
            const key = panel === 'top' ? 'top' : 'bottom';
            let z = prev[key];
            if (direction === 'in') {
                z = Math.min(z * 1.25, 100);
            } else if (direction === 'out') {
                z = Math.max(1, z / 1.25);
            } else {
                z = 1;
            }
            return { ...prev, [key]: z };
        });
    };

    return (
        <main className="main-panel">
            <div className="top-grid">
                <section className="machine-section" aria-label="Сварочный аппарат">
                    <div className="machine-header">
                        <button
                            type="button"
                            className="machine-info-back-tile"
                            onClick={handleBackToEquipment}
                            title="Вернуться к списку оборудования"
                        >
                            <span className="machine-info-icon">←</span>
                        </button>
                        {machineId && (
                            <button
                                type="button"
                                className="machine-info-back-tile"
                                onClick={handleDeleteMachine}
                                title="Удалить аппарат"
                                style={{ marginLeft: '8px' }}
                            >
                                <span className="machine-info-icon">✕</span>
                            </button>
                        )}

                    </div>
                    <div className="machine-title">
                        <span className="machine-title-main">CORE</span>
                        <span className="machine-title-accent">PULSE</span>
                    </div>
                    <div className="machine-info-tiles">
                        <div className="machine-info-row">
                            <button
                                type="button"
                                className="machine-info-icon-tile"
                                onClick={handleOpenEditModal}
                                title="Редактировать наименование и подразделение"
                                style={{
                                    cursor: 'pointer',
                                    border: 'none',
                                    background: 'transparent',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <span className="machine-info-icon">✎</span>
                            </button>
                            <span className="machine-info-text">{displayName}</span>
                        </div>
                        {organizationUnit && (
                            <div className="machine-info-row">
                                <div className="machine-info-icon-tile">
                                    <span className="machine-info-icon">📍</span>
                                </div>
                                <span className="machine-info-text">{organizationUnit}</span>
                            </div>
                        )}
                    </div>
                    <div className="machine-visual-container">
                        <div className="machine-visual">
                            <img
                                src={machineImage}
                                alt="CORE PRO 500 сварочный аппарат"
                                className="machine-image"
                            />
                        </div>
                    </div>
                    <div className="welding-timer">
                        {isTimerActive && (
                            <div className="welding-timer-label">Сварка</div>
                        )}
                        <div className="welding-timer-display">
                            <span className="welding-timer-icon">⚡</span>
                            <span className={`welding-timer-time ${isTimerActive ? 'welding-active' : 'welding-inactive'}`}>
                                {weldingTimer}
                            </span>
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
                                    <div className={`metric-value primary numeric ${isWeldingActive ? 'welding-active' : 'welding-inactive'}`}>
                                        <span className="value">{currentValue}</span>
                                        <span className="metric-system primary">A</span>
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
                                    <div className={`metric-value secondary numeric ${isWeldingActive ? 'welding-active' : 'welding-inactive'}`}>
                                        <span className="value">{voltageValue}</span>
                                        <span className="metric-system secondary">B</span>
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

                <section className="card status-card" aria-label="Параметры системы">
                    <div className="status-list">
                        {systemParameters.length > 0 ? (
                            systemParameters.map((row) => (
                                <div key={row.label} className="status-row">
                                    <span className="status-label">{row.label}</span>
                                    <span
                                        className={`status-value ${row.muted ? 'muted' : ''} numeric`}
                                        style={row.stateColor ? { color: row.stateColor } : {}}
                                    >
                                        {row.value}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="status-row">
                                    <span className="status-label">Управление</span>
                                    <span className="status-value muted numeric">Руч.</span>
                                </div>
                                <div className="status-row">
                                    <span className="status-label">Напряжение зав. кратера</span>
                                    <span className="status-value numeric">42 В</span>
                                </div>
                                <div className="status-row">
                                    <span className="status-label">Входящая темп. охл. жидкости</span>
                                    <span className="status-value numeric">40 °C</span>
                                </div>
                                <div className="status-row">
                                    <span className="status-label">Исходящая темп. охл. жидкости</span>
                                    <span className="status-value numeric">51 °C</span>
                                </div>
                                <div className="status-row">
                                    <span className="status-label">Индуктивность</span>
                                    <span className="status-value numeric">4</span>
                                </div>
                                <div className="status-row">
                                    <span className="status-label">Напряжение фазы А</span>
                                    <span className="status-value numeric">120 В</span>
                                </div>
                                <div className="status-row">
                                    <span className="status-label">Напряжение фазы B</span>
                                    <span className="status-value numeric">56 В</span>
                                </div>
                                <div className="status-row">
                                    <span className="status-label">Напряжение фазы C</span>
                                    <span className="status-value numeric">11 В</span>
                                </div>
                            </>
                        )}
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
                        <div className="telemetry-header">
                            <button
                                type="button"
                                className="back-button"
                                onClick={toggleTelemetryList}
                                title={isTelemetryListExpanded ? "Скрыть список телеметрии" : "Показать список телеметрии"}
                            >
                                <span className="back-arrow">{isTelemetryListExpanded ? '←' : '→'}</span>
                            </button>
                            {isTelemetryListExpanded && (
                                <div className="date-box">
                                    <span className="date-text">{formatDate()}</span>
                                </div>
                            )}
                        </div>
                        {isTelemetryListExpanded && (
                            <>
                                <div className="tabs tabs-fixed">
                                    <button
                                        className={`tab ${activeTab === 'graphs' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('graphs')}
                                    >
                                        Графики
                                    </button>
                                    <button
                                        className={`tab ${activeTab === 'info' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('info')}
                                    >
                                        Информация
                                    </button>
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
                                <div className="chart-card__header">
                                    <div>
                                    </div>
                                </div>
                                <div className="chart-wrapper">
                                    <div className="chart-canvas">
                                        <Line
                                            data={topChartData}
                                            options={getTelemetryLineChartOptions(topTimeBounds, telemetryChartZoom.top)}
                                            ref={(chart) => {
                                                if (chart && chart.canvas) {
                                                    chart.canvas.id = 'current-chart';
                                                    currentChartInstanceRef.current = chart;
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="chart-controls">
                                    <button
                                        type="button"
                                        className="chart-control-btn"
                                        title="Увеличить масштаб"
                                        onClick={() => handleTelemetryChartZoom('top', 'in')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <circle cx="7" cy="7" r="5"/>
                                            <path d="M7 4v6M4 7h6"/>
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="chart-control-btn"
                                        title="Уменьшить масштаб"
                                        onClick={() => handleTelemetryChartZoom('top', 'out')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <circle cx="7" cy="7" r="5"/>
                                            <path d="M4 7h6"/>
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="chart-control-btn"
                                        title="Сбросить масштаб"
                                        onClick={() => handleTelemetryChartZoom('top', 'reset')}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <path d="M7 1v2.5M7 10.5V13M1 7h2.5M10.5 7H13M2.5 2.5l1.8 1.8M9.7 9.7l1.8 1.8M2.5 11.5l1.8-1.8M9.7 4.3l1.8-1.8"/>
                                            <circle cx="7" cy="7" r="4"/>
                                        </svg>
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
        </main>
    );
};

export default DeviceMonitorPage;