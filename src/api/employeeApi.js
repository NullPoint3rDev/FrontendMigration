import { api } from '../services/api';

const API_URL = '/employees';

export const getAllEmployees = async () => {
    try {
        const response = await api.get(API_URL);
        return response;
    } catch (error) {
        console.error('Error fetching employees:', error);
        throw error;
    }
};

export const getEmployeeById = async (id) => {
    try {
        const response = await api.get(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error fetching employee:', error);
        throw error;
    }
};

export const createEmployee = async (employeeData) => {
    try {
        const response = await api.post(API_URL, employeeData);
        return response;
    } catch (error) {
        console.error('Error creating employee:', error);
        throw error;
    }
};

export const updateEmployee = async (id, employeeData) => {
    try {
        const response = await api.put(`${API_URL}/${id}`, employeeData);
        return response;
    } catch (error) {
        console.error('Error updating employee:', error);
        throw error;
    }
};

export const deleteEmployee = async (id) => {
    try {
        const response = await api.delete(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error deleting employee:', error);
        throw error;
    }
};

export const getEmployeesByStatus = async (status) => {
    try {
        const response = await api.get(`${API_URL}/status/${status}`);
        return response;
    } catch (error) {
        console.error('Error fetching employees by status:', error);
        throw error;
    }
};

export const getEmployeesByOrganizationUnit = async (organizationUnitId) => {
    try {
        const response = await api.get(`${API_URL}/organization-unit/${organizationUnitId}`);
        return response;
    } catch (error) {
        console.error('Error fetching employees by organization unit:', error);
        throw error;
    }
};

export const searchEmployees = async (filters) => {
    try {
        const params = new URLSearchParams();
        if (filters.fullName) params.append('fullName', filters.fullName);
        if (filters.email) params.append('email', filters.email);
        if (filters.position) params.append('position', filters.position);
        if (filters.organizationUnitId) params.append('organizationUnitId', filters.organizationUnitId);
        if (filters.userRoleId) params.append('userRoleId', filters.userRoleId);
        if (filters.status) params.append('status', filters.status);
        
        const response = await api.get(`${API_URL}/search?${params.toString()}`);
        return response;
    } catch (error) {
        console.error('Error searching employees:', error);
        throw error;
    }
};
