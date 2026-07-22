import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const BASE = `${API_BASE_URL}/v2-protocol-test`;

export async function getV2TestMeta() {
    const res = await fetch(`${BASE}/meta`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`meta ${res.status}`);
    return res.json();
}

export async function getV2TestEvents(afterId = 0) {
    const res = await fetch(`${BASE}/events?afterId=${afterId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`events ${res.status}`);
    return res.json();
}

export async function postV2TestCommand(body) {
    const res = await fetch(`${BASE}/command`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `command ${res.status}`);
    return data;
}
