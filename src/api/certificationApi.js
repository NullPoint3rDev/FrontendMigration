import { api } from '../services/api';

const API_URL = '/certifications';

export const getAllCertifications = async () => {
    try {
        const response = await api.get(API_URL);
        return response;
    } catch (error) {
        console.error('Error fetching certifications:', error);
        throw error;
    }
};

export const getCertificationById = async (id) => {
    try {
        const response = await api.get(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error fetching certification:', error);
        throw error;
    }
};

export const getCertificationsByWelderId = async (welderId) => {
    try {
        const response = await api.get(`${API_URL}/welder/${welderId}`);
        return response;
    } catch (error) {
        console.error('Error fetching certifications by welder id:', error);
        throw error;
    }
};

export const createCertification = async (welderId, certificationData) => {
    try {
        console.log('Creating certification with data:', certificationData);
        const response = await api.post(`${API_URL}/welder/${welderId}`, certificationData);
        console.log('Certification created successfully:', response);
        return response;
    } catch (error) {
        console.error('Error creating certification:', error);
        throw error;
    }
};

export const updateCertification = async (id, certificationData) => {
    try {
        const response = await api.put(`${API_URL}/${id}`, certificationData);
        return response;
    } catch (error) {
        console.error('Error updating certification:', error);
        throw error;
    }
};

export const deleteCertification = async (id) => {
    try {
        const response = await api.delete(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error deleting certification:', error);
        throw error;
    }
};

