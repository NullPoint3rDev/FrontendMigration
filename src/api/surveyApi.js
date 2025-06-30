import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/surveys`;

// Получить все опросы
export async function getAllSurveys() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить опрос по ID
export async function getSurveyById(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить опросы по статусу
export async function getSurveysByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить активные опросы
export async function getActiveSurveys() {
    const res = await fetch(`${API_URL}/active`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск опросов
export async function searchSurveys(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новый опрос
export async function createSurvey(survey) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(survey),
    });
    return res.json();
}

// Обновить опрос
export async function updateSurvey(id, survey) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(survey),
    });
    return res.json();
}

// Удалить опрос
export async function deleteSurvey(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Активировать опрос
export async function activateSurvey(id) {
    const res = await fetch(`${API_URL}/${id}/activate`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Деактивировать опрос
export async function deactivateSurvey(id) {
    const res = await fetch(`${API_URL}/${id}/deactivate`, {
        method: 'PUT',
        headers: getAuthHeaders()
    });
    return res.status === 200;
}

// Получить вопросы опроса
export async function getSurveyQuestions(surveyId) {
    const res = await fetch(`${API_URL}/${surveyId}/questions`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Добавить вопрос к опросу
export async function addSurveyQuestion(surveyId, question) {
    const res = await fetch(`${API_URL}/${surveyId}/questions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(question),
    });
    return res.json();
}

// Обновить вопрос опроса
export async function updateSurveyQuestion(surveyId, questionId, question) {
    const res = await fetch(`${API_URL}/${surveyId}/questions/${questionId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(question),
    });
    return res.json();
}

// Удалить вопрос из опроса
export async function deleteSurveyQuestion(surveyId, questionId) {
    const res = await fetch(`${API_URL}/${surveyId}/questions/${questionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.status === 204;
}

// Получить ответы на опрос
export async function getSurveyResponses(surveyId) {
    const res = await fetch(`${API_URL}/${surveyId}/responses`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Отправить ответ на опрос
export async function submitSurveyResponse(surveyId, response) {
    const res = await fetch(`${API_URL}/${surveyId}/responses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(response),
    });
    return res.json();
}

// Получить статистику опроса
export async function getSurveyStatistics(surveyId) {
    const res = await fetch(`${API_URL}/${surveyId}/statistics`, {
        headers: getAuthHeaders()
    });
    return res.json();
} 