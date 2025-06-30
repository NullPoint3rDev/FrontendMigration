import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/queue-tasks`;

// Получить все задачи
export async function getAllQueueTasks() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить задачу по ID
export async function getQueueTaskById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить задачи по статусу
export async function getQueueTasksByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить задачи по типу
export async function getQueueTasksByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новую задачу
export async function createQueueTask(task) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(task),
    });
    return res.json();
}

// Обновить задачу
export async function updateQueueTask(id, task) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(task),
    });
    return res.json();
}

// Удалить задачу
export async function deleteQueueTask(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Приостановить задачу
export async function pauseQueueTask(id) {
    const res = await fetch(`${API_URL}/${id}/pause`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Возобновить задачу
export async function resumeQueueTask(id) {
    const res = await fetch(`${API_URL}/${id}/resume`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Отменить задачу
export async function cancelQueueTask(id) {
    const res = await fetch(`${API_URL}/${id}/cancel`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить активные задачи
export async function getActiveQueueTasks() {
    const res = await fetch(`${API_URL}/active`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить завершенные задачи
export async function getCompletedQueueTasks() {
    const res = await fetch(`${API_URL}/completed`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить задачи в очереди
export async function getQueuedTasks() {
    const res = await fetch(`${API_URL}/queued`);
    return res.json();
}

// Получить задачи по приоритету
export async function getTasksByPriority(priority) {
    const res = await fetch(`${API_URL}/priority/${priority}`);
    return res.json();
}

// Получить задачи по дате создания
export async function getTasksByCreationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`);
    return res.json();
}

// Получить статистику задач
export async function getTaskStatistics() {
    const res = await fetch(`${API_URL}/statistics`);
    return res.json();
}

// Поиск задач
export async function searchTasks(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
} 