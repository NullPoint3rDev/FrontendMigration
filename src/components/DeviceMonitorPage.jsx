import React, { useState, useEffect, useCallback, useRef } from 'react';
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
            const st = e?.status;
            if (st !== 404 && st !== 400) {
                console.warn('RFID welder lookup:', e);
            }
        }
    }
    return null;
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

    // Состояние для графиков
    const [currentChartData, setCurrentChartData] = useState([]);
    const [voltageChartData, setVoltageChartData] = useState([]);
    const maxDataPoints = 100; // Максимальное количество точек на графике

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
        const code = extractRfidFromDeviceData(deviceData, machineMac, hasData);
        if (!code) {
            rfidLookupCacheRef.current = { code: null, snapshot: null };
            setRfidLookup({ status: 'idle' });
            return;
        }
        const cached = rfidLookupCacheRef.current;
        if (cached.code === code && cached.snapshot) {
            return;
        }
        if (cached.code === code && cached.snapshot === null) {
            return;
        }
        rfidLookupCacheRef.current = { code, snapshot: null };
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
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [deviceData, machineMac, hasData]);

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

    // Рефы для отслеживания предыдущих значений
    const prevCurrentRef = useRef(null);
    const prevVoltageRef = useRef(null);
    const prevWeldingStateRef = useRef(null); // Отслеживание предыдущего состояния сварки

    // Рефы для графиков
    const currentChartInstanceRef = useRef(null);
    const voltageChartInstanceRef = useRef(null);

    // Рефы для отслеживания времени последнего обновления графика
    const lastChartUpdateTimeRef = useRef(null);
    const chartUpdateIntervalRef = useRef(null);

    // Refs для хранения актуальных данных в интервале
    const deviceDataRef = useRef(deviceData);
    const machineMacRef = useRef(machineMac);
    const hasDataRef = useRef(hasData);
    const currentChartDataRef = useRef(currentChartData);
    const voltageChartDataRef = useRef(voltageChartData);

    // Обновляем refs при изменении данных
    useEffect(() => {
        deviceDataRef.current = deviceData;
        machineMacRef.current = machineMac;
        hasDataRef.current = hasData;
        currentChartDataRef.current = currentChartData;
        voltageChartDataRef.current = voltageChartData;
    }, [deviceData, machineMac, hasData, currentChartData, voltageChartData]);

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

    // Обновление данных графиков при изменении состояния сварки
    useEffect(() => {
        if (Object.keys(deviceData).length === 0 || !hasData) {
            // Нет данных - очищаем графики
            setCurrentChartData([]);
            setVoltageChartData([]);
            prevCurrentRef.current = null;
            prevVoltageRef.current = null;
            prevWeldingStateRef.current = null;
            lastChartUpdateTimeRef.current = null;
            // Останавливаем интервал обновления
            if (chartUpdateIntervalRef.current) {
                clearInterval(chartUpdateIntervalRef.current);
                chartUpdateIntervalRef.current = null;
            }
            return;
        }

        const data = deviceData[machineMac];
        if (!data) {
            // Нет данных для этого аппарата - очищаем графики
            setCurrentChartData([]);
            setVoltageChartData([]);
            prevCurrentRef.current = null;
            prevVoltageRef.current = null;
            prevWeldingStateRef.current = null;
            lastChartUpdateTimeRef.current = null;
            // Останавливаем интервал обновления
            if (chartUpdateIntervalRef.current) {
                clearInterval(chartUpdateIntervalRef.current);
                chartUpdateIntervalRef.current = null;
            }
            return;
        }

        const isCurrentlyWelding = isWelding();
        const prevWeldingState = prevWeldingStateRef.current;

        // Проверяем, изменилось ли состояние сварки
        // Учитываем случай, когда сварка начинается впервые (prevWeldingState === null)
        const weldingStateChanged = prevWeldingState !== isCurrentlyWelding;

        // Если сварка идет, всегда проверяем, инициализирован ли график
        if (isCurrentlyWelding) {
            // Проверяем, нужно ли инициализировать график (изменилось состояние ИЛИ график пустой)
            const needsInitialization = weldingStateChanged || currentChartDataRef.current.length === 0;

            if (needsInitialization) {
                const current = parseFloat(data.Current || data['State.I'] || 0);
                const voltage = parseFloat(data.Voltage || data['State.U'] || 0);
                const timestamp = new Date();

                // Сварка только что началась или график не инициализирован - резкий подъем
                // График должен быть пустым, поэтому добавляем точку с 0, затем сразу точку с реальным значением
                const timestamp0 = new Date(timestamp.getTime() - 10); // Небольшое смещение для визуализации

                setCurrentChartData(() => {
                    // Начинаем с пустого графика, добавляем 0, затем реальное значение
                    return [
                        { x: timestamp0, y: 0 },
                        { x: timestamp, y: current }
                    ];
                });
                prevCurrentRef.current = current;

                setVoltageChartData(() => {
                    // Начинаем с пустого графика, добавляем 0, затем реальное значение
                    return [
                        { x: timestamp0, y: 0 },
                        { x: timestamp, y: voltage }
                    ];
                });
                prevVoltageRef.current = voltage;

                lastChartUpdateTimeRef.current = timestamp.getTime();
            }

            // Останавливаем старый интервал (если был для нулей) и запускаем новый для сварки
            if (chartUpdateIntervalRef.current) {
                clearInterval(chartUpdateIntervalRef.current);
            }

            // Запускаем интервал обновления графика раз в секунду
            chartUpdateIntervalRef.current = setInterval(() => {
                const currentDeviceData = deviceDataRef.current;
                const currentMac = machineMacRef.current;

                if (Object.keys(currentDeviceData).length === 0 || !hasDataRef.current) {
                    // Нет данных - останавливаем интервал
                    if (chartUpdateIntervalRef.current) {
                        clearInterval(chartUpdateIntervalRef.current);
                        chartUpdateIntervalRef.current = null;
                    }
                    return;
                }

                const data = currentDeviceData[currentMac];
                if (!data) {
                    return;
                }

                // Проверяем, идет ли сварка, используя актуальные данные
                const isCurrentlyWelding = (() => {
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
                    const current = parseFloat(data.Current || data['State.I'] || 0);
                    return current > 1;
                })();

                if (isCurrentlyWelding) {
                    const current = parseFloat(data.Current || data['State.I'] || 0);
                    const voltage = parseFloat(data.Voltage || data['State.U'] || 0);
                    const timestamp = new Date();

                    setCurrentChartData(prev => {
                        const newData = [...prev, { x: timestamp, y: current }];
                        return newData.length > maxDataPoints ? newData.slice(-maxDataPoints) : newData;
                    });
                    prevCurrentRef.current = current;

                    setVoltageChartData(prev => {
                        const newData = [...prev, { x: timestamp, y: voltage }];
                        return newData.length > maxDataPoints ? newData.slice(-maxDataPoints) : newData;
                    });
                    prevVoltageRef.current = voltage;

                    lastChartUpdateTimeRef.current = timestamp.getTime();
                } else {
                    // Сварка закончилась - останавливаем интервал
                    if (chartUpdateIntervalRef.current) {
                        clearInterval(chartUpdateIntervalRef.current);
                        chartUpdateIntervalRef.current = null;
                    }
                }
            }, 1000); // Обновление раз в секунду

            prevWeldingStateRef.current = isCurrentlyWelding;
        } else if (!isCurrentlyWelding) {
            // Сварка не идет
            if (weldingStateChanged) {
                // Сварка только что закончилась - резкий спад
                const timestamp = new Date();
                const lastCurrent = prevCurrentRef.current !== null ? prevCurrentRef.current : 0;
                const lastVoltage = prevVoltageRef.current !== null ? prevVoltageRef.current : 0;

                setCurrentChartData(prev => {
                    const newData = [...prev, { x: timestamp, y: lastCurrent }];
                    // Затем сразу точку с 0
                    return [...newData, { x: new Date(timestamp.getTime() + 1), y: 0 }];
                });
                prevCurrentRef.current = 0;

                setVoltageChartData(prev => {
                    const newData = [...prev, { x: timestamp, y: lastVoltage }];
                    // Затем сразу точку с 0
                    return [...newData, { x: new Date(timestamp.getTime() + 1), y: 0 }];
                });
                prevVoltageRef.current = 0;
            }

            // Инициализируем график нулями, если он пустой
            if (currentChartDataRef.current.length === 0) {
                const timestamp = new Date();
                setCurrentChartData([{ x: timestamp, y: 0 }]);
                setVoltageChartData([{ x: timestamp, y: 0 }]);
                prevCurrentRef.current = 0;
                prevVoltageRef.current = 0;
            }

            // Останавливаем старый интервал (если был для сварки) и запускаем новый для нулей
            if (chartUpdateIntervalRef.current) {
                clearInterval(chartUpdateIntervalRef.current);
            }

            // Запускаем интервал обновления графика нулями раз в секунду
            chartUpdateIntervalRef.current = setInterval(() => {
                const timestamp = new Date();

                setCurrentChartData(prev => {
                    const newData = [...prev, { x: timestamp, y: 0 }];
                    return newData.length > maxDataPoints ? newData.slice(-maxDataPoints) : newData;
                });
                prevCurrentRef.current = 0;

                setVoltageChartData(prev => {
                    const newData = [...prev, { x: timestamp, y: 0 }];
                    return newData.length > maxDataPoints ? newData.slice(-maxDataPoints) : newData;
                });
                prevVoltageRef.current = 0;
            }, 1000); // Обновление раз в секунду

            prevWeldingStateRef.current = isCurrentlyWelding;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceData, hasData, machineMac]);

    // Очистка интервала при размонтировании
    useEffect(() => {
        return () => {
            if (chartUpdateIntervalRef.current) {
                clearInterval(chartUpdateIntervalRef.current);
            }
        };
    }, []);

    // Убираем сложную синхронизацию - теперь простое состояние

    // Простая функция как в archive проекте - просто обновляем состояние
    const updateConnectionStatus = (connected, hasStateData) => {
        console.log('🔄 updateConnectionStatus:', { connected, hasStateData });

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
                setCurrentChartData([]); // Очищаем график тока
                setVoltageChartData([]); // Очищаем график напряжения
                prevCurrentRef.current = null; // Сбрасываем предыдущее значение тока
                prevVoltageRef.current = null; // Сбрасываем предыдущее значение напряжения
                prevWeldingStateRef.current = null; // Сбрасываем предыдущее состояние сварки
                setDisconnectTimeout(null);
            }, 3000); // 3 секунды задержки

            setDisconnectTimeout(timeout);
        }
    };

    // Функция для опроса состояния устройства (как в archive проекте)
    const startPolling = () => {
        console.log('🔄 Запуск polling для MAC:', machineMac);

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

        // Устанавливаем интервал опроса каждые 500ms (как в archive проекте)
        const interval = setInterval(() => {
            fetchDeviceState();
        }, 500);

        setPollingInterval(interval);
    };

    // Функция для остановки polling
    const stopPolling = () => {
        console.log('🛑 Остановка polling');
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

            console.log('🔍 API Response:', response);

            if (response && response !== null) {
                console.log('✅ Устройство подключено, обновляем данные');

                // Обрабатываем данные
                processStructuredData({
                    mac: machineMac,
                    state: response
                });

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
                console.log('❌ Нет данных от устройства');
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
            // console.log('🔍 processStructuredData вызвана с данными:', data); // Убрали лишний лог

            if (data.state && data.state.properties) {
                const mac = data.mac || machineMac; // берём из payload, fallback на выбранный MAC
                const params = {};

                // Сохраняем status из корня state (это ключевое поле для определения состояния сварки!)
                // status может быть: "Offline", "Welding", "On", "Error" и т.д.
                if (data.state.status !== undefined && data.state.status !== null) {
                    params.status = data.state.status;
                    console.log('🔍 Сохраняем status в params:', data.state.status);
                }

                // Сохраняем errorCode из корня state, если он есть
                if (data.state.errorCode !== undefined && data.state.errorCode !== null) {
                    params.errorCode = data.state.errorCode;
                }

                // Извлекаем ВСЕ параметры из структурированных данных
                console.log('🔍 Все ключи properties:', Object.keys(data.state.properties || {}));
                // Проверяем наличие RFID.Hex в исходных данных
                if (data.state.properties && data.state.properties['RFID.Hex']) {
                    console.log('🔍 Найден RFID.Hex в properties:', data.state.properties['RFID.Hex']);
                }
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
                            console.log(`🔍 Найдено напряжение фазы: ${key} = ${prop.value}`);
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
                            console.log(`🔍 Сохранен RFID код: key="${key}", value="${prop.value}"`);
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
                            // Логируем напряжения фаз для отладки
                            if (key && (key.includes('Напряжение фазы') || key.includes('фазы'))) {
                                console.log(`🔍 Сохранено напряжение фазы: key="${key}", value="${prop.value}"`);
                            }
                        }
                    }
                });

                // console.log('🔍 Обновляем данные устройства:', params); // Убрали лишний лог

                // Убеждаемся, что status сохраняется (приоритет params.status, если он был установлен выше)
                const finalStatus = params.status || data.state.status || null;

                console.log('🔍 processStructuredData - finalStatus:', finalStatus);
                console.log('🔍 processStructuredData - data.state.status:', data.state.status);
                console.log('🔍 processStructuredData - params.status:', params.status);

                // Сохраняем RFID код из предыдущих данных, если он не пришел в новом ответе
                const existingData = deviceData[mac];
                if (existingData && existingData.RFID && !params.RFID) {
                    params.RFID = existingData.RFID;
                    console.log('🔍 Сохраняем RFID из предыдущих данных:', existingData.RFID);
                }
                if (existingData && existingData['RFID.Hex'] && !params['RFID.Hex']) {
                    params['RFID.Hex'] = existingData['RFID.Hex'];
                    console.log('🔍 Сохраняем RFID.Hex из предыдущих данных:', existingData['RFID.Hex']);
                }

                // Логируем сохранение RFID перед обновлением
                if (params.RFID) {
                    console.log('🔍 Сохраняем RFID в deviceData:', params.RFID);
                }
                if (params['RFID.Hex']) {
                    console.log('🔍 Сохраняем RFID.Hex в deviceData:', params['RFID.Hex']);
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

                if (finalStatus) {
                    console.log('✅ Status сохранен в deviceData:', finalStatus);
                } else {
                    console.log('⚠️ Status не был сохранен (null или undefined)');
                }

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
            console.log('💾 Начинаем сохранение названия аппарата:', { machineId, trimmedName });

            // Получаем текущие данные аппарата по ID
            const machine = await getWeldingMachineById(machineId);
            console.log('📦 Получены данные аппарата:', machine);

            if (!machine || !machine.id) {
                throw new Error('Аппарат не найден');
            }

            // Подготавливаем данные для обновления
            const updateData = {
                ...machine,
                name: trimmedName
            };
            console.log('📤 Отправляем данные на обновление:', updateData);

            // Обновляем только название
            const result = await updateWeldingMachine(machineId, updateData);
            console.log('✅ Название успешно обновлено:', result);

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

    // Конфигурация верхнего графика (ток): левая ось 0–500, правая 0–50, ось X 6:00–22:00
    const getCurrentChartOptions = (dataLength) => {
        const n = Math.max(dataLength, 1);
        const xMax = Math.max(0, n - 1);
        const xStep = n <= 1 ? 1 : xMax / 8;
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
                        label: (ctx) => `Ток (А): ${ctx.parsed.y.toFixed(1)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
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
                            if (n <= 1) return '6:00';
                            const hour = 6 + Math.round(16 * val / xMax);
                            return `${hour}:00`;
                        }
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        if (n <= 1) return;
                        const step = xMax / 8;
                        axis.ticks = Array.from({ length: 9 }, (_, i) => ({ value: i * step }));
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

    // Конфигурация нижнего графика (напряжение + вторая линия): две оси Y, ось X 6:00–22:00
    const getVoltageChartOptions = (dataLength) => {
        const n = Math.max(dataLength, 1);
        const xMax = Math.max(0, n - 1);
        const xStep = n <= 1 ? 1 : xMax / 8;
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
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
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
                            if (n <= 1) return '6:00';
                            const hour = 6 + Math.round(16 * val / xMax);
                            return `${hour}:00`;
                        }
                    },
                    border: { display: false },
                    afterBuildTicks: (axis) => {
                        if (n <= 1) return;
                        const step = xMax / 8;
                        axis.ticks = Array.from({ length: 9 }, (_, i) => ({ value: i * step }));
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

    // Данные для верхнего графика (ток): синяя линия, ось Y 0–500
    const getCurrentChartData = () => ({
        datasets: [{
            label: 'Ток (А)',
            data: currentChartData.map((d, i) => ({ x: i, y: Number(d.y) || 0 })),
            borderColor: '#3ec7ff',
            backgroundColor: 'rgba(62, 199, 255, 0.05)',
            fill: false,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#3ec7ff',
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 2,
            tension: 0,
            yAxisID: 'y'
        }]
    });

    // Данные для нижнего графика: розовая линия (напряжение, правая ось 0–50), оранжевая (левая ось 0–500)
    const getVoltageChartData = () => {
        const voltagePoints = voltageChartData.map((d, i) => ({ x: i, y: Number(d.y) || 0 }));
        const orangePoints = currentChartData.map((d, i) => ({ x: i, y: Math.min(Number(d.y) || 0, 250) }));
        return {
            datasets: [
                {
                    label: 'Напряжение (В)',
                    data: voltagePoints,
                    borderColor: '#ff61c8',
                    backgroundColor: 'rgba(255, 97, 200, 0.05)',
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#ff61c8',
                    pointHoverBorderColor: '#FFFFFF',
                    pointHoverBorderWidth: 2,
                    tension: 0,
                    yAxisID: 'yRight'
                },
                {
                    label: 'Ток (А)',
                    data: orangePoints,
                    borderColor: '#ffae64',
                    backgroundColor: 'rgba(255, 174, 100, 0.05)',
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#ffae64',
                    pointHoverBorderColor: '#FFFFFF',
                    pointHoverBorderWidth: 2,
                    tension: 0,
                    yAxisID: 'y'
                }
            ]
        };
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

        // Логируем для отладки, если значение не найдено
        if (data && !voltagePhaseB && voltagePhaseA) {
            console.log('⚠️ Напряжение фазы B не найдено. Доступные ключи в data:', Object.keys(data).filter(k =>
                k.toLowerCase().includes('voltage') ||
                k.toLowerCase().includes('фазы') ||
                k.toLowerCase().includes('phase')
            ));
            console.log('🔍 Все ключи data:', Object.keys(data));
        }

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

        // Отладка: выводим все ключи и значения, связанные с состоянием
        const stateKeys = Object.keys(data).filter(key =>
            key.toLowerCase().includes('state') ||
            key.toLowerCase().includes('status') ||
            key.toLowerCase().includes('состояние') ||
            key.toLowerCase().includes('welding')
        );
        if (stateKeys.length > 0) {
            console.log('🔍 Ключи состояния:', stateKeys);
            stateKeys.forEach(key => {
                console.log(`  ${key}:`, data[key]);
            });
        }

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
            console.log('🔍 Проверка WeldingMachineState (приоритет):', weldingMachineState, '->', stateLower);
            // Проверяем, содержит ли состояние информацию о сварке
            // ВАЖНО: только явное указание "Сварка" или "Welding", не "Аппарат включен"
            if (stateLower === 'сварка' || stateLower === 'welding' ||
                stateLower.includes('сварка') || stateLower.includes('welding') ||
                stateLower.includes('сварочн') || stateLower.includes('weld')) {
                console.log('✅ Сварка обнаружена по WeldingMachineState:', weldingMachineState);
                return true;
            }
            // Если явно указано, что сварки нет (включен, ожидание, выключен и т.д.)
            if (stateLower.includes('ожидан') || stateLower.includes('waiting') ||
                stateLower.includes('выключ') || stateLower.includes('off') ||
                stateLower.includes('включен') || stateLower.includes('on') ||
                stateLower === 'выкл' || stateLower === 'off' ||
                stateLower === 'аппарат включен') {
                console.log('❌ WeldingMachineState указывает на отсутствие сварки:', weldingMachineState);
                return false;
            }
        } else {
            console.log('⚠️ WeldingMachineState не найден в данных');
        }

        // 2. Проверяем status из корня объекта (вторичная проверка)
        // ВАЖНО: status из корня может быть "Offline" даже при сварке, поэтому это вторичная проверка
        const status = data.status || data.Status;
        if (status) {
            const statusLower = String(status).toLowerCase().trim();
            console.log('🔍 Проверка status (вторичная):', status, '->', statusLower);
            // Проверяем различные варианты статуса "Сварка"
            if (statusLower === 'welding' || statusLower === 'сварка' ||
                statusLower === 'weld' ||
                statusLower.includes('сварка') ||
                statusLower.includes('welding')) {
                console.log('✅ Сварка обнаружена по status:', status);
                return true;
            }
            // Если статус явно не "сварка", но это не критично, так как приоритет у WeldingMachineState
            if (statusLower === 'offline' || statusLower === 'off' ||
                statusLower === 'выключен' || statusLower === 'выкл') {
                console.log('⚠️ status = "Offline", но проверяем WeldingMachineState выше');
            }
        } else {
            console.log('⚠️ status не найден в данных');
        }

        // 3. Проверяем ток сварки ТОЛЬКО если WeldingMachineState не определен или неоднозначен
        // НЕ используем ток как основной индикатор, так как аппарат может быть включен без сварки
        const current = parseFloat(data.Current || data['State.I'] || 0);
        if (current > 1 && !weldingMachineState) {
            // Только если WeldingMachineState не определен, используем ток как индикатор
            console.log('✅ Сварка обнаружена по току (WeldingMachineState не определен):', current);
            return true;
        }

        console.log('❌ Сварка не обнаружена');
        return false;
    };

    // Телеметрия каналы
    const telemetryChannels = [
        { label: 'Сварочный ток', color: '#3ec7ff', active: true, tile1: true, tile2: false },
        { label: 'Сварочное напряжение', color: '#ff61c8', active: true, tile1: false, tile2: true },
        { label: 'Расход газа', color: '#2fe4a8', active: false, tile1: false, tile2: false },
        { label: 'Расход проволоки', color: '#ffae64', active: false, tile1: false, tile2: false },
        { label: 'Напряжение сети', color: '#a07dff', active: false, tile1: false, tile2: false },
        { label: 'Темп. радиатора', color: '#66d1ff', active: false, tile1: false, tile2: false },
        { label: 'Темп. инвертора', color: '#7cffb2', active: false, tile1: false, tile2: false },
        { label: 'Темп. выпрямителя', color: '#ffc96a', active: false, tile1: false, tile2: false },
        { label: 'Темп. БВО', color: '#f1ca06', active: true, tile1: true, tile2: true },
        { label: 'Потр. мощность', color: '#6d8bff', active: false, tile1: false, tile2: false }
    ];

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
                        <div className="machine-title">
                            <span className="machine-title-main">CORE</span>
                            <span className="machine-title-accent">PULSE</span>
                        </div>
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

                    <div className="card control-config-tile">
                        <span className="config-label">Настройка ограничений</span>
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
                                        <div
                                            key={channel.label}
                                            className={`telemetry-item ${channel.active ? 'active' : ''}`}
                                        >
                                            <span className="telemetry-label">{channel.label}</span>
                                            <div className="telemetry-tiles">
                                                <button
                                                    type="button"
                                                    className={`telemetry-tile ${channel.active && channel.tile1 ? 'active' : ''}`}
                                                    style={{ color: channel.active && channel.tile1 ? channel.color : 'rgba(188, 183, 197, 0.4)' }}
                                                >
                                                    <span className="wave-icon">~</span>
                                                    <span className="tile-number">1</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`telemetry-tile ${channel.active && channel.tile2 ? 'active' : ''}`}
                                                    style={{ color: channel.active && channel.tile2 ? channel.color : 'rgba(188, 183, 197, 0.4)' }}
                                                >
                                                    <span className="wave-icon">~</span>
                                                    <span className="tile-number">2</span>
                                                </button>
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
                                <div className="chart-card__header">
                                    <div>
                                    </div>
                                </div>
                                <div className="chart-wrapper">
                                    <div className="chart-canvas">
                                        <Line
                                            data={getCurrentChartData()}
                                            options={getCurrentChartOptions(currentChartData.length)}
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
                                    <button type="button" className="chart-control-btn" title="Увеличить">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <circle cx="7" cy="7" r="5"/>
                                            <path d="M7 4v6M4 7h6"/>
                                        </svg>
                                    </button>
                                    <button type="button" className="chart-control-btn" title="Уменьшить">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <circle cx="7" cy="7" r="5"/>
                                            <path d="M4 7h6"/>
                                        </svg>
                                    </button>
                                    <button type="button" className="chart-control-btn" title="Обновить">
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <path d="M7 1v2.5M7 10.5V13M1 7h2.5M10.5 7H13M2.5 2.5l1.8 1.8M9.7 9.7l1.8 1.8M2.5 11.5l1.8-1.8M9.7 4.3l1.8-1.8"/>
                                            <circle cx="7" cy="7" r="4"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="chart-card medium">
                                <div className="chart-card__header">
                                    <div>
                                    </div>
                                    <div className="chart-legend">
                                    </div>
                                </div>
                                <div className="chart-wrapper">
                                    <div className="chart-canvas">
                                        <Line
                                            data={getVoltageChartData()}
                                            options={getVoltageChartOptions(Math.max(voltageChartData.length, currentChartData.length))}
                                            ref={(chart) => {
                                                if (chart && chart.canvas) {
                                                    chart.canvas.id = 'voltage-chart';
                                                    voltageChartInstanceRef.current = chart;
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="chart-controls">
                                    <button type="button" className="chart-control-btn" title="Увеличить">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <circle cx="7" cy="7" r="5"/>
                                            <path d="M7 4v6M4 7h6"/>
                                        </svg>
                                    </button>
                                    <button type="button" className="chart-control-btn" title="Уменьшить">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <circle cx="7" cy="7" r="5"/>
                                            <path d="M4 7h6"/>
                                        </svg>
                                    </button>
                                    <button type="button" className="chart-control-btn" title="Обновить">
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