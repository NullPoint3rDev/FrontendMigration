import React, { useState, useEffect, useMemo } from 'react';
import { FaChevronRight, FaChevronDown, FaBell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../styles/weldersPage.css';
import UserProfile from './UserProfile';
import {
    getAllUserAccounts,
    deleteUserAccount,
    getRoles,
} from '../api/userAccountApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';
import { api } from '../services/api';
import {
    groupUnitsByOrganization,
    findUnitInForest,
    flattenUnitNamesFromForest,
} from '../utils/organizationUnitFilterGroups';

const USERS_PAGE_STATE_KEY = 'usersPageState';
const TYPE_FILTER_OPTIONS = ['admin', 'user', 'blocked'];

const ROLE_TYPE_LABELS = {
    ADMIN_ALLOY: 'Администратор Эллой',
    USER_ALLOY: 'Пользователь Эллой',
    ADMIN_DEALER: 'Администратор дилера',
    USER_DEALER: 'Пользователь дилера',
    ADMIN_ENTERPRISE: 'Администратор предприятия',
    USER_ENTERPRISE: 'Пользователь предприятия',
};

function formatRoleTypeLabel(label) {
    const words = String(label || '').trim().split(/\s+/);
    if (words.length <= 1) return words[0] || '—';
    return `${words[0]}\n${words.slice(1).join(' ')}`;
}

function normalizeTypeFilterFromSaved(saved) {
    if (Array.isArray(saved)) return saved;
    if (saved === 'admin') return ['admin'];
    if (saved === 'user') return ['user'];
    return [];
}

function loadUsersPageState() {
    try {
        const raw = localStorage.getItem(USERS_PAGE_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {}
    return null;
}

function saveUsersPageState(state) {
    try {
        localStorage.setItem(USERS_PAGE_STATE_KEY, JSON.stringify(state));
    } catch (_) {}
}

function EmployeesPage() {
    const savedState = useMemo(() => loadUsersPageState(), []);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [organizationUnitFilter, setOrganizationUnitFilter] = useState(
        Array.isArray(savedState?.organizationUnitFilter) ? savedState.organizationUnitFilter : []
    );
    const [typeFilter, setTypeFilter] = useState(() =>
        normalizeTypeFilterFromSaved(savedState?.typeFilter)
    );
    const [searchTerm, setSearchTerm] = useState(
        typeof savedState?.searchTerm === 'string' ? savedState.searchTerm : ''
    );
    const [sortField, setSortField] = useState(
        typeof savedState?.sortField === 'string' ? savedState.sortField : 'type'
    );
    const [sortDirection, setSortDirection] = useState(
        savedState?.sortDirection === 'desc' ? 'desc' : 'asc'
    );
    const [expandedFilters, setExpandedFilters] = useState({
        type: true,
        organizations: true,
    });
    const [expandedOrganizationUnits, setExpandedOrganizationUnits] = useState({});
    const [expandedOrgInFilter, setExpandedOrgInFilter] = useState({});
    const [organizationsList, setOrganizationsList] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [currentUserOrgId, setCurrentUserOrgId] = useState(null);
    const [isEnterpriseScopedRole, setIsEnterpriseScopedRole] = useState(false);
    const [currentUserIsAdminDealer, setCurrentUserIsAdminDealer] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadUsers();
        loadOrganizationUnits();
        loadOrganizations();
        loadRoles();
        loadCurrentUserScope();
    }, []);

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
            const isAdminDealer = roleName === 'ADMIN_DEALER';
            setIsEnterpriseScopedRole(isEnterpriseRole);
            setCurrentUserIsAdminDealer(isAdminDealer);
            setCurrentUserOrgId(currentUser?.organizationId ?? currentUser?.organization?.id ?? null);
        } catch (_) {
            setIsEnterpriseScopedRole(false);
            setCurrentUserIsAdminDealer(false);
            setCurrentUserOrgId(null);
        }
    };

    useEffect(() => {
        saveUsersPageState({
            organizationUnitFilter,
            typeFilter,
            searchTerm,
            sortField,
            sortDirection,
        });
    }, [organizationUnitFilter, typeFilter, searchTerm, sortField, sortDirection]);

    const loadUsers = async () => {
        try {
            const data = await getAllUserAccounts();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки пользователей:', err);
            setUsers([]);
        }
    };

    const loadOrganizationUnits = async () => {
        try {
            const data = await getAllOrganizationUnits();
            setOrganizationUnits(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки подразделений:', err);
            setOrganizationUnits([]);
        }
    };

    const loadRoles = async () => {
        try {
            const data = await getRoles();
            setRoles(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки ролей:', err);
            setRoles([]);
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

    const visibleOrganizationsList = useMemo(() => {
        if (!isEnterpriseScopedRole || currentUserOrgId == null) return organizationsList;
        return organizationsList.filter((o) => String(o.id) === String(currentUserOrgId));
    }, [organizationsList, isEnterpriseScopedRole, currentUserOrgId]);

    const organizationsForFilter = useMemo(
        () => groupUnitsByOrganization(visibleOrganizationUnits, visibleOrganizationsList),
        [visibleOrganizationUnits, visibleOrganizationsList]
    );

    const visibleUsers = useMemo(() => {
        let scoped = users;
        if (isEnterpriseScopedRole && currentUserOrgId != null) {
            scoped = users.filter((u) => {
                const userOrgId = u.organizationId ?? u.organization?.id ?? null;
                const unitId = u.organizationUnit?.id ?? null;
                return String(userOrgId) === String(currentUserOrgId) || (unitId != null && visibleUnitIdSet.has(String(unitId)));
            });
        }
        if (currentUserIsAdminDealer) {
            scoped = scoped.filter((u) => {
                const roleId = u.userRoleId;
                const role = roles.find((r) => r.id === roleId || r.id === parseInt(roleId, 10));
                const roleName = String(role?.name || '').toUpperCase();
                return roleName !== 'ADMIN_ENTERPRISE' && roleName !== 'USER_ENTERPRISE';
            });
        }
        return scoped;
    }, [users, isEnterpriseScopedRole, currentUserOrgId, visibleUnitIdSet, currentUserIsAdminDealer, roles]);

    const getOrganizationUnitName = (user) => {
        const unitName = user.organizationUnit?.name;
        if (!unitName) return '—';
        const unitExists = visibleOrganizationUnits.some(
            (unit) =>
                unit.name === unitName ||
                (user.organizationUnit?.id && unit.id === user.organizationUnit.id)
        );
        if (!unitExists) return '—';
        return unitName;
    };

    const getOrganizationName = (user) => {
        const orgId = user.organizationId ?? user.organization?.id ?? null;
        if (orgId != null) {
            const fromList = organizationsList.find((o) => String(o.id) === String(orgId));
            if (fromList?.name) return fromList.name;
            if (user.organization?.name) return user.organization.name;
        }

        const unitId = user.organizationUnit?.id;
        if (unitId == null) return '—';
        const flat = visibleOrganizationUnits;
        const getParentId = (u) => u.parentId ?? u.parent_id ?? (u.parentDepartment?.id ?? null);
        let current = flat.find((u) => u.id === unitId || u.id === parseInt(unitId, 10));
        if (!current) return '—';
        let depth = 0;
        const maxDepth = 50;
        while (current && depth < maxDepth) {
            const parentId = getParentId(current);
            if (parentId == null) {
                const unitOrgId =
                    current.organizationId ?? current.organization?.id ?? current.organization_id ?? null;
                if (unitOrgId != null) {
                    const org = organizationsList.find((o) => String(o.id) === String(unitOrgId));
                    if (org?.name) return org.name;
                }
                return current.name || '—';
            }
            current = flat.find((u) => u.id === parentId || u.id === parseInt(parentId, 10));
            depth++;
        }
        return current?.name || '—';
    };

    const getRoleTypeLabel = (user) => {
        const roleId = user.userRoleId;
        if (roleId == null) return formatRoleTypeLabel('Пользователь');
        const role = roles.find((r) => r.id === roleId || r.id === parseInt(roleId, 10));
        if (!role?.name) return formatRoleTypeLabel('Пользователь');
        const roleKey = String(role.name).toUpperCase();
        if (ROLE_TYPE_LABELS[roleKey]) {
            return formatRoleTypeLabel(ROLE_TYPE_LABELS[roleKey]);
        }
        const name = role.name.toLowerCase();
        const fallback =
            name.includes('admin') || name.includes('админ') ? 'Администратор' : 'Пользователь';
        return formatRoleTypeLabel(fallback);
    };

    const getRoleTypeSortKey = (user) => getRoleTypeLabel(user).replace(/\n/g, ' ').toLowerCase();

    const isAdminRole = (user) => {
        const roleId = user.userRoleId;
        if (roleId == null) return false;
        const role = roles.find((r) => r.id === roleId || r.id === parseInt(roleId, 10));
        if (!role || !role.name) return false;
        const name = (role.name || '').toLowerCase();
        return name.includes('admin') || name.includes('админ');
    };

    const isBlockedUser = (user) => {
        const s = (user.status || '').toString().toLowerCase();
        return s === 'blocked' || s === 'заблокирован';
    };

    const userMatchesTypeFilter = (user, filter) => {
        if (filter.includes('blocked') && isBlockedUser(user)) return true;
        if (isBlockedUser(user)) return false;
        if (filter.includes('admin') && isAdminRole(user)) return true;
        if (filter.includes('user') && !isAdminRole(user)) return true;
        return false;
    };

    const toggleTypeFilterOption = (key) => {
        setTypeFilter((prev) => {
            const isNone = prev.length === 1 && prev[0] === '__NONE__';
            const isAllState =
                prev.length === 0 || TYPE_FILTER_OPTIONS.every((k) => prev.includes(k));
            const currentlyChecked = !isNone && (isAllState || prev.includes(key));

            if (!currentlyChecked) {
                if (isNone) return [key];
                const next = [...prev];
                if (!next.includes(key)) next.push(key);
                if (TYPE_FILTER_OPTIONS.every((k) => next.includes(k))) return [];
                return next;
            }

            if (prev.length === 0) {
                return TYPE_FILTER_OPTIONS.filter((k) => k !== key);
            }
            const next = prev.filter((k) => k !== key);
            return next.length === 0 ? ['__NONE__'] : next;
        });
    };

    const getBlockedDisplay = (user) => {
        const s = (user.status || '').toString().toLowerCase();
        if (s === 'blocked' || s === 'заблокирован') {
            return { text: 'Заблокирован', className: 'blocked', color: '#EC2B3C' };
        }
        return { text: 'Активен', className: 'active', color: '#5C6D81' };
    };

    const isUserOnline = (user) => user.online === true || user.isOnline === true;

    const getOnlineDisplay = (user) => {
        if (isBlockedUser(user)) {
            return { text: 'Не в сети', className: 'offline', color: '#818EA1' };
        }
        if (isUserOnline(user)) {
            return { text: 'В сети', className: 'online', color: '#0FA626' };
        }
        return { text: 'Не в сети', className: 'offline', color: '#818EA1' };
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
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
                    case 'name':
                        return (item.fullName || '').toLowerCase();
                    case 'login':
                        return (item.username || '').toLowerCase();
                    case 'type':
                        return getRoleTypeSortKey(item);
                    case 'organization':
                        return getOrganizationName(item).toLowerCase();
                    case 'unit':
                        return getOrganizationUnitName(item).toLowerCase();
                    case 'position':
                        return (item.position || '').toLowerCase();
                    case 'phone':
                        return (item.phone || '').toLowerCase();
                    case 'blocked':
                        return getBlockedDisplay(item).text.toLowerCase();
                    case 'status':
                        return getOnlineDisplay(item).text.toLowerCase();
                    default:
                        return '';
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

    const handleDelete = async () => {
        if (selectedUsers.length === 0) {
            alert('Выберите пользователей для удаления');
            return;
        }
        if (!window.confirm(`Удалить выбранных пользователей (${selectedUsers.length})?`)) return;
        try {
            await Promise.all(selectedUsers.map((id) => deleteUserAccount(id)));
            setSelectedUsers([]);
            await loadUsers();
            alert('Пользователи удалены');
        } catch (err) {
            console.error('Ошибка удаления:', err);
            alert('Ошибка удаления: ' + err.message);
        }
    };

    const handleUserSelect = (userId, checked) => {
        if (checked) {
            setSelectedUsers([...selectedUsers, userId]);
        } else {
            setSelectedUsers(selectedUsers.filter((id) => id !== userId));
        }
    };

    const handleAddUser = async () => {
        try {
            const [currentUser, rolesList] = await Promise.all([
                api.getCurrentUser(),
                getRoles(),
            ]);
            if (!currentUser || !rolesList.length) {
                return;
            }
            const roleId = currentUser.userRoleId ?? currentUser.userRole?.id;
            const role = rolesList.find((r) => r.id === roleId || r.id === parseInt(roleId, 10));
            const name = (role?.name || '').toLowerCase();
            const isAdmin = name.includes('admin') || name.includes('админ');
            if (isAdmin) {
                navigate('/employees/add');
            }
        } catch (_) {
            // не админ или ошибка — не переходим
        }
    };

    const toggleFilter = (name) => {
        setExpandedFilters((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    const getFilteredUsers = (applySort = true) => {
        let filtered = visibleUsers;

        if (organizationUnitFilter.length > 0) {
            if (organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__') {
                filtered = [];
            } else {
                filtered = filtered.filter((item) => {
                    const name = getOrganizationUnitName(item);
                    if (name === '—') return false;
                    return organizationUnitFilter.includes(name);
                });
            }
        }

        if (typeFilter.length > 0) {
            if (typeFilter.length === 1 && typeFilter[0] === '__NONE__') {
                filtered = [];
            } else {
                filtered = filtered.filter((item) => userMatchesTypeFilter(item, typeFilter));
            }
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (item) =>
                    (item.fullName || '').toLowerCase().includes(term) ||
                    (item.username || '').toLowerCase().includes(term) ||
                    (item.email || '').toLowerCase().includes(term) ||
                    (item.position || '').toLowerCase().includes(term) ||
                    (item.phone || '').toLowerCase().includes(term)
            );
        }

        return applySort ? getSorted(filtered) : filtered;
    };

    const getAllChildUnits = (unit) => {
        const all = [unit];
        (unit.children || []).forEach((child) => all.push(...getAllChildUnits(child)));
        return all;
    };

    const toggleOrganizationUnitExpanded = (unitId) => {
        setExpandedOrganizationUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
    };

    const toggleOrganizationUnit = (unitId) => {
        const allRoots = organizationsForFilter.flatMap((o) => o.hierarchy);
        const unit = findUnitInForest(allRoots, unitId);
        if (!unit) return;
        const allChildUnits = getAllChildUnits(unit);
        const allNames = allChildUnits.map((u) => u.name);
        setOrganizationUnitFilter((prev) => {
            const isNone = prev.length === 1 && prev[0] === '__NONE__';
            const allChecked = !isNone && allNames.every((n) => prev.includes(n));
            if (!allChecked) {
                if (isNone) return allNames;
                const next = [...prev];
                allNames.forEach((n) => { if (!next.includes(n)) next.push(n); });
                return next;
            } else {
                const next = prev.filter((n) => !allNames.includes(n));
                return next.length === 0 ? ['__NONE__'] : next;
            }
        });
    };

    const toggleOrganizationOrg = (orgKey) => {
        const entry = organizationsForFilter.find((e) => e.orgKey === orgKey);
        if (!entry) return;
        const names = flattenUnitNamesFromForest(entry.hierarchy);
        if (names.length === 0) return;
        setOrganizationUnitFilter((prev) => {
            const isNone = prev.length === 1 && prev[0] === '__NONE__';
            const allChecked = !isNone && names.every((n) => prev.includes(n));
            if (!allChecked) {
                if (isNone) return names;
                const next = [...prev];
                names.forEach((n) => {
                    if (!next.includes(n)) next.push(n);
                });
                return next;
            }
            const next = prev.filter((n) => !names.includes(n));
            return next.length === 0 ? ['__NONE__'] : next;
        });
    };

    const toggleOrgExpandInFilter = (orgKey) => {
        setExpandedOrgInFilter((prev) => ({ ...prev, [orgKey]: !prev[orgKey] }));
    };

    const filteredUsers = getFilteredUsers();

    return (
        <div className="welders-page">
            <div className="welders-page-header-row">
                <h1 className="welders-page-title-header">Пользователи</h1>
                <div className="welders-tiles-controls">
                    <button
                        className="control-btn notifications-btn"
                        onClick={() => navigate('/notifications')}
                    >
                        <FaBell className="notifications-icon" />
                        <span className="notifications-badge" />
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
                            onClick={() => toggleFilter('type')}
                        >
                            <span>Тип</span>
                            <span className="filter-arrow">{expandedFilters.type ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.type && (() => {
                            const isNoneSelected =
                                typeFilter.length === 1 && typeFilter[0] === '__NONE__';
                            const isAllSelected =
                                (typeFilter.length === 0 ||
                                    TYPE_FILTER_OPTIONS.every((k) => typeFilter.includes(k))) &&
                                !isNoneSelected;
                            const showAllChecked = typeFilter.length === 0 && !isNoneSelected;
                            const isTypeOptionChecked = (key) =>
                                showAllChecked || (!isNoneSelected && typeFilter.includes(key));

                            return (
                                <div className="filter-tile-content">
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setTypeFilter([]);
                                                } else {
                                                    setTypeFilter(['__NONE__']);
                                                }
                                            }}
                                        />
                                        <span>Все</span>
                                    </label>
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isTypeOptionChecked('admin')}
                                            onChange={() => toggleTypeFilterOption('admin')}
                                        />
                                        <span>Администраторы</span>
                                    </label>
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isTypeOptionChecked('user')}
                                            onChange={() => toggleTypeFilterOption('user')}
                                        />
                                        <span>Пользователи</span>
                                    </label>
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isTypeOptionChecked('blocked')}
                                            onChange={() => toggleTypeFilterOption('blocked')}
                                        />
                                        <span>Заблокированные</span>
                                    </label>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="filter-tile">
                        <button
                            className="filter-tile-header"
                            onClick={() => toggleFilter('organizations')}
                        >
                            <span>Организации</span>
                            <span className="filter-arrow">{expandedFilters.organizations ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.organizations && (() => {
                            const allUnitNames = organizationsForFilter.flatMap((o) =>
                                flattenUnitNamesFromForest(o.hierarchy)
                            );
                            const isNoneSelected = organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__';
                            const allSelected = (organizationUnitFilter.length === 0 || organizationUnitFilter.length === allUnitNames.length) && !isNoneSelected;
                            const showAllChecked = organizationUnitFilter.length === 0 && !isNoneSelected;

                            const renderUnit = (unit, level = 0) => {
                                const allChildUnits = getAllChildUnits(unit);
                                const allUnitNamesForUnit = allChildUnits.map((u) => u.name);
                                const isUnitChecked = showAllChecked || (!isNoneSelected && allUnitNamesForUnit.every((n) => organizationUnitFilter.includes(n)));
                                const hasChildren = unit.children && unit.children.length > 0;
                                return (
                                    <div key={unit.id} className="filter-option-tree">
                                        <label
                                            className={`filter-checkbox ${level > 0 ? 'filter-checkbox-child' : ''}`}
                                            style={{ paddingLeft: level > 0 ? `${20 + (level - 1) * 20}px` : '0' }}
                                        >
                                            {hasChildren && (
                                                <button
                                                    type="button"
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
                                                {unit.children.map((child) => renderUnit(child, level + 1))}
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
                                                    setOrganizationUnitFilter(allUnitNames);
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
                                            const isOrgExpanded = expandedOrgInFilter[orgKey] === true;
                                            const isNoneSelectedOrg = organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__';
                                            const orgShowAllChecked = organizationUnitFilter.length === 0 && !isNoneSelectedOrg;
                                            const isOrgRowChecked =
                                                orgShowAllChecked ||
                                                (!isNoneSelectedOrg &&
                                                    orgNames.length > 0 &&
                                                    orgNames.every((n) => organizationUnitFilter.includes(n)));

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
                                            Нет доступных организаций
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
                            <button type="button" className="add-device-btn" onClick={handleAddUser}>
                                <span className="add-icon">+</span>
                                <span>Добавить пользователя</span>
                            </button>
                        </div>
                        <div className="welders-stats-tile">
                            <div className="stat-item">
                                <span>Всего: {visibleUsers.length}</span>
                            </div>
                            <div className="stat-item">
                                <span>Отображено: {filteredUsers.length}</span>
                            </div>
                            <div className="stat-item">
                                <span>Выбрано: {selectedUsers.length}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="delete-btn"
                            onClick={handleDelete}
                            disabled={selectedUsers.length === 0}
                        >
                            <span>×</span>
                            <span>Удалить</span>
                        </button>
                    </div>

                    <div className="welders-table-container">
                        <table className="welders-table">
                            <thead>
                            <tr>
                                <th />
                                <th onClick={() => toggleSort('name')} className={sortField === 'name' ? 'sort-active' : ''}>
                                    <span>Имя</span>
                                    <span className={`sort-arrow ${sortField === 'name' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'name' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                </th>
                                <th onClick={() => toggleSort('login')} className={sortField === 'login' ? 'sort-active' : ''}>
                                    <span>Логин</span>
                                    <span className={`sort-arrow ${sortField === 'login' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'login' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                </th>
                                <th
                                    onClick={() => toggleSort('type')}
                                    className={`user-type-header ${sortField === 'type' ? 'sort-active' : ''}`}
                                >
                                    <span>Тип</span>
                                    <span className={`sort-arrow ${sortField === 'type' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'type' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                </th>
                                <th onClick={() => toggleSort('organization')} className={sortField === 'organization' ? 'sort-active' : ''}>
                                    <span>Организация</span>
                                    <span className={`sort-arrow ${sortField === 'organization' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'organization' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                </th>
                                <th onClick={() => toggleSort('unit')} className={sortField === 'unit' ? 'sort-active' : ''}>
                                    <span>Подразделение</span>
                                    <span className={`sort-arrow ${sortField === 'unit' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'unit' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                </th>
                                <th onClick={() => toggleSort('position')} className={sortField === 'position' ? 'sort-active' : ''}>
                                    <span>Должность</span>
                                    <span className={`sort-arrow ${sortField === 'position' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'position' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                </th>
                                <th onClick={() => toggleSort('phone')} className={sortField === 'phone' ? 'sort-active' : ''}>
                                    <span>Телефон</span>
                                    <span className={`sort-arrow ${sortField === 'phone' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'phone' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                </th>
                                <th onClick={() => toggleSort('blocked')} className={sortField === 'blocked' ? 'sort-active' : ''}>
                                    <span>Блокировка</span>
                                    <span className={`sort-arrow ${sortField === 'blocked' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'blocked' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                </th>
                                <th onClick={() => toggleSort('status')} className={sortField === 'status' ? 'sort-active' : ''}>
                                    <span>Статус</span>
                                    <span className={`sort-arrow ${sortField === 'status' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                            {sortField === 'status' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                        </span>
                                </th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredUsers.map((user) => {
                                const blockedDisplay = getBlockedDisplay(user);
                                const onlineDisplay = getOnlineDisplay(user);
                                const isSelected = selectedUsers.includes(user.id);
                                const isAdmin = isAdminRole(user);
                                const isBlocked = isBlockedUser(user);
                                const userNameCellClass = isBlocked
                                    ? 'welder-name-cell user-name-cell--blocked'
                                    : isAdmin
                                        ? 'welder-name-cell user-name-cell--admin'
                                        : 'welder-name-cell user-name-cell--regular';
                                return (
                                    <tr
                                        key={user.id}
                                        className={`table-row ${isAdmin ? 'table-row-admin' : ''} ${isBlocked ? 'table-row-blocked' : ''} ${isSelected ? 'selected' : ''}`}
                                        onClick={() => navigate(`/employees/add/${user.id}`)}
                                    >
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => handleUserSelect(user.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className={userNameCellClass}>{user.fullName || '—'}</td>
                                        <td>{user.username || '—'}</td>
                                        <td className="user-type-cell">
                                            {getRoleTypeLabel(user).split('\n').map((line, lineIndex) => (
                                                <React.Fragment key={lineIndex}>
                                                    {lineIndex > 0 && <br />}
                                                    {line}
                                                </React.Fragment>
                                            ))}
                                        </td>
                                        <td>{getOrganizationName(user)}</td>
                                        <td>{getOrganizationUnitName(user)}</td>
                                        <td>{user.position || '—'}</td>
                                        <td>{user.phone || '—'}</td>
                                        <td>
                                                <span
                                                    className={`status-badge ${blockedDisplay.className}`}
                                                    style={blockedDisplay.color ? { color: blockedDisplay.color } : {}}
                                                >
                                                    {blockedDisplay.text}
                                                </span>
                                        </td>
                                        <td>
                                                <span
                                                    className={`status-badge ${onlineDisplay.className}`}
                                                    style={onlineDisplay.color ? { color: onlineDisplay.color } : {}}
                                                >
                                                    {onlineDisplay.text}
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
        </div>
    );
}

export default EmployeesPage;
