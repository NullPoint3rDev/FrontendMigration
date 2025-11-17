import React, { useState, useEffect } from 'react';
import '../styles/weldingEquipmentPageNew.css';
import { useNavigate } from 'react-router-dom';
import AddEquipmentModal from './AddEquipmentModal';
import machineImage from '../images/Untitled 3 копия.png';
// WebSocket отключен — используем только polling API
import { 
    createWeldingMachine, 
    updateWeldingMachine, 
    deleteWeldingMachine, 
    getAllWeldingMachines,
    getAllOrganizationUnits,
    getAllWeldingMachineTypes
} from '../api/weldingMachineApi';
import { getAllEmployees } from '../api/employeeApi';
import { getArchivePanelState } from '../api/archiveDeviceApi';

// Данные теперь загружаются с API сервера

const defaultCoreOptions = {
    gasControl: false,
    rfid: false,
    bvo: false,
};

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
    const [responsibleUsers, setResponsibleUsers] = useState([]);
    const [modelFilter, setModelFilter] = useState('');
    const [organizationUnitFilter, setOrganizationUnitFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
    const [viewMode, setViewMode] = useState('table'); // 'tiles' or 'table'
    const [expandedFilters, setExpandedFilters] = useState({
        department: false,
        status: false,
        model: false
    });
    const currentYear = new Date().getFullYear();
    const navigate = useNavigate();
    const [deviceStatusesByMac, setDeviceStatusesByMac] = useState({}); // { [mac]: 'off' | 'on' | 'welding' }
    const [statusIntervalId, setStatusIntervalId] = useState(null);
    const [shownErrors, setShownErrors] = useState(new Set());

    const todayDateString = new Date().toISOString().split('T')[0];

    const formatDateForInput = (value) => {
        if (!value) return '';
        if (typeof value === 'string') {
            const [datePart] = value.split('T');
            return datePart;
        }
        try {
            return value.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    const findRootOrganizationUnit = () => {
        if (!Array.isArray(organizationUnits) || organizationUnits.length === 0) return null;
        const root = organizationUnits.find(unit => unit.parentId == null || unit.parent_id == null);
        return root || organizationUnits[0];
    };

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
        if (!item) return;

        let coreOptions = { ...defaultCoreOptions };
        let wtModuleMac = '';
        let maintenanceTechnicianName = '';
        let maintenanceTechnicianPass = '';
        let responsibleUserId = '';
        let assignedWelders = Array.isArray(item.assignedWelders) ? item.assignedWelders : [];
        let maintenanceInterval = item.maintenanceInterval ?? item.maintenanceRegulation ?? '';
        let maintenanceReminderHours = item.userServiceNotifiedBeforeHours ?? '';

        if (item.modules) {
            try {
                const parsed = JSON.parse(item.modules);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.options) {
                        coreOptions = {
                            ...defaultCoreOptions,
                            ...parsed.options,
                        };
                    }
                    if (parsed.wtModuleMac) wtModuleMac = parsed.wtModuleMac;
                    if (parsed.maintenance) {
                        maintenanceTechnicianName = parsed.maintenance.technicianName || maintenanceTechnicianName;
                        maintenanceTechnicianPass = parsed.maintenance.technicianPass || parsed.maintenance.technicianRfid || maintenanceTechnicianPass;
                        if (parsed.maintenance.intervalHours != null && maintenanceInterval === '') {
                            maintenanceInterval = parsed.maintenance.intervalHours;
                        }
                        if (parsed.maintenance.reminderHours != null && maintenanceReminderHours === '') {
                            maintenanceReminderHours = parsed.maintenance.reminderHours;
                        }
                    }
                    if (parsed.responsibleUserId) {
                        responsibleUserId = String(parsed.responsibleUserId);
                    }
                    if (parsed.allowedWelders && Array.isArray(parsed.allowedWelders)) {
                        assignedWelders = parsed.allowedWelders;
                    }
                    if (parsed.maintenanceReminderHours != null && maintenanceReminderHours === '') {
                        maintenanceReminderHours = parsed.maintenanceReminderHours;
                    }
                }
            } catch (err) {
                console.warn('Не удалось разобрать поле modules для аппарата', err);
            }
        }

        setEditData({
            ...item,
            name: item.name || '',
            deviceModel: typeof item.deviceModel === 'string' && item.deviceModel
                ? item.deviceModel
                : (typeof item.model === 'string' && item.model ? item.model : item.deviceModel?.name || item.deviceModel?.code || ''),
            mac: item.mac || '',
            commissionDate: formatDateForInput(item.commissionDate || item.dateStartedUsing),
            manufactureYear: item.manufactureYear || '',
            lastService: formatDateForInput(item.lastService || item.lastServiceOn),
            serialNumber: item.serialNumber || '',
            inventoryNumber: item.inventoryNumber || '',
            assignedWelders,
            organizationUnit: item.organizationUnit || (item.organizationUnitId ? { id: item.organizationUnitId, name: item.organizationUnitName } : null),
            weldingMachineType: item.weldingMachineType || (item.weldingMachineTypeId ? { id: item.weldingMachineTypeId, name: item.weldingMachineTypeName } : null),
            coreOptions,
            wtModuleMac,
            maintenanceInterval: maintenanceInterval === null ? '' : maintenanceInterval,
            maintenanceReminderHours: maintenanceReminderHours === null ? '' : maintenanceReminderHours,
            maintenanceTechnicianName,
            maintenanceTechnicianPass,
            responsibleUserId,
            modules: item.modules || null,
        });
        setErrors({});
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditData({});
        setErrors({});
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'deviceModel') {
            setEditData(prev => ({
                ...prev,
                deviceModel: value,
                coreOptions: value === 'CORE'
                    ? { ...(prev.coreOptions || defaultCoreOptions) }
                    : { ...defaultCoreOptions },
                wtModuleMac: value === 'CORE' ? prev.wtModuleMac || '' : '',
                maintenanceInterval: value === 'CORE' ? prev.maintenanceInterval || '' : '',
                maintenanceReminderHours: value === 'CORE' ? prev.maintenanceReminderHours || '' : '',
                maintenanceTechnicianName: value === 'CORE' ? prev.maintenanceTechnicianName || '' : '',
                maintenanceTechnicianPass: value === 'CORE' ? prev.maintenanceTechnicianPass || '' : '',
                responsibleUserId: value === 'CORE' ? prev.responsibleUserId || '' : '',
                modules: value === 'CORE' ? prev.modules : null,
            }));
            return;
        }

        if (name === 'responsibleUserId') {
            setEditData(prev => ({ ...prev, responsibleUserId: value }));
            return;
        }

        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const openAddModal = () => {
        const defaultUnit = findRootOrganizationUnit();
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
            organizationUnit: defaultUnit ? { id: defaultUnit.id, name: defaultUnit.name } : null,
            weldingMachineType: null,
            coreOptions: { ...defaultCoreOptions },
            wtModuleMac: '',
            maintenanceInterval: '',
            maintenanceReminderHours: '',
            maintenanceTechnicianName: '',
            maintenanceTechnicianPass: '',
            responsibleUserId: '',
            modules: null,
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

    const loadResponsibleUsers = async () => {
        try {
            const data = await getAllEmployees();
            setResponsibleUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки ответственных пользователей:', err);
            setResponsibleUsers([]);
        }
    };

    useEffect(() => {
        loadEquipment();
        loadOrganizationUnits();
        loadWeldingMachineTypes();
        loadResponsibleUsers();
    }, []);

    // Poll device statuses every 4s
    useEffect(() => {
        // Clear previous
        if (statusIntervalId) {
            clearInterval(statusIntervalId);
        }
        // Immediate fetch once
        fetchAllStatuses();
        const id = setInterval(fetchAllStatuses, 4000);
        setStatusIntervalId(id);
        return () => {
            if (id) clearInterval(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipment, modelFilter, organizationUnitFilter, searchTerm]);

    const computeStatusFromState = (machine, stateObj) => {
        // Для CORE используем WeldingMachineState из посылки
        // Для остальных: сварка если ток > 1А (Current или State.I), иначе включен если есть данные, иначе выключен
        try {
            const props = stateObj?.properties || {};
            const deviceModel = machine?.deviceModel;

            if (deviceModel === 'CORE') {
                const rawState = props?.WeldingMachineState?.value || props?.WeldingMachineState;
                if (rawState !== undefined && rawState !== null) {
                    const normalized = String(rawState).toLowerCase();
                    // Для Core: ЖЁЛТАЯ плашка (сварка) ТОЛЬКО при явном состоянии "Сварка"
                    if (normalized.includes('weld') || normalized.includes('свар')) return 'welding';
                    if (normalized.includes('on') || normalized.includes('включ') || normalized.includes('ожидан')) return 'on';
                    if (normalized.includes('off') || normalized.includes('выключ')) return 'off';
                }
                // Для Core НЕ используем ток как индикатор сварки, если нет явного статуса "Сварка"
                return stateObj ? 'on' : 'off';
            }
            const currentRaw = props?.Current?.value ?? props?.Current ?? props?.['State.I']?.value ?? props?.['State.I'];
            const current = currentRaw != null ? parseFloat(currentRaw) : 0;
            if (!isNaN(current) && current > 1) return 'welding';
            // Если есть хоть какие-то данные, считаем "включен", иначе "выключен"
            return stateObj ? 'on' : 'off';
        } catch {
            return 'off';
        }
    };

    const fetchAllStatuses = async () => {
        if (!Array.isArray(equipment) || equipment.length === 0) return;
        // Берём устройства после фильтров поиска/модели/подразделения чтобы не опрашивать лишнее
        const list = getFilteredEquipment(false); // без сортировки
        const macs = list.map(m => m.mac).filter(Boolean);
        if (macs.length === 0) return;

        // Запрашиваем статусы параллельно
        const promises = list.map(async (machine) => {
            try {
                const state = await getArchivePanelState(machine.mac);
                const status = computeStatusFromState(machine, state);
                return [machine.mac, status];
            } catch {
                return [machine.mac, 'off'];
            }
        });
        const results = await Promise.all(promises);
        setDeviceStatusesByMac(prev => {
            const next = { ...prev };
            results.forEach(([mac, status]) => {
                next[mac] = status;
            });
            return next;
        });
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSorted = (arr) => {
        if (!sortField) return arr;
        const sorted = [...arr].sort((a, b) => {
            const getVal = (item) => {
                switch (sortField) {
                    case 'name': return (item.name || '').toLowerCase();
                    case 'model': {
                        return getModelDisplay(item).toLowerCase();
                    }
                    case 'mac': return (item.mac || '').toLowerCase();
                    case 'unit': return (item.organizationUnit?.name || '').toLowerCase();
                    case 'inventory': return (item.inventoryNumber || '').toLowerCase();
                    case 'welder': return getWelderDisplay(item).toLowerCase();
                    case 'status': {
                        const status = deviceStatusesByMac[item.mac] || 'off';
                        return status;
                    }
                    default: return '';
                }
            };
            const va = getVal(a);
            const vb = getVal(b);
            if (va < vb) return -1;
            if (va > vb) return 1;
            return 0;
        });
        return sortDirection === 'asc' ? sorted : sorted.reverse();
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const newErrors = {};
        const trimmedName = (editData.name || '').trim();
        if (!trimmedName) newErrors.name = 'Это поле обязательно';
        if (!editData.deviceModel) newErrors.deviceModel = 'Выберите модель устройства';
        // Приводим MAC к формату: только заглавные буквы, без двоеточий
        let mac = (editData.mac || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (!mac || mac.length !== 12) {
            newErrors.mac = 'MAC-адрес должен содержать 12 символов (только 0-9, A-F)';
        }
        if (!editData.organizationUnit) newErrors.organizationUnit = 'Выберите подразделение';
        if (!editData.commissionDate) {
            newErrors.commissionDate = 'Укажите дату ввода в эксплуатацию';
        } else {
            const commissionDateObj = new Date(editData.commissionDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (commissionDateObj > today) {
                newErrors.commissionDate = 'Дата ввода в эксплуатацию не может быть в будущем';
            }
        }

        const selectedUnitId = editData.organizationUnit?.id;
        if (trimmedName && selectedUnitId) {
            const duplicateName = equipment.some(machine => {
                const machineUnitId = machine.organizationUnit?.id || machine.organizationUnitId;
                return machine.id !== editData.id &&
                    machineUnitId === selectedUnitId &&
                    (machine.name || '').trim().toLowerCase() === trimmedName.toLowerCase();
            });
            if (duplicateName) {
                newErrors.name = 'В этом подразделении уже есть аппарат с таким названием';
            }
        }

        const maintenanceIntervalValue = editData.maintenanceInterval !== '' && editData.maintenanceInterval != null
            ? Number(editData.maintenanceInterval)
            : null;
        if (maintenanceIntervalValue != null && (Number.isNaN(maintenanceIntervalValue) || maintenanceIntervalValue < 0)) {
            newErrors.maintenanceInterval = 'Значение должно быть неотрицательным числом';
        }

        const maintenanceReminderValue = editData.maintenanceReminderHours !== '' && editData.maintenanceReminderHours != null
            ? Number(editData.maintenanceReminderHours)
            : null;
        if (maintenanceReminderValue != null && (Number.isNaN(maintenanceReminderValue) || maintenanceReminderValue < 0)) {
            newErrors.maintenanceReminderHours = 'Укажите корректное количество часов';
        }

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        try {
            const commissionDateValue = editData.commissionDate
                ? `${editData.commissionDate}T00:00:00`
                : null;
            const lastServiceValue = editData.lastService
                ? `${editData.lastService}T00:00:00`
                : null;

            const machineData = {
                id: editData.id,
                name: trimmedName,
                deviceModel: editData.deviceModel,
                mac,
                commissionDate: commissionDateValue,
                manufactureYear: editData.manufactureYear || '',
                lastService: lastServiceValue,
                serialNumber: editData.serialNumber || '',
                inventoryNumber: editData.inventoryNumber || '',
                organizationUnit: editData.organizationUnit,
                weldingMachineType: editData.weldingMachineType,
                assignedWelders: editData.assignedWelders || [],
                maintenanceInterval: maintenanceIntervalValue,
                maintenanceRegulation: maintenanceIntervalValue,
                userServiceNotifiedBeforeHours: maintenanceReminderValue,
            };

            if (!editData.id) {
                delete machineData.id;
            }

            const isCoreSelected = editData.deviceModel === 'CORE';

            if (isCoreSelected) {
                const corePayload = {
                    options: {
                        gasControl: Boolean(editData.coreOptions?.gasControl),
                        rfid: Boolean(editData.coreOptions?.rfid),
                        bvo: Boolean(editData.coreOptions?.bvo),
                    },
                    wtModuleMac: editData.wtModuleMac || '',
                    maintenance: {
                        intervalHours: maintenanceIntervalValue,
                        lastServiceDate: lastServiceValue,
                        technicianName: editData.maintenanceTechnicianName || '',
                        technicianPass: editData.maintenanceTechnicianPass || '',
                    },
                    responsibleUserId: editData.responsibleUserId ? Number(editData.responsibleUserId) : null,
                    allowedWelders: editData.assignedWelders || [],
                    maintenanceReminderHours: maintenanceReminderValue,
                };
                machineData.modules = JSON.stringify(corePayload);
            } else {
                machineData.modules = null;
            }

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

    const handleCoreOptionToggle = (optionKey) => (e) => {
        const { checked } = e.target;
        setEditData(prev => ({
            ...prev,
            coreOptions: {
                ...(prev.coreOptions || { ...defaultCoreOptions }),
                [optionKey]: checked
            }
        }));
    };

    // Функция для фильтрации оборудования
    const isCoreSelected = editData?.deviceModel === 'CORE';

    const toggleFilter = (filterName) => {
        setExpandedFilters(prev => ({
            ...prev,
            [filterName]: !prev[filterName]
        }));
    };

    const getFilteredEquipment = (applySort = true) => {
        let filtered = equipment;

        // Фильтр по модели
        if (modelFilter) {
            filtered = filtered.filter(item => item.deviceModel === modelFilter);
        }

        // Organization unit filter by organizationUnit.name
        if (organizationUnitFilter) {
            filtered = filtered.filter(item => (item.organizationUnit?.name || '') === organizationUnitFilter);
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

        return applySort ? getSorted(filtered) : filtered;
    };

    // Функция для получения модели аппарата для отображения
    const getModelDisplay = (item) => {
        if (item.deviceModel === 'MONITORING_BLOCK') return 'Блок Мониторинга';
        if (item.deviceModel === 'CORE') return 'CORE PRO 500';
        return item.model || item.deviceModel?.name || 'Не указана';
    };

    // Функция для получения сварщика
    const getWelderDisplay = (item) => {
        if (item.assignedWelders && Array.isArray(item.assignedWelders) && item.assignedWelders.length > 0) {
            return item.assignedWelders[0];
        }
        return 'Не назначен';
    };

    // Функция для получения последнего включения
    const getLastActivation = (item) => {
        // Можно использовать данные из deviceStatusesByMac или другие поля
        // Пока возвращаем пустую строку, если нет данных
        return '';
    };

    // Функция для получения цвета индикатора по статусу
    const getStatusIndicatorColor = (status) => {
        switch (status) {
            case 'welding':
                return '#FEB63E'; // оранжевый
            case 'on':
                return '#39956C'; // зеленый
            case 'error':
                return '#EC2B3C'; // красный
            case 'off':
            default:
                return '#5C6D81'; // серый
        }
    };

    // Подготовка данных для фильтров
    const buildDepartmentTree = () => {
        const tree = [];
        const rootUnits = organizationUnits.filter(unit => !unit.parentId && !unit.parent_id);
        
        rootUnits.forEach(root => {
            const children = organizationUnits.filter(unit => 
                (unit.parentId === root.id || unit.parent_id === root.id)
            );
            if (children.length > 0) {
                tree.push({
                    id: root.id,
                    label: root.name,
                    children: children.map(child => ({
                        id: child.id,
                        label: child.name
                    }))
                });
            } else {
                tree.push({
                    id: root.id,
                    label: root.name
                });
            }
        });
        return tree;
    };

    const departments = buildDepartmentTree();

    const statuses = [
        { id: 'all', label: 'Все' },
        { id: 'on', label: 'Включен' },
        { id: 'welding', label: 'Сварка' },
        { id: 'error', label: 'Ошибка' },
        { id: 'off', label: 'Выключен' }
    ];

    const models = [
        { id: 'all', label: 'Все' },
        { id: 'CORE', label: 'CORE PRO 500' },
        { id: 'MONITORING_BLOCK', label: 'Блок Мониторинга' }
    ];

    return (
        <div className="welding-equipment-page">
            <div className="filters-column">
                <div className="filter-tile search-input">
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Поиск..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-tile">
                    <button 
                        className="filter-tile-header"
                        onClick={() => toggleFilter('department')}
                    >
                        <span>Подразделение</span>
                        <span className="filter-arrow">{expandedFilters.department ? '▾' : '▸'}</span>
                    </button>
                    {expandedFilters.department && (
                        <div className="filter-tile-content">
                            {departments.map(dept => (
                                <div key={dept.id} className="filter-option">
                                    {dept.children ? (
                                        <>
                                            <label className="filter-checkbox">
                                                <input 
                                                    type="checkbox" 
                                                    checked={organizationUnitFilter === dept.label}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setOrganizationUnitFilter(dept.label);
                                                        } else {
                                                            setOrganizationUnitFilter('');
                                                        }
                                                    }}
                                                />
                                                <span>{dept.label}</span>
                                            </label>
                                            <div className="filter-sub-options">
                                                {dept.children.map(child => (
                                                    <label key={child.id} className="filter-checkbox sub">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={organizationUnitFilter === child.label}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setOrganizationUnitFilter(child.label);
                                                                } else {
                                                                    setOrganizationUnitFilter('');
                                                                }
                                                            }}
                                                        />
                                                        <span>{child.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <label className="filter-checkbox">
                                            <input 
                                                type="checkbox" 
                                                checked={organizationUnitFilter === dept.label}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setOrganizationUnitFilter(dept.label);
                                                    } else {
                                                        setOrganizationUnitFilter('');
                                                    }
                                                }}
                                            />
                                            <span>{dept.label}</span>
                                        </label>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="filter-tile">
                    <button 
                        className="filter-tile-header"
                        onClick={() => toggleFilter('status')}
                    >
                        <span>Состояние</span>
                        <span className="filter-arrow">{expandedFilters.status ? '▾' : '▸'}</span>
                    </button>
                    {expandedFilters.status && (
                        <div className="filter-tile-content">
                            {statuses.map(status => (
                                <label key={status.id} className="filter-checkbox">
                                    <input type="checkbox" />
                                    <span>{status.label}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="filter-tile">
                    <button 
                        className="filter-tile-header"
                        onClick={() => toggleFilter('model')}
                    >
                        <span>Модель аппарата</span>
                        <span className="filter-arrow">{expandedFilters.model ? '▾' : '▸'}</span>
                    </button>
                    {expandedFilters.model && (
                        <div className="filter-tile-content">
                            {models.map(model => (
                                <label key={model.id} className="filter-checkbox">
                                    <input 
                                        type="checkbox" 
                                        checked={modelFilter === model.id || (model.id === 'all' && !modelFilter)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                if (model.id === 'all') {
                                                    setModelFilter('');
                                                } else {
                                                    setModelFilter(model.id);
                                                }
                                            } else {
                                                setModelFilter('');
                                            }
                                        }}
                                    />
                                    <span>{model.label}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="equipment-content-column">
                <div className="content-header">
                    <div className="add-device-tile">
                        <button className="add-device-btn" onClick={openAddModal}>
                            <span className="add-icon">+</span>
                            <span>Добавить аппарат</span>
                        </button>
                    </div>
                    <div className="view-toggle">
                        <button 
                            className={`view-btn ${viewMode === 'tiles' ? 'active' : ''}`}
                            onClick={() => setViewMode('tiles')}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                                <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                                <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                                <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span>Плитки</span>
                        </button>
                        <button 
                            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            <span>Таблица</span>
                        </button>
                    </div>
                </div>

                {viewMode === 'table' && (
                    <div className="equipment-table-container">
                        <table className="equipment-table">
                            <thead>
                                <tr>
                                    <th onClick={() => toggleSort('model')}>
                                        <span>Модель</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('name')}>
                                        <span>Название</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('unit')}>
                                        <span>Подразделение</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('inventory')}>
                                        <span>Инвентарный номер</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('welder')}>
                                        <span>Сварщик</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th>
                                        <span>Последнее включение</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('status')}>
                                        <span>Статус</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {getFilteredEquipment().map((item) => {
                                    const status = deviceStatusesByMac[item.mac] || 'off';
                                    return (
                                        <tr 
                                            key={item.id} 
                                            className="table-row"
                                            onClick={() => handleControl(item)}
                                        >
                                            <td>
                                                <div className="model-cell-table">
                                                    <span 
                                                        className="status-indicator" 
                                                        style={{ backgroundColor: getStatusIndicatorColor(status) }}
                                                    />
                                                    <span>{getModelDisplay(item)}</span>
                                                </div>
                                            </td>
                                            <td>{item.name}</td>
                                            <td>{item.organizationUnit?.name || 'Не указано'}</td>
                                            <td>{item.inventoryNumber || 'Не указан'}</td>
                                            <td>{getWelderDisplay(item)}</td>
                                            <td>{getLastActivation(item) || 'Нет данных'}</td>
                                            <td>
                                                <span className={`status-badge ${status}`}>
                                                    {status === 'welding' ? 'Сварка' : 
                                                     status === 'on' ? 'Включен' : 
                                                     status === 'error' ? 'Ошибка' : 
                                                     'Выключен'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'tiles' && (
                    <div className="equipment-table-container">
                        <table className="equipment-table">
                            <thead>
                                <tr>
                                    <th onClick={() => toggleSort('model')}>
                                        <span>Модель</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('name')}>
                                        <span>Название</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('unit')}>
                                        <span>Подразделение</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('inventory')}>
                                        <span>Инвентарный номер</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('welder')}>
                                        <span>Сварщик</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th>
                                        <span>Последнее включение</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th onClick={() => toggleSort('status')}>
                                        <span>Статус</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {getFilteredEquipment().map((item) => {
                                    const status = deviceStatusesByMac[item.mac] || 'off';
                                    return (
                                        <tr 
                                            key={item.id} 
                                            className="table-row"
                                            onClick={() => handleControl(item)}
                                        >
                                            <td>
                                                <div className="model-cell">
                                                    <img 
                                                        src={machineImage} 
                                                        alt={getModelDisplay(item)}
                                                        className="machine-thumbnail"
                                                    />
                                                    <span>{getModelDisplay(item)}</span>
                                                </div>
                                            </td>
                                            <td>{item.name}</td>
                                            <td>{item.organizationUnit?.name || 'Не указано'}</td>
                                            <td>{item.inventoryNumber || 'Не указан'}</td>
                                            <td>{getWelderDisplay(item)}</td>
                                            <td>{getLastActivation(item) || 'Нет данных'}</td>
                                            <td>
                                                <span className={`status-badge ${status}`}>
                                                    {status === 'welding' ? 'Сварка' : 
                                                     status === 'on' ? 'Включен' : 
                                                     status === 'error' ? 'Ошибка' : 
                                                     'Выключен'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AddEquipmentModal  
                isOpen={modalOpen}
                onClose={closeModal}
                welders={welders}
                organizationUnits={organizationUnits}
                onSave={async (data) => {
                    // Преобразуем данные из AddEquipmentModal в формат для handleSave
                    const newEditData = {
                        ...editData,
                        name: data.name || '',
                        deviceModel: data.model === 'CORE PRO 500' ? 'CORE' : 
                                     data.model === 'Блок Мониторинга' ? 'MONITORING_BLOCK' : 
                                     data.model || '',
                        mac: data.macAddress || '',
                        commissionDate: data.commissioningDate || '',
                        serialNumber: data.serialNumber || '',
                        inventoryNumber: data.inventoryNumber || '',
                        organizationUnit: organizationUnits.find(unit => unit.name === data.department) || null,
                        coreOptions: {
                            gasControl: data.options?.gasControl || false,
                            rfid: data.options?.rfid || false,
                            bvo: data.options?.bvo || false
                        },
                        assignedWelders: data.approvedWelders || []
                    };
                    setEditData(newEditData);
                    // Вызываем handleSave
                    const fakeEvent = { preventDefault: () => {} };
                    await handleSave(fakeEvent);
                }}
            />
        </div>
    );
}

export default WeldingEquipmentPage;
