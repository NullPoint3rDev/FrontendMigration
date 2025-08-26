import { api } from '../services/api';

export const getAllOrganizationUnits = async () => {
    try {
        const response = await api.get('/organization-units');
        console.log('API Response:', response);
        console.log('API Response data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения подразделений:', error);
        throw error;
    }
};

export const getOrganizationUnitById = async (id) => {
    try {
        const response = await api.get(`/organization-units/${id}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения подразделения по ID:', error);
        throw error;
    }
};

export const createOrganizationUnit = async (organizationUnit) => {
    try {
        const response = await api.post('/organization-units', organizationUnit);
        return response.data;
    } catch (error) {
        console.error('Ошибка создания подразделения:', error);
        throw error;
    }
};

export const updateOrganizationUnit = async (id, organizationUnit) => {
    try {
        const response = await api.put(`/organization-units/${id}`, organizationUnit);
        return response.data;
    } catch (error) {
        console.error('Ошибка обновления подразделения:', error);
        throw error;
    }
};

export const deleteOrganizationUnit = async (id) => {
    try {
        await api.delete(`/organization-units/${id}`);
    } catch (error) {
        console.error('Ошибка удаления подразделения:', error);
        throw error;
    }
};

export const getOrganizationUnitsByOrganization = async (organizationId) => {
    try {
        const response = await api.get(`/organization-units/organization/${organizationId}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения подразделений по организации:', error);
        throw error;
    }
};

export const getOrganizationUnitsByStatus = async (status) => {
    try {
        const response = await api.get(`/organization-units/status/${status}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения подразделений по статусу:', error);
        throw error;
    }
};

export const searchOrganizationUnits = async (query) => {
    try {
        const response = await api.get(`/organization-units/search?query=${encodeURIComponent(query)}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка поиска подразделений:', error);
        throw error;
    }
};

export const getOrganizationUnitHierarchy = async () => {
    try {
        const response = await api.get('/organization-units/hierarchy');
        return response.data;
    } catch (error) {
        console.error('Ошибка получения иерархии подразделений:', error);
        throw error;
    }
};
