import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';

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

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    // Save settings to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('systemSettings', JSON.stringify(settings));
    }, [settings]);

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
            const defaultSettings = {
                dataRetention: {
                    weldingData: 365,
                    userLogs: 90,
                    systemLogs: 180,
                    reports: 730,
                    tempFiles: 7
                },
                userInactivity: {
                    sessionTimeout: 30,
                    autoLogout: true,
                    warningTime: 5,
                    maxSessions: 3
                },
                system: {
                    backupEnabled: true,
                    backupFrequency: 'daily',
                    emailNotifications: true,
                    smsNotifications: false,
                    language: 'ru',
                    timezone: 'Europe/Moscow'
                }
            };
            setSettings(defaultSettings);
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
        <div className="equipment-page">
            <div className="equipment-header">
                <h1 className="equipment-title">Настройки системы</h1>
                <div className="header-controls">
                    <button
                        className="action-btn edit-btn"
                        onClick={handleReset}
                        disabled={loading}
                    >
                        <i className="fas fa-undo"></i>
                        Сбросить
                    </button>
                    <button
                        className="add-equipment-btn"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        <i className="fas fa-save"></i>
                        Сохранить
                    </button>
                </div>
            </div>

            {saved && (
                <div className="success-message">
                    Настройки успешно сохранены!
                </div>
            )}

            <div className="settings-container">
                {/* Время хранения информации в БД */}
                <div className="settings-section">
                    <h2 className="section-title">Время хранения информации в БД</h2>
                    <p className="section-description">
                        Настройте период хранения различных типов данных в базе данных
                    </p>
                    
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label className="setting-label">Данные сварки (дни)</label>
                            <input
                                type="number"
                                value={settings.dataRetention.weldingData}
                                onChange={(e) => updateSetting('dataRetention', 'weldingData', parseInt(e.target.value))}
                                className="setting-input"
                                min="30"
                                max="3650"
                            />
                        </div>
                        
                        <div className="setting-item">
                            <label className="setting-label">Логи пользователей (дни)</label>
                            <input
                                type="number"
                                value={settings.dataRetention.userLogs}
                                onChange={(e) => updateSetting('dataRetention', 'userLogs', parseInt(e.target.value))}
                                className="setting-input"
                                min="7"
                                max="365"
                            />
                        </div>
                        
                        <div className="setting-item">
                            <label className="setting-label">Системные логи (дни)</label>
                            <input
                                type="number"
                                value={settings.dataRetention.systemLogs}
                                onChange={(e) => updateSetting('dataRetention', 'systemLogs', parseInt(e.target.value))}
                                className="setting-input"
                                min="30"
                                max="365"
                            />
                        </div>
                        
                        <div className="setting-item">
                            <label className="setting-label">Отчеты (дни)</label>
                            <input
                                type="number"
                                value={settings.dataRetention.reports}
                                onChange={(e) => updateSetting('dataRetention', 'reports', parseInt(e.target.value))}
                                className="setting-input"
                                min="90"
                                max="3650"
                            />
                        </div>
                        
                        <div className="setting-item">
                            <label className="setting-label">Временные файлы (дни)</label>
                            <input
                                type="number"
                                value={settings.dataRetention.tempFiles}
                                onChange={(e) => updateSetting('dataRetention', 'tempFiles', parseInt(e.target.value))}
                                className="setting-input"
                                min="1"
                                max="30"
                            />
                        </div>
                    </div>
                </div>

                {/* Время отсутствия активности пользователя */}
                <div className="settings-section">
                    <h2 className="section-title">Время отсутствия активности пользователя</h2>
                    <p className="section-description">
                        Настройте параметры сессий пользователей и автоматического выхода
                    </p>
                    
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label className="setting-label">Таймаут сессии (минуты)</label>
                            <input
                                type="number"
                                value={settings.userInactivity.sessionTimeout}
                                onChange={(e) => updateSetting('userInactivity', 'sessionTimeout', parseInt(e.target.value))}
                                className="setting-input"
                                min="5"
                                max="480"
                            />
                        </div>
                        
                        <div className="setting-item">
                            <label className="setting-label">Время предупреждения (минуты)</label>
                            <input
                                type="number"
                                value={settings.userInactivity.warningTime}
                                onChange={(e) => updateSetting('userInactivity', 'warningTime', parseInt(e.target.value))}
                                className="setting-input"
                                min="1"
                                max="30"
                            />
                        </div>
                        
                        <div className="setting-item">
                            <label className="setting-label">Максимум одновременных сессий</label>
                            <input
                                type="number"
                                value={settings.userInactivity.maxSessions}
                                onChange={(e) => updateSetting('userInactivity', 'maxSessions', parseInt(e.target.value))}
                                className="setting-input"
                                min="1"
                                max="10"
                            />
                        </div>
                        
                        <div className="setting-item checkbox-item">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={settings.userInactivity.autoLogout}
                                    onChange={(e) => updateSetting('userInactivity', 'autoLogout', e.target.checked)}
                                    className="setting-checkbox"
                                />
                                Автоматический выход при неактивности
                            </label>
                        </div>
                    </div>
                </div>

                {/* Дополнительные настройки системы */}
                <div className="settings-section">
                    <h2 className="section-title">Дополнительные настройки</h2>
                    <p className="section-description">
                        Общие настройки системы и уведомлений
                    </p>
                    
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label className="setting-label">Частота резервного копирования</label>
                            <select
                                value={settings.system.backupFrequency}
                                onChange={(e) => updateSetting('system', 'backupFrequency', e.target.value)}
                                className="setting-input"
                                disabled={!settings.system.backupEnabled}
                            >
                                <option value="hourly">Каждый час</option>
                                <option value="daily">Ежедневно</option>
                                <option value="weekly">Еженедельно</option>
                                <option value="monthly">Ежемесячно</option>
                            </select>
                        </div>
                        
                        <div className="setting-item">
                            <label className="setting-label">Язык интерфейса</label>
                            <select
                                value={settings.system.language}
                                onChange={(e) => updateSetting('system', 'language', e.target.value)}
                                className="setting-input"
                            >
                                <option value="ru">Русский</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                        
                        <div className="setting-item">
                            <label className="setting-label">Часовой пояс</label>
                            <select
                                value={settings.system.timezone}
                                onChange={(e) => updateSetting('system', 'timezone', e.target.value)}
                                className="setting-input"
                            >
                                <option value="Europe/Moscow">Москва (UTC+3)</option>
                                <option value="Europe/London">Лондон (UTC+0)</option>
                                <option value="America/New_York">Нью-Йорк (UTC-5)</option>
                            </select>
                        </div>
                        
                        <div className="setting-item checkbox-item">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={settings.system.backupEnabled}
                                    onChange={(e) => updateSetting('system', 'backupEnabled', e.target.checked)}
                                    className="setting-checkbox"
                                />
                                Автоматическое резервное копирование
                            </label>
                        </div>
                        
                        <div className="setting-item checkbox-item">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={settings.system.emailNotifications}
                                    onChange={(e) => updateSetting('system', 'emailNotifications', e.target.checked)}
                                    className="setting-checkbox"
                                />
                                Email уведомления
                            </label>
                        </div>
                        
                        <div className="setting-item checkbox-item">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={settings.system.smsNotifications}
                                    onChange={(e) => updateSetting('system', 'smsNotifications', e.target.checked)}
                                    className="setting-checkbox"
                                />
                                SMS уведомления
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
