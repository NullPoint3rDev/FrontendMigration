import React, { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WEBSOCKET_URL, API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';
import '../styles/deviceTestPage.css';

const DeviceTestPage = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [deviceState, setDeviceState] = useState(null);
    const [messageHistory, setMessageHistory] = useState([]);
    const [commandInput, setCommandInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [realtimeMessages, setRealtimeMessages] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDevices();
        connectWebSocket();
    }, []);

    useEffect(() => {
        if (selectedDevice) {
            loadDeviceState();
            loadDeviceHistory();
        }
    }, [selectedDevice]);

    const loadDevices = async () => {
        try {
            console.log('🔍 Загружаем устройства с API:', `${API_BASE_URL}/device-test/devices`);
            const response = await fetch(`${API_BASE_URL}/device-test/devices`, {
                headers: getAuthHeaders()
            });
            console.log('📡 Ответ сервера:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📱 Полученные устройства:', data);
            setDevices(data);
            
            if (data.length > 0 && !selectedDevice) {
                setSelectedDevice(data[0]);
                console.log('✅ Выбрано устройство по умолчанию:', data[0]);
            }
        } catch (err) {
            console.error('❌ Ошибка загрузки устройств:', err);
            setError(`Ошибка загрузки списка устройств: ${err.message}`);
        }
    };

    const loadDeviceState = async () => {
        if (!selectedDevice) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/device-test/devices/${selectedDevice.mac}/state`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            setDeviceState(data);
        } catch (err) {
            console.error('Ошибка загрузки состояния устройства:', err);
        }
    };

    const loadDeviceHistory = async () => {
        if (!selectedDevice) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/device-test/devices/${selectedDevice.mac}/history`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            setMessageHistory(data);
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
        }
    };

    const connectWebSocket = () => {
        const stompClient = new Client({
            brokerURL: undefined,
            webSocketFactory: () => new SockJS(WEBSOCKET_URL),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('🔌 WebSocket подключен для тестирования устройств');
                setIsConnected(true);
                setError(null);
                
                // Подписываемся на тестовые сообщения
                stompClient.subscribe('/topic/device-test', (message) => {
                    if (message.body) {
                        try {
                            const data = JSON.parse(message.body);
                            console.log('📊 Получено тестовое сообщение:', data);
                            
                            setRealtimeMessages(prev => [
                                {
                                    ...data,
                                    timestamp: new Date()
                                },
                                ...prev.slice(0, 9) // Храним последние 10 сообщений
                            ]);
                        } catch (err) {
                            console.error('Ошибка парсинга тестового сообщения:', err);
                        }
                    }
                });

                // Подписываемся на обычные сообщения от устройств
                stompClient.subscribe('/topic/device', (message) => {
                    if (message.body) {
                        console.log('📨 Получено сообщение от устройства:', message.body);
                        
                        const extractedMac = extractMacFromMessage(message.body);
                        console.log('🔍 Извлеченный MAC:', extractedMac);
                        
                        setRealtimeMessages(prev => [
                            {
                                mac: extractedMac,
                                type: 'device_message',
                                data: message.body,
                                timestamp: new Date()
                            },
                            ...prev.slice(0, 9)
                        ]);
                    }
                });
            },
            onDisconnect: () => {
                console.log('❌ WebSocket отключен');
                setIsConnected(false);
            },
            onStompError: (error) => {
                console.error('⚠️ WebSocket ошибка:', error);
                setError('Ошибка подключения к WebSocket: ' + error.message);
                setIsConnected(false);
            }
        });

        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    };

    const extractMacFromMessage = (message) => {
        // Пытаемся извлечь MAC из сообщения в различных форматах
        console.log('🔍 Извлекаем MAC из сообщения:', message);
        
        // Формат: TIMESTAMP|MAC:data
        const pipeMatch = message.match(/\|([0-9A-Fa-f]{12}):/);
        if (pipeMatch) {
            console.log('✅ Найден MAC после |:', pipeMatch[1]);
            return pipeMatch[1];
        }
        
        // Формат: MAC:data
        const colonMatch = message.match(/^([0-9A-Fa-f]{12}):/);
        if (colonMatch) {
            console.log('✅ Найден MAC в начале:', colonMatch[1]);
            return colonMatch[1];
        }
        
        // Любой 12-символьный hex
        const anyMatch = message.match(/([0-9A-Fa-f]{12})/);
        if (anyMatch) {
            console.log('✅ Найден MAC в тексте:', anyMatch[1]);
            return anyMatch[1];
        }
        
        console.log('❌ MAC не найден в сообщении');
        return 'Unknown';
    };

    const sendCommand = async () => {
        if (!selectedDevice || !commandInput.trim()) {
            setError('Выберите устройство и введите команду');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const url = `${API_BASE_URL}/device-test/devices/${selectedDevice.mac}/send`;
            const payload = { command: commandInput.trim() };
            
            console.log('📤 Отправляем команду:', {
                url,
                device: selectedDevice,
                command: payload.command
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            console.log('📡 Ответ сервера:', response.status, response.statusText);
            const data = await response.json();
            console.log('📊 Данные ответа:', data);
            
            if (response.ok) {
                console.log('✅ Команда отправлена успешно:', data);
                setCommandInput('');
                // Обновляем историю
                loadDeviceHistory();
            } else {
                setError(data.error || 'Ошибка отправки команды');
            }
        } catch (err) {
            console.error('❌ Ошибка отправки команды:', err);
            setError('Ошибка отправки команды: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        try {
            await fetch(`${API_BASE_URL}/device-test/history/clear`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            setMessageHistory([]);
            setRealtimeMessages([]);
        } catch (err) {
            console.error('Ошибка очистки истории:', err);
            setError('Ошибка очистки истории');
        }
    };

    const getDeviceName = (mac) => {
        const device = devices.find(d => d.mac === mac);
        return device ? device.name : mac;
    };

    const getStatusColor = (connected) => {
        return connected ? '#4CAF50' : '#FF6584';
    };

    const getStatusIcon = (connected) => {
        return connected ? '🟢' : '🔴';
    };

    const formatTimestamp = (timestamp) => {
        if (typeof timestamp === 'string') {
            return timestamp;
        }
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="device-test-page">
            {/* Заголовок */}
            <div className="device-test-header">
                <h1 className="device-test-title">🧪 Тестирование плат</h1>
                <div className="header-controls">
                    <div className="connection-status">
                        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                            {getStatusIcon(isConnected)}
                        </span>
                        <span className="status-text">
                            {isConnected ? 'Подключен' : 'Отключен'}
                        </span>
                    </div>
                    <button className="clear-history-btn" onClick={clearHistory}>
                        🗑️ Очистить историю
                    </button>
                </div>
            </div>

            {/* Ошибки */}
            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                    <button className="error-close" onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Основной контент */}
            <div className="device-test-content">
                {/* Левая панель - выбор устройства и отправка команд */}
                <div className="left-panel">
                    <div className="panel-card">
                        <h3 className="panel-title">📱 Выбор платы</h3>
                        <div className="device-list">
                            {devices.map(device => (
                                <div 
                                    key={device.mac}
                                    className={`device-item ${selectedDevice?.mac === device.mac ? 'selected' : ''}`}
                                    onClick={() => setSelectedDevice(device)}
                                >
                                    <div className="device-info">
                                        <div className="device-name">{device.name}</div>
                                        <div className="device-mac">{device.mac}</div>
                                        <div className="device-ip">{device.ip}:{device.port}</div>
                                    </div>
                                    <div className="device-status">
                                        {deviceState?.mac === device.mac && (
                                            <span 
                                                className="status-dot"
                                                style={{ backgroundColor: getStatusColor(deviceState.connected) }}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Отправка команд */}
                    {selectedDevice && (
                        <div className="panel-card">
                            <h3 className="panel-title">📤 Отправка команды</h3>
                            <div className="command-section">
                                <textarea
                                    className="command-input"
                                    placeholder="Введите команду для отправки плате..."
                                    value={commandInput}
                                    onChange={(e) => setCommandInput(e.target.value)}
                                    rows={4}
                                />
                                <button 
                                    className="send-button"
                                    onClick={sendCommand}
                                    disabled={loading || !commandInput.trim()}
                                >
                                    {loading ? '⏳' : '📤'} Отправить
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Правая панель - мониторинг */}
                <div className="right-panel">
                    {/* Состояние устройства */}
                    {selectedDevice && deviceState && (
                        <div className="panel-card">
                            <h3 className="panel-title">📊 Состояние платы</h3>
                            <div className="state-info">
                                <div className="state-item">
                                    <span className="state-label">MAC:</span>
                                    <span className="state-value">{deviceState.mac}</span>
                                </div>
                                <div className="state-item">
                                    <span className="state-label">Статус:</span>
                                    <span className="state-value">
                                        <span 
                                            className="status-indicator"
                                            style={{ color: getStatusColor(deviceState.connected) }}
                                        >
                                            {getStatusIcon(deviceState.connected)}
                                        </span>
                                        {deviceState.connected ? 'Подключен' : 'Отключен'}
                                    </span>
                                </div>
                                <div className="state-item">
                                    <span className="state-label">Время:</span>
                                    <span className="state-value">{deviceState.timestamp}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Сообщения в реальном времени */}
                    <div className="panel-card">
                        <h3 className="panel-title">⚡ Сообщения в реальном времени</h3>
                        <div className="messages-container">
                            {realtimeMessages.length > 0 ? (
                                realtimeMessages.map((msg, index) => (
                                    <div key={index} className={`message-item ${msg.type}`}>
                                        <div className="message-header">
                                            <span className="message-type">
                                                {msg.type === 'command_sent' ? '📤' : 
                                                 msg.type === 'device_message' ? '📨' : '📊'}
                                            </span>
                                            <span className="message-mac">{getDeviceName(msg.mac)}</span>
                                            <span className="message-time">
                                                {formatTimestamp(msg.timestamp)}
                                            </span>
                                        </div>
                                        <div className="message-content">
                                            {msg.command || msg.data}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-messages">
                                    <div className="no-messages-icon">📭</div>
                                    <p>Нет сообщений</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* История сообщений */}
                    <div className="panel-card">
                        <h3 className="panel-title">📚 История сообщений (последние 100)</h3>
                        <div className="history-container">
                            {messageHistory.length > 0 ? (
                                messageHistory.map((msg, index) => (
                                    <div key={index} className={`history-item ${msg.type}`}>
                                        <div className="history-header">
                                            <span className="history-type">
                                                {msg.type === 'sent' ? '📤' : '📨'}
                                            </span>
                                            <span className="history-mac">{msg.mac}</span>
                                            <span className="history-time">
                                                {formatTimestamp(msg.timestamp)}
                                            </span>
                                        </div>
                                        <div className="history-content">
                                            {msg.data}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-history">
                                    <div className="no-history-icon">📭</div>
                                    <p>История пуста</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceTestPage;