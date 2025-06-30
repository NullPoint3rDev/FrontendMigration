import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/inbox-messages`;

// Получить все сообщения
export async function getAllInboxMessages() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить сообщение по ID
export async function getInboxMessageById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить сообщения по статусу
export async function getInboxMessagesByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить сообщения по типу
export async function getInboxMessagesByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новое сообщение
export async function createInboxMessage(message) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(message),
    });
    return res.json();
}

// Обновить сообщение
export async function updateInboxMessage(id, message) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(message),
    });
    return res.json();
}

// Удалить сообщение
export async function deleteInboxMessage(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Отметить сообщение как прочитанное
export async function markInboxMessageAsRead(id) {
    const res = await fetch(`${API_URL}/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Отметить сообщение как непрочитанное
export async function markInboxMessageAsUnread(id) {
    const res = await fetch(`${API_URL}/${id}/unread`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить прочитанные сообщения
export async function getReadInboxMessages() {
    const res = await fetch(`${API_URL}/read`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить непрочитанные сообщения
export async function getUnreadInboxMessages() {
    const res = await fetch(`${API_URL}/unread`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить сообщения по отправителю
export async function getInboxMessagesBySender(senderId) {
    const res = await fetch(`${API_URL}/sender/${senderId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить сообщения по получателю
export async function getInboxMessagesByRecipient(recipientId) {
    const res = await fetch(`${API_URL}/recipient/${recipientId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить сообщения по дате создания
export async function getInboxMessagesByDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить сообщения по дате прочтения
export async function getInboxMessagesByReadDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/read-date-range?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить статистику сообщений
export async function getInboxMessageStatistics() {
    const res = await fetch(`${API_URL}/statistics`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск сообщений
export async function searchInboxMessages(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить вложения сообщения
export async function getInboxMessageAttachments(messageId) {
    const res = await fetch(`${API_URL}/${messageId}/attachments`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Добавить вложение к сообщению
export async function addInboxMessageAttachment(messageId, attachment) {
    const res = await fetch(`${API_URL}/${messageId}/attachments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(attachment),
    });
    return res.json();
}

// Удалить вложение из сообщения
export async function removeInboxMessageAttachment(messageId, attachmentId) {
    const res = await fetch(`${API_URL}/${messageId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Ответить на сообщение
export async function replyToInboxMessage(id, reply) {
    const res = await fetch(`${API_URL}/${id}/reply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reply),
    });
    return res.json();
}

// Переслать сообщение
export async function forwardInboxMessage(id, forwardData) {
    const res = await fetch(`${API_URL}/${id}/forward`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(forwardData),
    });
    return res.json();
} 