import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/dumps`;

// Получить все дампы
export async function getAllDumps() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить дамп по ID
export async function getDumpById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить дампы по типу
export async function getDumpsByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новый дамп
export async function createDump(dump) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(dump),
    });
    return res.json();
}

// Обновить дамп
export async function updateDump(id, dump) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(dump),
    });
    return res.json();
}

// Удалить дамп
export async function deleteDump(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Получить дампы по статусу
export async function getDumpsByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить дампы по размеру
export async function getDumpsBySize(minSize, maxSize) {
    const res = await fetch(`${API_URL}/size-range?min=${minSize}&max=${maxSize}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить дампы по дате создания
export async function getDumpsByCreationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Скачать дамп
export async function downloadDump(id) {
    const res = await fetch(`${API_URL}/${id}/download`, {
        headers: getAuthHeaders()
    });
    return res.blob();
}

// Загрузить дамп
export async function uploadDump(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/json'
        },
        body: formData,
    });
    return res.json();
}

// Восстановить дамп
export async function restoreDump(id) {
    const res = await fetch(`${API_URL}/${id}/restore`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить статистику дампов
export async function getDumpStatistics() {
    const res = await fetch(`${API_URL}/statistics`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск дампов
export async function searchDumps(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить метаданные дампа
export async function getDumpMetadata(id) {
    const res = await fetch(`${API_URL}/${id}/metadata`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Обновить метаданные дампа
export async function updateDumpMetadata(id, metadata) {
    const res = await fetch(`${API_URL}/${id}/metadata`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(metadata),
    });
    return res.json();
}

// Получить историю дампа
export async function getDumpHistory(id) {
    const res = await fetch(`${API_URL}/${id}/history`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать резервную копию дампа
export async function backupDump(id) {
    const res = await fetch(`${API_URL}/${id}/backup`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.json();
} 