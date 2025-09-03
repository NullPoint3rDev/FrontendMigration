import { api } from '../services/api';

export const getAllWPS = async () => {
    try {
        const response = await api.get('/wps');
        console.log('API getAllWPS response:', response);
        return response;
    } catch (error) {
        console.error('Ошибка получения WPS:', error);
        throw error;
    }
};

export const getWPSById = async (id) => {
    try {
        const response = await api.get(`/wps/${id}`);
        return response;
    } catch (error) {
        console.error('Ошибка получения WPS по ID:', error);
        throw error;
    }
};

export const createWPS = async (wps) => {
    try {
        const response = await api.post('/wps', wps);
        console.log('API createWPS response:', response);
        return response;
    } catch (error) {
        console.error('Ошибка создания WPS:', error);
        throw error;
    }
};

export const updateWPS = async (id, wps) => {
    try {
        const response = await api.put(`/wps/${id}`, wps);
        return response;
    } catch (error) {
        console.error('Ошибка обновления WPS:', error);
        throw error;
    }
};

export const deleteWPS = async (id) => {
    try {
        await api.delete(`/wps/${id}`);
    } catch (error) {
        console.error('Ошибка удаления WPS:', error);
        throw error;
    }
};

export const getWPSByStatus = async (status) => {
    try {
        const response = await api.get(`/wps/status/${status}`);
        return response;
    } catch (error) {
        console.error('Ошибка получения WPS по статусу:', error);
        throw error;
    }
};

export const getWPSByWeldingMethod = async (method) => {
    try {
        const response = await api.get(`/wps/method/${method}`);
        return response;
    } catch (error) {
        console.error('Ошибка получения WPS по методу сварки:', error);
        throw error;
    }
};

export const searchWPS = async (query) => {
    try {
        const response = await api.get(`/wps/search?query=${encodeURIComponent(query)}`);
        return response;
    } catch (error) {
        console.error('Ошибка поиска WPS:', error);
        throw error;
    }
};
