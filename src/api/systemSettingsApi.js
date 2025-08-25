import api from './api';

export const getAllSystemSettings = async () => {
    try {
        const response = await api.get('/system-settings');
        return response.data;
    } catch (error) {
        console.error('Ошибка получения системных настроек:', error);
        throw error;
    }
};

export const getSystemSettingById = async (id) => {
    try {
        const response = await api.get(`/system-settings/${id}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения системной настройки по ID:', error);
        throw error;
    }
};

export const getSystemSettingByKey = async (key) => {
    try {
        const response = await api.get(`/system-settings/key/${key}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения системной настройки по ключу:', error);
        throw error;
    }
};

export const getSystemSettingsByCategory = async (category) => {
    try {
        const response = await api.get(`/system-settings/category/${category}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения системных настроек по категории:', error);
        throw error;
    }
};

export const getSystemSettingsMap = async () => {
    try {
        const response = await api.get('/system-settings/map');
        return response.data;
    } catch (error) {
        console.error('Ошибка получения карты системных настроек:', error);
        throw error;
    }
};

export const createSystemSetting = async (setting) => {
    try {
        const response = await api.post('/system-settings', setting);
        return response.data;
    } catch (error) {
        console.error('Ошибка создания системной настройки:', error);
        throw error;
    }
};

export const updateSystemSetting = async (id, setting) => {
    try {
        const response = await api.put(`/system-settings/${id}`, setting);
        return response.data;
    } catch (error) {
        console.error('Ошибка обновления системной настройки:', error);
        throw error;
    }
};

export const updateSystemSettingByKey = async (key, value) => {
    try {
        const response = await api.put(`/system-settings/key/${key}`, value);
        return response.data;
    } catch (error) {
        console.error('Ошибка обновления системной настройки по ключу:', error);
        throw error;
    }
};

export const deleteSystemSetting = async (id) => {
    try {
        await api.delete(`/system-settings/${id}`);
    } catch (error) {
        console.error('Ошибка удаления системной настройки:', error);
        throw error;
    }
};

export const searchSystemSettings = async (query) => {
    try {
        const response = await api.get(`/system-settings/search?query=${encodeURIComponent(query)}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка поиска системных настроек:', error);
        throw error;
    }
};

export const getActiveSystemSettings = async () => {
    try {
        const response = await api.get('/system-settings/active');
        return response.data;
    } catch (error) {
        console.error('Ошибка получения активных системных настроек:', error);
        throw error;
    }
};

// Специальные методы для работы с настройками по категориям
export const getDataRetentionSettings = async () => {
    return getSystemSettingsByCategory('DATA_RETENTION');
};

export const getUserInactivitySettings = async () => {
    return getSystemSettingsByCategory('USER_INACTIVITY');
};

export const getSystemGeneralSettings = async () => {
    return getSystemSettingsByCategory('SYSTEM');
};

export const getNotificationSettings = async () => {
    return getSystemSettingsByCategory('NOTIFICATIONS');
};

export const getBackupSettings = async () => {
    return getSystemSettingsByCategory('BACKUP');
};
