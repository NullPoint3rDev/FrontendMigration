import React, { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WEBSOCKET_URL } from '../config';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Grid,
    Paper,
    Divider,
    Alert
} from '@mui/material';
import {
    Wifi,
    WifiOff,
    Memory,
    Speed,
    Thermostat,
    ElectricBolt
} from '@mui/icons-material';

const WeldingDeviceMonitor = () => {
    const [deviceData, setDeviceData] = useState({});
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const stompClient = new Client({
            brokerURL: undefined,
            webSocketFactory: () => new SockJS(WEBSOCKET_URL),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('🔌 Подключен к сварочному аппарату');
                setConnectionStatus('connected');
                setError(null);
                
                stompClient.subscribe('/topic/device', (message) => {
                    if (message.body) {
                        console.log('📊 Получены данные:', message.body);
                        processDeviceData(message.body);
                        setLastUpdate(new Date());
                    }
                });
            },
            onDisconnect: () => {
                console.log('❌ Отключен от сварочного аппарата');
                setConnectionStatus('disconnected');
            },
            onStompError: (error) => {
                console.error('⚠️ WebSocket ошибка:', error);
                setError('Ошибка подключения к сварочному аппарату');
                setConnectionStatus('error');
            }
        });

        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    }, []);

    const processDeviceData = (rawData) => {
        try {
            // Формат данных: MAC:PARAM1:VAL1;PARAM2:VAL2;...
            const [mac, ...dataParts] = rawData.split(':');
            const dataString = dataParts.join(':');
            
            const params = {};
            dataString.split(';').forEach(part => {
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
                    timestamp: new Date().toLocaleTimeString()
                }
            }));
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
            case 'connected': return <Wifi />;
            case 'disconnected': return <WifiOff />;
            case 'error': return <WifiOff />;
            default: return <WifiOff />;
        }
    };

    const renderParameter = (key, value, icon = null) => (
        <Grid item xs={12} sm={6} md={4} key={key}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                    {icon}
                    <Typography variant="subtitle2" color="textSecondary" ml={1}>
                        {key}
                    </Typography>
                </Box>
                <Typography variant="h6" fontWeight="bold">
                    {value}
                </Typography>
            </Paper>
        </Grid>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Мониторинг сварочного аппарата
            </Typography>

            {/* Статус подключения */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                            <Chip
                                icon={getStatusIcon(connectionStatus)}
                                label={connectionStatus === 'connected' ? 'Подключен' : 
                                       connectionStatus === 'disconnected' ? 'Отключен' : 'Ошибка'}
                                color={getStatusColor(connectionStatus)}
                                variant="outlined"
                            />
                            <Typography variant="body2" ml={2} color="textSecondary">
                                MAC: 8CAAB50C4254
                            </Typography>
                        </Box>
                        {lastUpdate && (
                            <Typography variant="body2" color="textSecondary">
                                Последнее обновление: {lastUpdate.toLocaleTimeString()}
                            </Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Ошибки */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Данные устройства */}
            {Object.keys(deviceData).length > 0 ? (
                <Grid container spacing={3}>
                    {Object.entries(deviceData).map(([mac, data]) => (
                        <Grid item xs={12} key={mac}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Сварочный аппарат ({mac})
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    
                                    <Grid container spacing={2}>
                                        {Object.entries(data).map(([key, value]) => {
                                            if (key === 'timestamp') return null;
                                            
                                            let icon = null;
                                            if (key.toLowerCase().includes('temp')) icon = <Thermostat />;
                                            else if (key.toLowerCase().includes('speed')) icon = <Speed />;
                                            else if (key.toLowerCase().includes('power')) icon = <ElectricBolt />;
                                            else if (key.toLowerCase().includes('memory')) icon = <Memory />;
                                            
                                            return renderParameter(key, value, icon);
                                        })}
                                    </Grid>
                                    
                                    <Box mt={2}>
                                        <Typography variant="caption" color="textSecondary">
                                            Обновлено: {data.timestamp}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Card>
                    <CardContent>
                        <Typography variant="body1" textAlign="center" color="textSecondary">
                            {connectionStatus === 'connected' 
                                ? 'Ожидание данных от сварочного аппарата...' 
                                : 'Нет подключения к сварочному аппарату'}
                        </Typography>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default WeldingDeviceMonitor; 