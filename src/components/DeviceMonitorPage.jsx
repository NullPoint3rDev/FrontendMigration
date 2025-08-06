import React, { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
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
                            params[key.trim()] = value.trim();
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
        return <Settings />;
    };

    const handleReconnect = () => {
        connectWebSocket();
    };

    const clearHistory = () => {
        setMessageHistory([]);
    };

    return (
        <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                📊 Мониторинг сварочного аппарата
            </Typography>

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
                                MAC: <strong>8CAAB579425A</strong>
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
                                📈 Данные сварочного аппарата
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
                                                            <Grid item xs={12} sm={6} md={4} key={key}>
                                                                <Paper elevation={1} sx={{ p: 2, textAlign: 'center', backgroundColor: 'white' }}>
                                                                    <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                                                                        {getParameterIcon(key)}
                                                                        <Typography variant="subtitle2" color="textSecondary" ml={1}>
                                                                            {key}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="h6" fontWeight="bold" color="primary">
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
                                            ? 'Ожидание данных от сварочного аппарата...' 
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