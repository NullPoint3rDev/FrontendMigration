const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function parseJson(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
}

export async function fetchMacRegistry(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value == null || value === '') return;
        if (Array.isArray(value)) {
            value.forEach((v) => qs.append(key, v));
        } else {
            qs.set(key, String(value));
        }
    });
    const res = await fetch(`${API_URL}/mac-address-registry?${qs.toString()}`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

export async function fetchMacEquipmentTypes() {
    const res = await fetch(`${API_URL}/mac-address-registry/equipment-types`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

export async function checkMacRegistryExists(mac) {
    const qs = new URLSearchParams({ mac });
    const res = await fetch(`${API_URL}/mac-address-registry/mac-exists?${qs.toString()}`, {
        headers: authHeaders(),
    });
    return parseJson(res);
}

export async function createMacRegistryEntry({ mac, equipmentTypeId }) {
    const res = await fetch(`${API_URL}/mac-address-registry`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ mac, equipmentTypeId }),
    });
    return parseJson(res);
}

export async function blockMacRegistryEntries(ids) {
    const res = await fetch(`${API_URL}/mac-address-registry/block`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ids }),
    });
    return parseJson(res);
}

export async function unblockMacRegistryEntries(ids) {
    const res = await fetch(`${API_URL}/mac-address-registry/unblock`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ids }),
    });
    return parseJson(res);
}

export async function deleteMacRegistryEntries(ids) {
    const res = await fetch(`${API_URL}/mac-address-registry`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ ids }),
    });
    return parseJson(res);
}

export function formatMacTyping(raw) {
    const digits = String(raw || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 12);
    if (digits.length <= 4) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
}

export function normalizeMacDigits(value) {
    return String(value || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
}
