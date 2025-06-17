// API service for making HTTP requests to WT backend

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.10.137:8083/api';

// Helper function for handling API responses
const handleResponse = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Something went wrong');
    }
    return response.json();
};

// API methods
export const api = {
    // Welding Machine Types
    getWeldingMachineTypes: async () => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types`);
        return handleResponse(response);
    },

    getWeldingMachineTypeById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types/${id}`);
        return handleResponse(response);
    },

    createWeldingMachineType: async (data) => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: data.name,
                description: data.description,
                manufacturer: data.manufacturer,
                model: data.model,
                imageUrl: data.imageUrl,
            }),
        });
        return handleResponse(response);
    },

    updateWeldingMachineType: async (id, data) => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: data.name,
                description: data.description,
                manufacturer: data.manufacturer,
                model: data.model,
                imageUrl: data.imageUrl,
            }),
        });
        return handleResponse(response);
    },

    deleteWeldingMachineType: async (id) => {
        const response = await fetch(`${API_BASE_URL}/welding-machine-types/${id}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },
};