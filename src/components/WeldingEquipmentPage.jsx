import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FaChevronRight, FaChevronDown, FaBell } from 'react-icons/fa';
import '../styles/weldingEquipmentPageNew.css';
import { useNavigate } from 'react-router-dom';
import AddEquipmentModal from './AddEquipmentModal';
import UserProfile from './UserProfile';
import machineImage from '../images/Untitled 3 копия.png';
import ResourcesLogo from '../images/ResourcesLogo.png';
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

const EQUIPMENT_FILTERS_STORAGE_KEY = 'weldingEquipmentFilters';

function loadFiltersFromStorage() {
    try {
        const raw = sessionStorage.getItem(EQUIPMENT_FILTERS_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {}
    return null;
}

function saveFiltersToStorage(data) {
    try {
        sessionStorage.setItem(EQUIPMENT_FILTERS_STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
}

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

function getInitialFilterState() {
    const s = loadFiltersFromStorage();
    return {
        modelFilter: Array.isArray(s?.modelFilter) ? s.modelFilter : [],
        organizationUnitFilter: Array.isArray(s?.organizationUnitFilter) ? s.organizationUnitFilter : [],
        statusFilter: Array.isArray(s?.statusFilter) && s.statusFilter.length > 0 ? s.statusFilter : ['on', 'welding', 'error', 'off'],
        searchTerm: typeof s?.searchTerm === 'string' ? s.searchTerm : '',
        sortField: typeof s?.sortField === 'string' ? s.sortField : 'unit',
        sortDirection: s?.sortDirection === 'desc' ? 'desc' : 'asc',
        viewMode: s?.viewMode === 'tiles' ? 'tiles' : 'table',
    };
}

function WeldingEquipmentPage() {
    const initialFilters = useMemo(() => getInitialFilterState(), []);
    const [equipment, setEquipment] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [dropdown, setDropdown] = useState(null);
    const [errors, setErrors] = useState({});
    const [welders, setWelders] = useState([]);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [weldingMachineTypes, setWeldingMachineTypes] = useState([]);
    const [responsibleUsers, setResponsibleUsers] = useState([]);
    const [modelFilter, setModelFilter] = useState(initialFilters.modelFilter); // Массив выбранных моделей
    const [organizationUnitFilter, setOrganizationUnitFilter] = useState(initialFilters.organizationUnitFilter); // Массив выбранных подразделений
    const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter); // Массив выбранных статусов (по умолчанию все выбраны)
    const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm);
    const [sortField, setSortField] = useState(initialFilters.sortField); // по умолчанию сортировка по подразделению
    const [sortDirection, setSortDirection] = useState(initialFilters.sortDirection); // 'asc' | 'desc'
    const [viewMode, setViewMode] = useState(initialFilters.viewMode); // 'tiles' or 'table'
    const [expandedFilters, setExpandedFilters] = useState({
        department: true,
        status: true,
        model: true
    });
    const [expandedOrganizationUnits, setExpandedOrganizationUnits] = useState({});
    const currentYear = new Date().getFullYear();
    const navigate = useNavigate();
    const [deviceStatusesByMac, setDeviceStatusesByMac] = useState({}); // { [mac]: 'off' | 'on' | 'welding' }
    const [deviceStatesByMac, setDeviceStatesByMac] = useState({}); // { [mac]: 'Дежурный режим' | 'Ожидание' | 'Заблокирован' | ... }
    const [statusIntervalId, setStatusIntervalId] = useState(null);
    const [shownErrors, setShownErrors] = useState(new Set());
    const lastGoodStateByMacRef = useRef({});
    const lastGoodSeenAtRef = useRef({});
    const STATUS_STALE_MS = 10000;

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
            // Удаляем дубликаты по id перед установкой
            const uniqueEquipment = Array.isArray(data) ? data.filter((item, index, self) =>
                index === self.findIndex(t => t.id === item.id)
            ) : [];
            setEquipment(uniqueEquipment);
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

    // Сохраняем фильтры в sessionStorage при изменении, чтобы при возврате со страницы мониторинга они не сбрасывались
    useEffect(() => {
        saveFiltersToStorage({
            modelFilter,
            organizationUnitFilter,
            statusFilter,
            searchTerm,
            sortField,
            sortDirection,
            viewMode,
        });
    }, [modelFilter, organizationUnitFilter, statusFilter, searchTerm, sortField, sortDirection, viewMode]);

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
    }, [equipment, modelFilter, organizationUnitFilter, statusFilter, searchTerm]);

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
        // Получаем отфильтрованное оборудование без сортировки
        const list = getFilteredEquipment(false); // без сортировки
        const macs = list.map(m => m.mac).filter(Boolean);
        if (macs.length === 0) return;

        // Запрашиваем статусы параллельно
        const promises = list.map(async (machine) => {
            const now = Date.now();
            const mac = machine.mac;
            try {
                const state = await getArchivePanelState(mac);
                if (state) {
                    lastGoodStateByMacRef.current[mac] = state;
                    lastGoodSeenAtRef.current[mac] = now;
                }
                let resolvedState = state;
                if (!resolvedState) {
                    const lastSeen = lastGoodSeenAtRef.current[mac];
                    if (lastSeen && now - lastSeen <= STATUS_STALE_MS) {
                        resolvedState = lastGoodStateByMacRef.current[mac] || null;
                    }
                }
                const status = computeStatusFromState(machine, resolvedState);
                // Получаем реальное состояние аппарата для форматирования
                const props = resolvedState?.properties || {};
                const rawState = props?.WeldingMachineState?.value || props?.WeldingMachineState || null;
                return [mac, status, rawState];
            } catch {
                const lastSeen = lastGoodSeenAtRef.current[mac];
                if (lastSeen && now - lastSeen <= STATUS_STALE_MS) {
                    const cachedState = lastGoodStateByMacRef.current[mac] || null;
                    const status = computeStatusFromState(machine, cachedState);
                    const props = cachedState?.properties || {};
                    const rawState = props?.WeldingMachineState?.value || props?.WeldingMachineState || null;
                    return [mac, status, rawState];
                }
                return [mac, 'off', null];
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
        setDeviceStatesByMac(prev => {
            const next = { ...prev };
            results.forEach(([mac, , rawState]) => {
                next[mac] = rawState;
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

    // Вспомогательные функции для сортировки (определяем заранее)
    const getModelDisplayForSort = (item) => {
        if (item.deviceModel === 'MONITORING_BLOCK') return 'Блок Мониторинга';
        if (item.deviceModel === 'CORE') return 'CORE PULSE';
        return item.deviceModel || '';
    };

    const getWelderDisplayForSort = (item) => {
        if (item.assignedWelders && Array.isArray(item.assignedWelders) && item.assignedWelders.length > 0) {
            return item.assignedWelders[0];
        }
        return 'Не назначен';
    };

    const getSorted = (arr) => {
        if (!sortField) return arr;
        // Создаем копию массива перед сортировкой
        const sorted = [...arr].sort((a, b) => {
            const getVal = (item) => {
                switch (sortField) {
                    case 'name': return (item.name || '').toLowerCase();
                    case 'model': {
                        return getModelDisplayForSort(item).toLowerCase();
                    }
                    case 'mac': return (item.mac || '').toLowerCase();
                    case 'unit': return (item.organizationUnit?.name || '').toLowerCase();
                    case 'inventory': return (item.inventoryNumber || '').toLowerCase();
                    case 'welder': return getWelderDisplayForSort(item).toLowerCase();
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
        // Создаем новый массив при reverse, чтобы не мутировать исходный
        return sortDirection === 'asc' ? sorted : [...sorted].reverse();
    };

    const handleSave = async (e, customEditData = null) => {
        e.preventDefault();
        // Используем переданные данные или текущее состояние
        const dataToUse = customEditData || editData;
        console.log('🟡 handleSave: Начало, editData:', dataToUse);
        const newErrors = {};
        const trimmedName = (dataToUse.name || '').trim();
        if (!trimmedName) {
            newErrors.name = 'Это поле обязательно';
            console.log('❌ handleSave: Ошибка валидации - нет названия');
        }
        if (!dataToUse.deviceModel) {
            newErrors.deviceModel = 'Выберите модель устройства';
            console.log('❌ handleSave: Ошибка валидации - нет модели');
        }
        // Приводим MAC к формату: только заглавные буквы, без двоеточий
        let mac = (dataToUse.mac || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (!mac || mac.length !== 12) {
            newErrors.mac = 'MAC-адрес должен содержать 12 символов (только 0-9, A-F)';
            console.log('❌ handleSave: Ошибка валидации - некорректный MAC:', mac);
        }
        if (!dataToUse.organizationUnit) {
            newErrors.organizationUnit = 'Выберите подразделение';
            console.log('❌ handleSave: Ошибка валидации - нет подразделения');
        }
        if (!dataToUse.commissionDate) {
            newErrors.commissionDate = 'Укажите дату ввода в эксплуатацию';
            console.log('❌ handleSave: Ошибка валидации - нет даты ввода в эксплуатацию');
        } else {
            const commissionDateObj = new Date(dataToUse.commissionDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (commissionDateObj > today) {
                newErrors.commissionDate = 'Дата ввода в эксплуатацию не может быть в будущем';
                console.log('❌ handleSave: Ошибка валидации - дата в будущем');
            }
        }

        const selectedUnitId = dataToUse.organizationUnit?.id;
        if (trimmedName && selectedUnitId) {
            const duplicateName = equipment.some(machine => {
                const machineUnitId = machine.organizationUnit?.id || machine.organizationUnitId;
                return machine.id !== dataToUse.id &&
                    machineUnitId === selectedUnitId &&
                    (machine.name || '').trim().toLowerCase() === trimmedName.toLowerCase();
            });
            if (duplicateName) {
                newErrors.name = 'В этом подразделении уже есть аппарат с таким названием';
            }
        }

        const maintenanceIntervalValue = dataToUse.maintenanceInterval !== '' && dataToUse.maintenanceInterval != null
            ? Number(dataToUse.maintenanceInterval)
            : null;
        if (maintenanceIntervalValue != null && (Number.isNaN(maintenanceIntervalValue) || maintenanceIntervalValue < 0)) {
            newErrors.maintenanceInterval = 'Значение должно быть неотрицательным числом';
        }

        const maintenanceReminderValue = dataToUse.maintenanceReminderHours !== '' && dataToUse.maintenanceReminderHours != null
            ? Number(dataToUse.maintenanceReminderHours)
            : null;
        if (maintenanceReminderValue != null && (Number.isNaN(maintenanceReminderValue) || maintenanceReminderValue < 0)) {
            newErrors.maintenanceReminderHours = 'Укажите корректное количество часов';
        }

        if (Object.keys(newErrors).length) {
            console.log('❌ handleSave: Есть ошибки валидации:', newErrors);
            setErrors(newErrors);
            // Бросаем ошибку с объектом ошибок для отображения в модальном окне
            const validationError = new Error('Ошибки валидации');
            validationError.errors = newErrors;
            throw validationError;
        }

        console.log('✅ handleSave: Валидация пройдена, начинаем сохранение...');
        try {
            // Функция для преобразования даты из формата DD.MM.YYYY в ISO формат YYYY-MM-DD
            const convertDateToISO = (dateString) => {
                if (!dateString) return null;
                console.log('🟡 convertDateToISO: Входная дата:', dateString);

                // Если дата уже в формате ISO (YYYY-MM-DD), возвращаем как есть
                if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
                    const result = `${dateString}T00:00:00`;
                    console.log('🟡 convertDateToISO: Дата уже в ISO формате, результат:', result);
                    return result;
                }

                // Если дата в формате DD.MM.YYYY, преобразуем в YYYY-MM-DD
                if (/^\d{2}\.\d{2}\.\d{4}/.test(dateString)) {
                    const [day, month, year] = dateString.split('.');
                    const result = `${year}-${month}-${day}T00:00:00`;
                    console.log('🟡 convertDateToISO: Преобразовано из DD.MM.YYYY, результат:', result);
                    return result;
                }

                // Пробуем распарсить как Date и преобразовать
                try {
                    const date = new Date(dateString);
                    if (!isNaN(date.getTime())) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const result = `${year}-${month}-${day}T00:00:00`;
                        console.log('🟡 convertDateToISO: Преобразовано через Date, результат:', result);
                        return result;
                    }
                } catch (e) {
                    console.error('❌ convertDateToISO: Ошибка преобразования даты:', dateString, e);
                }
                return null;
            };

            const commissionDateValue = convertDateToISO(dataToUse.commissionDate);
            const lastServiceValue = convertDateToISO(dataToUse.lastService);

            console.log('🟡 handleSave: Преобразованная дата ввода в эксплуатацию:', commissionDateValue);
            console.log('🟡 handleSave: Преобразованная дата последнего ТО:', lastServiceValue);

            // Подготавливаем organizationUnit - бэкенд ожидает объект с id и name
            let organizationUnitForApi = null;
            if (dataToUse.organizationUnit) {
                // Если это объект с id, отправляем объект с id и name
                if (dataToUse.organizationUnit.id) {
                    organizationUnitForApi = {
                        id: dataToUse.organizationUnit.id,
                        name: dataToUse.organizationUnit.name || ''
                    };
                } else {
                    // Если только объект без id, отправляем как есть
                    organizationUnitForApi = dataToUse.organizationUnit;
                }
            }

            console.log('🟡 handleSave: organizationUnit для API:', organizationUnitForApi);
            console.log('🟡 handleSave: commissionDateValue:', commissionDateValue);
            console.log('🟡 handleSave: lastServiceValue:', lastServiceValue);

            const machineData = {
                id: dataToUse.id,
                name: trimmedName,
                deviceModel: dataToUse.deviceModel,
                mac,
                commissionDate: commissionDateValue,
                manufactureYear: dataToUse.manufactureYear || null,
                lastService: lastServiceValue,
                serialNumber: dataToUse.serialNumber || '',
                inventoryNumber: dataToUse.inventoryNumber || '',
                organizationUnit: organizationUnitForApi,
                weldingMachineType: dataToUse.weldingMachineType,
                assignedWelders: dataToUse.assignedWelders || [],
                maintenanceInterval: maintenanceIntervalValue,
                maintenanceRegulation: maintenanceIntervalValue,
                userServiceNotifiedBeforeHours: maintenanceReminderValue,
            };

            if (!dataToUse.id) {
                delete machineData.id;
            }

            const isCoreSelected = dataToUse.deviceModel === 'CORE';

            if (isCoreSelected) {
                const corePayload = {
                    options: {
                        gasControl: Boolean(dataToUse.coreOptions?.gasControl),
                        rfid: Boolean(dataToUse.coreOptions?.rfid),
                        bvo: Boolean(dataToUse.coreOptions?.bvo),
                    },
                    wtModuleMac: dataToUse.wtModuleMac || '',
                    maintenance: {
                        intervalHours: maintenanceIntervalValue,
                        lastServiceDate: lastServiceValue,
                        technicianName: dataToUse.maintenanceTechnicianName || '',
                        technicianPass: dataToUse.maintenanceTechnicianPass || '',
                    },
                    responsibleUserId: dataToUse.responsibleUserId ? Number(dataToUse.responsibleUserId) : null,
                    allowedWelders: dataToUse.assignedWelders || [],
                    maintenanceReminderHours: maintenanceReminderValue,
                };
                machineData.modules = JSON.stringify(corePayload);
            } else {
                machineData.modules = null;
            }

            if (dataToUse.id) {
                console.log('🟡 handleSave: Обновляем существующее оборудование, ID:', dataToUse.id);
                console.log('🟡 handleSave: Данные для отправки:', machineData);
                await updateWeldingMachine(dataToUse.id, machineData);
                console.log('✅ handleSave: Оборудование успешно обновлено');
                alert('Оборудование успешно обновлено');
            } else {
                console.log('🟡 handleSave: Создаем новое оборудование');
                console.log('🟡 handleSave: Данные для отправки:', machineData);
                const result = await createWeldingMachine(machineData);
                console.log('✅ handleSave: Оборудование успешно создано, ответ сервера:', result);
                alert('Оборудование успешно создано');
            }
            console.log('🟡 handleSave: Загружаем обновленный список оборудования...');
            await loadEquipment();
            console.log('✅ handleSave: Список оборудования обновлен');
            closeModal();
        } catch (err) {
            console.error('Ошибка сохранения оборудования:', err);
            setErrors({ api: err.message });
            // Бросаем ошибку дальше, чтобы она попала в модальное окно
            const apiError = new Error(err.message || 'Ошибка сохранения оборудования');
            if (err.errors) {
                apiError.errors = err.errors;
            }
            throw apiError;
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
        const params = new URLSearchParams({
            machine: item.name || '',
            mac: item.mac || '',
            name: item.name || '',
            organizationUnit: item.organizationUnit?.name || ''
        });
        navigate(`/device-monitor?${params.toString()}`);
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
        // Создаем копию массива equipment, чтобы не мутировать исходный
        let filtered = [...equipment];

        // Фильтр по модели
        if (modelFilter.length > 0) {
            // Если установлено "__NONE__", ничего не показываем
            if (modelFilter.length === 1 && modelFilter[0] === '__NONE__') {
                filtered = [];
            } else {
                filtered = filtered.filter(item => modelFilter.includes(item.deviceModel));
            }
        }

        // Organization unit filter by organizationUnit.name
        if (organizationUnitFilter.length > 0) {
            // Если установлено "__NONE__", ничего не показываем
            if (organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__') {
                filtered = [];
            } else {
                filtered = filtered.filter(item => organizationUnitFilter.includes(item.organizationUnit?.name || ''));
            }
        }

        // Фильтр по состоянию
        // Если установлено "__NONE__", ничего не показываем
        if (statusFilter.length === 1 && statusFilter[0] === '__NONE__') {
            filtered = [];
        } else if (statusFilter.length === 0) {
            // Если массив пустой - ничего не выбрано, показываем пустой список
            filtered = [];
        } else {
            // Фильтруем по выбранным статусам
            filtered = filtered.filter(item => {
                const status = deviceStatusesByMac[item.mac] || 'off';
                return statusFilter.includes(status);
            });
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

    // Мемоизируем отфильтрованное и отсортированное оборудование
    // Используем useMemo после определения всех необходимых функций
    const filteredEquipment = useMemo(() => {
        return getFilteredEquipment(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipment, modelFilter, organizationUnitFilter, statusFilter, searchTerm, sortField, sortDirection, deviceStatusesByMac]);

    // Функция для получения модели аппарата для отображения
    const getModelDisplay = (item) => {
        if (item.deviceModel === 'MONITORING_BLOCK') return 'Блок Мониторинга';
        if (item.deviceModel === 'CORE') return 'CORE PULSE';
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

    // Функция для форматирования статуса для отображения в status-badge
    const getFormattedStatus = (status, rawState) => {
        // Если есть реальное состояние аппарата, используем его
        if (rawState !== null && rawState !== undefined) {
            const stateLower = String(rawState).toLowerCase().trim();

            // Дежурный режим -> Деж.Режим (зеленым #0cff00, как в DeviceMonitorPage)
            if (stateLower.includes('дежурн') || stateLower.includes('standby')) {
                return { text: 'Деж.Режим', className: 'on', color: '#0cff00' };
            }

            // Ожидание -> Ожидание (зеленым #0cff00, как в DeviceMonitorPage)
            if (stateLower.includes('ожидан') || stateLower.includes('waiting')) {
                return { text: 'Ожидание', className: 'on', color: '#0cff00' };
            }

            // Заблокирован -> Блок (серым, как в DeviceMonitorPage)
            if (stateLower.includes('заблокирован') || stateLower.includes('blocked') ||
                stateLower.includes('lock') || stateLower.includes('блокиров')) {
                return { text: 'Блок', className: 'off', color: 'rgba(188, 183, 197, 0.5)' };
            }

            // Сварка -> Сварка (желтым)
            if (stateLower.includes('сварка') || stateLower.includes('welding') ||
                stateLower.includes('weld') || stateLower.includes('сварочн')) {
                return { text: 'Сварка', className: 'welding' };
            }

            // Авария/Ошибка -> Ошибка (красным)
            if (stateLower.includes('авария') || stateLower.includes('error') ||
                stateLower.includes('ошибка') || stateLower.includes('emergency') ||
                stateLower.includes('failure')) {
                return { text: 'Ошибка', className: 'error' };
            }

            // Аппарат включен -> Вкл (зеленым)
            if (stateLower.includes('включен') || stateLower.includes('on')) {
                return { text: 'Вкл', className: 'on' };
            }
        }

        // Если нет реального состояния, используем базовый статус
        switch (status) {
            case 'welding':
                return { text: 'Сварка', className: 'welding' };
            case 'on':
                return { text: 'Вкл', className: 'on' };
            case 'error':
                return { text: 'Ошибка', className: 'error' };
            case 'off':
            default:
                return { text: 'Выкл', className: 'off' };
        }
    };

    // Разделяем модель на "CORE" и остальную часть для цветового оформления
    const formatModel = (modelName) => {
        if (modelName && modelName.startsWith('CORE ')) {
            const parts = modelName.split(' ', 2);
            return {
                first: parts[0], // "CORE"
                second: parts[1] ? parts.slice(1).join(' ') : '' // "PRO 500", "Synergy 500", etc.
            };
        }
        return { first: modelName || '', second: '' };
    };

    // Построение иерархии подразделений (аналогично ReportsPage)
    const buildOrganizationHierarchy = () => {
        if (!organizationUnits || organizationUnits.length === 0) return [];

        const unitMap = new Map();
        const rootUnits = [];

        const normalizeId = (id) => {
            if (id == null) return null;
            return typeof id === 'string' ? parseInt(id) : id;
        };

        // Создаем карту всех подразделений с пустыми массивами children
        organizationUnits.forEach(unit => {
            const normalizedId = normalizeId(unit.id);
            unitMap.set(normalizedId, {
                ...unit,
                id: normalizedId,
                children: []
            });
        });

        // Строим дерево
        organizationUnits.forEach(unit => {
            const normalizedId = normalizeId(unit.id);
            const unitNode = unitMap.get(normalizedId);

            let parentIdValue = null;
            if (unit.parentId != null) {
                parentIdValue = unit.parentId;
            } else if (unit.parent_id != null) {
                parentIdValue = unit.parent_id;
            } else if (unit.parentDepartment != null && unit.parentDepartment.id != null) {
                parentIdValue = unit.parentDepartment.id;
            }

            if (parentIdValue != null) {
                const normalizedParentId = normalizeId(parentIdValue);
                if (unitMap.has(normalizedParentId)) {
                    const parent = unitMap.get(normalizedParentId);
                    parent.children.push(unitNode);
                } else {
                    rootUnits.push(unitNode);
                }
            } else {
                rootUnits.push(unitNode);
            }
        });

        return rootUnits;
    };

    const organizationHierarchy = buildOrganizationHierarchy();

    const toggleOrganizationUnitExpanded = (unitId) => {
        setExpandedOrganizationUnits(prev => ({
            ...prev,
            [unitId]: !prev[unitId]
        }));
    };

    // Рекурсивная функция для получения всех дочерних подразделений
    const getAllChildUnits = (unit) => {
        const all = [unit];
        if (unit.children && unit.children.length > 0) {
            unit.children.forEach(child => {
                all.push(...getAllChildUnits(child));
            });
        }
        return all;
    };

    // Функция для переключения подразделения
    const toggleOrganizationUnit = (unitId) => {
        const hierarchy = buildOrganizationHierarchy();
        const unit = hierarchy.find(u => u.id === unitId) ||
            hierarchy.flatMap(u => getAllChildUnits(u)).find(u => u.id === unitId);
        if (!unit) return;

        const allChildUnits = getAllChildUnits(unit);
        const allUnitNames = allChildUnits.map(u => u.name);

        setOrganizationUnitFilter(prev => {
            const isNoneSelected = prev.length === 1 && prev[0] === '__NONE__';
            const currentlyChecked = !isNoneSelected && allUnitNames.every(name => prev.includes(name));
            const willBeChecked = !currentlyChecked;

            if (willBeChecked) {
                // Выбираем подразделение и все дочерние
                if (isNoneSelected) {
                    return allUnitNames;
                } else {
                    const newFilter = [...prev];
                    allUnitNames.forEach(name => {
                        if (!newFilter.includes(name)) {
                            newFilter.push(name);
                        }
                    });
                    return newFilter;
                }
            } else {
                // Убираем подразделение и все дочерние
                const newFilter = prev.filter(name => !allUnitNames.includes(name));
                if (newFilter.length === 0) {
                    return ['__NONE__'];
                }
                return newFilter;
            }
        });
    };

    const statuses = [
        { id: 'all', label: 'Все' },
        { id: 'on', label: 'Включен' },
        { id: 'welding', label: 'Сварка' },
        { id: 'error', label: 'Ошибка' },
        { id: 'off', label: 'Выключен' }
    ];

    const models = [
        { id: 'all', label: 'Все' },
        { id: 'CORE', label: 'CORE PULSE' },
        { id: 'MONITORING_BLOCK', label: 'Блок Мониторинга' }
    ];

    // Подсветка заголовка «Подразделение» при частичном выборе (как на странице Отчёты)
    const getAllUnitNamesFromHierarchy = (units) => {
        const names = [];
        units.forEach(unit => {
            names.push(unit.name);
            if (unit.children && unit.children.length > 0) {
                names.push(...getAllUnitNamesFromHierarchy(unit.children));
            }
        });
        return names;
    };
    const allDepartmentNames = organizationHierarchy.length ? getAllUnitNamesFromHierarchy(organizationHierarchy) : [];
    // «Ни одного»: только __NONE__ или пустой массив (все галочки сняты)
    const isDepartmentNoneSelected =
        (organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__') ||
        organizationUnitFilter.length === 0;
    const isDepartmentAllSelected = (organizationUnitFilter.length === 0 || organizationUnitFilter.length === allDepartmentNames.length) && !isDepartmentNoneSelected && allDepartmentNames.length > 0;
    // Подсветка только при частичном выборе: есть хотя бы одно выбранное подразделение и не все
    const hasAtLeastOneDepartment = organizationUnitFilter.length > 0 && organizationUnitFilter.some(name => name !== '__NONE__');
    const isDepartmentFilterPartial = !isDepartmentNoneSelected && !isDepartmentAllSelected && allDepartmentNames.length > 0 && hasAtLeastOneDepartment;

    return (
        <div className="welding-equipment-page">
            <div className="equipment-page-header-row">
                <h1 className="equipment-page-title-header">Сварочное оборудование</h1>
                <div className="equipment-page-controls">
                    <button
                        className="control-btn notifications-btn"
                        onClick={() => navigate('/notifications')}
                    >
                        <FaBell className="notifications-icon" />
                        <span className="notifications-badge"></span>
                    </button>
                    <UserProfile />
                </div>
            </div>
            <div className="welding-equipment-page-content">
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
                            <span className={isDepartmentFilterPartial ? 'filter-tile-header-label filter-tile-header-label--partial' : 'filter-tile-header-label'}>Подразделение</span>
                            <span className="filter-arrow">{expandedFilters.department ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.department && (() => {
                            // Получаем все подразделения (родительские и дочерние) для проверки "Все"
                            const getAllUnitNames = (units) => {
                                const names = [];
                                units.forEach(unit => {
                                    names.push(unit.name);
                                    if (unit.children && unit.children.length > 0) {
                                        names.push(...getAllUnitNames(unit.children));
                                    }
                                });
                                return names;
                            };
                            const allUnitNames = getAllUnitNames(organizationHierarchy);
                            const isNoneSelected = organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__';
                            const allSelected = (organizationUnitFilter.length === 0 ||
                                organizationUnitFilter.length === allUnitNames.length) && !isNoneSelected;
                            const showAllChecked = organizationUnitFilter.length === 0 && !isNoneSelected;

                            // Состояние подразделения рекурсивно (как на странице Отчёты): по unit.name в фильтре и по состоянию дочерних
                            const getUnitState = (unit) => {
                                if (showAllChecked) return { checked: true, indeterminate: false };
                                if (isNoneSelected) return { checked: false, indeterminate: false };
                                const unitInFilter = organizationUnitFilter.includes(unit.name);
                                const hasChildren = unit.children && unit.children.length > 0;
                                if (!hasChildren) {
                                    return { checked: unitInFilter, indeterminate: false };
                                }
                                const childStates = unit.children.map(child => getUnitState(child));
                                const allChildrenChecked = childStates.every(s => s.checked);
                                const someChildrenCheckedOrIndeterminate = childStates.some(s => s.checked || s.indeterminate);
                                if (allChildrenChecked) return { checked: true, indeterminate: false };
                                if (someChildrenCheckedOrIndeterminate) return { checked: false, indeterminate: true };
                                if (unitInFilter) return { checked: false, indeterminate: true };
                                return { checked: false, indeterminate: false };
                            };

                            // Рекурсивная функция для рендеринга подразделений
                            const renderUnit = (unit, level = 0) => {
                                const unitState = getUnitState(unit);
                                const isUnitChecked = Boolean(unitState.checked);
                                const isUnitIndeterminate = Boolean(unitState.indeterminate);
                                const hasChildren = unit.children && unit.children.length > 0;

                                return (
                                    <div key={unit.id} className="filter-option-tree">
                                        <label
                                            className={`filter-checkbox ${level > 0 ? 'filter-checkbox-child' : ''}`}
                                            style={{ paddingLeft: level > 0 ? `${20 + (level - 1) * 20}px` : '0' }}
                                        >
                                            {hasChildren && (
                                                <button
                                                    className="org-unit-expand-btn"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleOrganizationUnitExpanded(unit.id);
                                                    }}
                                                >
                                                    {expandedOrganizationUnits[unit.id] ? (
                                                        <FaChevronDown className="expand-icon" />
                                                    ) : (
                                                        <FaChevronRight className="expand-icon" />
                                                    )}
                                                </button>
                                            )}
                                            {!hasChildren && <span className="org-unit-spacer" />}
                                            <input
                                                type="checkbox"
                                                checked={isUnitChecked}
                                                onChange={() => toggleOrganizationUnit(unit.id)}
                                            />
                                            <span className={isUnitIndeterminate ? 'filter-unit-name filter-unit-name--highlight' : 'filter-unit-name'}>{unit.name}</span>
                                        </label>
                                        {hasChildren && expandedOrganizationUnits[unit.id] && (
                                            <div className="filter-sub-options-tree">
                                                {unit.children.map(child => renderUnit(child, level + 1))}
                                            </div>
                                        )}
                                    </div>
                                );
                            };

                            return (
                                <div className="filter-tile-content">
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Выбираем все
                                                    setOrganizationUnitFilter(allUnitNames);
                                                } else {
                                                    // При снятии галочки с активного "Все" - сбрасываем все галочки
                                                    setOrganizationUnitFilter(['__NONE__']);
                                                }
                                            }}
                                        />
                                        <span>Все</span>
                                    </label>
                                    {organizationHierarchy.length > 0 ? (
                                        organizationHierarchy.map(unit => renderUnit(unit))
                                    ) : (
                                        <div className="parameter-item" style={{ color: '#7B8BA6', fontSize: '12px', padding: '8px 12px' }}>
                                            Нет доступных подразделений
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <div className="filter-tile">
                        <button
                            className="filter-tile-header"
                            onClick={() => toggleFilter('status')}
                        >
                            <span>Статус</span>
                            <span className="filter-arrow">{expandedFilters.status ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.status && (() => {
                            const allStatusIds = statuses.filter(s => s.id !== 'all').map(s => s.id);
                            const isNoneSelected = statusFilter.length === 1 && statusFilter[0] === '__NONE__';
                            const isAllSelected = statusFilter.length === allStatusIds.length && !isNoneSelected;
                            const showAllChecked = false; // Не показываем все как выбранные когда массив пустой

                            return (
                                <div className="filter-tile-content">
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Выбираем все статусы кроме "all"
                                                    setStatusFilter(allStatusIds);
                                                } else {
                                                    // При снятии галочки с активного "Все" - очищаем все галочки (пустой массив)
                                                    setStatusFilter([]);
                                                }
                                            }}
                                        />
                                        <span>Все</span>
                                    </label>
                                    {statuses.filter(s => s.id !== 'all').map(status => {
                                        const isChecked = showAllChecked || statusFilter.includes(status.id);
                                        return (
                                            <label key={status.id} className="filter-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const willBeChecked = e.target.checked;
                                                        const isNoneSelected = statusFilter.length === 1 && statusFilter[0] === '__NONE__';

                                                        if (isNoneSelected) {
                                                            // Если было "__NONE__", удаляем его и добавляем выбранный элемент
                                                            if (willBeChecked) {
                                                                setStatusFilter([status.id]);
                                                            }
                                                        } else if (statusFilter.length === 0) {
                                                            // Если массив пустой (ничего не выбрано)
                                                            if (willBeChecked) {
                                                                // Ставим галочку - добавляем только этот элемент
                                                                setStatusFilter([status.id]);
                                                            } else {
                                                                // Снимаем галочку - ничего не делаем, уже ничего не выбрано
                                                                return;
                                                            }
                                                        } else {
                                                            // Если массив не пустой
                                                            if (willBeChecked) {
                                                                // Добавляем в фильтр
                                                                if (!statusFilter.includes(status.id)) {
                                                                    setStatusFilter(prev => [...prev, status.id]);
                                                                }
                                                            } else {
                                                                // Убираем из фильтра
                                                                const newFilter = statusFilter.filter(id => id !== status.id);
                                                                setStatusFilter(newFilter);
                                                            }
                                                        }
                                                    }}
                                                />
                                                <span>{status.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    <div className="filter-tile">
                        <button
                            className="filter-tile-header"
                            onClick={() => toggleFilter('model')}
                        >
                            <span>Модель аппарата</span>
                            <span className="filter-arrow">{expandedFilters.model ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.model && (() => {
                            const allModelIds = models.filter(m => m.id !== 'all').map(m => m.id);
                            const isNoneSelected = modelFilter.length === 1 && modelFilter[0] === '__NONE__';
                            const isAllSelected = (modelFilter.length === 0 || modelFilter.length === allModelIds.length) && !isNoneSelected;
                            const showAllChecked = modelFilter.length === 0 && !isNoneSelected; // Если пусто - показываем все как выбранные

                            return (
                                <div className="filter-tile-content">
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Выбираем все модели кроме "all"
                                                    setModelFilter(allModelIds);
                                                } else {
                                                    // При снятии галочки с активного "Все" - сбрасываем все галочки
                                                    setModelFilter(['__NONE__']);
                                                }
                                            }}
                                        />
                                        <span>Все</span>
                                    </label>
                                    {models.filter(m => m.id !== 'all').map(model => {
                                        const isChecked = showAllChecked || modelFilter.includes(model.id);
                                        return (
                                            <label key={model.id} className="filter-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const willBeChecked = e.target.checked;
                                                        const isNoneSelected = modelFilter.length === 1 && modelFilter[0] === '__NONE__';

                                                        if (isNoneSelected) {
                                                            // Если было "__NONE__", удаляем его и добавляем выбранный элемент
                                                            if (willBeChecked) {
                                                                setModelFilter([model.id]);
                                                            }
                                                        } else if (modelFilter.length === 0) {
                                                            // Если массив пустой (все выбрано)
                                                            if (willBeChecked) {
                                                                // Ставим галочку - ничего не делаем, все уже выбрано
                                                                return;
                                                            } else {
                                                                // Снимаем галочку - выбираем все кроме текущего
                                                                const allExceptCurrent = allModelIds.filter(id => id !== model.id);
                                                                setModelFilter(allExceptCurrent);
                                                            }
                                                        } else {
                                                            // Если массив не пустой
                                                            if (willBeChecked) {
                                                                // Добавляем в фильтр
                                                                if (!modelFilter.includes(model.id)) {
                                                                    setModelFilter(prev => [...prev, model.id]);
                                                                }
                                                            } else {
                                                                // Убираем из фильтра
                                                                const newFilter = modelFilter.filter(id => id !== model.id);
                                                                setModelFilter(newFilter);
                                                            }
                                                        }
                                                    }}
                                                />
                                                <span>{model.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="equipment-content-column">
                    <div className="content-header">
                        <div className="add-device-tile">
                            <button className="add-device-btn" onClick={openAddModal}>
                                <span className="add-icon">+</span>
                                <span>Добавить оборудование</span>
                            </button>
                        </div>
                        <div className="welders-stats-tile">
                            <div className="stat-item">
                                <img src={ResourcesLogo} alt="" className="stat-icon" />
                                <span>Всего в компании: {equipment.length}</span>
                            </div>
                            <div className="stat-item">
                                <img src={ResourcesLogo} alt="" className="stat-icon" />
                                <span>Всего отфильтровано: {filteredEquipment.length}</span>
                            </div>
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
                                <span>Таблица</span>
                            </button>
                            <button
                                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                                onClick={() => setViewMode('table')}
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <span>Плитки</span>
                            </button>
                        </div>
                    </div>

                    {viewMode === 'table' && (
                        <div className="equipment-table-container">
                            <table className="equipment-table">
                                <thead>
                                <tr>
                                    <th
                                        onClick={() => toggleSort('model')}
                                        className={sortField === 'model' ? 'sort-active' : ''}
                                    >
                                        <span>Модель</span>
                                        <span className={`sort-arrow ${sortField === 'model' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'model' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                    </th>
                                    <th
                                        onClick={() => toggleSort('name')}
                                        className={sortField === 'name' ? 'sort-active' : ''}
                                    >
                                        <span>Название</span>
                                        <span className={`sort-arrow ${sortField === 'name' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'name' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                    </th>
                                    <th
                                        onClick={() => toggleSort('unit')}
                                        className={sortField === 'unit' ? 'sort-active' : ''}
                                    >
                                        <span>Подразделение</span>
                                        <span className={`sort-arrow ${sortField === 'unit' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'unit' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                    </th>
                                    <th
                                        onClick={() => toggleSort('inventory')}
                                        className={sortField === 'inventory' ? 'sort-active' : ''}
                                    >
                                        <span>Инвентарный номер</span>
                                        <span className={`sort-arrow ${sortField === 'inventory' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'inventory' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                    </th>
                                    <th
                                        onClick={() => toggleSort('welder')}
                                        className={sortField === 'welder' ? 'sort-active' : ''}
                                    >
                                        <span>Сварщик</span>
                                        <span className={`sort-arrow ${sortField === 'welder' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'welder' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                    </th>
                                    <th>
                                        <span>Последнее включение</span>
                                        <span className="sort-arrow">▾</span>
                                    </th>
                                    <th
                                        onClick={() => toggleSort('status')}
                                        className={sortField === 'status' ? 'sort-active' : ''}
                                    >
                                        <span>Статус</span>
                                        <span className={`sort-arrow ${sortField === 'status' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'status' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredEquipment.map((item, index) => {
                                    const status = deviceStatusesByMac[item.mac] || 'off';
                                    const rawState = deviceStatesByMac[item.mac] || null;
                                    const formattedStatus = getFormattedStatus(status, rawState);
                                    const modelDisplay = getModelDisplay(item);
                                    const modelParts = formatModel(modelDisplay);
                                    // Используем комбинацию id и индекса для гарантии уникальности ключа
                                    const uniqueKey = item.id ? `${item.id}-${index}` : `item-${index}-${item.mac || Date.now()}`;
                                    return (
                                        <tr
                                            key={uniqueKey}
                                            className="table-row table-row-compact"
                                            onClick={() => handleControl(item)}
                                        >
                                            <td>
                                                <div className="model-cell-table">
                                                    <span className={`equipment-status-dot ${status}`}></span>
                                                    <img
                                                        src={machineImage}
                                                        alt={modelDisplay}
                                                        className="machine-thumbnail-small"
                                                    />
                                                    <span className="model-text">
                                                        <span className="model-part-first">{modelParts.first}</span>
                                                        {modelParts.second && (
                                                            <span className="model-part-second"> {modelParts.second}</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>{item.name}</td>
                                            <td>{item.organizationUnit?.name || 'Не указано'}</td>
                                            <td>{item.inventoryNumber || 'Не указан'}</td>
                                            <td>{getWelderDisplay(item)}</td>
                                            <td>{getLastActivation(item) || 'Нет данных'}</td>
                                            <td>
                                                <span
                                                    className={`status-badge ${formattedStatus.className}`}
                                                    style={formattedStatus.color ? { color: formattedStatus.color } : {}}
                                                >
                                                    {formattedStatus.text}
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
            </div>

            <AddEquipmentModal
                isOpen={modalOpen}
                onClose={closeModal}
                welders={welders}
                organizationUnits={organizationUnits}
                onSave={async (data) => {
                    try {
                        console.log('🟢 WeldingEquipmentPage: onSave вызван с данными:', data);
                        // Преобразуем данные из AddEquipmentModal в формат для handleSave
                        // Преобразуем модель: "Core Pulse" или "Core" -> "CORE", "Блок мониторинга" -> "MONITORING_BLOCK"
                        let deviceModel = '';
                        const modelLower = (data.model || '').toLowerCase().trim();
                        if (modelLower === 'core' || modelLower === 'core pulse' || modelLower.includes('core')) {
                            deviceModel = 'CORE';
                        } else if (modelLower === 'блок мониторинга' || modelLower === 'monitoring_block' || modelLower.includes('мониторинг')) {
                            deviceModel = 'MONITORING_BLOCK';
                        } else {
                            // Если модель уже в правильном формате (CORE или MONITORING_BLOCK), используем как есть
                            const upperModel = (data.model || '').toUpperCase().trim();
                            if (upperModel === 'CORE' || upperModel === 'MONITORING_BLOCK') {
                                deviceModel = upperModel;
                            } else {
                                deviceModel = data.model || '';
                            }
                        }

                        console.log('🟢 WeldingEquipmentPage: Исходная модель:', data.model);
                        console.log('🟢 WeldingEquipmentPage: Преобразованная модель:', deviceModel);

                        const newEditData = {
                            ...editData,
                            name: data.name || '',
                            deviceModel: deviceModel,
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
                        console.log('🟢 WeldingEquipmentPage: newEditData:', newEditData);
                        setEditData(newEditData);

                        // Вызываем handleSave с переданными данными напрямую
                        console.log('🟢 WeldingEquipmentPage: Вызываем handleSave с данными...');
                        const fakeEvent = { preventDefault: () => {} };
                        await handleSave(fakeEvent, newEditData);
                        console.log('✅ WeldingEquipmentPage: handleSave завершен');
                    } catch (error) {
                        console.error('❌ WeldingEquipmentPage: Ошибка в onSave:', error);
                        console.error('❌ WeldingEquipmentPage: error.errors:', error.errors);
                        // Сохраняем исходную ошибку, если у неё уже есть errors
                        if (error.errors) {
                            // Если ошибка уже содержит объект errors, просто пробрасываем её дальше
                            throw error;
                        } else {
                            // Если это общая ошибка API без errors, создаем объект ошибки
                            const errorObj = new Error(error.message || 'Произошла ошибка при сохранении');
                            errorObj.errors = { api: error.message || 'Произошла ошибка при сохранении' };
                            throw errorObj;
                        }
                    }
                }}
            />
        </div>
    );
}

export default WeldingEquipmentPage;
