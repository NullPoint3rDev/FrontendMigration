import { API_BASE_URL } from '../config';

const handleResponse = async (response) => {
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Response text:', text);

    if (!response.ok) {
        let error;
        try {
            error = JSON.parse(text);
        } catch (e) {
            console.error('Error parsing error response:', e);
            error = { message: text || 'An error occurred' };
        }
        throw new Error(error.message || 'An error occurred');
    }

    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('Error parsing success response:', e);
        throw new Error('Invalid JSON response from server');
    }
};

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token);

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Generated headers:', headers);
    return headers;
};

export const userAccountApi = {
    getCurrentUser: async () => {
        const headers = getAuthHeaders();
        console.log('Making request to /user-accounts/current with headers:', headers);

        const response = await fetch(`${API_BASE_URL}/user-accounts/current`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });

        return handleResponse(response);
    },

    updateUserProfile: async (userData) => {
        console.log('Making request to /user-accounts/profile with headers:', getAuthHeaders());
        const response = await fetch(`${API_BASE_URL}/user-accounts/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });
        return handleResponse(response);
    },

    uploadUserPhoto: async (formData) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Authorization': `Bearer ${token}`
        };

        console.log('Making request to /user-accounts/upload-photo with headers:', headers);

        const response = await fetch(`${API_BASE_URL}/user-accounts/upload-photo`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include'
        });

        return handleResponse(response);
    },

    getOrganizations: async () => {
        const headers = getAuthHeaders();
        console.log('Making request to /organizations with headers:', headers);

        const response = await fetch(`${API_BASE_URL}/organizations`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });

        return handleResponse(response);
    }
};