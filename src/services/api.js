// API service for making HTTP requests to WT backend

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.10.137:8084/api';

// Helper function for handling API responses
const handleResponse = async (response) => {
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
        console.log('Unauthorized response, clearing token and redirecting to login');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
    }
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Something went wrong');
    }

    try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const text = await response.text();
            console.log('Response text:', text);
            try {
                const data = JSON.parse(text);
                console.log('Parsed response data:', data);
                return data;
            } catch (e) {
                console.error('Error parsing JSON:', e);
                throw new Error('Invalid JSON response from server');
            }
        } else {
            const text = await response.text();
            console.log('Response text:', text);
            return text;
        }
    } catch (error) {
        console.error('Error handling response:', error);
        throw new Error('Error handling server response');
    }
};

// Helper function for adding auth headers
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    // Логи убраны для чистоты консоли
    if (!token) {
        console.warn('No token found in localStorage');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    // Логи убраны для чистоты консоли
    return headers;
};

// Helper function for handling auth response
const handleAuthResponse = async (response) => {
    console.log('Handling auth response...');
    const data = await handleResponse(response);
    console.log('Auth response data:', data);

    if (data && data.token) {
        console.log('Setting token:', data.token);
        localStorage.setItem('token', data.token);
    } else {
        console.warn('No token in response:', data);
        throw new Error('Токен не получен от сервера');
    }
    return data;
};

// API methods
export const api = {
    // Auth methods
    login: async (credentials) => {
        console.log('Attempting login with:', credentials);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            console.log('Login response status:', response.status);
            const data = await handleAuthResponse(response);
            console.log('Login successful:', data);
            return data;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    },

    register: async (userData) => {
        console.log('Attempting registration with:', userData);
        try {
            // Сначала регистрируем пользователя
            const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(userData),
                credentials: 'include'
            });
            const registerData = await handleResponse(registerResponse);
            console.log('Registration response:', registerData);

            // Затем выполняем вход
            console.log('Attempting auto-login after registration');
            const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    username: userData.username,
                    password: userData.password
                }),
                credentials: 'include'
            });
            return handleAuthResponse(loginResponse);
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    logout: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            localStorage.removeItem('token');
            localStorage.removeItem('sessionId');
            return handleResponse(response);
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    },

    // User methods
    getCurrentUser: async () => {
        try {
            const headers = getAuthHeaders();
            console.log('Making request to /user-accounts/current with headers:', headers);
            const response = await fetch(`${API_BASE_URL}/user-accounts/current`, {
                method: 'GET',
                headers: headers
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Get current user error:', error);
            throw error;
        }
    },

    updateUserProfile: async (data) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user-accounts/profile`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    },

    uploadUserPhoto: async (formData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/user-accounts/photo`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Accept': 'application/json'
                },
                body: formData,
                credentials: 'include'
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Upload photo error:', error);
            throw error;
        }
    },

    getOrganizations: async () => {
        try {
            const headers = getAuthHeaders();
            console.log('Making request to /organizations with headers:', headers);
            const response = await fetch(`${API_BASE_URL}/organizations`, {
                method: 'GET',
                headers: headers
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Get organizations error:', error);
            throw error;
        }
    },

    // Welding Machine Types
    getWeldingMachineTypes: async () => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    getWeldingMachineTypeById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types/${id}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    createWeldingMachineType: async (data) => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    updateWeldingMachineType: async (id, data) => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    deleteWeldingMachineType: async (id) => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        return handleResponse(response);
    },

    get: async (url, options = {}) => {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            ...options,
        });
        return handleResponse(response);
    },

    post: async (url, data, options = {}) => {
        let headers = getAuthHeaders();
        let body = data;
        if (data instanceof FormData) {
            headers = { ...headers };
            delete headers['Content-Type'];
        } else if (typeof data === 'object') {
            body = JSON.stringify(data);
        }
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'POST',
            headers,
            body,
            ...options,
        });
        return handleResponse(response);
    },

    put: async (url, data, options = {}) => {
        let headers = getAuthHeaders();
        let body = data;
        if (data instanceof FormData) {
            headers = { ...headers };
            delete headers['Content-Type'];
        } else if (typeof data === 'object') {
            body = JSON.stringify(data);
        }
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'PUT',
            headers,
            body,
            ...options,
        });
        return handleResponse(response);
    },

    delete: async (url, options = {}) => {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            ...options,
        });
        return handleResponse(response);
    },

    getMessages: (type, userId) => fetch(`${API_BASE_URL}/messages/${type}?userId=${userId}`).then(r => r.json()),
    getMessage: (id) => fetch(`${API_BASE_URL}/messages/${id}`).then(r => r.json()),
    sendMessage: (formData) => fetch(`${API_BASE_URL}/messages`, { method: 'POST', body: formData }).then(r => r.json()),
    markAsRead: async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/${id}/read`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Ошибка');
            // Не парсим json, если тело пустое
            return;
        } catch (error) {
            console.error('Mark as read error:', error);
            throw error;
        }
    },
    deleteMessage: async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Ошибка удаления');
            // Не парсим json, если тело пустое
            return;
        } catch (error) {
            console.error('Delete message error:', error);
            throw error;
        }
    },
    downloadAttachment: (attachmentId) => fetch(`${API_BASE_URL}/messages/attachments/${attachmentId}`),
    getAllUsers: () => fetch(`${API_BASE_URL}/user-accounts`, { headers: getAuthHeaders() }).then(handleResponse),
};