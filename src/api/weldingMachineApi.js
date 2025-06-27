const API_URL = '/welding-machines';

// Получить все сварочные машины
export async function getAllWeldingMachines() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить машину по ID
export async function getWeldingMachineById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить машины по типу
export async function getWeldingMachinesByType(typeId) {
    const res = await fetch(`${API_URL}/type/${typeId}`);
    return res.json();
}

// Получить машины по статусу
export async function getWeldingMachinesByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Получить машины по организации
export async function getWeldingMachinesByOrganization(orgId) {
    const res = await fetch(`${API_URL}/organization/${orgId}`);
    return res.json();
}

// Поиск машин
export async function searchWeldingMachines(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
}

// Создать новую машину
export async function createWeldingMachine(machine) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(machine),
    });
    return res.json();
}

// Обновить машину
export async function updateWeldingMachine(id, machine) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(machine),
    });
    return res.json();
}

// Удалить машину (мягкое удаление)
export async function deleteWeldingMachine(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Жесткое удаление машины
export async function hardDeleteWeldingMachine(id) {
    const res = await fetch(`${API_URL}/${id}/hard`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Получить параметры машины
export async function getWeldingMachineParameters(id) {
    const res = await fetch(`${API_URL}/${id}/parameters`);
    return res.json();
}

// Обновить параметры машины
export async function updateWeldingMachineParameters(id, parameters) {
    const res = await fetch(`${API_URL}/${id}/parameters`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(parameters),
    });
    return res.json();
}

// Получить историю состояний машины
export async function getWeldingMachineStateHistory(id) {
    const res = await fetch(`${API_URL}/${id}/states/history`);
    return res.json();
}

// Получить текущее состояние машины
export async function getWeldingMachineCurrentState(id) {
    const res = await fetch(`${API_URL}/${id}/states/current`);
    return res.json();
}

// Обновить состояние машины
export async function updateWeldingMachineState(id, state) {
    const res = await fetch(`${API_URL}/${id}/states`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
    });
    return res.json();
} 