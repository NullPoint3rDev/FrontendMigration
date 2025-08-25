import api from './api';

export const getAllWPS = async () => {
    try {
        const response = await api.get('/welding-procedures');
        return response.data;
    } catch (error) {
        console.error('Ошибка получения WPS:', error);
        throw error;
    }
};

export const getWPSById = async (id) => {
    try {
        const response = await api.get(`/welding-procedures/${id}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения WPS по ID:', error);
        throw error;
    }
};

export const createWPS = async (wps) => {
    try {
        const response = await api.post('/welding-procedures', wps);
        return response.data;
    } catch (error) {
        console.error('Ошибка создания WPS:', error);
        throw error;
    }
};

export const updateWPS = async (id, wps) => {
    try {
        const response = await api.put(`/welding-procedures/${id}`, wps);
        return response.data;
    } catch (error) {
        console.error('Ошибка обновления WPS:', error);
        throw error;
    }
};

export const deleteWPS = async (id) => {
    try {
        await api.delete(`/welding-procedures/${id}`);
    } catch (error) {
        console.error('Ошибка удаления WPS:', error);
        throw error;
    }
};

export const getWPSByStatus = async (status) => {
    try {
        const response = await api.get(`/welding-procedures/status/${status}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения WPS по статусу:', error);
        throw error;
    }
};

export const getWPSByWeldingMethod = async (method) => {
    try {
        const response = await api.get(`/welding-procedures/method/${method}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения WPS по методу сварки:', error);
        throw error;
    }
};

export const getWPSByMaterialType = async (materialType) => {
    try {
        const response = await api.get(`/welding-procedures/material/${encodeURIComponent(materialType)}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения WPS по типу материала:', error);
        throw error;
    }
};

export const searchWPS = async (query) => {
    try {
        const response = await api.get(`/welding-procedures/search?query=${encodeURIComponent(query)}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка поиска WPS:', error);
        throw error;
    }
};

export const getWPSByCurrentRange = async (current) => {
    try {
        const response = await api.get(`/welding-procedures/current/${current}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения WPS по диапазону тока:', error);
        throw error;
    }
};

export const getWPSByVoltageRange = async (voltage) => {
    try {
        const response = await api.get(`/welding-procedures/voltage/${voltage}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения WPS по диапазону напряжения:', error);
        throw error;
    }
};
