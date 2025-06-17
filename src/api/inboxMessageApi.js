const API_URL = '/api/inbox-messages';

// Получить все сообщения
export async function getAllMessages() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить сообщение по ID
export async function getMessageById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить сообщения по статусу
export async function getMessagesByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Получить сообщения по типу
export async function getMessagesByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`);
    return res.json();
}

// Создать новое сообщение
export async function createMessage(message) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
    return res.json();
}

// Обновить сообщение
export async function updateMessage(id, message) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
    return res.json();
}

// Удалить сообщение
export async function deleteMessage(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Отметить сообщение как прочитанное
export async function markMessageAsRead(id) {
    const res = await fetch(`${API_URL}/${id}/read`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Отметить сообщение как непрочитанное
export async function markMessageAsUnread(id) {
    const res = await fetch(`${API_URL}/${id}/unread`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Получить прочитанные сообщения
export async function getReadMessages() {
    const res = await fetch(`${API_URL}/read`);
    return res.json();
}

// Получить непрочитанные сообщения
export async function getUnreadMessages() {
    const res = await fetch(`${API_URL}/unread`);
    return res.json();
}

// Получить сообщения по отправителю
export async function getMessagesBySender(senderId) {
    const res = await fetch(`${API_URL}/sender/${senderId}`);
    return res.json();
}

// Получить сообщения по получателю
export async function getMessagesByRecipient(recipientId) {
    const res = await fetch(`${API_URL}/recipient/${recipientId}`);
    return res.json();
}

// Получить сообщения по дате создания
export async function getMessagesByCreationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`);
    return res.json();
}

// Получить сообщения по дате прочтения
export async function getMessagesByReadDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/read-date-range?start=${startDate}&end=${endDate}`);
    return res.json();
}

// Получить статистику сообщений
export async function getMessageStatistics() {
    const res = await fetch(`${API_URL}/statistics`);
    return res.json();
}

// Поиск сообщений
export async function searchMessages(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
}

// Получить вложения сообщения
export async function getMessageAttachments(messageId) {
    const res = await fetch(`${API_URL}/${messageId}/attachments`);
    return res.json();
}

// Добавить вложение к сообщению
export async function addMessageAttachment(messageId, attachment) {
    const res = await fetch(`${API_URL}/${messageId}/attachments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(attachment),
    });
    return res.json();
}

// Удалить вложение из сообщения
export async function removeMessageAttachment(messageId, attachmentId) {
    const res = await fetch(`${API_URL}/${messageId}/attachments/${attachmentId}`, {
        method: 'DELETE',
    });
    return res.status === 204;
} 