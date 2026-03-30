import { api } from '../services/api';

const API_URL = '/welders';

export const getAllWelders = async () => {
    try {
        const response = await api.get(API_URL);
        return response;
    } catch (error) {
        console.error('Error fetching welders:', error);
        throw error;
    }
};

export const getWelderById = async (id) => {
    try {
        const response = await api.get(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error fetching welder:', error);
        throw error;
    }
};

export const createWelder = async (welderData) => {
    try {
        console.log('Creating welder with data:', welderData);
        const response = await api.post(API_URL, welderData);
        console.log('Welder created successfully:', response);
        return response;
    } catch (error) {
        console.error('Error creating welder:', error);
        // Сохраняем полную информацию об ошибке для обработки
        if (error.response) {
            error.response = {
                data: error.response.data || error.response,
                status: error.response.status || error.status
            };
        }
        throw error;
    }
};

export const updateWelder = async (id, welderData) => {
    try {
        const response = await api.put(`${API_URL}/${id}`, welderData);
        return response;
    } catch (error) {
        console.error('Error updating welder:', error);
        throw error;
    }
};

export const deleteWelder = async (id) => {
    try {
        const response = await api.delete(`${API_URL}/${id}`);
        return response;
    } catch (error) {
        console.error('Error deleting welder:', error);
        throw error;
    }
};

export const getWeldersByStatus = async (status) => {
    try {
        const response = await api.get(`${API_URL}/status/${status}`);
        return response;
    } catch (error) {
        console.error('Error fetching welders by status:', error);
        throw error;
    }
};

export const getWeldersByDepartment = async (department) => {
    try {
        const response = await api.get(`${API_URL}/department/${encodeURIComponent(department)}`);
        return response;
    } catch (error) {
        console.error('Error fetching welders by department:', error);
        throw error;
    }
};

export const getWeldersByName = async (name) => {
    try {
        const response = await api.get(`${API_URL}/name/${encodeURIComponent(name)}`);
        return response;
    } catch (error) {
        console.error('Error fetching welders by name:', error);
        throw error;
    }
};

export const getWeldersByGrade = async (grade) => {
    try {
        const response = await api.get(`${API_URL}/grade/${encodeURIComponent(grade)}`);
        return response;
    } catch (error) {
        console.error('Error fetching welders by grade:', error);
        throw error;
    }
};

export const getWelderByRfidCode = async (rfidCode) => {
    try {
        const response = await api.get(`${API_URL}/rfid/${encodeURIComponent(rfidCode)}`);
        return response;
    } catch (error) {
        const st = error?.status;
        if (st !== 404 && st !== 400) {
            console.error('Error fetching welder by RFID code:', error);
        }
        throw error;
    }
};

export const checkRfidCodeAvailability = async (rfidCode, department, excludeWelderId = null) => {
    try {
        // Используем новый эндпоинт для проверки доступности RFID кода
        if (excludeWelderId) {
            const params = new URLSearchParams({
                rfidCode: rfidCode,
                department: department
            });
            const response = await api.get(`${API_URL}/${excludeWelderId}/rfid-availability?${params.toString()}`);
            return response;
        } else {
            // Если это новый сварщик, проверяем через список сварщиков в подразделении
            const welders = await getWeldersByDepartment(department);

            const conflictingWelder = welders.find(welder => {
                // Проверяем, есть ли у сварщика этот RFID код
                if (welder.rfidPasses && Array.isArray(welder.rfidPasses)) {
                    return welder.rfidPasses.some(pass => pass.code === rfidCode);
                } else if (welder.rfidCode) {
                    // Обратная совместимость: парсим строку с разделителями
                    const codes = welder.rfidCode.split(',').map(code => code.trim()).filter(code => code.length > 0);
                    return codes.includes(rfidCode);
                }
                return false;
            });

            return !conflictingWelder; // Возвращаем true, если код доступен
        }
    } catch (error) {
        console.error('Error checking RFID code availability:', error);
        throw error;
    }
};

export const getWelderByEmployeeId = async (employeeId) => {
    try {
        const response = await api.get(`${API_URL}/employee/${encodeURIComponent(employeeId)}`);
        return response;
    } catch (error) {
        console.error('Error fetching welder by employee ID:', error);
        throw error;
    }
};

export const searchWelders = async (filters) => {
    try {
        const params = new URLSearchParams();
        if (filters.name) params.append('name', filters.name);
        if (filters.status) params.append('status', filters.status);
        if (filters.department) params.append('department', filters.department);
        if (filters.grade) params.append('grade', filters.grade);

        const response = await api.get(`${API_URL}/search?${params.toString()}`);
        return response;
    } catch (error) {
        console.error('Error searching welders:', error);
        throw error;
    }
};

export const uploadWelderPhoto = async (welderId, file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.10.137:8084/api';
        const response = await fetch(`${API_BASE_URL}${API_URL}/${welderId}/photo`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Accept': 'application/json'
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Ошибка загрузки фото');
        }

        return await response.text();
    } catch (error) {
        console.error('Error uploading welder photo:', error);
        throw error;
    }
};

export const getWelderPhotoUrl = (welderId) => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.10.137:8084/api';
    return `${API_BASE_URL}${API_URL}/${welderId}/photo`;
};

export const getWelderPhoto = async (welderId) => {
    try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.10.137:8084/api';
        const url = `${API_BASE_URL}${API_URL}/${welderId}/photo`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Accept': 'image/*'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return null; // Фото не найдено
            }
            throw new Error(`Ошибка загрузки фото: ${response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error loading welder photo:', error);
        return null;
    }
};
