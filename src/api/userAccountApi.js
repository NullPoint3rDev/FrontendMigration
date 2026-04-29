import { api } from '../services/api';

const API_URL = '/user-accounts';

export const getAllUserAccounts = async () => {
    try {
        const response = await api.get(API_URL);
        return Array.isArray(response) ? response : [];
    } catch (error) {
        console.error('Error fetching user accounts:', error);
        throw error;
    }
};

export const getUserAccountById = async (id) => {
    try {
        const response = await api.get(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error fetching user account:', error);
        throw error;
    }
};

export const createUserAccount = async (data) => {
    try {
        const response = await api.post(API_URL, data);
        return response;
    } catch (error) {
        console.error('Error creating user account:', error);
        throw error;
    }
};

export const updateUserAccount = async (id, data) => {
    try {
        const response = await api.put(`${API_URL}/${id}`, data);
        return response;
    } catch (error) {
        console.error('Error updating user account:', error);
        throw error;
    }
};

export const deleteUserAccount = async (id) => {
    try {
        await api.delete(`${API_URL}/${id}`);
    } catch (error) {
        console.error('Error deleting user account:', error);
        throw error;
    }
};

export const getRoles = async () => {
    try {
        const response = await api.get('/roles');
        return Array.isArray(response) ? response : [];
    } catch (error) {
        console.error('Error fetching roles:', error);
        return [];
    }
};

/** Отправить 6-значный код подтверждения email (редактирование существующего пользователя). */
export const sendEmailVerificationCode = async (userId) => {
    await api.post(`${API_URL}/${userId}/email-verification/send`, {});
};

/** Подтвердить email кодом из письма. */
export const confirmEmailVerificationCode = async (userId, code) => {
    return await api.post(`${API_URL}/${userId}/email-verification/confirm`, { code });
};
