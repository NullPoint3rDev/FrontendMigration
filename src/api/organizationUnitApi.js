import { api } from '../services/api';

export const getAllOrganizationUnits = async () => {
    try {
        const response = await api.get('/organization-units');
        console.log('API Response:', response);
        console.log('API Response data:', response);
        return response; // API возвращает данные напрямую, а не в response.data
    } catch (error) {
        console.error('Ошибка получения подразделений:', error);
        throw error;
    }
};

export const getOrganizationUnitById = async (id) => {
    try {
        const response = await api.get(`/organization-units/${id}`);
        return response;
    } catch (error) {
        console.error('Ошибка получения подразделения по ID:', error);
        throw error;
    }
};

export const createOrganizationUnit = async (organizationUnit) => {
    try {
        console.log('Отправляем данные в API:', organizationUnit);
        const response = await api.post('/organization-units', organizationUnit);
        console.log('Ответ от API при создании:', response);
        return response;
    } catch (error) {
        console.error('Ошибка создания подразделения:', error);
        throw error;
    }
};

export const updateOrganizationUnit = async (id, organizationUnit) => {
    try {
        const response = await api.put(`/organization-units/${id}`, organizationUnit);
        return response;
    } catch (error) {
        console.error('Ошибка обновления подразделения:', error);
        throw error;
    }
};

export const deleteOrganizationUnit = async (id) => {
    try {
        console.log('Отправляем запрос на удаление подразделения с ID:', id);
        const response = await api.delete(`/organization-units/${id}`);
        console.log('Ответ от API при удалении:', response);
        return response;
    } catch (error) {
        console.error('Ошибка удаления подразделения:', error);
        throw error;
    }
};

export const getOrganizationUnitsByOrganization = async (organizationId) => {
    try {
        const response = await api.get(`/organization-units/organization/${organizationId}`);
        const list = Array.isArray(response) ? response : (response && response.content);
        return Array.isArray(list) ? list : [];
    } catch (error) {
        console.error('Ошибка получения подразделений по организации:', error);
        throw error;
    }
};

export const getOrganizationUnitsByStatus = async (status) => {
    try {
        const response = await api.get(`/organization-units/status/${status}`);
        return response;
    } catch (error) {
        console.error('Ошибка получения подразделений по статусу:', error);
        throw error;
    }
};

export const searchOrganizationUnits = async (query) => {
    try {
        const response = await api.get(`/organization-units/search?query=${encodeURIComponent(query)}`);
        return response;
    } catch (error) {
        console.error('Ошибка поиска подразделений:', error);
        throw error;
    }
};

export const getOrganizationUnitHierarchy = async () => {
    try {
        const response = await api.get('/organization-units/hierarchy');
        return response;
    } catch (error) {
        console.error('Ошибка получения иерархии подразделений:', error);
        throw error;
    }
};
