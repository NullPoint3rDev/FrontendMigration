import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
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
import '../styles/deviceMonitor.css';
import * as archiveDeviceApi from '../api/archiveDeviceApi';
import * as weldingMachineApi from '../api/weldingMachineApi';

// Кастомный плагин для градиентов и пороговых линий
const gradientPlugin = {
    id: 'gradientPlugin',
    beforeDatasetsDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const scales = chart.scales;
        
        if (!chartArea || !scales.y) return;
        
        // Идентифицируем график по данным или другим способом
        const isCurrentChart = chart.canvas.id === 'current-chart' || 
                               (chart.data.datasets[0] && chart.data.datasets[0].label === 'Ток (А)');
        
        // Для осциллограммы градиенты не нужны, но оставляем для совместимости
        // Графики теперь без заливки (fill: false)
    },
    afterDatasetsDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const scales = chart.scales;
        
        if (!chartArea || !scales.y) return;
        
        // Идентифицируем график
        const isCurrentChart = chart.canvas.id === 'current-chart' || 
                               (chart.data.datasets[0] && chart.data.datasets[0].label === 'Ток (А)');
        
        // // Пороговая линия для тока (350A)
        // if (isCurrentChart) {
        //     const thresholdValue = 350;
        //     const yPos = scales.y.getPixelForValue(thresholdValue);
        //
        //     ctx.save();
        //     ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        //     ctx.lineWidth = 1.5;
        //     ctx.setLineDash([5, 5]);
        //     ctx.beginPath();
        //     ctx.moveTo(chartArea.left, yPos);
        //     ctx.lineTo(chartArea.right, yPos);
        //     ctx.stroke();
        //     ctx.restore();
        // }
        
        // Идентифицируем график напряжения
        const isVoltageChart = chart.canvas.id === 'voltage-chart' || 
                               (chart.data.datasets[0] && chart.data.datasets[0].label === 'Напряжение (В)');
        
        // // Пороговая линия для напряжения (35V)
        // if (isVoltageChart) {
        //     const thresholdValue = 35;
        //     const yPos = scales.y.getPixelForValue(thresholdValue);
        //
        //     ctx.save();
        //     ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        //     ctx.lineWidth = 1.5;
        //     ctx.setLineDash([5, 5]);
        //     ctx.beginPath();
        //     ctx.moveTo(chartArea.left, yPos);
        //     ctx.lineTo(chartArea.right, yPos);
        //     ctx.stroke();
        //     ctx.restore();
        // }
    }
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
    gradientPlugin
);

const DeviceMonitorPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const selectedMac = searchParams.get('mac');
    
    // Состояние для списка устройств
    const [equipment, setEquipment] = useState([]);
    const [filteredEquipment, setFilteredEquipment] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [modelFilter, setModelFilter] = useState('all');
    const [selectedDevice, setSelectedDevice] = useState(null);
    
    // Состояние для навигации (Ресурсы развернуты по умолчанию)
    const [expandedMenu, setExpandedMenu] = useState({ 'Ресурсы': true });
    
    // Состояние для вкладок
    const [activeTab, setActiveTab] = useState('graphs');
    
    // Состояние для параметров графиков
    const [graphParams, setGraphParams] = useState({
        current: { line1: true, line2: true },
        voltage: { line1: true, line2: true },
        gasFlow: { line1: false, line2: false },
        wireFlow: { line1: false, line2: false },
        mainsVoltage: { line1: false, line2: false },
        radiatorTemp: { line1: false, line2: false },
        inverterTemp: { line1: false, line2: false },
        rectifierTemp: { line1: false, line2: false },
        bvoTemp: { line1: false, line2: false },
        powerConsumption: { line1: false, line2: false }
    });
    
    const machineName = selectedDevice?.name || searchParams.get('machine') || 'Выберите аппарат';
    const machineMac = selectedMac || selectedDevice?.mac || '';
    
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
    
    // Состояние для графиков
    const [currentChartData, setCurrentChartData] = useState([]);
    const [voltageChartData, setVoltageChartData] = useState([]);
    const maxDataPoints = 100; // Максимальное количество точек на графике

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

    // Загрузка списка оборудования
    useEffect(() => {
        const loadEquipment = async () => {
            try {
                const data = await weldingMachineApi.getAllWeldingMachines();
                setEquipment(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Ошибка загрузки оборудования:', err);
                setEquipment([]);
            }
        };
        loadEquipment();
    }, []);
    
    // Фильтрация оборудования
    useEffect(() => {
        let filtered = equipment;
        
        if (departmentFilter !== 'all') {
            // Фильтр по подразделению можно добавить позже
        }
        
        if (statusFilter !== 'all') {
            // Фильтр по статусу можно добавить позже
        }
        
        if (modelFilter !== 'all') {
            filtered = filtered.filter(item => item.deviceModel === modelFilter);
        }
        
        setFilteredEquipment(filtered);
    }, [equipment, departmentFilter, statusFilter, modelFilter]);
    
    // Выбор устройства при загрузке или изменении URL
    useEffect(() => {
        if (selectedMac && equipment.length > 0) {
            const device = equipment.find(eq => eq.mac === selectedMac);
            if (device) {
                setSelectedDevice(device);
            }
        } else if (equipment.length > 0 && !selectedDevice && !selectedMac) {
            // Выбираем первое устройство по умолчанию
            const firstDevice = equipment[0];
            setSelectedDevice(firstDevice);
            if (firstDevice?.mac) {
                setSearchParams({ mac: firstDevice.mac });
            }
        }
    }, [selectedMac, equipment, selectedDevice]);
    
    // Обработчик выбора устройства
    const handleDeviceSelect = (device) => {
        setSelectedDevice(device);
        if (device.mac) {
            setSearchParams({ mac: device.mac });
        }
    };
    
    useEffect(() => {
        if (machineMac) {
            startPolling();
            return () => stopPolling();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machineMac]);

    // Очистка таймаутов при размонтировании
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            if (disconnectTimeout) {
                clearTimeout(disconnectTimeout);
            }
        };
    }, [disconnectTimeout]);
    
    // Рефы для отслеживания предыдущих значений
    const prevCurrentRef = useRef(null);
    const prevVoltageRef = useRef(null);
    
    // Рефы для графиков
    const currentChartInstanceRef = useRef(null);
    const voltageChartInstanceRef = useRef(null);
    
    // Обновление данных графиков при изменении deviceData
    useEffect(() => {
        if (Object.keys(deviceData).length > 0 && hasData) {
            Object.entries(deviceData).forEach(([mac, data]) => {
                const current = parseFloat(data.Current || data['State.I'] || 0);
                const voltage = parseFloat(data.Voltage || data['State.U'] || 0);
                
                // Проверяем, изменились ли значения перед обновлением
                const currentChanged = prevCurrentRef.current === null || prevCurrentRef.current !== current;
                const voltageChanged = prevVoltageRef.current === null || prevVoltageRef.current !== voltage;
                
                if (currentChanged && !isNaN(current)) {
                    const timestamp = new Date();
                    prevCurrentRef.current = current;
                    
                    // Обновляем данные графика тока
                    setCurrentChartData(prev => {
                        const newData = [...prev, { x: timestamp, y: current }];
                        return newData.length > maxDataPoints ? newData.slice(-maxDataPoints) : newData;
                    });
                }
                
                if (voltageChanged && !isNaN(voltage)) {
                    const timestamp = new Date();
                    prevVoltageRef.current = voltage;
                    
                    // Обновляем данные графика напряжения
                    setVoltageChartData(prev => {
                        const newData = [...prev, { x: timestamp, y: voltage }];
                        return newData.length > maxDataPoints ? newData.slice(-maxDataPoints) : newData;
                    });
                }
            });
        }
    }, [deviceData, hasData, maxDataPoints]);

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
                
                // console.log('🔍 Обновляем данные устройства:', params); // Убрали лишний лог
                
                updateDeviceData({
                    [mac]: {
                        ...params,
                        timestamp: data.timestamp || new Date().toLocaleTimeString()
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

    // Создание градиента для заполнения графика
    const createGradient = (ctx, chartArea, color1, color2) => {
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
    };

    // Конфигурация графиков в стиле скриншота
    const getChartOptions = (min, max, label, threshold, thresholdLabel, chartRef) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
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
                    label: function(context) {
                        return `${label}: ${context.parsed.y.toFixed(1)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                display: false,
                grid: {
                    display: false
                }
            },
            y: {
                min: min,
                max: max,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    lineWidth: 1,
                    drawBorder: false
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        size: 11
                    },
                    padding: 8
                },
                border: {
                    display: false
                }
            }
        },
        animation: {
            duration: 0
        },
        elements: {
            point: {
                radius: 0,
                hoverRadius: 4
            },
            line: {
                tension: 0,
                borderWidth: 1.5
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        },
        layout: {
            padding: {
                top: 10,
                bottom: 10,
                left: 10,
                right: 10
            }
        }
    });

    // Подготовка данных для графиков (в стиле осциллограммы)
    const getCurrentChartData = () => ({
        labels: currentChartData.map((_, index) => ''),
        datasets: [{
            label: 'Ток (А)',
            data: currentChartData.map(d => d.y),
            borderColor: '#64C8FF',
            backgroundColor: 'rgba(100, 200, 255, 0.05)', // Минимальная заливка для осциллограммы
            fill: false, // Без заливки для осциллограммы
            borderWidth: 1.5, // Тонкая линия
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#64C8FF',
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 2,
            tension: 0, // Резкие углы, без сглаживания (как осциллограмма)
            stepped: false
        }]
    });

    const getVoltageChartData = () => ({
        labels: voltageChartData.map((_, index) => ''),
        datasets: [{
            label: 'Напряжение (В)',
            data: voltageChartData.map(d => d.y),
            borderColor: '#FF65B4',
            backgroundColor: 'rgba(255, 101, 180, 0.05)', // Минимальная заливка для осциллограммы
            fill: false, // Без заливки для осциллограммы
            borderWidth: 1.5, // Тонкая линия
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#FF65B4',
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 2,
            tension: 0, // Резкие углы, без сглаживания (как осциллограмма)
            stepped: false
        }]
    });

    // Обработчик переключения меню
    const toggleMenu = (menuName) => {
        setExpandedMenu(prev => ({
            ...prev,
            [menuName]: !prev[menuName]
        }));
    };
    
    // Обработчик переключения параметра графика
    const toggleGraphParam = (paramName, line) => {
        setGraphParams(prev => ({
            ...prev,
            [paramName]: {
                ...prev[paramName],
                [line]: !prev[paramName][line]
            }
        }));
    };
    
    // Получение данных для текущего устройства
    const currentDeviceData = deviceData[machineMac] || {};
    const current = parseFloat(currentDeviceData.Current || currentDeviceData['State.I'] || 0);
    const voltage = parseFloat(currentDeviceData.Voltage || currentDeviceData['State.U'] || 0);
    
    // Навигационное меню (как в дизайне)
    const navMenu = [
        { label: 'Главная', path: '/', icon: '🏠' },
        { 
            label: 'Предприятие', 
            path: '/departments',
            icon: '🏭',
            expanded: expandedMenu['Предприятие'],
            toggle: () => toggleMenu('Предприятие')
        },
        { 
            label: 'Ресурсы', 
            path: '/equipment',
            icon: '📦',
            expanded: expandedMenu['Ресурсы'],
            toggle: () => toggleMenu('Ресурсы'),
            children: [
                { label: 'Сварочное оборудование', path: '/equipment', active: true },
                { label: 'Сетевое оборудование системы мониторинга', path: '/network-equipment' },
                { label: 'Сварочные материалы', path: '/materials' },
                { label: 'Технологические карты сварки (WPS)', path: '/wps' }
            ]
        },
        { label: 'Отчёты', path: '/my-reports', icon: '📊' },
        { label: 'Уведомления', path: '/notifications', icon: '🔔' },
        { label: 'Настройки', path: '/settings', icon: '⚙️' },
        { label: 'О программе', path: '/about', icon: 'ℹ️' }
    ];

    return (
        <div className="device-monitor-layout">
            {/* Левая боковая панель навигации */}
            <aside className="monitor-sidebar">
                <div className="sidebar-logo">
                    <span className="logo-text">WELDtelecom</span>
                </div>
                <nav className="sidebar-nav">
                    {navMenu.map((item) => (
                        <div key={item.label}>
                            {item.children ? (
                                <>
                                    <div 
                                        className={`sidebar-nav-item ${item.expanded ? 'expanded' : ''}`}
                                        onClick={item.toggle}
                                    >
                                        <span className="nav-icon">{item.icon}</span>
                                        <span className="nav-label">{item.label}</span>
                                        <span className="nav-arrow">{item.expanded ? '▼' : '▶'}</span>
                                    </div>
                                    {item.expanded && (
                                        <div className="sidebar-submenu">
                                            {item.children.map((child) => (
                                                <div
                                                    key={child.label}
                                                    className={`sidebar-nav-item submenu-item ${child.active ? 'active' : ''}`}
                                                    onClick={() => navigate(child.path)}
                                                >
                                                    <span className="nav-label">{child.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div
                                    className="sidebar-nav-item"
                                    onClick={() => navigate(item.path)}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    <span className="nav-label">{item.label}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </nav>
            </aside>
            
            {/* Основной контент */}
            <div className="monitor-main-content">
                {/* Средняя панель: Список устройств */}
                <div className="device-list-panel">
                    {/* Фильтры */}
                    <div className="device-filters">
                        <select 
                            className="filter-select"
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                        >
                            <option value="all">Все</option>
                        </select>
                        <select 
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Все</option>
                            <option value="active">Активные</option>
                            <option value="inactive">Неактивные</option>
                        </select>
                        <select 
                            className="filter-select"
                            value={modelFilter}
                            onChange={(e) => setModelFilter(e.target.value)}
                        >
                            <option value="all">Все</option>
                            {[...new Set(equipment.map(eq => eq.deviceModel))].map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Список устройств */}
                    <div className="device-list">
                        {filteredEquipment.map((device) => (
                            <div
                                key={device.id}
                                className={`device-list-item ${selectedDevice?.id === device.id ? 'selected' : ''}`}
                                onClick={() => handleDeviceSelect(device)}
                            >
                                <div className="device-icon">
                                    {device.status === 'error' && <span className="error-indicator">!</span>}
                                </div>
                                <div className="device-list-info">
                                    <div className="device-list-name">{device.name || device.deviceModel}</div>
                                    <div className="device-list-task">(!) {device.jobNumber || '112 Сборка сварка уголков'}</div>
                                    <div className="device-list-operator">{device.operator || 'Ильенко С. Е.'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Правая панель: Детальный мониторинг */}
                <div className="device-detail-panel">
                    {/* Заголовок с информацией об устройстве */}
                    <div className="detail-header">
                        <div className="detail-header-left">
                            <h2 className="detail-device-name">{machineName}</h2>
                            <div className="detail-job-info">
                                <span className="job-icon">(!)</span>
                                <span className="job-text">{selectedDevice?.jobNumber || '112 Сборка сварка уголков'}</span>
                            </div>
                            <div className="detail-location">
                                <span className="location-icon">📍</span>
                                <span className="location-text">{selectedDevice?.location || 'Цех металообработки №5'}</span>
                            </div>
                        </div>
                        <div className="detail-header-right">
                            <div className="user-profile-icon">👤</div>
                        </div>
                    </div>
                    
                    {/* Панель управления */}
                    <div className="control-panel">
                        <div className="control-group">
                            <label className="control-label">Режим работы:</label>
                            <select className="control-select">
                                <option>Ограничение</option>
                            </select>
                        </div>
                        <div className="control-group">
                            <label className="control-label">Состояние:</label>
                            <div className="status-badge welding">{isConnected ? 'Сварка' : 'Отключен'}</div>
                        </div>
                        <button className="control-button">Настройка ограничений</button>
                        <div className="control-group">
                            <label className="control-label">Сварщик:</label>
                            <div className="welder-info">
                                <span className="welder-name">{selectedDevice?.operator || 'Ильенко С. Е.'}</span>
                                <span className={`welder-status ${isConnected ? 'online' : 'offline'}`}></span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Блок с изображением аппарата и метриками */}
                    <div className="device-metrics-section">
                        <div className="device-image-container">
                            <div className="device-image">
                                <div className="device-display">
                                    <div className="display-value-top">130</div>
                                    <div className="display-value-bottom">19.0</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="metrics-container">
                            {/* Ток сварки */}
                            <div className="metric-block">
                                <div className="metric-header">
                                    <span className="metric-label">Ток сварки</span>
                                </div>
                                <div className="metric-value-large">{current || 450}A</div>
                                <div className="metric-slider">
                                    <input 
                                        type="range" 
                                        min="5" 
                                        max="500" 
                                        value={current || 450}
                                        className="metric-range"
                                        readOnly
                                    />
                                    <div className="metric-range-labels">
                                        <span>5</span>
                                        <span>{current || 450}</span>
                                        <span>500</span>
                                    </div>
                                </div>
                                <div className="metric-adjust-buttons">
                                    <button className="metric-btn-left">‹</button>
                                    <span className="metric-range-display">300 - {current || 450}</span>
                                    <button className="metric-btn-right">›</button>
                                </div>
                                <div className="metric-additional-info">
                                    <span>005</span>
                                    <span>78</span>
                                    <span>PULSE</span>
                                </div>
                            </div>
                            
                            {/* Напряжение сварки */}
                            <div className="metric-block">
                                <div className="metric-header">
                                    <span className="metric-label">Напряжение сварки</span>
                                </div>
                                <div className="metric-value-large">{voltage || 30.5}В</div>
                                <div className="metric-slider">
                                    <input 
                                        type="range" 
                                        min="5" 
                                        max="50" 
                                        value={voltage || 30.5}
                                        className="metric-range"
                                        readOnly
                                    />
                                    <div className="metric-range-labels">
                                        <span>5</span>
                                        <span>{voltage || 30.5}</span>
                                        <span>50</span>
                                    </div>
                                </div>
                                <div className="metric-adjust-buttons">
                                    <button className="metric-btn-left">‹</button>
                                    <span className="metric-range-display">10 - {voltage || 35}</span>
                                    <button className="metric-btn-right">›</button>
                                </div>
                                <div className="metric-additional-info">
                                    <span>ER304</span>
                                    <span>Ar92</span>
                                    <span>Ø 1.4</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Список ошибок/предупреждений */}
                        <div className="errors-panel">
                            <div className="error-item warning">
                                <span className="error-icon">⚠️</span>
                                <span className="error-text">Ошибка БВО</span>
                                <span className="error-toggle">▼</span>
                            </div>
                            <div className="error-item warning">
                                <span className="error-icon">⚠️</span>
                                <span className="error-text">Ошибка БВО</span>
                                <span className="error-toggle">▼</span>
                            </div>
                            <div className="error-item error">
                                <span className="error-icon">🔴</span>
                                <span className="error-text">Ошибка авторизации</span>
                                <span className="error-toggle">▼</span>
                            </div>
                            <div className="error-item error">
                                <span className="error-icon">🔴</span>
                                <span className="error-text">Ошибка авторизации</span>
                                <span className="error-toggle">▼</span>
                            </div>
                            <div className="error-item error">
                                <span className="error-icon">🔴</span>
                                <span className="error-text">Ошибка авторизации</span>
                                <span className="error-toggle">▼</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Вкладки и графики */}
                    <div className="tabs-section">
                        <div className="tabs-header">
                            <button 
                                className={`tab-button ${activeTab === 'graphs' ? 'active' : ''}`}
                                onClick={() => setActiveTab('graphs')}
                            >
                                Графики
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
                                onClick={() => setActiveTab('info')}
                            >
                                Информация
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
                                onClick={() => setActiveTab('activity')}
                            >
                                Активность
                            </button>
                            <div className="date-picker">24.07.2026</div>
                        </div>
                        
                        <div className="tabs-content">
                            {activeTab === 'graphs' && (
                                <div className="graphs-tab-content">
                                    <div className="graph-params-panel">
                                        <div className="graph-param-item">
                                            <span className="param-name">Сварочный ток</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.current.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('current', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.current.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('current', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                        <div className="graph-param-item">
                                            <span className="param-name">Сварочное напряжение</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.voltage.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('voltage', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.voltage.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('voltage', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                        <div className="graph-param-item">
                                            <span className="param-name">Расход газа</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.gasFlow.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('gasFlow', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.gasFlow.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('gasFlow', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                        <div className="graph-param-item">
                                            <span className="param-name">Расход проволоки</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.wireFlow.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('wireFlow', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.wireFlow.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('wireFlow', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                        <div className="graph-param-item">
                                            <span className="param-name">Напряжение сети</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.mainsVoltage.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('mainsVoltage', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.mainsVoltage.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('mainsVoltage', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                        <div className="graph-param-item">
                                            <span className="param-name">Темп. радиатора</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.radiatorTemp.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('radiatorTemp', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.radiatorTemp.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('radiatorTemp', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                        <div className="graph-param-item">
                                            <span className="param-name">Темп. инвертора</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.inverterTemp.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('inverterTemp', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.inverterTemp.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('inverterTemp', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                        <div className="graph-param-item">
                                            <span className="param-name">Темп. выпрямителя</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.rectifierTemp.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('rectifierTemp', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.rectifierTemp.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('rectifierTemp', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                        <div className="graph-param-item">
                                            <span className="param-name">Темп. БВО</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.bvoTemp.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('bvoTemp', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.bvoTemp.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('bvoTemp', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                        <div className="graph-param-item">
                                            <span className="param-name">Потр. мощность</span>
                                            <div className="param-toggles">
                                                <button 
                                                    className={`param-toggle ${graphParams.powerConsumption.line1 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('powerConsumption', 'line1')}
                                                >~1</button>
                                                <button 
                                                    className={`param-toggle ${graphParams.powerConsumption.line2 ? 'active' : ''}`}
                                                    onClick={() => toggleGraphParam('powerConsumption', 'line2')}
                                                >~2</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="graphs-display">
                                        {currentChartData.length > 0 ? (
                                            <div className="graph-container">
                                                <div className="graph-controls">
                                                    <button className="graph-icon">🔍</button>
                                                    <button className="graph-icon">🔄</button>
                                                </div>
                                                <Line
                                                    data={getCurrentChartData()}
                                                    options={getChartOptions(0, 500, 'Ток (А)', 350, '350A')}
                                                    ref={(chart) => {
                                                        if (chart && chart.canvas) {
                                                            chart.canvas.id = 'current-chart';
                                                            currentChartInstanceRef.current = chart;
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="graph-placeholder">Ожидание данных...</div>
                                        )}
                                        
                                        {voltageChartData.length > 0 ? (
                                            <div className="graph-container">
                                                <div className="graph-controls">
                                                    <button className="graph-icon">🔍</button>
                                                    <button className="graph-icon">🔄</button>
                                                </div>
                                                <Line
                                                    data={getVoltageChartData()}
                                                    options={getChartOptions(0, 50.0, 'Напряжение (В)', 35, '35В')}
                                                    ref={(chart) => {
                                                        if (chart && chart.canvas) {
                                                            chart.canvas.id = 'voltage-chart';
                                                            voltageChartInstanceRef.current = chart;
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="graph-placeholder">Ожидание данных...</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {activeTab === 'info' && (
                                <div className="info-tab-content">
                                    <p>Информация об устройстве</p>
                                </div>
                            )}
                            {activeTab === 'activity' && (
                                <div className="activity-tab-content">
                                    <p>Активность устройства</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceMonitorPage; 