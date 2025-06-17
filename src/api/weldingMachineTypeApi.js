const API_URL = '/api/welding-machine-types';

// Получить все типы сварочных машин
export async function getAllWeldingMachineTypes() {
    const res = await fetch(API_URL);
    return res.json();
}

// Получить тип по ID
export async function getWeldingMachineTypeById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    return res.json();
}

// Получить тип по имени
export async function getWeldingMachineTypeByName(name) {
    const res = await fetch(`${API_URL}/name/${name}`);
    return res.json();
}

// Получить типы по статусу
export async function getWeldingMachineTypesByStatus(status) {
    const res = await fetch(`${API_URL}/status/${status}`);
    return res.json();
}

// Поиск типов
export async function searchWeldingMachineTypes(searchTerm) {
    const res = await fetch(`${API_URL}/search?searchTerm=${searchTerm}`);
    return res.json();
}

// Создать новый тип
export async function createWeldingMachineType(type) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(type),
    });
    return res.json();
}

// Обновить тип
export async function updateWeldingMachineType(id, type) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(type),
    });
    return res.json();
}

// Удалить тип (мягкое удаление)
export async function deleteWeldingMachineType(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    return res.status === 204;
}

// Жесткое удаление типа
export async function hardDeleteWeldingMachineType(id) {
    const res = await fetch(`${API_URL}/${id}/hard`, {
        method: 'DELETE',
    });
    return res.status === 204;
} 