import { API_BASE_URL } from '../config';

// Вход в систему
export async function login(credentials) {
    console.log('Attempting login with:', credentials);
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(credentials),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    const data = await response.json();
    console.log('Response data:', data);

    if (data.token) {
        localStorage.setItem('token', data.token);
        console.log('Token saved to localStorage:', data.token);
    } else {
        console.error('No token received in response');
        throw new Error('Authentication failed: No token received');
    }

    return data;
}

// Выход из системы
export async function logout() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('No token found during logout');
        return true;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        return response.status === 200;
    } finally {
        localStorage.removeItem('token');
    }
}

// Обновление токена
export async function refreshToken() {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
    });
    return res.json();
}

// Проверка токена
export async function validateToken() {
    const res = await fetch(`${API_BASE_URL}/auth/validate`);
    return res.status === 200;
}

// Получить информацию о текущем пользователе
export async function getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('No token found when getting current user');
        throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    return response.json();
}

// Сменить пароль
export async function changePassword(passwordData) {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(passwordData),
    });
    return response.status === 200;
}

// Запрос на сброс пароля
export async function requestPasswordReset(email) {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password-request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    });
    return response.status === 200;
}

// Сброс пароля
export async function resetPassword(resetData) {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(resetData),
    });
    return response.status === 200;
} 