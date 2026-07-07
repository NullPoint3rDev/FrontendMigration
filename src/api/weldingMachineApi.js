import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const API_URL = `${API_BASE_URL}/welding-machines`;

/** Ограничивает время ожидания ответа (сервер может «висеть» на PUT без ответа — UI тогда залипает). */
async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (e) {
        if (e && e.name === 'AbortError') {
            const err = new Error(
                `Превышено время ожидания ответа сервера (${Math.round(timeoutMs / 1000)} с). Проверьте бэкенд или сеть.`
            );
            err.name = 'AbortError';
            throw err;
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

// Проверка «живости» устройства по MAC (стучится ли аппарат на сервер сейчас)
export async function getMacLiveness(mac) {
    const res = await fetch(`${API_URL}/mac-liveness?mac=${encodeURIComponent(mac)}`, {
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
}

// Получить все машины
export async function getAllWeldingMachines() {
    const res = await fetch(API_URL, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить машину по ID
export async function getWeldingMachineById(id) {
    const res = await fetchWithTimeout(
        `${API_URL}/${id}`,
        { headers: getAuthHeaders() },
        60000
    );
    if (!res.ok) {
        let errorData;
        try {
            errorData = await res.json();
        } catch {
            errorData = { message: `HTTP ${res.status}: ${res.statusText}` };
        }
        const error = new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
        if (errorData.errors) error.errors = errorData.errors;
        throw error;
    }
    return res.json();
}

// Получить машины по организации
export async function getWeldingMachinesByOrganization(organizationId) {
    const res = await fetch(`${API_URL}/organization/${organizationId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить машины по типу
export async function getWeldingMachinesByType(typeId) {
    const res = await fetch(`${API_URL}/type/${typeId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Поиск машин
export async function searchWeldingMachines(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${encodeURIComponent(searchTerm)}`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Создать новую машину
export async function createWeldingMachine(machine) {
    console.log('📤 createWeldingMachine: Отправляем данные:', machine);
    console.log('📤 createWeldingMachine: URL:', API_URL);

    const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
    };
    console.log('📤 createWeldingMachine: Заголовки:', headers);

    const res = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(machine),
    });

    console.log('📥 createWeldingMachine: Статус ответа:', res.status, res.statusText);

    if (!res.ok) {
        let errorData;
        try {
            errorData = await res.json();
            console.error('❌ createWeldingMachine: Данные ошибки:', errorData);
        } catch (e) {
            console.error('❌ createWeldingMachine: Не удалось распарсить JSON ошибки:', e);
            errorData = { message: `HTTP ${res.status}: ${res.statusText}` };
        }

        // Извлекаем сообщение об ошибке из разных возможных форматов
        const errorMessage = errorData.message ||
            errorData.error ||
            errorData.api ||
            (errorData.errors && typeof errorData.errors === 'object' ?
                (errorData.errors.message || errorData.errors.api || JSON.stringify(errorData.errors)) :
                errorData.errors) ||
            `HTTP ${res.status}: ${res.statusText}`;

        console.error('❌ createWeldingMachine: Извлеченное сообщение об ошибке:', errorMessage);

        const error = new Error(errorMessage);
        if (errorData.errors) {
            error.errors = errorData.errors;
        }
        throw error;
    }

    const result = await res.json();
    console.log('✅ createWeldingMachine: Успешно создано:', result);
    return result;
}

// Обновить машину
export async function updateWeldingMachine(id, machine) {
    const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
    };

    const res = await fetchWithTimeout(
        `${API_URL}/${id}`,
        {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(machine),
        },
        60000
    );

    if (!res.ok) {
        let errorData;
        try {
            errorData = await res.json();
        } catch (e) {
            errorData = { message: `HTTP ${res.status}: ${res.statusText}` };
        }

        // Извлекаем сообщение об ошибке из разных возможных форматов
        const errorMessage = errorData.message ||
            errorData.error ||
            errorData.api ||
            (errorData.errors && typeof errorData.errors === 'object' ?
                (errorData.errors.message || errorData.errors.api || JSON.stringify(errorData.errors)) :
                errorData.errors) ||
            `HTTP ${res.status}: ${res.statusText}`;

        const error = new Error(errorMessage);
        if (errorData.errors) {
            error.errors = errorData.errors;
        }
        throw error;
    }

    const text = await Promise.race([
        res.text(),
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error('Сервер не отдал тело ответа вовремя (таймаут чтения).')),
                30000
            )
        ),
    ]);
    if (!text || !text.trim()) return null;
    try {
        return JSON.parse(text);
    } catch (_) {
        return null;
    }
}

// Удалить машину (мягкое удаление — статус Deleted)
export async function deleteWeldingMachine(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Ошибка удаления устройства' }));
        throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    return true;
}

// Полное удаление аппарата из БД (включая MAC и связанные данные)
export async function hardDeleteWeldingMachine(id) {
    const res = await fetch(`${API_URL}/${id}/hard`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Ошибка удаления устройства' }));
        throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    return true;
}

// Получить все подразделения
export async function getAllOrganizationUnits() {
    const res = await fetch(`${API_BASE_URL}/organization-units`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить все типы сварочных машин
export async function getAllWeldingMachineTypes() {
    const res = await fetch(`${API_BASE_URL}/welding-machine-types`, {
        headers: getAuthHeaders()
    });
    return res.json();
}

// Получить ID аппаратов по RFID кодам
export async function getWeldingMachineIdsByRfidCodes(rfidCodes) {
    const res = await fetch(`${API_BASE_URL}/welding-machine-states/machines-by-rfid`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(rfidCodes)
    });
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
} 