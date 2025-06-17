const API_URL = '/api/alerts';

// Получить все оповещения
export async function getAllAlerts() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить оповещение по ID
export async function getAlertById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить оповещения по статусу
export async function getAlertsByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Получить оповещения по машине
export async function getAlertsByMachine(machineId) {
    const res = await fetch(`${API_URL}/machine/${machineId}`);
    return res.json();
}

// Получить оповещения по типу
export async function getAlertsByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`);
    return res.json();
}

// Поиск оповещений
export async function searchAlerts(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
}

// Создать новое оповещение
export async function createAlert(alert) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
    });
    return res.json();
}

// Обновить оповещение
export async function updateAlert(id, alert) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
    });
    return res.json();
}

// Удалить оповещение
export async function deleteAlert(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Отметить оповещение как прочитанное
export async function markAlertAsRead(id) {
    const res = await fetch(`${API_URL}/${id}/read`, {
        method: 'PUT',
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
    const res = await fetch(`${API_URL}/unread`);
    return res.json();
}

// Получить количество непрочитанных оповещений
export async function getUnreadAlertsCount() {
    const res = await fetch(`${API_URL}/unread/count`);
    return res.json();
} 