import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/user-accounts`;

const handleResponse = async (response) => {
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Response text:', text);

    if (!response.ok) {
        let error;
        try {
            error = JSON.parse(text);
        } catch (e) {
            console.error('Error parsing error response:', e);
            error = { message: text || 'An error occurred' };
        }
        throw new Error(error.message || 'An error occurred');
    }

    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('Error parsing success response:', e);
        throw new Error('Invalid JSON response from server');
    }
};

export const userAccountApi = {
    getCurrentUser: async () => {
        const headers = getAuthHeaders();
        console.log('Making request to /user-accounts/current with headers:', headers);

        const response = await fetch(`${API_BASE_URL}/user-accounts/current`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });

        return handleResponse(response);
    },

    updateUserProfile: async (userData) => {
        console.log('Making request to /user-accounts/profile with headers:', getAuthHeaders());
        const response = await fetch(`${API_BASE_URL}/user-accounts/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });
        return handleResponse(response);
    },

    uploadUserPhoto: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const headers = {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        };
        console.log('Making request to /user-accounts/photo with headers:', headers);
        const response = await fetch(`${API_BASE_URL}/user-accounts/photo`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include'
        });
        return handleResponse(response);
    },

    getOrganizations: async () => {
        const headers = getAuthHeaders();
        console.log('Making request to /organizations with headers:', headers);

        const response = await fetch(`${API_BASE_URL}/organizations`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });

        return handleResponse(response);
    }
};

export async function getAllEmployees() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

export async function createEmployee(employee) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(employee),
    });
    return res.json();
}

export async function updateEmployee(id, employee) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(employee),
    });
    return res.json();
}

export async function deleteEmployee(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Получить все подразделения (organization units)
export async function getAllOrganizationUnits() {
    const res = await fetch(`${API_BASE_URL}/organization-units`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить все роли
export async function getAllUserRoles() {
    const res = await fetch(`${API_BASE_URL}/roles`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить все статусы (захардкодим, если нет API)
export function getAllStatuses() {
    return [
        { value: 'ACTIVE', label: 'Активен' },
        { value: 'INACTIVE', label: 'Неактивен' },
        { value: 'BLOCKED', label: 'Заблокирован' },
    ];
}

// Получить аватарку пользователя по UUID
export function getUserPhotoUrl(photoId) {
    return `${API_URL}/photo/${photoId}`;
}