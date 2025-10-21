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
        // Мок: возвращаем фейкового пользователя
        return Promise.resolve({
            id: 1,
            name: "Демо Пользователь",
            username: "demo",
            position: "Инженер",
            organizationId: "1",
            about: "Это демонстрационный профиль пользователя.",
            socials: [
                { type: "telegram", value: "@demo_user" },
                { type: "vk", value: "vk.com/demo" }
            ],
            photo: null
        });
    },

    updateUserProfile: async (userData) => {
        // Мок: возвращаем обновлённые данные
        return Promise.resolve({ ...userData, id: 1, name: userData.name || "Демо Пользователь" });
    },

    uploadUserPhoto: async (file) => {
        // Мок: возвращаем base64 строку (или null)
        return Promise.resolve(null);
    },

    getOrganizations: async () => {
        // Мок: возвращаем список организаций
        return Promise.resolve([
            { id: "1", name: "ООО \"СварТех\"" },
            { id: "2", name: "ЗАО \"МеталлСвар\"" }
        ]);
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
        { value: 'Active', label: 'Активен' },
        { value: 'Inactive', label: 'Неактивен' }
    ];
}

// Получить аватарку пользователя по UUID
export function getUserPhotoUrl(photoId) {
    return `${API_URL}/photo/${photoId}`;
}