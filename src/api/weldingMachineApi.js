import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/welding-machines`;

// Получить все машины
export async function getAllWeldingMachines() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить машину по ID
export async function getWeldingMachineById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить машины по организации
export async function getWeldingMachinesByOrganization(organizationId) {
    const res = await fetch(`${API_URL}/organization/${organizationId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить машины по типу
export async function getWeldingMachinesByType(typeId) {
    const res = await fetch(`${API_URL}/type/${typeId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск машин
export async function searchWeldingMachines(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${encodeURIComponent(searchTerm)}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новую машину
export async function createWeldingMachine(machine) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(machine),
    });
    return res.json();
}

// Обновить машину
export async function updateWeldingMachine(id, machine) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(machine),
    });
    return res.json();
}

// Удалить машину
export async function deleteWeldingMachine(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Получить все подразделения
export async function getAllOrganizationUnits() {
    const res = await fetch(`${API_BASE_URL}/organization-units`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить все типы сварочных машин
export async function getAllWeldingMachineTypes() {
    const res = await fetch(`${API_BASE_URL}/welding-machine-types`, {
        headers: getAuthHeaders()
    });
    return res.json();
} 