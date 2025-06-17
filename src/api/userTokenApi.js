const API_URL = '/api/tokens';

// Получить все токены
export async function getAllTokens() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить токен по ID
export async function getTokenById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить токены пользователя
export async function getUserTokens(userId) {
    const res = await fetch(`${API_URL}/user/${userId}`);
    return res.json();
}

// Создать новый токен
export async function createToken(token) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(token),
    });
    return res.json();
}

// Обновить токен
export async function updateToken(id, token) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(token),
    });
    return res.json();
}

// Удалить токен
export async function deleteToken(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Проверить валидность токена
export async function validateToken(token) {
    const res = await fetch(`${API_URL}/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
    });
    return res.json();
}

// Обновить токен
export async function refreshToken(token) {
    const res = await fetch(`${API_URL}/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
    });
    return res.json();
}

// Отозвать токен
export async function revokeToken(id) {
    const res = await fetch(`${API_URL}/${id}/revoke`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Получить активные токены
export async function getActiveTokens() {
    const res = await fetch(`${API_URL}/active`);
    return res.json();
}

// Получить истекшие токены
export async function getExpiredTokens() {
    const res = await fetch(`${API_URL}/expired`);
    return res.json();
}

// Получить токены по типу
export async function getTokensByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`);
    return res.json();
}

// Получить токены по статусу
export async function getTokensByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Получить токены по дате создания
export async function getTokensByCreationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`);
    return res.json();
}

// Получить токены по дате истечения
export async function getTokensByExpirationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/expiration-range?start=${startDate}&end=${endDate}`);
    return res.json();
}

// Получить статистику токенов
export async function getTokenStatistics() {
    const res = await fetch(`${API_URL}/statistics`);
    return res.json();
} 