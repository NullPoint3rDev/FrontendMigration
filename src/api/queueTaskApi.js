const API_URL = '/api/queue-tasks';

// Получить все задачи
export async function getAllTasks() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить задачу по ID
export async function getTaskById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить задачи по статусу
export async function getTasksByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Получить задачи по типу
export async function getTasksByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`);
    return res.json();
}

// Создать новую задачу
export async function createTask(task) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
    });
    return res.json();
}

// Обновить задачу
export async function updateTask(id, task) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
    });
    return res.json();
}

// Удалить задачу
export async function deleteTask(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Приостановить задачу
export async function pauseTask(id) {
    const res = await fetch(`${API_URL}/${id}/pause`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Возобновить задачу
export async function resumeTask(id) {
    const res = await fetch(`${API_URL}/${id}/resume`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Отменить задачу
export async function cancelTask(id) {
    const res = await fetch(`${API_URL}/${id}/cancel`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Получить активные задачи
export async function getActiveTasks() {
    const res = await fetch(`${API_URL}/active`);
    return res.json();
}

// Получить завершенные задачи
export async function getCompletedTasks() {
    const res = await fetch(`${API_URL}/completed`);
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