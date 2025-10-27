import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../styles/deviceMonitor.css';
import * as archiveDeviceApi from '../api/archiveDeviceApi';

const DeviceMonitorPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const machineName = searchParams.get('machine') || 'Неизвестный аппарат';
    const machineMac = searchParams.get('mac') || 'Неизвестный MAC';
    
    const [deviceData, setDeviceData] = useState({});
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [messageHistory, setMessageHistory] = useState([]);
    
    // Состояние для polling
    const [pollingInterval, setPollingInterval] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    
    // Реф для дебаунсинга обновлений
    const updateTimeoutRef = useRef(null);
    
    // Рефы для debounce статуса подключения
    const disconnectTimeoutRef = useRef(null);
    const [displayedStatus, setDisplayedStatus] = useState('disconnected'); // Отображаемый статус
    const [actualStatus, setActualStatus] = useState('disconnected'); // Реальный статус

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

    // Очистка таймаутов при размонтировании
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
            }
        };
    }, []);

    // Синхронизация connectionStatus с displayedStatus для отображения
    useEffect(() => {
        console.log('🔄 Состояние изменилось:', {
            displayedStatus,
            connectionStatus,
            actualStatus
        });
    }, [displayedStatus, connectionStatus, actualStatus]);

    // Функция для обновления статуса с debounce
    const updateConnectionStatus = useCallback((newStatus) => {
        console.log('🔄 updateConnectionStatus called:', {
            newStatus,
            currentDisplayedStatus: displayedStatus,
            currentActualStatus: actualStatus
        });
        
        setActualStatus(newStatus);
        
        // Если статус "connected" - сразу показываем
        if (newStatus === 'connected') {
            console.log('✅ Устанавливаем статус: connected');
            // Очищаем таймаут отключения
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
            }
            setDisplayedStatus('connected');
            setConnectionStatus('connected');
        } 
        // Если статус "disconnected" - проверяем, был ли ранее подключен
        else if (newStatus === 'disconnected') {
            // Если ранее был подключен - добавляем задержку 3 секунды
            if (displayedStatus === 'connected') {
                console.log('⏳ Устройство отключилось, ждем 3 секунды...');
                // Очищаем предыдущий таймаут
                if (disconnectTimeoutRef.current) {
                    clearTimeout(disconnectTimeoutRef.current);
                }
                
                // Устанавливаем новый таймаут
                disconnectTimeoutRef.current = setTimeout(() => {
                    console.log('⏰ Таймаут истек, устанавливаем статус: disconnected');
                    setDisplayedStatus('disconnected');
                    setConnectionStatus('disconnected');
                    // Очищаем данные при отключении
                    setDeviceData({});
                }, 3000); // 3 секунды задержки
            } else {
                console.log('❌ Устройство уже было отключено, устанавливаем статус: disconnected');
                // Если уже был отключен - показываем сразу
                setDisplayedStatus('disconnected');
                setConnectionStatus('disconnected');
                setDeviceData({});
            }
        }
        // Для других статусов (error) - показываем сразу
        else {
            console.log('⚠️ Устанавливаем статус:', newStatus);
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
            }
            setDisplayedStatus(newStatus);
            setConnectionStatus(newStatus);
        }
    }, [displayedStatus]);

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
    
    // Функция для получения состояния устройства (версия 2 - логи убраны)
    const fetchDeviceState = async () => {
        try {
            const response = await archiveDeviceApi.getArchivePanelState(machineMac);
            
            // Добавляем детальное логирование для отладки
            console.log('🔍 API Response:', {
                success: response.success,
                isConnected: response.isConnected,
                hasState: !!response.state,
                message: response.message,
                status: response.status
            });
            
            if (response.success && response.state && response.isConnected) {
                const receiveTime = new Date();
                console.log('✅ Устройство подключено, обновляем данные');
                
                // Обрабатываем данные (оборачиваем в нужный формат)
                processStructuredData({
                    mac: machineMac,
                    state: response.state
                });
                
                // Обновляем статус с debounce
                updateConnectionStatus('connected');
                setLastUpdate(receiveTime);
                setError(null);
                setIsConnecting(false);
                
                // Добавляем в историю сообщений
                setMessageHistory(prev => [
                    {
                        timestamp: new Date(),
                        data: JSON.stringify(response.state),
                        type: 'received'
                    },
                    ...prev.slice(0, 9) // Храним последние 10 сообщений
                ]);
            } else {
                // Если устройство отключено или не найдено
                console.log('❌ Устройство отключено:', response.message);
                updateConnectionStatus('disconnected');
                setError(response.message || 'Устройство не найдено');
            }
        } catch (err) {
            console.error('Ошибка получения состояния устройства:', err);
            // Если это ошибка сети (ERR_CONNECTION_REFUSED и т.п.) - считаем отключенным
            if (err.message.includes('Failed to fetch') || err.message.includes('ERR_CONNECTION_REFUSED')) {
                updateConnectionStatus('disconnected');
                setError('Устройство отключено');
            } else {
                updateConnectionStatus('error');
                setError('Ошибка подключения: ' + err.message);
            }
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

    // Archive-style функции управления

    return (
        <div className="device-monitor-page">
            <div className="device-monitor-header">
                <h1 className="device-monitor-title">📊 Мониторинг сварочного аппарата</h1>
                <button className="back-btn" onClick={handleBackToEquipment}>
                    ← Назад к оборудованию
                </button>
            </div>
            
            {/* Информация о выбранном аппарате */}
            <div className="device-info-card">
                <h2 className="device-name">{machineName}</h2>
                <div className="device-mac">MAC: {machineMac}</div>
            </div>

            {/* Статус подключения */}
            <div className="status-card">
                <div className="status-info">
                    <div className="status-indicator">
                        <span className="status-icon">{getStatusIcon(displayedStatus)}</span>
                        <span className="status-text">
                            {displayedStatus === 'connected' ? 'Подключен' : 
                             displayedStatus === 'disconnected' ? 'Отключен' : 'Ошибка'}
                        </span>
                    </div>
                    <button 
                        className="reconnect-btn"
                        onClick={handleReconnect}
                        disabled={isConnecting}
                    >
                        {isConnecting ? '🔄' : '🔄'} Переподключиться
                    </button>
                </div>
                {lastUpdate && (
                    <div className="last-update">
                        Последнее обновление: {lastUpdate.toLocaleTimeString()}
                    </div>
                )}
                
            </div>

            {/* Ошибки */}
            {error && displayedStatus === 'disconnected' && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Данные устройства */}
            <div className="device-data-section">
                <h3 className="section-title">⚡ Параметры сварочного аппарата</h3>
                
                {Object.keys(deviceData).length > 0 && displayedStatus === 'connected' ? (
                    <div className="parameters-grid">
                        {Object.entries(deviceData).map(([mac, data]) => (
                            <div key={mac} className="device-parameters">
                                {/* Основные параметры в плитках */}
                                <div className="main-parameters-grid">
                                    {/* Ток - приоритет новым параметрам, fallback на старые */}
                                    {(data.Current || data['State.I']) && (
                                        <div className="main-parameter-card">
                                            <div className="main-parameter-header">
                                                <span className="main-parameter-icon">⚡</span>
                                                <span className="main-parameter-name">Ток (А)</span>
                                            </div>
                                            <div className="main-parameter-value">{data.Current || data['State.I']}</div>
                                        </div>
                                    )}
                                    
                                    {/* Напряжение - приоритет новым параметрам, fallback на старые */}
                                    {(data.Voltage || data['State.U']) && (
                                        <div className="main-parameter-card">
                                            <div className="main-parameter-header">
                                                <span className="main-parameter-icon">🔋</span>
                                                <span className="main-parameter-name">Напряжение (В)</span>
                                            </div>
                                            <div className="main-parameter-value">{data.Voltage || data['State.U']}</div>
                                        </div>
                                    )}
                                    
                                </div>
                                
                                {/* Остальные параметры в списке */}
                                <div className="other-parameters-list">
                                    <h4 className="other-parameters-title">Дополнительные параметры</h4>
                                    {Object.entries(data).map(([key, value]) => {
                                        if (key === 'timestamp' || key === 'Current' || key === 'Voltage' || 
                                            key === 'State.I' || key === 'State.U' ||
                                            key === 'State.Ctrl' || key === 'State.material' || key === 'State.GasFlow' || 
                                            key === 'State.Temperature' || key === 'Packet.Index' || key === 'Time.Hours' || 
                                            key === 'Time.Minutes' || key === 'Time.Seconds' || key === 'Date.Day' || 
                                            key === 'Date.Month' || key === 'Date.Year') {
                                            return null;
                                        }
                                        
                                        return (
                                            <div key={key} className="other-parameter-item">
                                                <div className="other-parameter-info">
                                                    <span className="other-parameter-icon">{getParameterIcon(key)}</span>
                                                    <span className="other-parameter-name">{getParameterDisplayName(key)}</span>
                                                </div>
                                                <div className="other-parameter-value">{value}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/*<div className="update-time">*/}
                                {/*    Обновлено: {data.timestamp}*/}
                                {/*</div>*/}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-data">
                        <div className="no-data-icon">
                            {displayedStatus === 'connected' ? '⏳' : '🔴'}
                        </div>
                        <p className="no-data-text">
                            {displayedStatus === 'connected' 
                                ? 'Ожидание данных от сварочного аппарата...' 
                                : displayedStatus === 'disconnected'
                                ? 'Сварочный аппарат выключен'
                                : 'Нет подключения к сварочному аппарату'}
                        </p>
                        {displayedStatus === 'disconnected' && (
                            <p className="no-data-subtext">
                                Данные не отображаются, так как аппарат не активен
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeviceMonitorPage; 