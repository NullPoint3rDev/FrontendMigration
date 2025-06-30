import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/push-events`;

// Получить все push события
export async function getAllPushEvents() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить push событие по ID
export async function getPushEventById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить push события по типу
export async function getPushEventsByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить push события по статусу
export async function getPushEventsByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новое push событие
export async function createPushEvent(event) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(event),
    });
    return res.json();
}

// Обновить push событие
export async function updatePushEvent(id, event) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(event),
    });
    return res.json();
}

// Удалить push событие
export async function deletePushEvent(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Отправить push событие
export async function sendPushEvent(id) {
    const res = await fetch(`${API_URL}/${id}/send`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Отменить push событие
export async function cancelPushEvent(id) {
    const res = await fetch(`${API_URL}/${id}/cancel`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить отправленные push события
export async function getSentPushEvents() {
    const res = await fetch(`${API_URL}/sent`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить ожидающие push события
export async function getPendingPushEvents() {
    const res = await fetch(`${API_URL}/pending`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить push события по дате
export async function getPushEventsByDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск push событий
export async function searchPushEvents(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить все события
export async function getAllEvents() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить событие по ID
export async function getEventById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить события по типу
export async function getEventsByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`);
    return res.json();
}

// Получить события по статусу
export async function getEventsByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Создать новое событие
export async function createEvent(event) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
    });
    return res.json();
}

// Обновить событие
export async function updateEvent(id, event) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
    });
    return res.json();
}

// Удалить событие
export async function deleteEvent(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Отправить событие
export async function sendEvent(id) {
    const res = await fetch(`${API_URL}/${id}/send`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Отменить событие
export async function cancelEvent(id) {
    const res = await fetch(`${API_URL}/${id}/cancel`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Получить активные события
export async function getActiveEvents() {
    const res = await fetch(`${API_URL}/active`);
    return res.json();
}

// Получить отправленные события
export async function getSentEvents() {
    const res = await fetch(`${API_URL}/sent`);
    return res.json();
}

// Получить события в очереди
export async function getQueuedEvents() {
    const res = await fetch(`${API_URL}/queued`);
    return res.json();
}

// Получить события по приоритету
export async function getEventsByPriority(priority) {
    const res = await fetch(`${API_URL}/priority/${priority}`);
    return res.json();
}

// Получить события по дате создания
export async function getEventsByCreationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`);
    return res.json();
}

// Получить события по дате отправки
export async function getEventsBySendDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/send-date-range?start=${startDate}&end=${endDate}`);
    return res.json();
}

// Получить статистику событий
export async function getEventStatistics() {
    const res = await fetch(`${API_URL}/statistics`);
    return res.json();
}

// Поиск событий
export async function searchEvents(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
}

// Получить события по получателю
export async function getEventsByRecipient(recipientId) {
    const res = await fetch(`${API_URL}/recipient/${recipientId}`);
    return res.json();
}

// Получить события по отправителю
export async function getEventsBySender(senderId) {
    const res = await fetch(`${API_URL}/sender/${senderId}`);
    return res.json();
} 