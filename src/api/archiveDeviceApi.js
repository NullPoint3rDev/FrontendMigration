import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/archive-devices`;

// Получить статистику подключений
export async function getArchiveConnectionStatistics() {
    const res = await fetch(`${API_URL}/statistics`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить статистику воркера
export async function getArchiveWorkerStatistics() {
    const res = await fetch(`${API_URL}/worker-statistics`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить статистику исходящих пакетов
export async function getArchiveOutboundStatistics() {
    const res = await fetch(`${API_URL}/outbound-statistics`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Отправить команду устройству
export async function sendArchiveCommand(mac, command) {
    const res = await fetch(`${API_URL}/send-command?mac=${encodeURIComponent(mac)}&command=${encodeURIComponent(command)}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.json();
}

// Отправить команду синхронизации времени
export async function sendArchiveTimeSync(mac) {
    const res = await fetch(`${API_URL}/send-timesync?mac=${encodeURIComponent(mac)}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.json();
}

// Запросить статус устройства
export async function requestArchiveStatus(mac) {
    const res = await fetch(`${API_URL}/request-status?mac=${encodeURIComponent(mac)}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.json();
}

// Сбросить устройство
export async function resetArchiveDevice(mac) {
    const res = await fetch(`${API_URL}/reset-device?mac=${encodeURIComponent(mac)}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.json();
}

// Отправить команду управления
export async function sendArchiveControl(mac, current, voltage, gasFlow) {
    const params = new URLSearchParams();
    params.append('mac', mac);
    if (current !== undefined) params.append('current', current);
    if (voltage !== undefined) params.append('voltage', voltage);
    if (gasFlow !== undefined) params.append('gasFlow', gasFlow);
    
    const res = await fetch(`${API_URL}/send-control?${params}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.json();
}

// Очистить очередь исходящих пакетов
export async function clearArchiveOutboundQueue() {
    const res = await fetch(`${API_URL}/clear-outbound-queue`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить размер очереди входящих пакетов
export async function getArchiveIncomingQueueSize() {
    const res = await fetch(`${API_URL}/incoming-queue-size`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить размер очереди исходящих пакетов
export async function getArchiveOutboundQueueSize() {
    const res = await fetch(`${API_URL}/outbound-queue-size`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить текущее состояние устройства (для polling)
export async function getArchivePanelState(mac) {
    const res = await fetch(`${API_URL}/panel-state?mac=${encodeURIComponent(mac)}`, {
        headers: getAuthHeaders()
    });
    
    // Проверяем, есть ли контент для парсинга
    const text = await res.text();
    if (!text || text.trim() === '') {
        return null;
    }
    
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
        return null;
    }
}
