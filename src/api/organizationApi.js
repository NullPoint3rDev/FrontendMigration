import { API_BASE_URL } from '../config';
const API_URL = `${API_BASE_URL}/organizations`;

// Получить все организации
export async function getAllOrganizations() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить организацию по ID
export async function getOrganizationById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить организации по статусу
export async function getOrganizationsByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Поиск организаций
export async function searchOrganizations(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
}

// Создать новую организацию
export async function createOrganization(organization) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(organization),
    });
    return res.json();
}

// Обновить организацию
export async function updateOrganization(id, organization) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(organization),
    });
    return res.json();
}

// Удалить организацию (мягкое удаление)
export async function deleteOrganization(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Жесткое удаление организации
export async function hardDeleteOrganization(id) {
    const res = await fetch(`${API_URL}/${id}/hard`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Получить подразделения организации
export async function getOrganizationUnits(orgId) {
    const res = await fetch(`${API_URL}/${orgId}/units`);
    return res.json();
}

// Добавить подразделение в организацию
export async function addOrganizationUnit(orgId, unit) {
    const res = await fetch(`${API_URL}/${orgId}/units`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(unit),
    });
    return res.json();
}

// Обновить подразделение организации
export async function updateOrganizationUnit(orgId, unitId, unit) {
    const res = await fetch(`${API_URL}/${orgId}/units/${unitId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(unit),
    });
    return res.json();
}

// Удалить подразделение организации
export async function deleteOrganizationUnit(orgId, unitId) {
    const res = await fetch(`${API_URL}/${orgId}/units/${unitId}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}