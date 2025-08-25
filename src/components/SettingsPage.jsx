import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Box,
    Divider,
    Alert
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';

const SettingsPage = () => {
    const [settings, setSettings] = useState({
        // Время хранения информации в БД
        dataRetention: {
            weldingData: 365, // дни
            userLogs: 90, // дни
            systemLogs: 180, // дни
            reports: 730, // дни
            tempFiles: 7 // дни
        },
        // Время отсутствия активности пользователя
        userInactivity: {
            sessionTimeout: 30, // минуты
            autoLogout: true,
            warningTime: 5, // минуты
            maxSessions: 3
        },
        // Дополнительные настройки
        system: {
            backupEnabled: true,
            backupFrequency: 'daily',
            emailNotifications: true,
            smsNotifications: false,
            language: 'ru',
            timezone: 'Europe/Moscow'
        }
    });

    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            // TODO: Заменить на реальный API вызов
            // const response = await api.getSettings();
            // setSettings(response.data);
            
            // Имитация загрузки
            setTimeout(() => {
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            // TODO: Заменить на реальный API вызов
            // await api.updateSettings(settings);
            
            // Имитация сохранения
            setTimeout(() => {
                setLoading(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }, 1000);
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
            loadSettings();
        }
    };

    const updateSetting = (category, key, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Настройки системы
                </Typography>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleReset}
                        sx={{ mr: 2 }}
                        disabled={loading}
                    >
                        Сбросить
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={loading}
                    >
                        Сохранить
                    </Button>
                </Box>
            </Box>

            {saved && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Настройки успешно сохранены!
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Время хранения информации в БД */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Время хранения информации в БД
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Настройте период хранения различных типов данных в базе данных
                            </Typography>
                            
                            <TextField
                                fullWidth
                                label="Данные сварки (дни)"
                                type="number"
                                value={settings.dataRetention.weldingData}
                                onChange={(e) => updateSetting('dataRetention', 'weldingData', parseInt(e.target.value))}
                                margin="normal"
                                inputProps={{ min: 30, max: 3650 }}
                            />
                            
                            <TextField
                                fullWidth
                                label="Логи пользователей (дни)"
                                type="number"
                                value={settings.dataRetention.userLogs}
                                onChange={(e) => updateSetting('dataRetention', 'userLogs', parseInt(e.target.value))}
                                margin="normal"
                                inputProps={{ min: 7, max: 365 }}
                            />
                            
                            <TextField
                                fullWidth
                                label="Системные логи (дни)"
                                type="number"
                                value={settings.dataRetention.systemLogs}
                                onChange={(e) => updateSetting('dataRetention', 'systemLogs', parseInt(e.target.value))}
                                margin="normal"
                                inputProps={{ min: 30, max: 365 }}
                            />
                            
                            <TextField
                                fullWidth
                                label="Отчеты (дни)"
                                type="number"
                                value={settings.dataRetention.reports}
                                onChange={(e) => updateSetting('dataRetention', 'reports', parseInt(e.target.value))}
                                margin="normal"
                                inputProps={{ min: 90, max: 3650 }}
                            />
                            
                            <TextField
                                fullWidth
                                label="Временные файлы (дни)"
                                type="number"
                                value={settings.dataRetention.tempFiles}
                                onChange={(e) => updateSetting('dataRetention', 'tempFiles', parseInt(e.target.value))}
                                margin="normal"
                                inputProps={{ min: 1, max: 30 }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Время отсутствия активности пользователя */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Время отсутствия активности пользователя
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Настройте параметры сессий пользователей и автоматического выхода
                            </Typography>
                            
                            <TextField
                                fullWidth
                                label="Таймаут сессии (минуты)"
                                type="number"
                                value={settings.userInactivity.sessionTimeout}
                                onChange={(e) => updateSetting('userInactivity', 'sessionTimeout', parseInt(e.target.value))}
                                margin="normal"
                                inputProps={{ min: 5, max: 480 }}
                            />
                            
                            <TextField
                                fullWidth
                                label="Время предупреждения (минуты)"
                                type="number"
                                value={settings.userInactivity.warningTime}
                                onChange={(e) => updateSetting('userInactivity', 'warningTime', parseInt(e.target.value))}
                                margin="normal"
                                inputProps={{ min: 1, max: 30 }}
                            />
                            
                            <TextField
                                fullWidth
                                label="Максимум одновременных сессий"
                                type="number"
                                value={settings.userInactivity.maxSessions}
                                onChange={(e) => updateSetting('userInactivity', 'maxSessions', parseInt(e.target.value))}
                                margin="normal"
                                inputProps={{ min: 1, max: 10 }}
                            />
                            
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.userInactivity.autoLogout}
                                        onChange={(e) => updateSetting('userInactivity', 'autoLogout', e.target.checked)}
                                    />
                                }
                                label="Автоматический выход при неактивности"
                                sx={{ mt: 2 }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Дополнительные настройки системы */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Дополнительные настройки
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Общие настройки системы и уведомлений
                            </Typography>
                            
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.system.backupEnabled}
                                                onChange={(e) => updateSetting('system', 'backupEnabled', e.target.checked)}
                                            />
                                        }
                                        label="Автоматическое резервное копирование"
                                    />
                                    
                                    {settings.system.backupEnabled && (
                                        <FormControl fullWidth margin="normal">
                                            <InputLabel>Частота резервного копирования</InputLabel>
                                            <Select
                                                value={settings.system.backupFrequency}
                                                onChange={(e) => updateSetting('system', 'backupFrequency', e.target.value)}
                                            >
                                                <MenuItem value="hourly">Каждый час</MenuItem>
                                                <MenuItem value="daily">Ежедневно</MenuItem>
                                                <MenuItem value="weekly">Еженедельно</MenuItem>
                                                <MenuItem value="monthly">Ежемесячно</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.system.emailNotifications}
                                                onChange={(e) => updateSetting('system', 'emailNotifications', e.target.checked)}
                                            />
                                        }
                                        label="Email уведомления"
                                    />
                                    
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.system.smsNotifications}
                                                onChange={(e) => updateSetting('system', 'smsNotifications', e.target.checked)}
                                            />
                                        }
                                        label="SMS уведомления"
                                    />
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>Язык интерфейса</InputLabel>
                                        <Select
                                            value={settings.system.language}
                                            onChange={(e) => updateSetting('system', 'language', e.target.value)}
                                        >
                                            <MenuItem value="ru">Русский</MenuItem>
                                            <MenuItem value="en">English</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>Часовой пояс</InputLabel>
                                        <Select
                                            value={settings.system.timezone}
                                            onChange={(e) => updateSetting('system', 'timezone', e.target.value)}
                                        >
                                            <MenuItem value="Europe/Moscow">Москва (UTC+3)</MenuItem>
                                            <MenuItem value="Europe/London">Лондон (UTC+0)</MenuItem>
                                            <MenuItem value="America/New_York">Нью-Йорк (UTC-5)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default SettingsPage;
