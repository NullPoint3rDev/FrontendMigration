import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        connectWebSocket();
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
                
                stompClient.subscribe('/topic/device', (message) => {
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
                
                // Подписываемся на структурированные данные
                stompClient.subscribe('/topic/device-state', (message) => {
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
                            // Показываем ток и напряжение
                            if (key.trim() === 'State.I' || key.trim() === 'State.U') {
                                // Конвертируем hex в десятичное число
                                const decimalValue = parseInt(value.trim(), 16);
                                params[key.trim()] = decimalValue.toString();
                            }
                        }
                    }
                });

                setDeviceData(prev => ({
                    ...prev,
                    [mac]: {
                        ...prev[mac],
                        ...params,
                        timestamp: timestamp || new Date().toLocaleTimeString()
                    }
                }));
            }
        } catch (err) {
            console.error('Ошибка обработки данных:', err);
        }
    };

    const processStructuredData = (data) => {
        try {
            if (data.state && data.state.properties) {
                const mac = '8CAAB50C4254'; // MAC адрес сварочного аппарата
                const params = {};
                
                // Извлекаем ток и напряжение из структурированных данных
                Object.entries(data.state.properties).forEach(([key, prop]) => {
                    if (prop && prop.value) {
                        // Показываем ток и напряжение
                        if (key === 'State.I' || key === 'State.U') {
                            // Конвертируем hex в десятичное число
                            const decimalValue = parseInt(prop.value, 16);
                            params[key] = decimalValue.toString();
                        }
                    }
                });
                
                setDeviceData(prev => ({
                    ...prev,
                    [mac]: {
                        ...prev[mac],
                        ...params,
                        timestamp: data.timestamp || new Date().toLocaleTimeString()
                    }
                }));
                
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
            case 'State.I': return 'Ток (А)';
            case 'State.U': return 'Напряжение (В)';
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
        if (lowerKey.includes('temp')) return '🌡️';
        if (lowerKey.includes('speed')) return '⚡';
        if (lowerKey.includes('power')) return '🔌';
        if (lowerKey.includes('memory')) return '💾';
        if (lowerKey.includes('status')) return '⚙️';
        if (key === 'State.I') return '⚡'; // Иконка для тока
        if (key === 'State.U') return '🔋'; // Иконка для напряжения
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