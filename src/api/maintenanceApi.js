const API_URL = '/api/maintenance';

// Получить все записи обслуживания
export async function getAllMaintenanceRecords() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить запись обслуживания по ID
export async function getMaintenanceRecordById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить записи обслуживания по машине
export async function getMaintenanceRecordsByMachine(machineId) {
    const res = await fetch(`${API_URL}/machine/${machineId}`);
    return res.json();
}

// Получить записи обслуживания по статусу
export async function getMaintenanceRecordsByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Получить записи обслуживания по типу
export async function getMaintenanceRecordsByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`);
    return res.json();
}

// Поиск записей обслуживания
export async function searchMaintenanceRecords(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
}

// Создать новую запись обслуживания
export async function createMaintenanceRecord(record) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
    });
    return res.json();
}

// Обновить запись обслуживания
export async function updateMaintenanceRecord(id, record) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
    });
    return res.json();
}

// Удалить запись обслуживания
export async function deleteMaintenanceRecord(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Запланировать обслуживание
export async function scheduleMaintenance(machineId, schedule) {
    const res = await fetch(`${API_URL}/schedule/${machineId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedule),
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

// Отметить обслуживание как выполненное
export async function markMaintenanceAsCompleted(id) {
    const res = await fetch(`${API_URL}/${id}/complete`, {
        method: 'PUT',
    });
    return res.status === 200;
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