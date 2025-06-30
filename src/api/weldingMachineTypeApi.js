import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/welding-machine-types`;

// Получить все типы сварочных машин
export async function getAllWeldingMachineTypes() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить тип по ID
export async function getWeldingMachineTypeById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить тип по имени
export async function getWeldingMachineTypeByName(name) {
    const res = await fetch(`${API_URL}/name/${name}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить типы по статусу
export async function getWeldingMachineTypesByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск типов
export async function searchWeldingMachineTypes(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новый тип
export async function createWeldingMachineType(type) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(type),
    });
    return res.json();
}

// Обновить тип
export async function updateWeldingMachineType(id, type) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(type),
    });
    return res.json();
}

// Удалить тип (мягкое удаление)
export async function deleteWeldingMachineType(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Жесткое удаление типа
export async function hardDeleteWeldingMachineType(id) {
    const res = await fetch(`${API_URL}/${id}/hard`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
} 