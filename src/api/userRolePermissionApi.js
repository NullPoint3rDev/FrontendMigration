const API_URL = '/api/roles';

// Получить все роли
export async function getAllRoles() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить роль по ID
export async function getRoleById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Создать новую роль
export async function createRole(role) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(role),
    });
    return res.json();
}

// Обновить роль
export async function updateRole(id, role) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(role),
    });
    return res.json();
}

// Удалить роль
export async function deleteRole(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Получить разрешения роли
export async function getRolePermissions(roleId) {
    const res = await fetch(`${API_URL}/${roleId}/permissions`);
    return res.json();
}

// Назначить разрешение роли
export async function assignPermissionToRole(roleId, permissionId) {
    const res = await fetch(`${API_URL}/${roleId}/permissions/${permissionId}`, {
        method: 'POST',
    });
    return res.status === 200;
}

// Удалить разрешение у роли
export async function removePermissionFromRole(roleId, permissionId) {
    const res = await fetch(`${API_URL}/${roleId}/permissions/${permissionId}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Получить все разрешения
export async function getAllPermissions() {
    const res = await fetch('/api/permissions');
    return res.json();
}

// Получить разрешение по ID
export async function getPermissionById(id) {
    const res = await fetch(`/api/permissions/${id}`);
    return res.json();
}

// Создать новое разрешение
export async function createPermission(permission) {
    const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(permission),
    });
    return res.json();
}

// Обновить разрешение
export async function updatePermission(id, permission) {
    const res = await fetch(`/api/permissions/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(permission),
    });
    return res.json();
}

// Удалить разрешение
export async function deletePermission(id) {
    const res = await fetch(`/api/permissions/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Получить роли с разрешениями
export async function getRolesWithPermissions() {
    const res = await fetch(`${API_URL}/with-permissions`);
    return res.json();
}

// Получить разрешения с ролями
export async function getPermissionsWithRoles() {
    const res = await fetch('/api/permissions/with-roles');
    return res.json();
}

// Проверить разрешение пользователя
export async function checkUserPermission(userId, permissionId) {
    const res = await fetch(`/api/users/${userId}/check-permission/${permissionId}`);
    return res.json();
}

// Получить все разрешения пользователя
export async function getAllUserPermissions(userId) {
    const res = await fetch(`/api/users/${userId}/all-permissions`);
    return res.json();
} 