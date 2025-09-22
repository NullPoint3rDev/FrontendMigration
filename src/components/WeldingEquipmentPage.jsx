import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { 
    createWeldingMachine, 
    updateWeldingMachine, 
    deleteWeldingMachine, 
    getAllWeldingMachines,
    getAllOrganizationUnits,
    getAllWeldingMachineTypes
} from '../api/weldingMachineApi';

const initialEquipment = [
    {
        id: 1,
        name: 'MC-501-MXPULSE',
        model: 'MC-501-MXPULSE',
        mac: '001A2B3C4D5E',
        department: 'Конструкторский отдел ALLOY',
        status: '',
        imageUrl: '/images/mx_pulse.webp',
        commissionDate: '',
        manufactureYear: '',
        lastService: '',
        serialNumber: '',
        inventoryNumber: '',
        assignedWelders: []
    },
    {
        id: 2,
        name: 'T2',
        model: 'T2',
        mac: '001A2B3C4D5C',
        department: 'Конструкторский отдел ALLOY',
        status: '',
        imageUrl: '/images/T2.jpg',
        commissionDate: '',
        manufactureYear: '',
        lastService: '',
        serialNumber: '',
        inventoryNumber: '',
        assignedWelders: []
    },
    {
        id: 3,
        name: 'MC500M1',
        model: 'MC500M1',
        mac: '001A2B3C4D5D',
        department: 'Конструкторский отдел ALLOY',
        status: '',
        imageUrl: '/images/MC500M1.jpg',
        commissionDate: '',
        manufactureYear: '',
        lastService: '',
        serialNumber: '',
        inventoryNumber: '',
        assignedWelders: []
    },
    {
        id: 4,
        name: 'MC-1001A1',
        model: 'MC-1001A1',
        mac: '001A2B3C4D5F',
        department: 'Конструкторский отдел ALLOY',
        status: '',
        imageUrl: '/images/MC-1001A1.jpg',
        commissionDate: '',
        manufactureYear: '',
        lastService: '',
        serialNumber: '',
        inventoryNumber: '',
        assignedWelders: []
    },
    {
        id: 5,
        name: 'МС-501 MX',
        model: 'МС-501 MX',
        mac: '001A2B3C4D5G',
        department: 'Конструкторский отдел ALLOY',
        status: '',
        imageUrl: '/images/МС-501 MX.jpg',
        commissionDate: '',
        manufactureYear: '',
        lastService: '',
        serialNumber: '',
        inventoryNumber: '',
        assignedWelders: []
    },
    {
        id: 6,
        name: 'БМ 500',
        model: 'БМ 500',
        mac: '001A2B3C4D5C',
        department: 'Конструкторский отдел ALLOY',
        status: '',
        imageUrl: '/images/БМ 500.jpg',
        commissionDate: '',
        manufactureYear: '',
        lastService: '',
        serialNumber: '',
        inventoryNumber: '',
        assignedWelders: []
    },
    {
        id: 7,
        name: 'Блок мониторинга ОГК',
        model: 'Блок мониторинга ОГК',
        mac: '8CAAB50C4254',
        department: 'Конструкторский отдел ALLOY',
        status: '',
        imageUrl: '/images/display_adaptive.png',
        commissionDate: '',
        manufactureYear: '',
        lastService: '',
        serialNumber: '',
        inventoryNumber: '',
        assignedWelders: []
    },
];

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

    // Load equipment from localStorage or use initial data
    useEffect(() => {
        const savedEquipment = localStorage.getItem('equipment');
        if (savedEquipment) {
            setEquipment(JSON.parse(savedEquipment));
        } else {
            setEquipment(initialEquipment);
        }
    }, []);

    // Save equipment to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('equipment', JSON.stringify(equipment));
    }, [equipment]);

    useEffect(() => {
        const stompClient = new Client({
            brokerURL: undefined, // обязательно undefined, если используешь SockJS
            webSocketFactory: () => new SockJS('http://95.172.58.219:8084/api/ws'),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('WebSocket подключен к сварочному аппарату');
                stompClient.subscribe('/topic/device', (message) => {
                    if (message.body) {
                        console.log('Получены данные от устройства:', message.body);
                        const [mac, ...dataArr] = message.body.split(':');
                        const data = dataArr.join(':');
                        setDeviceDataByMac(prev => ({ ...prev, [mac]: data }));
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
            model: '',
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
        if (!editData.model) newErrors.model = 'Это поле обязательно';
        // Приводим MAC к формату: только заглавные буквы, без двоеточий
        let mac = (editData.mac || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (!mac || mac.length !== 12) {
            newErrors.mac = 'MAC-адрес должен содержать 12 символов (только 0-9, A-F)';
        }
        if (!editData.organizationUnit) newErrors.organizationUnit = 'Выберите подразделение';
        if (!editData.weldingMachineType) newErrors.weldingMachineType = 'Выберите тип сварочной машины';

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
            } else {
                await createWeldingMachine(machineData);
            }
            await loadEquipment();
            closeModal();
        } catch (err) {
            setErrors({ api: err.message });
        }
    };

    // Delete handler
    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это оборудование?')) {
            try {
                await deleteWeldingMachine(id);
                await loadEquipment();
                closeModal();
            } catch (err) {
                setErrors({ api: err.message });
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

    return (
        <div className="equipment-page">
            <div className="equipment-header">
                <h1 className="equipment-title">Сварочное оборудование</h1>
                <button className="add-equipment-btn" onClick={openAddModal}>
                    <i className="fas fa-plus"></i>
                    Добавить оборудование
                </button>
            </div>

            <div className="equipment-grid">
                {equipment.map((item) => (
                    <div key={item.id} className="equipment-card">
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="equipment-image"
                            onError={(e) => {
                                e.target.src = '/images/placeholder.jpg';
                            }}
                        />
                        <div className="equipment-info">
                            <h3 className="equipment-name">{item.name}</h3>
                            <p className="equipment-model">Модель: {item.model}</p>
                            <div className="equipment-details">
                                <div className="detail-item">
                                    <span className="detail-label">MAC:</span>
                                    {item.mac}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Отдел:</span>
                                    {item.department}
                                </div>
                                {item.serialNumber && (
                                    <div className="detail-item">
                                        <span className="detail-label">Серийный номер:</span>
                                        {item.serialNumber}
                                    </div>
                                )}
                                {item.inventoryNumber && (
                                    <div className="detail-item">
                                        <span className="detail-label">Инв. номер:</span>
                                        {item.inventoryNumber}
                                    </div>
                                )}
                            </div>
                            {item.assignedWelders && item.assignedWelders.length > 0 && (
                                <div className="assigned-welders">
                                    <div className="detail-label">Назначенные сварщики:</div>
                                    {item.assignedWelders.map(welderName => {
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
                            {/* Данные от аппарата по MAC */}
                            {deviceDataByMac[item.mac] && (
                                <div className="device-data-block">
                                    <strong>Данные от аппарата:</strong>
                                    <pre>{deviceDataByMac[item.mac]}</pre>
                                </div>
                            )}
                            <div className="equipment-actions">
                                <button
                                    className="action-btn control-btn"
                                    onClick={() => handleControl(item)}
                                >
                                    <i className="fas fa-cog"></i>
                                    Управление
                                </button>
                                <button
                                    className="action-btn edit-btn"
                                    onClick={() => openEditModal(item)}
                                >
                                    <i className="fas fa-edit"></i>
                                    Редактировать
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(item.id)}
                                >
                                    <i className="fas fa-trash"></i>
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
                                <label className="form-label">Модель</label>
                                <input
                                    type="text"
                                    name="model"
                                    value={editData.model || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите модель"
                                />
                                {errors.model && <p className="error-message">{errors.model}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">MAC-адрес</label>
                                <input
                                    type="text"
                                    name="mac"
                                    value={editData.mac || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите MAC-адрес"
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
                                <label className="form-label">Тип сварочной машины</label>
                                <select
                                    name="weldingMachineType"
                                    value={editData.weldingMachineType?.id || ''}
                                    onChange={(e) => {
                                        const selectedType = weldingMachineTypes.find(type => type.id === parseInt(e.target.value));
                                        setEditData({ ...editData, weldingMachineType: selectedType });
                                    }}
                                    className="form-input"
                                >
                                    <option value="">Выберите тип сварочной машины</option>
                                    {weldingMachineTypes.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.weldingMachineType && (
                                    <p className="error-message">{errors.weldingMachineType}</p>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">URL изображения</label>
                                <input
                                    type="text"
                                    name="imageUrl"
                                    value={editData.imageUrl || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите URL изображения"
                                />
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