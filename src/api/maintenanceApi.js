import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/maintenance`;

// Получить все записи обслуживания
export async function getAllMaintenance() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить запись обслуживания по ID
export async function getMaintenanceById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить записи обслуживания по машине
export async function getMaintenanceByMachine(machineId) {
    const res = await fetch(`${API_URL}/machine/${machineId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить записи обслуживания по статусу
export async function getMaintenanceByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить записи обслуживания по типу
export async function getMaintenanceByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск записей обслуживания
export async function searchMaintenanceRecords(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
}

// Создать новую запись обслуживания
export async function createMaintenance(maintenance) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(maintenance),
    });
    return res.json();
}

// Обновить запись обслуживания
export async function updateMaintenance(id, maintenance) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(maintenance),
    });
    return res.json();
}

// Удалить запись обслуживания
export async function deleteMaintenance(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Запланировать обслуживание
export async function scheduleMaintenance(maintenance) {
    const res = await fetch(`${API_URL}/schedule`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(maintenance),
    });
    return res.json();
}

// Завершить обслуживание
export async function completeMaintenance(id) {
    const res = await fetch(`${API_URL}/${id}/complete`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Отменить обслуживание
export async function cancelMaintenance(id) {
    const res = await fetch(`${API_URL}/${id}/cancel`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить запланированное обслуживание
export async function getScheduledMaintenance() {
    const res = await fetch(`${API_URL}/scheduled`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить завершенное обслуживание
export async function getCompletedMaintenance() {
    const res = await fetch(`${API_URL}/completed`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить расписание обслуживания
export async function getMaintenanceSchedule(machineId) {
    const res = await fetch(`${API_URL}/schedule/${machineId}`);
    return res.json();
}

// Обновить расписание обслуживания
export async function updateMaintenanceSchedule(machineId, schedule) {
    const res = await fetch(`${API_URL}/schedule/${machineId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedule),
    });
    return res.json();
}

// Получить предстоящие обслуживания
export async function getUpcomingMaintenance() {
    const res = await fetch(`${API_URL}/upcoming`);
    return res.json();
}

// Получить просроченные обслуживания
export async function getOverdueMaintenance() {
    const res = await fetch(`${API_URL}/overdue`);
    return res.json();
}

// Получить статистику обслуживания
export async function getMaintenanceStatistics(machineId) {
    const res = await fetch(`${API_URL}/statistics/${machineId}`);
    return res.json();
} 