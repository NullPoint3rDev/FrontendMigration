import React, { useState, useEffect, useMemo } from 'react';
import { FaChevronRight, FaChevronDown, FaBell, FaArrowRight } from 'react-icons/fa';
import '../styles/weldersPage.css';
import { useNavigate, useLocation } from 'react-router-dom';
import UserProfile from '../components/UserProfile';
import MoveWeldersModal from '../components/MoveWeldersModal';
import WelderIcon from '../images/WelderIcon.png';
import {
    getAllWelders,
    createWelder,
    updateWelder,
    deleteWelder
} from '../api/welderApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';
import { getCertificationsByWelderId } from '../api/certificationApi';
import { useCurrentUserPermissions } from '../hooks/useCurrentUserPermissions';
import { api } from '../services/api';
import { getRoles } from '../api/userAccountApi';
import {
    groupUnitsByOrganization,
    findUnitInForest,
    flattenUnitNamesFromForest,
    orgFilterToken,
    isOrgFilterToken,
    orgKeyFromFilterToken,
    flattenOrganizationFilterKeys,
    isOrganizationFilterFullySelected,
} from '../utils/organizationUnitFilterGroups';

const WELDERS_PAGE_STATE_KEY = 'weldersPageState';
const STATUS_FILTER_OPTIONS = ['blocked', 'online', 'offline'];

function getWelderStatusRaw(welder) {
    const s = welder?.status;
    if (s == null || s === '') return '';
    if (typeof s === 'string') return s.trim();
    if (typeof s === 'object') {
        return String(s.name || s.value || s.status || '').trim();
    }
    return String(s).trim();
}

function normalizeStatusFilterFromSaved(saved) {
    if (!Array.isArray(saved)) return [];
    return saved.filter((k) => k === '__NONE__' || STATUS_FILTER_OPTIONS.includes(k));
}

function loadWeldersPageState() {
    try {
        const raw = localStorage.getItem(WELDERS_PAGE_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {}
    return null;
}

function saveWeldersPageState(state) {
    try {
        localStorage.setItem(WELDERS_PAGE_STATE_KEY, JSON.stringify(state));
    } catch (_) {}
}

function WeldersPage() {
    const { canWriteWelders: canWriteWeldersPerm } = useCurrentUserPermissions();
    const savedState = useMemo(() => loadWeldersPageState(), []);
    const [welders, setWelders] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [errors, setErrors] = useState({});
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [organizationUnitFilter, setOrganizationUnitFilter] = useState(
        Array.isArray(savedState?.organizationUnitFilter) ? savedState.organizationUnitFilter : []
    );
    const [hazardousGroupsFilter, setHazardousGroupsFilter] = useState(
        Array.isArray(savedState?.hazardousGroupsFilter) ? savedState.hazardousGroupsFilter : []
    );
    const [withoutGroupFilter, setWithoutGroupFilter] = useState(
        savedState?.withoutGroupFilter === true
    );
    const [statusFilter, setStatusFilter] = useState(() =>
        normalizeStatusFilterFromSaved(savedState?.statusFilter)
    );
    const [searchTerm, setSearchTerm] = useState(
        typeof savedState?.searchTerm === 'string' ? savedState.searchTerm : ''
    );
    const [sortField, setSortField] = useState(
        typeof savedState?.sortField === 'string' ? savedState.sortField : 'name'
    );
    const [sortDirection, setSortDirection] = useState(
        savedState?.sortDirection === 'desc' ? 'desc' : 'asc'
    );
    const [expandedFilters, setExpandedFilters] = useState({
        department: true,
        status: true,
        hazardousGroups: true,
    });
    const [expandedHazardousGroups, setExpandedHazardousGroups] = useState({});
    const [expandedOrganizationUnits, setExpandedOrganizationUnits] = useState({});
    const [expandedOrgInFilter, setExpandedOrgInFilter] = useState({});
    const [organizationsList, setOrganizationsList] = useState([]);
    const [selectedWelders, setSelectedWelders] = useState([]);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [currentUserOrgId, setCurrentUserOrgId] = useState(null);
    const [isEnterpriseScopedRole, setIsEnterpriseScopedRole] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        loadOrganizationUnits();
        loadOrganizations();
        loadCurrentUserScope();
    }, []);

    useEffect(() => {
        if (location.pathname === '/welders') {
            loadWelders();
        }
    }, [location.pathname]);

    const loadOrganizations = async () => {
        try {
            const data = await api.getOrganizations();
            setOrganizationsList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки организаций:', err);
            setOrganizationsList([]);
        }
    };

    const loadCurrentUserScope = async () => {
        try {
            const [currentUser, rolesData] = await Promise.all([api.getCurrentUser(), getRoles()]);
            const roleId = currentUser?.userRoleId ?? currentUser?.userRole?.id;
            const role = (Array.isArray(rolesData) ? rolesData : []).find(
                (r) => r.id === roleId || r.id === parseInt(roleId, 10)
            );
            const roleName = String(role?.name || '').toUpperCase();
            const isEnterpriseRole = roleName === 'ADMIN_ENTERPRISE' || roleName === 'USER_ENTERPRISE';
            setIsEnterpriseScopedRole(isEnterpriseRole);
            setCurrentUserOrgId(currentUser?.organizationId ?? currentUser?.organization?.id ?? null);
        } catch (_) {
            setIsEnterpriseScopedRole(false);
            setCurrentUserOrgId(null);
        }
    };

    // Сохраняем фильтры и сортировку в localStorage при изменении
    useEffect(() => {
        saveWeldersPageState({
            organizationUnitFilter,
            hazardousGroupsFilter,
            withoutGroupFilter,
            statusFilter,
            searchTerm,
            sortField,
            sortDirection,
        });
    }, [organizationUnitFilter, hazardousGroupsFilter, withoutGroupFilter, statusFilter, searchTerm, sortField, sortDirection]);


    const openAddModal = () => {
        setEditData({
            name: '',
            employeeId: '',
            grade: '',
            position: '',
            organizationUnit: null,
            admissionType: '',
            status: 'offline',
        });
        setErrors({});
        setModalOpen(true);
    };

    const handleEdit = (welder) => {
        setEditData({
            id: welder.id,
            name: welder.name || welder.fullName || '',
            employeeId: welder.employeeId || welder.tabNumber || '',
            grade: welder.grade || '',
            position: welder.position || '',
            organizationUnit: welder.organizationUnit || (welder.department ? { name: welder.department } : null),
            admissionType: welder.admissionType || '',
            status: welder.status || 'offline',
        });
        setErrors({});
        setModalOpen(true);
    };

    // Загрузка сварщиков с сервера
    const loadWelders = async () => {
        try {
            const data = await getAllWelders();
            console.log('welders from API:', data);
            const weldersArray = Array.isArray(data) ? data : [];

            // Загружаем аттестации для каждого сварщика
            const weldersWithCertifications = await Promise.all(
                weldersArray.map(async (welder) => {
                    try {
                        const certifications = await getCertificationsByWelderId(welder.id);
                        // Формируем строку "Вид допуска" на основе аттестаций
                        let admissionType = 'Не указан';
                        let activeTechGroups = []; // Массив активных групп опасных производств

                        if (certifications && certifications.length > 0) {
                            const activeCerts = certifications.filter(cert => cert.status === 'ACTIVE');
                            if (activeCerts.length > 0) {
                                // Берем способы сварки из активных аттестаций
                                const methods = activeCerts
                                    .flatMap(cert => cert.weldingMethods || [])
                                    .filter((method, index, self) => self.indexOf(method) === index); // Убираем дубликаты
                                admissionType = methods.length > 0 ? methods.join(', ') : 'Не указан';

                                // Собираем все группы опасных производств из активных аттестаций
                                activeTechGroups = activeCerts
                                    .flatMap(cert => cert.techGroups || [])
                                    .filter((group, index, self) => self.indexOf(group) === index); // Убираем дубликаты
                            }
                        }
                        return { ...welder, admissionType, activeTechGroups };
                    } catch (error) {
                        console.error(`Ошибка загрузки аттестаций для сварщика ${welder.id}:`, error);
                        return { ...welder, admissionType: 'Не указан', activeTechGroups: [] };
                    }
                })
            );

            setWelders(weldersWithCertifications);
        } catch (err) {
            setErrors({ api: 'Ошибка загрузки сварщиков: ' + err.message });
            setWelders([]);
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

    const visibleOrganizationUnits = useMemo(() => {
        if (!isEnterpriseScopedRole || currentUserOrgId == null) return organizationUnits;
        return organizationUnits.filter(
            (u) => String(u.organizationId ?? u.organization?.id ?? u.organization_id ?? '') === String(currentUserOrgId)
        );
    }, [organizationUnits, isEnterpriseScopedRole, currentUserOrgId]);

    const visibleUnitIdSet = useMemo(
        () => new Set(visibleOrganizationUnits.map((u) => String(u.id))),
        [visibleOrganizationUnits]
    );

    const visibleUnitNameSet = useMemo(
        () =>
            new Set(
                visibleOrganizationUnits
                    .map((u) => String(u.name || '').trim().toLowerCase())
                    .filter(Boolean)
            ),
        [visibleOrganizationUnits]
    );

    const visibleOrganizationsList = useMemo(() => {
        if (!isEnterpriseScopedRole || currentUserOrgId == null) return organizationsList;
        return organizationsList.filter((o) => String(o.id) === String(currentUserOrgId));
    }, [organizationsList, isEnterpriseScopedRole, currentUserOrgId]);

    const organizationsForFilter = useMemo(
        () => groupUnitsByOrganization(visibleOrganizationUnits, visibleOrganizationsList),
        [visibleOrganizationUnits, visibleOrganizationsList]
    );

    const visibleWelders = useMemo(() => {
        if (!isEnterpriseScopedRole || currentUserOrgId == null) return welders;
        return welders.filter((w) => {
            const unitId = w.organizationUnit?.id ?? w.organizationUnitId ?? null;
            if (unitId != null && visibleUnitIdSet.has(String(unitId))) {
                return true;
            }
            const departmentName = String(w.department || '').trim().toLowerCase();
            return departmentName && visibleUnitNameSet.has(departmentName);
        });
    }, [welders, isEnterpriseScopedRole, currentUserOrgId, visibleUnitIdSet, visibleUnitNameSet]);

    // Функция для получения названия подразделения с проверкой его существования
    const getOrganizationUnitName = (welder) => {
        const unitName = welder.organizationUnit?.name || welder.department;
        if (!unitName) {
            return 'Не указано';
        }

        // Проверяем, существует ли подразделение в текущем списке
        const unitExists = visibleOrganizationUnits.some(unit =>
            unit.name === unitName ||
            (welder.organizationUnit?.id && unit.id === welder.organizationUnit.id)
        );

        if (!unitExists) {
            return 'Не указано'; // Подразделение было удалено
        }

        return unitName;
    };

    const welderMatchesOrganizationFilter = (welder, filter) => {
        const unitId = welder.organizationUnit?.id ?? welder.organizationUnitId ?? null;
        if (unitId != null) {
            const unit = visibleOrganizationUnits.find(
                (u) => u.id === unitId || u.id === parseInt(unitId, 10)
            );
            const orgId = unit?.organizationId ?? unit?.organization?.id ?? unit?.organization_id ?? null;
            if (orgId != null) {
                const orgKey = String(orgId);
                if (filter.some((key) => isOrgFilterToken(key) && orgKeyFromFilterToken(key) === orgKey)) {
                    return true;
                }
            }
        }
        const unitName = getOrganizationUnitName(welder);
        if (unitName === 'Не указано') {
            return false;
        }
        return filter.includes(unitName);
    };

    // Функция для форматирования статуса сварщика (столбец «Статус»)
    const getWelderStatusDisplay = (welder) => {
        const statusKey = getWelderStatusRaw(welder);
        const raw = statusKey.toUpperCase();
        if (
            raw === 'BLOCKED' ||
            raw === 'DISMISSED' ||
            raw === 'INACTIVE' ||
            statusKey.toLowerCase() === 'blocked' ||
            statusKey.toLowerCase() === 'заблокирован'
        ) {
            return { text: 'Заблокирован', className: 'blocked', color: '#445569' };
        }
        const status = statusKey.toLowerCase();
        switch (status) {
            case 'online':
            case 'в сети':
                return { text: 'В сети', className: 'online', color: '#0FA626' };
            case 'offline':
            case 'не в сети':
                return { text: 'Не в сети', className: 'offline', color: '#818EA1' };
            default:
                return { text: 'Не в сети', className: 'offline', color: '#818EA1' };
        }
    };

    const isWelderBlockedForFilter = (welder) => {
        const statusKey = getWelderStatusRaw(welder);
        const raw = statusKey.toUpperCase();
        if (raw === 'BLOCKED' || raw === 'DISMISSED' || raw === 'INACTIVE') return true;
        const s = statusKey.toLowerCase();
        return s === 'blocked' || s === 'заблокирован';
    };

    const isWelderOnlineForFilter = (welder) => {
        if (isWelderBlockedForFilter(welder)) return false;
        return getWelderStatusDisplay(welder).className === 'online';
    };

    const isWelderOfflineForFilter = (welder) => {
        if (isWelderBlockedForFilter(welder)) return false;
        return getWelderStatusDisplay(welder).className === 'offline';
    };

    const welderMatchesStatusFilter = (welder, filter) => {
        if (filter.includes('blocked') && isWelderBlockedForFilter(welder)) return true;
        if (filter.includes('online') && isWelderOnlineForFilter(welder)) return true;
        if (filter.includes('offline') && isWelderOfflineForFilter(welder)) return true;
        return false;
    };

    const toggleStatusFilterOption = (key) => {
        setStatusFilter((prev) => {
            const isNone = prev.length === 1 && prev[0] === '__NONE__';
            const isAllState =
                prev.length === 0 || STATUS_FILTER_OPTIONS.every((k) => prev.includes(k));
            const currentlyChecked = !isNone && (isAllState || prev.includes(key));

            if (!currentlyChecked) {
                if (isNone) return [key];
                const next = [...prev];
                if (!next.includes(key)) next.push(key);
                if (STATUS_FILTER_OPTIONS.every((k) => next.includes(k))) return [];
                return next;
            }

            if (prev.length === 0) {
                return STATUS_FILTER_OPTIONS.filter((k) => k !== key);
            }
            const next = prev.filter((k) => k !== key);
            return next.length === 0 ? ['__NONE__'] : next;
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
                    case 'name': return (item.name || item.fullName || '').toLowerCase();
                    case 'employeeId': return (item.employeeId || item.tabNumber || '').toLowerCase();
                    case 'grade': return (item.grade || '').toLowerCase();
                    case 'position': return (item.position || '').toLowerCase();
                    case 'unit': return getOrganizationUnitName(item).toLowerCase();
                    case 'admissionType': return (item.admissionType || '').toLowerCase();
                    case 'status': return getWelderStatusDisplay(item).text.toLowerCase();
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
        if (!trimmedName) {
            newErrors.name = 'Это поле обязательно';
        }

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        try {
            const welderData = {
                id: editData.id,
                name: trimmedName,
                employeeId: editData.employeeId || '',
                grade: editData.grade || '',
                position: editData.position || '',
                organizationUnit: editData.organizationUnit,
                admissionType: editData.admissionType || '',
                status: editData.status || 'offline',
            };

            if (!editData.id) {
                delete welderData.id;
            }

            if (editData.id) {
                await updateWelder(editData.id, welderData);
                alert('Сварщик успешно обновлен');
            } else {
                await createWelder(welderData);
                alert('Сварщик успешно создан');
            }
            await loadWelders();
            closeModal();
        } catch (err) {
            console.error('Ошибка сохранения сварщика:', err);
            setErrors({ api: err.message || 'Ошибка сохранения сварщика' });
        }
    };

    // Delete handler
    const handleDelete = async () => {
        if (selectedWelders.length === 0) {
            alert('Выберите сварщиков для удаления');
            return;
        }

        const confirmMessage = `Вы уверены, что хотите удалить ${selectedWelders.length} сварщик(ов)?`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            const deletePromises = selectedWelders.map(id => deleteWelder(id));
            await Promise.all(deletePromises);
            setSelectedWelders([]);
            await loadWelders();
            alert('Сварщики успешно удалены');
        } catch (err) {
            console.error('Ошибка удаления сварщиков:', err);
            alert('Ошибка удаления сварщиков: ' + err.message);
        }
    };

    const navigateToWelderProfile = (welderId) => {
        if (welderId) {
            navigate(`/welders/add/${welderId}`);
        }
    };

    const handleWelderSelect = (welderId, checked) => {
        if (checked) {
            setSelectedWelders([...selectedWelders, welderId]);
        } else {
            setSelectedWelders(selectedWelders.filter(id => id !== welderId));
        }
    };

    const toggleFilter = (filterName) => {
        setExpandedFilters(prev => ({
            ...prev,
            [filterName]: !prev[filterName]
        }));
    };

    const getFilteredWelders = (applySort = true) => {
        let filtered = visibleWelders;

        // Фильтр по подразделению
        if (organizationUnitFilter.length > 0) {
            if (organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__') {
                filtered = [];
            } else {
                filtered = filtered.filter((item) =>
                    welderMatchesOrganizationFilter(item, organizationUnitFilter)
                );
            }
        }

        if (statusFilter.length > 0) {
            if (statusFilter.length === 1 && statusFilter[0] === '__NONE__') {
                filtered = [];
            } else {
                filtered = filtered.filter((item) => welderMatchesStatusFilter(item, statusFilter));
            }
        }

        // Фильтр по группам опасных произв. объектов и «Без группы»
        // Когда выбрано «Все» (hazardousGroupsFilter.length === 0) — не фильтруем по группам, показываем всех
        const hasNoGroup = (item) => ((item.activeTechGroups || []).length === 0);
        if (hazardousGroupsFilter.length === 0) {
            // «Все» — фильтр по группам не применяем
        } else if (withoutGroupFilter) {
            // «Без группы» включена
            if (hazardousGroupsFilter.length === 1 && hazardousGroupsFilter[0] === '__NONE__') {
                filtered = filtered.filter(hasNoGroup);
            } else if (
                allHazardousGroupIds.length > 0 &&
                hazardousGroupsFilter.length === allHazardousGroupIds.length &&
                hazardousGroupsFilter.every((id) => allHazardousGroupIds.includes(id))
            ) {
                // Выбраны все группы и «Без группы» — показываем всех сварщиков
            } else {
                const filterStrings = hazardousGroupsFilter
                    .map(filterId => filterIdToTechGroupString(filterId))
                    .filter(str => str !== null);
                filtered = filtered.filter(item => {
                    const noGroup = hasNoGroup(item);
                    const hasSelectedGroup = filterStrings.some(filterStr =>
                        (item.activeTechGroups || []).includes(filterStr)
                    );
                    return noGroup || hasSelectedGroup;
                });
            }
        } else if (hazardousGroupsFilter.length > 0) {
            if (hazardousGroupsFilter.length === 1 && hazardousGroupsFilter[0] === '__NONE__') {
                filtered = [];
            } else if (
                allHazardousGroupIds.length > 0 &&
                hazardousGroupsFilter.length === allHazardousGroupIds.length &&
                hazardousGroupsFilter.every((id) => allHazardousGroupIds.includes(id))
            ) {
                if (withoutGroupFilter) {
                    // Выбраны все группы и «Без группы» — показываем всех сварщиков
                } else {
                    // Выбраны все группы, но «Без группы» снята — только сварщики с группами
                    filtered = filtered.filter(item => (item.activeTechGroups || []).length > 0);
                }
            } else {
                filtered = filtered.filter(item => {
                    const activeTechGroups = item.activeTechGroups || [];
                    const filterStrings = hazardousGroupsFilter
                        .map(filterId => filterIdToTechGroupString(filterId))
                        .filter(str => str !== null);
                    return filterStrings.some(filterStr =>
                        activeTechGroups.includes(filterStr)
                    );
                });
            }
        }

        // Фильтр по поисковому запросу
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                (item.name || item.fullName || '').toLowerCase().includes(term) ||
                (item.employeeId || item.tabNumber || '').toLowerCase().includes(term) ||
                (item.position || '').toLowerCase().includes(term)
            );
        }

        return applySort ? getSorted(filtered) : filtered;
    };


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
        const allRoots = organizationsForFilter.flatMap((o) => o.hierarchy);
        const unit = findUnitInForest(allRoots, unitId);
        if (!unit) return;

        const allChildUnits = getAllChildUnits(unit);
        const allUnitNames = allChildUnits.map(u => u.name);

        setOrganizationUnitFilter((prev) => {
            const isNone = prev.length === 1 && prev[0] === '__NONE__';
            const showAll = prev.length === 0 && !isNone;
            const allChecked = showAll || (!isNone && allUnitNames.every((name) => prev.includes(name)));

            if (!allChecked) {
                if (isNone) return allUnitNames;
                if (showAll) {
                    return flattenOrganizationFilterKeys(organizationsForFilter).filter(
                        (k) => !allUnitNames.includes(k)
                    );
                }
                const next = [...prev];
                allUnitNames.forEach((name) => {
                    if (!next.includes(name)) next.push(name);
                });
                return next;
            }

            const next = showAll
                ? flattenOrganizationFilterKeys(organizationsForFilter).filter(
                    (k) => !allUnitNames.includes(k)
                )
                : prev.filter((name) => !allUnitNames.includes(name));
            return next.length === 0 ? ['__NONE__'] : next;
        });
    };

    const toggleOrganizationOrg = (orgKey) => {
        const entry = organizationsForFilter.find((e) => e.orgKey === orgKey);
        if (!entry) return;
        const names = flattenUnitNamesFromForest(entry.hierarchy);
        const token = orgFilterToken(orgKey);
        const orgKeys = names.length > 0 ? names : [token];

        setOrganizationUnitFilter((prev) => {
            const isNone = prev.length === 1 && prev[0] === '__NONE__';
            const showAll = prev.length === 0 && !isNone;
            const allChecked =
                showAll || (!isNone && orgKeys.every((k) => prev.includes(k)));

            if (!allChecked) {
                if (isNone) return orgKeys;
                if (showAll) {
                    const allKeys = flattenOrganizationFilterKeys(organizationsForFilter);
                    return allKeys.filter((k) => !orgKeys.includes(k));
                }
                const next = [...prev];
                orgKeys.forEach((k) => {
                    if (!next.includes(k)) next.push(k);
                });
                return next;
            }

            const next = showAll
                ? flattenOrganizationFilterKeys(organizationsForFilter).filter((k) => !orgKeys.includes(k))
                : prev.filter((k) => !orgKeys.includes(k));
            return next.length === 0 ? ['__NONE__'] : next;
        });
    };

    const toggleOrgExpandInFilter = (orgKey) => {
        setExpandedOrgInFilter((prev) => ({ ...prev, [orgKey]: !prev[orgKey] }));
    };

    // Функция для преобразования ID фильтра в строку формата "ГРУППА: пп. N"
    const filterIdToTechGroupString = (filterId) => {
        // Маппинг ID фильтра на название группы и номер пункта
        const groupMapping = {
            'PTO': 'ПТО',
            'KO': 'КО',
            'GO': 'ГО',
            'NGDO': 'НГДО',
            'MO': 'МО',
            'OKHNVP': 'ОХВВП', // В фильтре OKHNVP, в аттестациях ОХВВП
            'GDO': 'ГДО',
            'OTOG': 'ОТОГ',
            'SK': 'СК',
            'KSM': 'КСМ'
        };

        // Парсим ID фильтра (например, "PTO1" -> группа "PTO", номер "1")
        const match = filterId.match(/^([A-Z]+)(\d+)$/);
        if (!match) return null;

        const groupCode = match[1];
        const groupNumber = match[2];
        const groupName = groupMapping[groupCode];

        if (!groupName) return null;

        return `${groupName}: пп. ${groupNumber}`;
    };


    // Группы опасных произв. объектов с подгруппами
    const hazardousGroups = [
        {
            id: 'PTO',
            label: 'ПТО',
            children: Array.from({ length: 14 }, (_, i) => ({
                id: `PTO${i + 1}`,
                label: `Группа ${i + 1}`
            }))
        },
        {
            id: 'KO',
            label: 'КО',
            children: [
                { id: 'KO1', label: 'Группа 1' },
                { id: 'KO2', label: 'Группа 2' },
                { id: 'KO3', label: 'Группа 3' },
                { id: 'KO4', label: 'Группа 4' },
                { id: 'KO5', label: 'Группа 5' }
            ]
        },
        {
            id: 'GO',
            label: 'ГО',
            children: Array.from({ length: 7 }, (_, i) => ({
                id: `GO${i + 1}`,
                label: `Группа ${i + 1}`
            }))
        },
        {
            id: 'NGDO',
            label: 'НГДО',
            children: Array.from({ length: 13 }, (_, i) => ({
                id: `NGDO${i + 1}`,
                label: `Группа ${i + 1}`
            }))
        },
        {
            id: 'MO',
            label: 'МО',
            children: Array.from({ length: 6 }, (_, i) => ({
                id: `MO${i + 1}`,
                label: `Группа ${i + 1}`
            }))
        },
        {
            id: 'OKHNVP',
            label: 'ОХНВП',
            children: Array.from({ length: 16 }, (_, i) => ({
                id: `OKHNVP${i + 1}`,
                label: `Группа ${i + 1}`
            }))
        },
        {
            id: 'GDO',
            label: 'ГДО',
            children: [
                { id: 'GDO1', label: 'Группа 1' }
            ]
        },
        {
            id: 'OTOG',
            label: 'ОТОГ',
            children: Array.from({ length: 3 }, (_, i) => ({
                id: `OTOG${i + 1}`,
                label: `Группа ${i + 1}`
            }))
        },
        {
            id: 'SK',
            label: 'СК',
            children: Array.from({ length: 4 }, (_, i) => ({
                id: `SK${i + 1}`,
                label: `Группа ${i + 1}`
            }))
        },
        {
            id: 'KSM',
            label: 'КСМ',
            children: Array.from({ length: 2 }, (_, i) => ({
                id: `KSM${i + 1}`,
                label: `Группа ${i + 1}`
            }))
        }
    ];

    // Список всех id групп (для проверки «все выбраны» = не фильтровать)
    const allHazardousGroupIds = useMemo(() => {
        const ids = [];
        hazardousGroups.forEach((group) => {
            ids.push(group.id);
            if (group.children?.length) group.children.forEach((c) => ids.push(c.id));
        });
        return ids;
    }, []);

    const toggleHazardousGroupExpanded = (groupId) => {
        setExpandedHazardousGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    // Функция для получения всех дочерних групп
    const getAllChildGroups = (group) => {
        const all = [group.id];
        if (group.children && group.children.length > 0) {
            group.children.forEach(child => {
                all.push(child.id);
            });
        }
        return all;
    };

    // Функция для переключения группы или подгруппы
    const toggleHazardousGroup = (groupId) => {
        // Ищем группу в основном списке
        let group = hazardousGroups.find(g => g.id === groupId);

        // Если не найдена в основном списке, ищем в дочерних
        if (!group) {
            for (const g of hazardousGroups) {
                if (g.children) {
                    const child = g.children.find(c => c.id === groupId);
                    if (child) {
                        // Это дочерняя группа - обрабатываем её отдельно
                        setHazardousGroupsFilter(prev => {
                            const isNoneSelected = prev.length === 1 && prev[0] === '__NONE__';
                            const currentlyChecked = !isNoneSelected && prev.includes(groupId);
                            const willBeChecked = !currentlyChecked;

                            if (willBeChecked) {
                                if (isNoneSelected) {
                                    return [groupId];
                                } else {
                                    const newFilter = [...prev];
                                    if (!newFilter.includes(groupId)) {
                                        newFilter.push(groupId);
                                    }
                                    return newFilter;
                                }
                            } else {
                                const newFilter = prev.filter(id => id !== groupId);
                                if (newFilter.length === 0) {
                                    return ['__NONE__'];
                                }
                                return newFilter;
                            }
                        });
                        return;
                    }
                }
            }
            return;
        }

        // Это родительская группа - обрабатываем её и все дочерние
        const allChildGroups = getAllChildGroups(group);

        setHazardousGroupsFilter(prev => {
            const isNoneSelected = prev.length === 1 && prev[0] === '__NONE__';
            const currentlyChecked = !isNoneSelected && allChildGroups.every(id => prev.includes(id));
            const willBeChecked = !currentlyChecked;

            if (willBeChecked) {
                // Выбираем группу и все дочерние
                if (isNoneSelected) {
                    return allChildGroups;
                } else {
                    const newFilter = [...prev];
                    allChildGroups.forEach(id => {
                        if (!newFilter.includes(id)) {
                            newFilter.push(id);
                        }
                    });
                    return newFilter;
                }
            } else {
                // Убираем группу и все дочерние
                const newFilter = prev.filter(id => !allChildGroups.includes(id));
                if (newFilter.length === 0) {
                    return ['__NONE__'];
                }
                return newFilter;
            }
        });
    };

    return (
        <div className="welders-page">
            {/* Page Title and Controls - Same line */}
            <div className="welders-page-header-row">
                <h1 className="welders-page-title-header">Сварщики</h1>
                <div className="welders-tiles-controls">
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
                            <span>Подразделение</span>
                            <span className="filter-arrow">{expandedFilters.department ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.department && (() => {
                            const isNoneSelected = organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__';
                            const allSelected =
                                (organizationUnitFilter.length === 0 ||
                                    isOrganizationFilterFullySelected(
                                        organizationUnitFilter,
                                        organizationsForFilter
                                    )) &&
                                !isNoneSelected;
                            const showAllChecked = organizationUnitFilter.length === 0 && !isNoneSelected;

                            // Рекурсивная функция для рендеринга подразделений
                            const renderUnit = (unit, level = 0) => {
                                const allChildUnits = getAllChildUnits(unit);
                                const allUnitNamesForUnit = allChildUnits.map(u => u.name);
                                const isUnitChecked = showAllChecked || (!isNoneSelected && allUnitNamesForUnit.every(name => organizationUnitFilter.includes(name)));
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
                                            <span>{unit.name}</span>
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
                                                    setOrganizationUnitFilter([]);
                                                } else {
                                                    setOrganizationUnitFilter(['__NONE__']);
                                                }
                                            }}
                                        />
                                        <span>Все</span>
                                    </label>
                                    {organizationsForFilter.length > 0 ? (
                                        organizationsForFilter.map(({ orgKey, orgName, hierarchy }) => {
                                            const orgNames = flattenUnitNamesFromForest(hierarchy);
                                            const orgToken = orgFilterToken(orgKey);
                                            const orgKeys = orgNames.length > 0 ? orgNames : [orgToken];
                                            const isOrgExpanded = expandedOrgInFilter[orgKey] === true;
                                            const isNoneSelectedOrg = organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__';
                                            const orgShowAllChecked = organizationUnitFilter.length === 0 && !isNoneSelectedOrg;
                                            const isOrgRowChecked =
                                                orgShowAllChecked ||
                                                (!isNoneSelectedOrg &&
                                                    orgKeys.every((k) => organizationUnitFilter.includes(k)));

                                            return (
                                                <div key={orgKey} className="filter-org-block">
                                                    <label className="filter-checkbox filter-org-header-row">
                                                        <button
                                                            type="button"
                                                            className="org-unit-expand-btn"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                toggleOrgExpandInFilter(orgKey);
                                                            }}
                                                        >
                                                            {isOrgExpanded ? (
                                                                <FaChevronDown className="expand-icon" />
                                                            ) : (
                                                                <FaChevronRight className="expand-icon" />
                                                            )}
                                                        </button>
                                                        <input
                                                            type="checkbox"
                                                            checked={isOrgRowChecked}
                                                            onChange={() => toggleOrganizationOrg(orgKey)}
                                                        />
                                                        <span className="filter-org-title">{orgName}</span>
                                                    </label>
                                                    {isOrgExpanded &&
                                                        hierarchy.length > 0 &&
                                                        hierarchy.map((unit) => renderUnit(unit))}
                                                    {isOrgExpanded && hierarchy.length === 0 && (
                                                        <div
                                                            className="filter-checkbox"
                                                            style={{ color: '#7B8BA6', fontSize: '12px', padding: '4px 12px 8px 36px' }}
                                                        >
                                                            Нет подразделений
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="filter-checkbox" style={{ color: '#7B8BA6', fontSize: '12px', padding: '8px 12px' }}>
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
                            const isNoneSelected =
                                statusFilter.length === 1 && statusFilter[0] === '__NONE__';
                            const isAllSelected =
                                (statusFilter.length === 0 ||
                                    STATUS_FILTER_OPTIONS.every((k) => statusFilter.includes(k))) &&
                                !isNoneSelected;
                            const showAllChecked = statusFilter.length === 0 && !isNoneSelected;
                            const isStatusOptionChecked = (key) =>
                                showAllChecked || (!isNoneSelected && statusFilter.includes(key));

                            return (
                                <div className="filter-tile-content">
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setStatusFilter([]);
                                                } else {
                                                    setStatusFilter(['__NONE__']);
                                                }
                                            }}
                                        />
                                        <span>Все</span>
                                    </label>
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isStatusOptionChecked('blocked')}
                                            onChange={() => toggleStatusFilterOption('blocked')}
                                        />
                                        <span>Заблокирован</span>
                                    </label>
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isStatusOptionChecked('online')}
                                            onChange={() => toggleStatusFilterOption('online')}
                                        />
                                        <span>В сети</span>
                                    </label>
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isStatusOptionChecked('offline')}
                                            onChange={() => toggleStatusFilterOption('offline')}
                                        />
                                        <span>Не в сети</span>
                                    </label>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="filter-tile">
                        <button
                            className="filter-tile-header"
                            onClick={() => toggleFilter('hazardousGroups')}
                        >
                            <span>Группы опасных произв. объектов:</span>
                            <span className="filter-arrow">{expandedFilters.hazardousGroups ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.hazardousGroups && (() => {
                            // Получаем все группы (родительские и дочерние) для проверки "Все"
                            const getAllGroupIds = (groups) => {
                                const ids = [];
                                groups.forEach(group => {
                                    ids.push(group.id);
                                    if (group.children && group.children.length > 0) {
                                        group.children.forEach(child => {
                                            ids.push(child.id);
                                        });
                                    }
                                });
                                return ids;
                            };
                            const allGroupIds = getAllGroupIds(hazardousGroups);
                            const isNoneSelected = hazardousGroupsFilter.length === 1 && hazardousGroupsFilter[0] === '__NONE__';
                            const isAllSelected = (hazardousGroupsFilter.length === 0 || (hazardousGroupsFilter.length === allGroupIds.length && withoutGroupFilter)) && !isNoneSelected;
                            const showAllChecked = hazardousGroupsFilter.length === 0 && !isNoneSelected;

                            // Рекурсивная функция для рендеринга групп
                            const renderGroup = (group, level = 0) => {
                                const hasChildren = group.children && group.children.length > 0;

                                // Для родительских групп проверяем, выбраны ли все дочерние
                                let isGroupChecked;
                                if (hasChildren) {
                                    const allChildGroups = getAllChildGroups(group);
                                    isGroupChecked = showAllChecked || (!isNoneSelected && allChildGroups.every(id => hazardousGroupsFilter.includes(id)));
                                } else {
                                    // Для дочерних групп проверяем только саму группу
                                    isGroupChecked = showAllChecked || (!isNoneSelected && hazardousGroupsFilter.includes(group.id));
                                }

                                return (
                                    <div key={group.id} className="filter-option-tree">
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
                                                        toggleHazardousGroupExpanded(group.id);
                                                    }}
                                                >
                                                    {expandedHazardousGroups[group.id] ? (
                                                        <FaChevronDown className="expand-icon" />
                                                    ) : (
                                                        <FaChevronRight className="expand-icon" />
                                                    )}
                                                </button>
                                            )}
                                            {!hasChildren && <span className="org-unit-spacer" />}
                                            <input
                                                type="checkbox"
                                                checked={isGroupChecked}
                                                onChange={() => toggleHazardousGroup(group.id)}
                                            />
                                            <span>{group.label}</span>
                                        </label>
                                        {hasChildren && expandedHazardousGroups[group.id] && (
                                            <div className="filter-sub-options-tree">
                                                {group.children.map(child => renderGroup(child, level + 1))}
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
                                            checked={isAllSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // «Все» = не фильтровать по группам, показывать всех; «Без группы» тоже ставим
                                                    setHazardousGroupsFilter([]);
                                                    setWithoutGroupFilter(true);
                                                } else {
                                                    // При снятии галочки с активного "Все" — сбрасываем все галочки и «Без группы»
                                                    setHazardousGroupsFilter(['__NONE__']);
                                                    setWithoutGroupFilter(false);
                                                }
                                            }}
                                        />
                                        <span>Все</span>
                                    </label>
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={withoutGroupFilter || isAllSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setWithoutGroupFilter(true);
                                                } else {
                                                    setWithoutGroupFilter(false);
                                                    if (isAllSelected || hazardousGroupsFilter.length === 0) {
                                                        setHazardousGroupsFilter([...allHazardousGroupIds]);
                                                    }
                                                }
                                            }}
                                        />
                                        <span>Без группы</span>
                                    </label>
                                    {hazardousGroups.length > 0 ? (
                                        hazardousGroups.map(group => renderGroup(group))
                                    ) : (
                                        <div className="filter-checkbox" style={{ color: '#7B8BA6', fontSize: '12px', padding: '8px 12px' }}>
                                            Нет доступных групп
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="equipment-content-column">
                    <div className="content-header">
                        <div className="add-device-tile">
                            <button
                                type="button"
                                className="add-device-btn"
                                onClick={() => navigate('/welders/add')}
                                disabled={!canWriteWeldersPerm}
                                title={!canWriteWeldersPerm ? 'Нет прав на добавление сварщиков' : undefined}
                            >
                                <span className="add-icon">+</span>
                                <span>Добавить сварщика</span>
                            </button>
                        </div>
                        <div className="naks-register-tile">
                            <button
                                className="naks-register-btn"
                                onClick={() => window.open('https://naks.ru/registry/personal/', '_blank')}
                            >
                                Открыть реестр НАКС
                            </button>
                        </div>
                        <div className="action-tile">
                            <button
                                type="button"
                                className="tile-btn move-btn"
                                onClick={() => setIsMoveModalOpen(true)}
                                disabled={selectedWelders.length === 0}
                            >
                                <FaArrowRight className="btn-icon" />
                                Переместить
                            </button>
                        </div>
                        <div className="welders-stats-tile">
                            <div className="stat-item">
                                <img src={WelderIcon} alt="Welder" className="stat-icon" />
                                <span>Всего в компании: {visibleWelders.length}</span>
                            </div>
                            <div className="stat-item">
                                <img src={WelderIcon} alt="Welder" className="stat-icon" />
                                <span>Всего отфильтровано: {getFilteredWelders().length}</span>
                            </div>
                            <div className="stat-item">
                                <img
                                    src={WelderIcon}
                                    alt="Welder"
                                    className={`stat-icon ${selectedWelders.length > 0 ? 'stat-icon-selected' : ''}`}
                                />
                                <span>Выбрано: {selectedWelders.length}</span>
                            </div>
                        </div>
                        <button className="delete-btn" onClick={handleDelete} disabled={selectedWelders.length === 0}>
                            <span>×</span>
                            <span>Удалить</span>
                        </button>
                    </div>

                    <div className="welders-table-container">
                        <table className="welders-table">
                            <thead>
                            <tr>
                                <th></th>
                                <th
                                    onClick={() => toggleSort('name')}
                                    className={sortField === 'name' ? 'sort-active' : ''}
                                >
                                    <span>Сварщик</span>
                                    <span className={`sort-arrow ${sortField === 'name' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'name' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                    </span>
                                </th>
                                <th
                                    onClick={() => toggleSort('employeeId')}
                                    className={sortField === 'employeeId' ? 'sort-active' : ''}
                                >
                                    <span>Таб. №</span>
                                    <span className={`sort-arrow ${sortField === 'employeeId' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'employeeId' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                    </span>
                                </th>
                                <th
                                    onClick={() => toggleSort('grade')}
                                    className={sortField === 'grade' ? 'sort-active' : ''}
                                >
                                    <span>Разряд</span>
                                    <span className={`sort-arrow ${sortField === 'grade' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'grade' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                    </span>
                                </th>
                                <th
                                    onClick={() => toggleSort('position')}
                                    className={sortField === 'position' ? 'sort-active' : ''}
                                >
                                    <span>Должность</span>
                                    <span className={`sort-arrow ${sortField === 'position' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'position' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
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
                                    onClick={() => toggleSort('admissionType')}
                                    className={`admission-type-header ${sortField === 'admissionType' ? 'sort-active' : ''}`}
                                >
                                    <span>Вид допуска</span>
                                    <span className={`sort-arrow ${sortField === 'admissionType' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'admissionType' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                    </span>
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
                            {getFilteredWelders().map((welder) => {
                                const statusDisplay = getWelderStatusDisplay(welder);
                                const isSelected = selectedWelders.includes(welder.id);
                                return (
                                    <tr
                                        key={welder.id}
                                        className={`table-row ${isSelected ? 'selected' : ''}`}
                                        onClick={() => navigateToWelderProfile(welder.id)}
                                    >
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => handleWelderSelect(welder.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="welder-name-cell">{welder.name || welder.fullName || 'Без имени'}</td>
                                        <td>{welder.employeeId || welder.tabNumber || 'Не указан'}</td>
                                        <td>{welder.grade || 'Не указан'}</td>
                                        <td>{welder.position || 'Не указана'}</td>
                                        <td>{getOrganizationUnitName(welder)}</td>
                                        <td className="admission-type-cell">{welder.admissionType || 'Не указан'}</td>
                                        <td>
                                                <span
                                                    className={`status-badge ${statusDisplay.className}`}
                                                    style={statusDisplay.color ? { color: statusDisplay.color } : {}}
                                                >
                                                {statusDisplay.text}
                                                </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Простое модальное окно для добавления/редактирования сварщика */}
            {modalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editData.id ? 'Редактировать сварщика' : 'Добавить сварщика'}</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>ФИО *</label>
                                <input
                                    type="text"
                                    value={editData.name || ''}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    required
                                />
                                {errors.name && <span className="error">{errors.name}</span>}
                            </div>
                            <div className="form-group">
                                <label>Табельный номер</label>
                                <input
                                    type="text"
                                    value={editData.employeeId || ''}
                                    onChange={(e) => setEditData({ ...editData, employeeId: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Разряд</label>
                                <input
                                    type="text"
                                    value={editData.grade || ''}
                                    onChange={(e) => setEditData({ ...editData, grade: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Должность</label>
                                <input
                                    type="text"
                                    value={editData.position || ''}
                                    onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Подразделение</label>
                                <select
                                    value={editData.organizationUnit?.id || ''}
                                    onChange={(e) => {
                                        const unit = organizationUnits.find(u => u.id === parseInt(e.target.value));
                                        setEditData({ ...editData, organizationUnit: unit || null });
                                    }}
                                >
                                    <option value="">Выберите подразделение</option>
                                    {visibleOrganizationUnits.map(unit => (
                                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Вид допуска</label>
                                <input
                                    type="text"
                                    value={editData.admissionType || ''}
                                    onChange={(e) => setEditData({ ...editData, admissionType: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Статус</label>
                                <select
                                    value={editData.status || 'offline'}
                                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                >
                                    <option value="online">В сети</option>
                                    <option value="offline">Не в сети</option>
                                    <option value="blocked">Заблокирован</option>
                                </select>
                            </div>
                            {errors.api && <div className="error">{errors.api}</div>}
                            <div className="modal-footer">
                                <button type="button" onClick={closeModal}>Отмена</button>
                                <button type="submit">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <MoveWeldersModal
                isOpen={isMoveModalOpen}
                onClose={() => setIsMoveModalOpen(false)}
                selectedWelderIds={selectedWelders}
                welders={visibleWelders}
                organizationUnits={visibleOrganizationUnits}
                onSuccess={async () => {
                    await loadWelders();
                    setSelectedWelders([]);
                }}
            />
        </div>
    );
}

export default WeldersPage;
