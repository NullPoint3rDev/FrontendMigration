const API_URL = '/api/email-templates';

// Получить все шаблоны
export async function getAllTemplates() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить шаблон по ID
export async function getTemplateById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить шаблоны по типу
export async function getTemplatesByType(type) {
    const res = await fetch(`${API_URL}/type/${type}`);
    return res.json();
}

// Создать новый шаблон
export async function createTemplate(template) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
    });
    return res.json();
}

// Обновить шаблон
export async function updateTemplate(id, template) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
    });
    return res.json();
}

// Удалить шаблон
export async function deleteTemplate(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Получить шаблон по коду
export async function getTemplateByCode(code) {
    const res = await fetch(`${API_URL}/code/${code}`);
    return res.json();
}

// Получить шаблоны по языку
export async function getTemplatesByLanguage(language) {
    const res = await fetch(`${API_URL}/language/${language}`);
    return res.json();
}

// Получить шаблоны по категории
export async function getTemplatesByCategory(category) {
    const res = await fetch(`${API_URL}/category/${category}`);
    return res.json();
}

// Получить шаблоны по статусу
export async function getTemplatesByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Активировать шаблон
export async function activateTemplate(id) {
    const res = await fetch(`${API_URL}/${id}/activate`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Деактивировать шаблон
export async function deactivateTemplate(id) {
    const res = await fetch(`${API_URL}/${id}/deactivate`, {
        method: 'PUT',
    });
    return res.status === 200;
}

// Получить активные шаблоны
export async function getActiveTemplates() {
    const res = await fetch(`${API_URL}/active`);
    return res.json();
}

// Получить неактивные шаблоны
export async function getInactiveTemplates() {
    const res = await fetch(`${API_URL}/inactive`);
    return res.json();
}

// Получить шаблоны по дате создания
export async function getTemplatesByCreationDate(startDate, endDate) {
    const res = await fetch(`${API_URL}/date-range?start=${startDate}&end=${endDate}`);
    return res.json();
}

// Получить статистику шаблонов
export async function getTemplateStatistics() {
    const res = await fetch(`${API_URL}/statistics`);
    return res.json();
}

// Поиск шаблонов
export async function searchTemplates(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
}

// Получить версии шаблона
export async function getTemplateVersions(templateId) {
    const res = await fetch(`${API_URL}/${templateId}/versions`);
    return res.json();
}

// Создать новую версию шаблона
export async function createTemplateVersion(templateId, version) {
    const res = await fetch(`${API_URL}/${templateId}/versions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(version),
    });
    return res.json();
}

// Восстановить версию шаблона
export async function restoreTemplateVersion(templateId, versionId) {
    const res = await fetch(`${API_URL}/${templateId}/versions/${versionId}/restore`, {
        method: 'PUT',
    });
    return res.status === 200;
} 