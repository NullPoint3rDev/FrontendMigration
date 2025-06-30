import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/roles`;

// Получить все роли
export async function getAllRoles() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить роль по ID
export async function getRoleById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новую роль
export async function createRole(role) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(role),
    });
    return res.json();
}

// Обновить роль
export async function updateRole(id, role) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(role),
    });
    return res.json();
}

// Удалить роль
export async function deleteRole(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Получить разрешения роли
export async function getRolePermissions(roleId) {
    const res = await fetch(`${API_URL}/${roleId}/permissions`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Назначить разрешение роли
export async function assignPermissionToRole(roleId, permissionId) {
    const res = await fetch(`${API_URL}/${roleId}/permissions/${permissionId}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Удалить разрешение у роли
export async function removePermissionFromRole(roleId, permissionId) {
    const res = await fetch(`${API_URL}/${roleId}/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Получить все разрешения
export async function getAllPermissions() {
    const res = await fetch(`${API_BASE_URL}/permissions`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить разрешение по ID
export async function getPermissionById(id) {
    const res = await fetch(`${API_BASE_URL}/permissions/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новое разрешение
export async function createPermission(permission) {
    const res = await fetch(`${API_BASE_URL}/permissions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(permission),
    });
    return res.json();
}

// Обновить разрешение
export async function updatePermission(id, permission) {
    const res = await fetch(`${API_BASE_URL}/permissions/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(permission),
    });
    return res.json();
}

// Удалить разрешение
export async function deletePermission(id) {
    const res = await fetch(`${API_BASE_URL}/permissions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Получить роли с разрешениями
export async function getRolesWithPermissions() {
    const res = await fetch(`${API_URL}/with-permissions`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить разрешения с ролями
export async function getPermissionsWithRoles() {
    const res = await fetch(`${API_BASE_URL}/permissions/with-roles`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Проверить разрешение пользователя
export async function checkUserPermission(userId, permissionId) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/check-permission/${permissionId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить все разрешения пользователя
export async function getAllUserPermissions(userId) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/all-permissions`, {
        headers: getAuthHeaders()
    });
    return res.json();
} 