import { api } from '../services/api';

const API_URL = '/mac-address-registry';

function buildQuery(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value == null || value === '') return;
        if (Array.isArray(value)) {
            value.forEach((v) => qs.append(key, v));
        } else {
            qs.set(key, String(value));
        }
    });
    const query = qs.toString();
    return query ? `?${query}` : '';
}

export async function fetchMacRegistry(params = {}) {
    return api.get(`${API_URL}${buildQuery(params)}`);
}

export async function fetchMacEquipmentTypes() {
    return api.get(`${API_URL}/equipment-types`);
}

export async function checkMacRegistryExists(mac) {
    return api.get(`${API_URL}/mac-exists${buildQuery({ mac })}`);
}

export async function createMacRegistryEntry({ mac, equipmentTypeId }) {
    return api.post(API_URL, { mac, equipmentTypeId });
}

export async function blockMacRegistryEntries(ids) {
    return api.post(`${API_URL}/block`, { ids });
}

export async function unblockMacRegistryEntries(ids) {
    return api.post(`${API_URL}/unblock`, { ids });
}

export async function deleteMacRegistryEntries(ids) {
    return api.delete(API_URL, { body: JSON.stringify({ ids }) });
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
