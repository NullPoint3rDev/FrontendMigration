import React, { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Paper,
    Chip,
    Alert,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    CircularProgress,
    Button
} from '@mui/material';
import {
    Wifi,
    WifiOff,
    Memory,
    Speed,
    Thermostat,
    ElectricBolt,
    Refresh,
    Settings,
    Warning,
    CheckCircle,
    Error
} from '@mui/icons-material';

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
        setIsConnecting(true);
        setError(null);

        const stompClient = new Client({
            brokerURL: undefined,
            webSocketFactory: () => new SockJS('http://95.172.58.219:8084/api/ws'),
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
                setError('Ошибка подключения к сварочному аппарату: ' + error.message);
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
                            // Показываем только ток
                            if (key.trim() === 'State.I') {
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
                const mac = '8CAAB579425A'; // MAC адрес сварочного аппарата
                const params = {};
                
                // Извлекаем только ток из структурированных данных
                Object.entries(data.state.properties).forEach(([key, prop]) => {
                    if (prop && prop.value) {
                        // Показываем только ток
                        if (key === 'State.I') {
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
            default: return key;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected': return 'success';
            case 'disconnected': return 'error';
            case 'error': return 'warning';
            default: return 'default';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected': return <CheckCircle />;
            case 'disconnected': return <WifiOff />;
            case 'error': return <Error />;
            default: return <WifiOff />;
        }
    };

    const getParameterIcon = (key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('temp')) return <Thermostat />;
        if (lowerKey.includes('speed')) return <Speed />;
        if (lowerKey.includes('power')) return <ElectricBolt />;
        if (lowerKey.includes('memory')) return <Memory />;
        if (lowerKey.includes('status')) return <Settings />;
        if (key === 'State.I') return <ElectricBolt />; // Иконка для тока
        return <Settings />;
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
        <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    📊 Мониторинг сварочного аппарата
                </Typography>
                <Button
                    variant="outlined"
                    onClick={handleBackToEquipment}
                    sx={{ minWidth: '120px' }}
                >
                    ← Назад к оборудованию
                </Button>
            </Box>
            
            {/* Информация о выбранном аппарате */}
            <Card sx={{ mb: 3, boxShadow: 2 }}>
                <CardContent>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        {machineName}
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        MAC-адрес: <strong>{machineMac}</strong>
                    </Typography>
                </CardContent>
            </Card>

            {/* Статус подключения */}
            <Card sx={{ mb: 3, boxShadow: 3 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap">
                        <Box display="flex" alignItems="center" gap={2}>
                            <Chip
                                icon={getStatusIcon(connectionStatus)}
                                label={connectionStatus === 'connected' ? 'Подключен' : 
                                       connectionStatus === 'disconnected' ? 'Отключен' : 'Ошибка'}
                                color={getStatusColor(connectionStatus)}
                                variant="outlined"
                                size="large"
                            />
                            <Typography variant="body1" color="textSecondary">
                                MAC: <strong>{machineMac}</strong>
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Сервер: <strong>95.172.58.219:8084</strong>
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={2}>
                            {isConnecting && <CircularProgress size={20} />}
                            <Button
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={handleReconnect}
                                disabled={isConnecting}
                            >
                                Переподключиться
                            </Button>
                        </Box>
                    </Box>
                    {lastUpdate && (
                        <Typography variant="body2" color="textSecondary" mt={1}>
                            Последнее обновление: {lastUpdate.toLocaleTimeString()}
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* Ошибки */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Данные устройства */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ boxShadow: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                ⚡ Ток сварочного аппарата
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            
                            {Object.keys(deviceData).length > 0 ? (
                                <Grid container spacing={2}>
                                    {Object.entries(deviceData).map(([mac, data]) => (
                                        <Grid item xs={12} key={mac}>
                                            <Paper elevation={2} sx={{ p: 2, backgroundColor: '#fafafa' }}>
                                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                    🔧 Сварочный аппарат ({mac})
                                                </Typography>
                                                
                                                <Grid container spacing={2}>
                                                    {Object.entries(data).map(([key, value]) => {
                                                        if (key === 'timestamp') return null;
                                                        
                                                        return (
                                                            <Grid item xs={12} key={key}>
                                                                <Paper elevation={3} sx={{ p: 4, textAlign: 'center', backgroundColor: 'white', border: '3px solid #1976d2' }}>
                                                                    <Box display="flex" alignItems="center" justifyContent="center" mb={3}>
                                                                        {getParameterIcon(key)}
                                                                        <Typography variant="h4" color="textSecondary" ml={2}>
                                                                            {getParameterDisplayName(key)}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="h1" fontWeight="bold" color="primary">
                                                                        {value}
                                                                    </Typography>
                                                                </Paper>
                                                            </Grid>
                                                        );
                                                    })}
                                                </Grid>
                                                
                                                <Box mt={2}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Обновлено: {data.timestamp}
                                                    </Typography>
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Box textAlign="center" py={4}>
                                    <Warning sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="body1" color="textSecondary">
                                        {connectionStatus === 'connected' 
                                            ? 'Ожидание данных тока от сварочного аппарата...' 
                                            : 'Нет подключения к сварочному аппарату'}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* История сообщений */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ boxShadow: 3 }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    📝 История сообщений
                                </Typography>
                                <Button
                                    size="small"
                                    onClick={clearHistory}
                                    disabled={messageHistory.length === 0}
                                >
                                    Очистить
                                </Button>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            
                            {messageHistory.length > 0 ? (
                                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                                    {messageHistory.map((msg, index) => (
                                        <ListItem key={index} sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}>
                                            <ListItemIcon>
                                                <CheckCircle color="success" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={msg.data.substring(0, 50) + (msg.data.length > 50 ? '...' : '')}
                                                secondary={msg.timestamp.toLocaleTimeString()}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Box textAlign="center" py={2}>
                                    <Typography variant="body2" color="textSecondary">
                                        Нет сообщений
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DeviceMonitorPage; 