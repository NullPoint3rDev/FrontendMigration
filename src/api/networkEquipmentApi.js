import { api } from '../services/api';

export const getAllNetworkEquipment = async () => {
    try {
        const response = await api.get('/network-equipment');
        console.log('API getAllNetworkEquipment response:', response);
        return response;
    } catch (error) {
        console.error('Ошибка получения сетевого оборудования:', error);
        throw error;
    }
};

export const getNetworkEquipmentById = async (id) => {
    try {
        const response = await api.get(`/network-equipment/${id}`);
        return response;
    } catch (error) {
        console.error('Ошибка получения сетевого оборудования по ID:', error);
        throw error;
    }
};

export const createNetworkEquipment = async (equipment) => {
    try {
        const response = await api.post('/network-equipment', equipment);
        console.log('API createNetworkEquipment response:', response);
        return response;
    } catch (error) {
        console.error('Ошибка создания сетевого оборудования:', error);
        throw error;
    }
};

export const updateNetworkEquipment = async (id, equipment) => {
    try {
        const response = await api.put(`/network-equipment/${id}`, equipment);
        return response;
    } catch (error) {
        console.error('Ошибка обновления сетевого оборудования:', error);
        throw error;
    }
};

export const deleteNetworkEquipment = async (id) => {
    try {
        await api.delete(`/network-equipment/${id}`);
    } catch (error) {
        console.error('Ошибка удаления сетевого оборудования:', error);
        throw error;
    }
};

export const getNetworkEquipmentByStatus = async (status) => {
    try {
        const response = await api.get(`/network-equipment/status/${status}`);
        return response;
    } catch (error) {
        console.error('Ошибка получения сетевого оборудования по статусу:', error);
        throw error;
    }
};

export const getNetworkEquipmentByType = async (type) => {
    try {
        const response = await api.get(`/network-equipment/type/${type}`);
        return response;
    } catch (error) {
        console.error('Ошибка получения сетевого оборудования по типу:', error);
        throw error;
    }
};

export const updateLastSeen = async (id) => {
    try {
        const response = await api.put(`/network-equipment/${id}/last-seen`);
        return response;
    } catch (error) {
        console.error('Ошибка обновления времени последней активности:', error);
        throw error;
    }
};

export const searchNetworkEquipment = async (query) => {
    try {
        const response = await api.get(`/network-equipment/search?query=${encodeURIComponent(query)}`);
        return response;
    } catch (error) {
        console.error('Ошибка поиска сетевого оборудования:', error);
        throw error;
    }
};
