import { api } from '../services/api';

const API_URL = '/report-templates';

export const getAllReportTemplates = async () => {
    try {
        const response = await api.get(API_URL);
        return response;
    } catch (error) {
        console.error('Error fetching report templates:', error);
        throw error;
    }
};

export const getReportTemplateById = async (id) => {
    try {
        const response = await api.get(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error fetching report template:', error);
        throw error;
    }
};

export const getMyReportTemplates = async () => {
    try {
        const response = await api.get(`${API_URL}/my`);
        return response;
    } catch (error) {
        console.error('Error fetching my report templates:', error);
        throw error;
    }
};

export const saveReportTemplate = async (templateData) => {
    try {
        const response = await api.post(API_URL, templateData);
        return response;
    } catch (error) {
        console.error('Error saving report template:', error);
        throw error;
    }
};

export const deleteReportTemplate = async (id) => {
    try {
        const response = await api.delete(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error deleting report template:', error);
        throw error;
    }
};

