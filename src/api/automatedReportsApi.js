import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';
import { formatMoscowDateTime } from '../utils/moscowTime';

const API_URL = `${API_BASE_URL}/automated-reports`;

// Получить все автоматизированные отчеты
export async function getAllAutomatedReports() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить автоматизированный отчет по ID
export async function getAutomatedReportById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить автоматизированные отчеты пользователя
export async function getUserAutomatedReports(userId) {
    const res = await fetch(`${API_URL}/user/${userId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить активные автоматизированные отчеты
export async function getActiveAutomatedReports() {
    const res = await fetch(`${API_URL}/active`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новый автоматизированный отчет
export async function createAutomatedReport(reportData) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reportData)
    });
    return res.json();
}

// Обновить автоматизированный отчет
export async function updateAutomatedReport(id, reportData) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(reportData)
    });
    return res.json();
}

// Удалить автоматизированный отчет
export async function deleteAutomatedReport(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Активировать/деактивировать автоматизированный отчет
export async function toggleAutomatedReportStatus(id) {
    const res = await fetch(`${API_URL}/${id}/toggle-status`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.json();
}

// Запустить автоматизированный отчет вручную
export async function runAutomatedReport(id) {
    const res = await fetch(`${API_URL}/${id}/run`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить историю выполнения автоматизированного отчета
export async function getAutomatedReportHistory(id) {
    const res = await fetch(`${API_URL}/${id}/history`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить статистику автоматизированных отчетов
export async function getAutomatedReportsStats() {
    const res = await fetch(`${API_URL}/stats`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск автоматизированных отчетов
export async function searchAutomatedReports(searchTerm) {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить доступные типы триггеров
export async function getTriggerTypes() {
    const res = await fetch(`${API_URL}/trigger-types`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить доступные шаблоны отчетов для автоматизации
export async function getAvailableTemplates() {
    const res = await fetch(`${API_URL}/available-templates`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Валидация конфигурации триггера
export async function validateTriggerConfig(triggerConfig) {
    const res = await fetch(`${API_URL}/validate-trigger`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(triggerConfig)
    });
    return res.json();
}

// Получить следующее время выполнения для триггера
export async function getNextRunTime(triggerConfig) {
    const res = await fetch(`${API_URL}/next-run-time`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(triggerConfig)
    });
    return res.json();
}

// Экспорт конфигурации автоматизированных отчетов
export async function exportAutomatedReportsConfig() {
    const res = await fetch(`${API_URL}/export`, {
        headers: getAuthHeaders()
    });
    return res.blob();
}

// Импорт конфигурации автоматизированных отчетов
export async function importAutomatedReportsConfig(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/import`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            // Не устанавливаем Content-Type, чтобы браузер сам установил с boundary
        },
        body: formData
    });
    return res.json();
}

// Получить логи выполнения автоматизированных отчетов
export async function getExecutionLogs(filters = {}) {
    const queryParams = new URLSearchParams(filters);
    const res = await fetch(`${API_URL}/logs?${queryParams}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Очистить старые логи выполнения
export async function clearOldExecutionLogs(olderThanDays = 30) {
    const res = await fetch(`${API_URL}/logs/clear?olderThanDays=${olderThanDays}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить настройки автоматизированных отчетов
export async function getAutomatedReportsSettings() {
    const res = await fetch(`${API_URL}/settings`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Обновить настройки автоматизированных отчетов
export async function updateAutomatedReportsSettings(settings) {
    const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings)
    });
    return res.json();
}

// Вспомогательные функции
export const automatedReportsHelpers = {
    // Создать стандартную конфигурацию триггера по времени
    createTimeTrigger: (frequency, time, timezone = 'UTC') => {
        return {
            type: 'TIME',
            frequency,
            time,
            timezone,
            description: `Каждый ${frequency} в ${time} (${timezone})`
        };
    },

    // Создать триггер по ошибкам оборудования
    createEquipmentErrorTrigger: (threshold, equipmentIds = []) => {
        return {
            type: 'EQUIPMENT_ERROR',
            threshold,
            equipmentIds,
            description: `При превышении ${threshold} ошибок в час`
        };
    },

    // Создать триггер по значениям параметров
    createValueThresholdTrigger: (parameter, operator, value, equipmentIds = []) => {
        return {
            type: 'VALUE_THRESHOLD',
            parameter,
            operator,
            value,
            equipmentIds,
            description: `Когда ${parameter} ${operator} ${value}`
        };
    },

    // Валидация конфигурации автоматизированного отчета
    validateReportConfig: (config) => {
        const errors = [];
        
        if (!config.name || config.name.trim().length === 0) {
            errors.push('Название отчета обязательно');
        }
        
        if (!config.templateId) {
            errors.push('Шаблон отчета обязателен');
        }
        
        if (!config.triggers || config.triggers.length === 0) {
            errors.push('Необходимо добавить хотя бы один триггер');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Форматирование времени следующего запуска
    formatNextRunTime: (nextRun) => {
        if (!nextRun) return 'Не запланирован';
        
        const date = new Date(nextRun);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        
        if (diff < 0) return 'Просрочен';
        if (diff < 60000) return 'Скоро';
        if (diff < 3600000) return `Через ${Math.floor(diff / 60000)} мин`;
        if (diff < 86400000) return `Через ${Math.floor(diff / 3600000)} ч`;
        
        return formatMoscowDateTime(date);
    },

    // Получить статус автоматизированного отчета
    getReportStatus: (report) => {
        if (!report.isActive) return 'INACTIVE';
        if (!report.nextRun) return 'NO_SCHEDULE';
        
        const nextRun = new Date(report.nextRun);
        const now = new Date();
        
        if (nextRun < now) return 'OVERDUE';
        return 'ACTIVE';
    },

    // Получить цвет статуса
    getStatusColor: (status) => {
        const colors = {
            'ACTIVE': 'success',
            'INACTIVE': 'default',
            'NO_SCHEDULE': 'warning',
            'OVERDUE': 'error'
        };
        return colors[status] || 'default';
    },

    // Получить текст статуса
    getStatusText: (status) => {
        const texts = {
            'ACTIVE': 'Активен',
            'INACTIVE': 'Неактивен',
            'NO_SCHEDULE': 'Без расписания',
            'OVERDUE': 'Просрочен'
        };
        return texts[status] || status;
    }
};
