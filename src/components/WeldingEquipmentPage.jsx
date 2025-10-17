import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { WEBSOCKET_URL } from '../config';
import { 
    createWeldingMachine, 
    updateWeldingMachine, 
    deleteWeldingMachine, 
    getAllWeldingMachines,
    getAllOrganizationUnits,
    getAllWeldingMachineTypes
} from '../api/weldingMachineApi';

// Данные теперь загружаются с API сервера

const navMenu = [
    { label: 'Главная', path: '/' },
    {
        label: 'Предприятия',
        dropdown: [
            { label: 'Организации', path: '/organizations' },
            { label: 'Сотрудники', path: '/employees' },
            { label: 'Сварщики', path: '/welders' },
        ],
    },
    {
        label: 'Ресурсы',
        dropdown: [
            { label: 'Сварочные материалы', path: '/materials' },
            { label: 'Сварочное оборудование', path: '/equipment' },
        ],
    },
    {
        label: 'Инструкции',
        dropdown: [
            { label: 'Безопасность сварочных работ', path: '/safety' },
            { label: 'Прошивки', path: '/firmware' },
            { label: 'Документы', path: '/docs' },
        ],
    },
    {
        label: 'Мониторинг',
        dropdown: [
            { label: 'Архив', path: '/archive' },
            { label: 'Отчеты', path: '/reports' },
        ],
    },
    {
        label: 'Обучение',
        dropdown: [
            { label: 'Библиотека', path: '/library' },
        ],
    },
    {
        label: 'ДСЕ',
        dropdown: [
            { label: 'Типы проволоки', path: '/wire-types' },
        ],
    },
    { label: 'О программе', path: '/about' },
];

function WeldingEquipmentPage() {
    const [equipment, setEquipment] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [dropdown, setDropdown] = useState(null);
    const [errors, setErrors] = useState({});
    const [welders, setWelders] = useState([]);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [weldingMachineTypes, setWeldingMachineTypes] = useState([]);
    const [modelFilter, setModelFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const currentYear = new Date().getFullYear();
    const navigate = useNavigate();
    const [deviceDataByMac, setDeviceDataByMac] = useState({});

    // Load welders from localStorage
    useEffect(() => {
        const savedWelders = localStorage.getItem('welders');
        if (savedWelders) {
            setWelders(JSON.parse(savedWelders));
        }
    }, []);

    // Load equipment from API only
    useEffect(() => {
        // Убираем загрузку из localStorage, используем только API
        loadEquipment();
    }, []);

    // Данные теперь хранятся в базе данных, localStorage не нужен

    useEffect(() => {
        const stompClient = new Client({
            brokerURL: undefined, // обязательно undefined, если используешь SockJS
            webSocketFactory: () => new SockJS(WEBSOCKET_URL),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('WebSocket подключен к сварочному аппарату');
                
                // Подписка на данные от устройств
                stompClient.subscribe('/topic/device', (message) => {
                    if (message.body) {
                        console.log('Получены данные от устройства:', message.body);
                        const [mac, ...dataArr] = message.body.split(':');
                        const data = dataArr.join(':');
                        setDeviceDataByMac(prev => ({ ...prev, [mac]: data }));
                    }
                });

                // Подписка на события подключения/отключения устройств
                stompClient.subscribe('/topic/device-status', (message) => {
                    if (message.body) {
                        try {
                            const statusData = JSON.parse(message.body);
                            console.log('Статус устройства обновлен:', statusData);
                            
                            // Обновляем статус устройства в списке
                            setEquipment(prev => prev.map(item => 
                                item.mac === statusData.mac 
                                    ? { ...item, lastSeen: statusData.timestamp, status: statusData.status }
                                    : item
                            ));
                        } catch (e) {
                            console.error('Ошибка парсинга статуса устройства:', e);
                        }
                    }
                });

                // Подписка на события ошибок соответствия модели
                stompClient.subscribe('/topic/device-model-error', (message) => {
                    if (message.body) {
                        try {
                            const errorData = JSON.parse(message.body);
                            console.error('Ошибка соответствия модели устройства:', errorData);
                            
                            // Можно показать уведомление пользователю
                            alert(`Ошибка соответствия модели для устройства ${errorData.mac}: ${errorData.message}`);
                        } catch (e) {
                            console.error('Ошибка парсинга ошибки модели:', e);
                        }
                    }
                });
            },
            onDisconnect: () => {
                console.log('WebSocket отключен от сварочного аппарата');
            },
            onStompError: (error) => {
                console.error('WebSocket ошибка:', error);
            }
        });
        stompClient.activate();
        return () => {
            stompClient.deactivate();
        };
    }, []);

    // Navigation logic
    const handleNavClick = (item, e) => {
        if (item.dropdown) {
            e.stopPropagation();
            setDropdown(dropdown === item.label ? null : item.label);
        } else {
            window.location.pathname = item.path;
        }
    };

    const handleDropdownClick = (subitem) => {
        window.location.pathname = subitem.path;
    };

    // Modal logic
    const openEditModal = (item) => {
        setEditData(item);
        setErrors({});
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditData({});
        setErrors({});
    };

    const handleInputChange = (e) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };

    const openAddModal = () => {
        setEditData({
            name: '',
            deviceModel: '',
            mac: '',
            department: '',
            status: '',
            imageUrl: '',
            commissionDate: '',
            manufactureYear: '',
            lastService: '',
            serialNumber: '',
            inventoryNumber: '',
            assignedWelders: [],
            organizationUnit: null,
            weldingMachineType: null
        });
        setErrors({});
        setModalOpen(true);
    };

    // Загрузка оборудования с сервера
    const loadEquipment = async () => {
        try {
            const data = await getAllWeldingMachines();
            console.log('equipment from API:', data);
            setEquipment(Array.isArray(data) ? data : []);
        } catch (err) {
            setErrors({ api: 'Ошибка загрузки оборудования: ' + err.message });
            setEquipment([]);
        }
    };

    // Загрузка подразделений
    const loadOrganizationUnits = async () => {
        try {
            const data = await getAllOrganizationUnits();
            setOrganizationUnits(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки подразделений:', err);
            setOrganizationUnits([]);
        }
    };

    // Загрузка типов сварочных машин
    const loadWeldingMachineTypes = async () => {
        try {
            const data = await getAllWeldingMachineTypes();
            setWeldingMachineTypes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки типов сварочных машин:', err);
            setWeldingMachineTypes([]);
        }
    };

    useEffect(() => {
        loadEquipment();
        loadOrganizationUnits();
        loadWeldingMachineTypes();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!editData.name) newErrors.name = 'Это поле обязательно';
        if (!editData.deviceModel) newErrors.deviceModel = 'Выберите модель устройства';
        // Приводим MAC к формату: только заглавные буквы, без двоеточий
        let mac = (editData.mac || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (!mac || mac.length !== 12) {
            newErrors.mac = 'MAC-адрес должен содержать 12 символов (только 0-9, A-F)';
        }
        if (!editData.organizationUnit) newErrors.organizationUnit = 'Выберите подразделение';

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        try {
            const machineData = {
                ...editData,
                mac,
                organizationUnit: editData.organizationUnit,
                weldingMachineType: editData.weldingMachineType
            };

            if (editData.id) {
                await updateWeldingMachine(editData.id, machineData);
                alert('Оборудование успешно обновлено');
            } else {
                await createWeldingMachine(machineData);
                alert('Оборудование успешно создано');
            }
            await loadEquipment();
            closeModal();
        } catch (err) {
            console.error('Ошибка сохранения оборудования:', err);
            setErrors({ api: err.message });
            alert('Ошибка сохранения оборудования: ' + err.message);
        }
    };

    // Delete handler
    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это оборудование?')) {
            try {
                await deleteWeldingMachine(id);
                await loadEquipment();
                // Показываем уведомление об успешном удалении
                alert('Оборудование успешно удалено');
            } catch (err) {
                console.error('Ошибка удаления оборудования:', err);
                alert('Ошибка удаления оборудования: ' + err.message);
            }
        }
    };

    // Action buttons
    const handleControl = (item) => {
        navigate(`/device-monitor?machine=${encodeURIComponent(item.name)}&mac=${encodeURIComponent(item.mac)}`);
    };

    const navigateToWelderProfile = (welderId) => {
        if (welderId) {
            navigate(`/welders/${welderId}`);
        }
    };

    const handleSelectAllWelders = () => {
        setEditData({
            ...editData,
            assignedWelders: welders.map(w => w.name)
        });
    };

    const handleWelderSelection = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
        setEditData({
            ...editData,
            assignedWelders: selectedOptions
        });
    };

    // Функция для фильтрации оборудования
    const getFilteredEquipment = () => {
        let filtered = equipment;

        // Фильтр по модели
        if (modelFilter) {
            filtered = filtered.filter(item => item.deviceModel === modelFilter);
        }

        // Фильтр по поисковому запросу
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.name?.toLowerCase().includes(term) ||
                item.mac?.toLowerCase().includes(term) ||
                item.serialNumber?.toLowerCase().includes(term) ||
                item.inventoryNumber?.toLowerCase().includes(term)
            );
        }

        return filtered;
    };

    return (
        <div className="equipment-page">
            <div className="equipment-header">
                <h1 className="equipment-title">Сварочное оборудование</h1>
                <button className="add-equipment-btn" onClick={openAddModal}>
                    <i className="fas fa-plus"></i>
                    Добавить оборудование
                </button>
            </div>

            {/* Фильтры */}
            <div className="equipment-filters">
                <div className="filter-group">
                    <label className="filter-label">Поиск:</label>
                    <input
                        type="text"
                        className="filter-input"
                        placeholder="Поиск по названию, MAC, серийному номеру..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Модель:</label>
                    <select
                        className="filter-select"
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value)}
                    >
                        <option value="">Все модели</option>
                        <option value="MONITORING_BLOCK">Блок мониторинга</option>
                        <option value="CORE">Core</option>
                    </select>
                </div>
            </div>

            {getFilteredEquipment().length > 0 ? (
                <table className="equipment-table">
                    <thead>
                        <tr>
                            <th>Название</th>
                            <th>Модель</th>
                            <th>MAC</th>
                            <th>Подразделение</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getFilteredEquipment().map((item) => (
                            <tr key={item.id}>
                                <td>{item.name}</td>
                                <td>
                                    {item.deviceModel === 'MONITORING_BLOCK' ? 'Блок мониторинга' : 
                                     item.deviceModel === 'CORE' ? 'Core' : 
                                     item.model || 'Не указана'}
                                </td>
                                <td>{item.mac}</td>
                                <td>{item.organizationUnit?.name || 'Не указано'}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={() => openEditModal(item)}
                                            title="Редактировать"
                                        >
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            className="action-btn control-btn"
                                            onClick={() => handleControl(item)}
                                            title="Управление"
                                        >
                                            <i className="fas fa-cog"></i>
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={() => handleDelete(item.id)}
                                            title="Удалить"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="no-equipment">
                    <div className="no-equipment-content">
                        <i className="fas fa-tools" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}></i>
                        <h3>Нет оборудования</h3>
                        <p>Добавьте первое устройство, нажав кнопку "Добавить оборудование"</p>
                    </div>
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editData.id ? 'Редактировать оборудование' : 'Добавить оборудование'}
                            </h2>
                            <button className="close-btn" onClick={closeModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Название</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={editData.name || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите название"
                                />
                                {errors.name && <p className="error-message">{errors.name}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Модель устройства *</label>
                                <select
                                    name="deviceModel"
                                    value={editData.deviceModel || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option value="">Выберите модель устройства</option>
                                    <option value="MONITORING_BLOCK">Блок мониторинга</option>
                                    <option value="CORE">Core</option>
                                </select>
                                {errors.deviceModel && <p className="error-message">{errors.deviceModel}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">MAC-адрес *</label>
                                <input
                                    type="text"
                                    name="mac"
                                    value={editData.mac || ''}
                                    onChange={(e) => {
                                        // Автоматическая нормализация MAC-адреса
                                        let value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
                                        if (value.length > 12) {
                                            value = value.substring(0, 12);
                                        }
                                        setEditData({ ...editData, mac: value });
                                    }}
                                    className="form-input"
                                    placeholder="Введите MAC-адрес (12 символов: 0-9, A-F)"
                                    maxLength={12}
                                />
                                {errors.mac && <p className="error-message">{errors.mac}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Подразделение</label>
                                <select
                                    name="organizationUnit"
                                    value={editData.organizationUnit?.id || ''}
                                    onChange={(e) => {
                                        const selectedUnit = organizationUnits.find(unit => unit.id === parseInt(e.target.value));
                                        setEditData({ ...editData, organizationUnit: selectedUnit });
                                    }}
                                    className="form-input"
                                >
                                    <option value="">Выберите подразделение</option>
                                    {organizationUnits.map(unit => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.organizationUnit && (
                                    <p className="error-message">{errors.organizationUnit}</p>
                                )}
                            </div>


                            <div className="form-group">
                                <label className="form-label">Дата ввода в эксплуатацию</label>
                                <input
                                    type="date"
                                    name="commissionDate"
                                    value={editData.commissionDate || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Год выпуска</label>
                                <input
                                    type="number"
                                    name="manufactureYear"
                                    value={editData.manufactureYear || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    min="1900"
                                    max={currentYear}
                                    placeholder="Введите год выпуска"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Последнее обслуживание</label>
                                <input
                                    type="date"
                                    name="lastService"
                                    value={editData.lastService || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Серийный номер</label>
                                <input
                                    type="text"
                                    name="serialNumber"
                                    value={editData.serialNumber || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите серийный номер"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Инвентарный номер</label>
                                <input
                                    type="text"
                                    name="inventoryNumber"
                                    value={editData.inventoryNumber || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите инвентарный номер"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Назначенные сварщики</label>
                                <select
                                    multiple
                                    name="assignedWelders"
                                    value={editData.assignedWelders || []}
                                    onChange={handleWelderSelection}
                                    className="welder-select"
                                >
                                    {welders.map(welder => (
                                        <option key={welder.id} value={welder.name}>
                                            {welder.name} (RFID: {welder?.rfidCode || 'Не указан'})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="select-all-btn"
                                    onClick={handleSelectAllWelders}
                                >
                                    Выбрать всех сварщиков
                                </button>
                            </div>

                            {editData.assignedWelders && editData.assignedWelders.length > 0 && (
                                <div className="assigned-welders">
                                    <label className="form-label">Текущие назначения:</label>
                                    {editData.assignedWelders.map(welderName => {
                                        const welder = welders.find(w => w.name === welderName);
                                        return (
                                            <div
                                                key={welderName}
                                                className="assigned-welder"
                                                onClick={() => navigateToWelderProfile(welder?.id)}
                                            >
                                                <div>{welderName}</div>
                                                <div className="rfid-code">
                                                    RFID: {welder?.rfidCode || 'Не указан'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="submit" className="save-btn">
                                    <i className="fas fa-save"></i>
                                    Сохранить
                                </button>
                                <button type="button" className="cancel-btn" onClick={closeModal}>
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WeldingEquipmentPage;