import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { WEBSOCKET_URL } from '../config';
import '../styles/deviceMonitor.css';

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
    
    // Реф для дебаунсинга обновлений
    const updateTimeoutRef = useRef(null);

    // Оптимизированная функция для обновления данных с дебаунсингом
    const updateDeviceData = useCallback((newData) => {
        // Очищаем предыдущий таймаут
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        
        // Устанавливаем новый таймаут для обновления (100мс дебаунсинг)
        updateTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Обновление данных устройства:', newData);
            setDeviceData(prev => ({
                ...prev,
                ...newData
            }));
            setLastUpdate(new Date());
        }, 100);
    }, []);

    useEffect(() => {
        connectWebSocket();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machineMac]);

    // Очистка таймаута при размонтировании
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, []);

    const connectWebSocket = () => {
        console.log('🔌 Попытка подключения к WebSocket...');
        console.log('🌐 WebSocket URL:', WEBSOCKET_URL);
        console.log('🌐 Current hostname:', window.location.hostname);
        setIsConnecting(true);
        setError(null);

        const stompClient = new Client({
            brokerURL: undefined,
            webSocketFactory: () => new SockJS(WEBSOCKET_URL),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('🔌 WebSocket подключен к сварочному аппарату');
                setConnectionStatus('connected');
                setError(null);
                setIsConnecting(false);
                
                // Подписка на старый формат ТОЛЬКО для текущего MAC
                stompClient.subscribe(`/topic/device/${machineMac}`, (message) => {
                    if (message.body) {
                        console.log('📊 Получены данные:', message.body);
                        processDeviceData(message.body);
                        setLastUpdate(new Date());
                        
                        // Добавляем в историю сообщений
                        setMessageHistory(prev => [
                            {
                                timestamp: new Date(),
                                data: message.body,
                                type: 'received'
                            },
                            ...prev.slice(0, 9) // Храним последние 10 сообщений
                        ]);
                    }
                });
                
                // Подписка на структурированные данные ТОЛЬКО для текущего MAC
                stompClient.subscribe(`/topic/device-state/${machineMac}`, (message) => {
                    if (message.body) {
                        try {
                            const data = JSON.parse(message.body);
                            console.log('📊 Получены структурированные данные:', data);
                            processStructuredData(data);
                            setLastUpdate(new Date());
                        } catch (err) {
                            console.error('Ошибка парсинга JSON:', err);
                        }
                    }
                });
            },
            onDisconnect: () => {
                console.log('❌ WebSocket отключен от сварочного аппарата');
                setConnectionStatus('disconnected');
                setIsConnecting(false);
            },
            onStompError: (error) => {
                console.error('⚠️ WebSocket ошибка:', error);
                console.error('⚠️ Детали ошибки:', {
                    message: error.message,
                    type: error.type,
                    details: error.details
                });
                setError('Ошибка подключения к сварочному аппарату: ' + error.message);
                setConnectionStatus('error');
                setIsConnecting(false);
            },
            onWebSocketError: (error) => {
                console.error('⚠️ WebSocket соединение ошибка:', error);
                setError('Ошибка WebSocket соединения: ' + error.message);
                setConnectionStatus('error');
                setIsConnecting(false);
            }
        });

        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    };

    const processDeviceData = (rawData) => {
        try {
            console.log('🔍 Обработка старых данных:', rawData);
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
                                    params[trimmedKey] = (decimalValue / 10).toString();
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

                console.log('📊 Обработанные параметры:', params);
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
            console.log('🔍 Обработка структурированных данных:', data);
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
                        } else {
                            // Все остальные параметры
                            params[key] = prop.value;
                        }
                    }
                });
                
                console.log('📊 Структурированные параметры:', params);
                updateDeviceData({
                    [mac]: {
                        ...params,
                        timestamp: data.timestamp || new Date().toLocaleTimeString()
                    }
                });
                
                console.log('✅ Структурированные данные обработаны:', params);
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
            case 'Inductance': return 'Индуктивность (мГн)';
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
        if (key === 'Inductance') return '🔄';
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
        connectWebSocket();
    };

    const clearHistory = () => {
        setMessageHistory([]);
    };

    const handleBackToEquipment = () => {
        navigate('/equipment');
    };

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
            </div>

            {/* Статус подключения */}
            <div className="status-card">
                <div className="status-info">
                    <div className="status-indicator">
                        <span className="status-icon">{getStatusIcon(connectionStatus)}</span>
                        <span className="status-text">
                            {connectionStatus === 'connected' ? 'Подключен' : 
                             connectionStatus === 'disconnected' ? 'Отключен' : 'Ошибка'}
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
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Данные устройства */}
            <div className="device-data-section">
                <h3 className="section-title">⚡ Параметры сварочного аппарата</h3>
                
                {Object.keys(deviceData).length > 0 ? (
                    <div className="parameters-grid">
                        {console.log('🎨 Рендер данных устройства:', deviceData)}
                        {Object.entries(deviceData).map(([mac, data]) => (
                            <div key={mac} className="device-parameters">
                                {Object.entries(data).map(([key, value]) => {
                                    if (key === 'timestamp') return null;
                                    
                                    return (
                                        <div key={key} className="parameter-card">
                                            <div className="parameter-header">
                                                <span className="parameter-icon">{getParameterIcon(key)}</span>
                                                <span className="parameter-name">{getParameterDisplayName(key)}</span>
                                            </div>
                                            <div className="parameter-value">{value}</div>
                                        </div>
                                    );
                                })}
                                
                                <div className="update-time">
                                    Обновлено: {data.timestamp}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-data">
                        <div className="no-data-icon">⚠️</div>
                        <p className="no-data-text">
                            {connectionStatus === 'connected' 
                                ? 'Ожидание данных от сварочного аппарата...' 
                                : 'Нет подключения к сварочному аппарату'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeviceMonitorPage; 