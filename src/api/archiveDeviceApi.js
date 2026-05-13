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
    try {
        const res = await fetch(`${API_URL}/panel-state?mac=${encodeURIComponent(mac)}`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            console.error('❌ [archiveDeviceApi] HTTP Error:', res.status, res.statusText);
            const errorText = await res.text();
            console.error('❌ [archiveDeviceApi] Error response body:', errorText);
            return null;
        }

        const text = await res.text();

        if (!text || text.trim() === '' || text.trim() === 'null') {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            console.error('❌ [archiveDeviceApi] Ошибка парсинга JSON:', error);
            console.error('❌ [archiveDeviceApi] Текст для парсинга:', text.substring(0, 500));
            return null;
        }
    } catch (error) {
        console.error('❌ [archiveDeviceApi] Ошибка запроса:', error);
        console.error('❌ [archiveDeviceApi] Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        return null;
    }
}

// История телеметрии (epoch millis): ток/напряжение/статус/ошибка/RFID за период (<= 24ч)
export async function getArchiveTelemetryHistory(mac, fromMs, toMs) {
    const params = new URLSearchParams();
    params.append('mac', mac);
    params.append('fromMs', String(fromMs));
    params.append('toMs', String(toMs));
    const res = await fetch(`${API_URL}/telemetry-history?${params.toString()}`, {
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
}
