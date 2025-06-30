import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/alerts`;

// Получить все оповещения
export async function getAllAlerts() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить оповещение по ID
export async function getAlertById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить оповещения по статусу
export async function getAlertsByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить оповещения по машине
export async function getAlertsByMachine(machineId) {
    const res = await fetch(`${API_URL}/machine/${machineId}`);
    return res.json();
}

// Получить оповещения по типу
export async function getAlertsByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить оповещения по приоритету
export async function getAlertsByPriority(priority) {
    const res = await fetch(`${API_URL}/priority/${priority}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск оповещений
export async function searchAlerts(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новое оповещение
export async function createAlert(alert) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(alert),
    });
    return res.json();
}

// Обновить оповещение
export async function updateAlert(id, alert) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(alert),
    });
    return res.json();
}

// Удалить оповещение
export async function deleteAlert(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Отметить оповещение как прочитанное
export async function markAlertAsRead(id) {
    const res = await fetch(`${API_URL}/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Отметить все оповещения как прочитанные
export async function markAllAlertsAsRead() {
    const res = await fetch(`${API_URL}/read-all`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Получить непрочитанные оповещения
export async function getUnreadAlerts() {
    const res = await fetch(`${API_URL}/unread`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить количество непрочитанных оповещений
export async function getUnreadAlertsCount() {
    const res = await fetch(`${API_URL}/unread/count`);
    return res.json();
}

// Получить алерты по дате
export async function getAlertsByDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Отметить алерт как не прочитанный
export async function markAlertAsUnread(id) {
    const res = await fetch(`${API_URL}/${id}/unread`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
} 