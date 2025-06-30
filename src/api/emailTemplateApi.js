import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/email-templates`;

// Получить все шаблоны
export async function getAllTemplates() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить шаблон по ID
export async function getTemplateById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить шаблоны по типу
export async function getTemplatesByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новый шаблон
export async function createTemplate(template) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(template),
    });
    return res.json();
}

// Обновить шаблон
export async function updateTemplate(id, template) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(template),
    });
    return res.json();
}

// Удалить шаблон
export async function deleteTemplate(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Получить шаблон по коду
export async function getTemplateByCode(code) {
    const res = await fetch(`${API_URL}/code/${code}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить шаблоны по языку
export async function getTemplatesByLanguage(language) {
    const res = await fetch(`${API_URL}/language/${language}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить шаблоны по категории
export async function getTemplatesByCategory(category) {
    const res = await fetch(`${API_URL}/category/${category}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить шаблоны по статусу
export async function getTemplatesByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Активировать шаблон
export async function activateTemplate(id) {
    const res = await fetch(`${API_URL}/${id}/activate`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Деактивировать шаблон
export async function deactivateTemplate(id) {
    const res = await fetch(`${API_URL}/${id}/deactivate`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить активные шаблоны
export async function getActiveTemplates() {
    const res = await fetch(`${API_URL}/active`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить неактивные шаблоны
export async function getInactiveTemplates() {
    const res = await fetch(`${API_URL}/inactive`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить шаблоны по дате создания
export async function getTemplatesByCreationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить статистику шаблонов
export async function getTemplateStatistics() {
    const res = await fetch(`${API_URL}/statistics`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск шаблонов
export async function searchTemplates(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить версии шаблона
export async function getTemplateVersions(templateId) {
    const res = await fetch(`${API_URL}/${templateId}/versions`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новую версию шаблона
export async function createTemplateVersion(templateId, version) {
    const res = await fetch(`${API_URL}/${templateId}/versions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(version),
    });
    return res.json();
}

// Восстановить версию шаблона
export async function restoreTemplateVersion(templateId, versionId) {
    const res = await fetch(`${API_URL}/${templateId}/versions/${versionId}/restore`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить все шаблоны email
export async function getAllEmailTemplates() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить шаблон email по ID
export async function getEmailTemplateById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить шаблоны email по типу
export async function getEmailTemplatesByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить шаблоны email по статусу
export async function getEmailTemplatesByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить активные шаблоны email
export async function getActiveEmailTemplates() {
    const res = await fetch(`${API_URL}/active`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новый шаблон email
export async function createEmailTemplate(template) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(template),
    });
    return res.json();
}

// Обновить шаблон email
export async function updateEmailTemplate(id, template) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(template),
    });
    return res.json();
}

// Удалить шаблон email
export async function deleteEmailTemplate(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Активировать шаблон email
export async function activateEmailTemplate(id) {
    const res = await fetch(`${API_URL}/${id}/activate`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Деактивировать шаблон email
export async function deactivateEmailTemplate(id) {
    const res = await fetch(`${API_URL}/${id}/deactivate`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить предварительный просмотр шаблона
export async function previewEmailTemplate(id, data) {
    const res = await fetch(`${API_URL}/${id}/preview`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
}

// Отправить тестовый email
export async function sendTestEmail(id, testData) {
    const res = await fetch(`${API_URL}/${id}/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(testData),
    });
    return res.json();
}

// Клонировать шаблон email
export async function cloneEmailTemplate(id, newName) {
    const res = await fetch(`${API_URL}/${id}/clone`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newName }),
    });
    return res.json();
}

// Экспортировать шаблон email
export async function exportEmailTemplate(id) {
    const res = await fetch(`${API_URL}/${id}/export`, {
        headers: getAuthHeaders()
    });
    return res.blob();
}

// Импортировать шаблон email
export async function importEmailTemplate(templateData) {
    const res = await fetch(`${API_URL}/import`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(templateData),
    });
    return res.json();
}

// Поиск шаблонов email
export async function searchEmailTemplates(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`, {
        headers: getAuthHeaders()
    });
    return res.json();
} 