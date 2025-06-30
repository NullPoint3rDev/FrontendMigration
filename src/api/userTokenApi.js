import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/tokens`;

// Получить все токены
export async function getAllTokens() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить токен по ID
export async function getTokenById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить токены пользователя
export async function getUserTokens(userId) {
    const res = await fetch(`${API_URL}/user/${userId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новый токен
export async function createToken(token) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(token),
    });
    return res.json();
}

// Обновить токен
export async function updateToken(id, token) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(token),
    });
    return res.json();
}

// Удалить токен
export async function deleteToken(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Проверить валидность токена
export async function validateToken(token) {
    const res = await fetch(`${API_URL}/validate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token }),
    });
    return res.json();
}

// Обновить токен
export async function refreshToken(token) {
    const res = await fetch(`${API_URL}/refresh`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token }),
    });
    return res.json();
}

// Отозвать токен
export async function revokeToken(id) {
    const res = await fetch(`${API_URL}/${id}/revoke`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить активные токены
export async function getActiveTokens() {
    const res = await fetch(`${API_URL}/active`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить истекшие токены
export async function getExpiredTokens() {
    const res = await fetch(`${API_URL}/expired`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить токены по типу
export async function getTokensByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить токены по статусу
export async function getTokensByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить токены по дате создания
export async function getTokensByCreationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить токены по дате истечения
export async function getTokensByExpirationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/expiration-range?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить статистику токенов
export async function getTokenStatistics() {
    const res = await fetch(`${API_URL}/statistics`, {
        headers: getAuthHeaders()
    });
    return res.json();
} 