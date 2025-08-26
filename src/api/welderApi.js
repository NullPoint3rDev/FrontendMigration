import { api } from '../services/api';

const API_URL = '/api/welders';

export const getAllWelders = async () => {
    try {
        const response = await api.get(API_URL);
        return response;
    } catch (error) {
        console.error('Error fetching welders:', error);
        throw error;
    }
};

export const getWelderById = async (id) => {
    try {
        const response = await api.get(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error fetching welder:', error);
        throw error;
    }
};

export const createWelder = async (welderData) => {
    try {
        const response = await api.post(API_URL, welderData);
        return response;
    } catch (error) {
        console.error('Error creating welder:', error);
        throw error;
    }
};

export const updateWelder = async (id, welderData) => {
    try {
        const response = await api.put(`${API_URL}/${id}`, welderData);
        return response;
    } catch (error) {
        console.error('Error updating welder:', error);
        throw error;
    }
};

export const deleteWelder = async (id) => {
    try {
        const response = await api.delete(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error deleting welder:', error);
        throw error;
    }
};

export const getWeldersByStatus = async (status) => {
    try {
        const response = await api.get(`${API_URL}/status/${status}`);
        return response;
    } catch (error) {
        console.error('Error fetching welders by status:', error);
        throw error;
    }
};

export const getWeldersByDepartment = async (department) => {
    try {
        const response = await api.get(`${API_URL}/department/${encodeURIComponent(department)}`);
        return response;
    } catch (error) {
        console.error('Error fetching welders by department:', error);
        throw error;
    }
};

export const getWeldersByName = async (name) => {
    try {
        const response = await api.get(`${API_URL}/name/${encodeURIComponent(name)}`);
        return response;
    } catch (error) {
        console.error('Error fetching welders by name:', error);
        throw error;
    }
};

export const getWeldersByGrade = async (grade) => {
    try {
        const response = await api.get(`${API_URL}/grade/${encodeURIComponent(grade)}`);
        return response;
    } catch (error) {
        console.error('Error fetching welders by grade:', error);
        throw error;
    }
};

export const getWelderByRfidCode = async (rfidCode) => {
    try {
        const response = await api.get(`${API_URL}/rfid/${encodeURIComponent(rfidCode)}`);
        return response;
    } catch (error) {
        console.error('Error fetching welder by RFID code:', error);
        throw error;
    }
};

export const getWelderByEmployeeId = async (employeeId) => {
    try {
        const response = await api.get(`${API_URL}/employee/${encodeURIComponent(employeeId)}`);
        return response;
    } catch (error) {
        console.error('Error fetching welder by employee ID:', error);
        throw error;
    }
};

export const searchWelders = async (filters) => {
    try {
        const params = new URLSearchParams();
        if (filters.name) params.append('name', filters.name);
        if (filters.status) params.append('status', filters.status);
        if (filters.department) params.append('department', filters.department);
        if (filters.grade) params.append('grade', filters.grade);
        
        const response = await api.get(`${API_URL}/search?${params.toString()}`);
        return response;
    } catch (error) {
        console.error('Error searching welders:', error);
        throw error;
    }
};
