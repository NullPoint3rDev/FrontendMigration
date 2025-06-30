import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/notifications`;

// Получить все уведомления
export async function getAllNotifications() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить уведомление по ID
export async function getNotificationById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить уведомления по статусу
export async function getNotificationsByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить уведомления по типу
export async function getNotificationsByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить уведомления пользователя
export async function getUserNotifications(userId) {
    const res = await fetch(`${API_URL}/user/${userId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить уведомления по дате
export async function getNotificationsByDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск уведомлений
export async function searchNotifications(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новое уведомление
export async function createNotification(notification) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(notification),
    });
    return res.json();
}

// Обновить уведомление
export async function updateNotification(id, notification) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(notification),
    });
    return res.json();
}

// Удалить уведомление
export async function deleteNotification(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Отметить уведомление как прочитанное
export async function markNotificationAsRead(id) {
    const res = await fetch(`${API_URL}/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Отметить уведомление как не прочитанное
export async function markNotificationAsUnread(id) {
    const res = await fetch(`${API_URL}/${id}/unread`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить непрочитанные уведомления
export async function getUnreadNotifications() {
    const res = await fetch(`${API_URL}/unread`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить количество непрочитанных уведомлений
export async function getUnreadNotificationsCount() {
    const res = await fetch(`${API_URL}/unread/count`);
    return res.json();
}

// Отправить уведомление пользователю
export async function sendNotificationToUser(userId, notification) {
    const res = await fetch(`${API_URL}/send/user/${userId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
    });
    return res.json();
}

// Отправить уведомление группе пользователей
export async function sendNotificationToGroup(groupId, notification) {
    const res = await fetch(`${API_URL}/send/group/${groupId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
    });
    return res.json();
} 