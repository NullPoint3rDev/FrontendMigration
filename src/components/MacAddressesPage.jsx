import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaBell, FaLock, FaLockOpen } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../styles/weldersPage.css';
import '../styles/addWelderPage.css';
import '../styles/macAddressesPage.css';
import UserProfile from './UserProfile';
import WelderDateField from './WelderDateField';
import { useCurrentUserPermissions } from '../hooks/useCurrentUserPermissions';
import {
    blockMacRegistryEntries,
    checkMacRegistryExists,
    createMacRegistryEntry,
    deleteMacRegistryEntries,
    fetchMacEquipmentTypes,
    fetchMacRegistry,
    normalizeMacDigits,
    unblockMacRegistryEntries,
} from '../api/macAddressRegistryApi';

const MAC_PAGE_STATE_KEY = 'macAddressesPageState';
const STATUS_FILTER_OPTIONS = [
    { key: 'ACTIVE', label: 'Активен' },
    { key: 'WAITING', label: 'Ожидание' },
    { key: 'BLOCKED', label: 'Заблокирован' },
];

function loadPageState() {
    try {
        const raw = localStorage.getItem(MAC_PAGE_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
        return null;
    }
}

function savePageState(state) {
    try {
        localStorage.setItem(MAC_PAGE_STATE_KEY, JSON.stringify(state));
    } catch (_) {}
}

function statusClass(statusLabel) {
    if (statusLabel === 'Активен') return 'status-active';
    if (statusLabel === 'Заблокирован') return 'status-blocked';
    return 'status-waiting';
}

function MacAddressesPage() {
    const navigate = useNavigate();
    const savedState = useMemo(() => loadPageState(), []);
    const {
        ready,
        canReadMacRegistry,
        canAddMacRegistry,
        isAdminAlloy,
    } = useCurrentUserPermissions();

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [equipmentTypes, setEquipmentTypes] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState(
        typeof savedState?.searchTerm === 'string' ? savedState.searchTerm : ''
    );
    const [typeFilter, setTypeFilter] = useState(
        Array.isArray(savedState?.typeFilter) ? savedState.typeFilter : []
    );
    const [statusFilter, setStatusFilter] = useState(
        Array.isArray(savedState?.statusFilter) ? savedState.statusFilter : []
    );
    const [dateFromDraft, setDateFromDraft] = useState(savedState?.dateFromDraft || '');
    const [dateToDraft, setDateToDraft] = useState(savedState?.dateToDraft || '');
    const [dateFrom, setDateFrom] = useState(savedState?.dateFrom || '');
    const [dateTo, setDateTo] = useState(savedState?.dateTo || '');

    const [sortField, setSortField] = useState(savedState?.sortField || 'sessionCount');
    const [sortDirection, setSortDirection] = useState(
        savedState?.sortDirection != null
            ? (savedState.sortDirection === 'desc' ? 'desc' : 'asc')
            : 'desc'
    );
    const [page, setPage] = useState(typeof savedState?.page === 'number' ? savedState.page : 0);

    const [newMac, setNewMac] = useState('');
    const [newTypeId, setNewTypeId] = useState('');
    const [addError, setAddError] = useState('');
    const [adding, setAdding] = useState(false);

    const [expandedFilters, setExpandedFilters] = useState({
        type: true,
        status: true,
        date: true,
    });

    useEffect(() => {
        if (!ready) return;
        if (!canReadMacRegistry) {
            navigate('/equipment');
        }
    }, [ready, canReadMacRegistry, navigate]);

    useEffect(() => {
        savePageState({
            searchTerm,
            typeFilter,
            statusFilter,
            dateFromDraft,
            dateToDraft,
            dateFrom,
            dateTo,
            sortField,
            sortDirection,
            page,
        });
    }, [searchTerm, typeFilter, statusFilter, dateFromDraft, dateToDraft, dateFrom, dateTo, sortField, sortDirection, page]);

    const loadTypes = useCallback(async () => {
        try {
            const types = await fetchMacEquipmentTypes();
            setEquipmentTypes(Array.isArray(types) ? types : []);
            setNewTypeId((prev) => prev || (types?.[0]?.id != null ? String(types[0].id) : ''));
        } catch (e) {
            console.error(e);
        }
    }, []);

    const loadData = useCallback(async () => {
        const typeNone = typeFilter.length === 1 && typeFilter[0] === '__NONE__';
        const statusNone = statusFilter.length === 1 && statusFilter[0] === '__NONE__';
        if (typeNone || statusNone) {
            setItems([]);
            setTotal(0);
            setLoading(false);
            setError('');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const typeIds = typeFilter.length > 0
                ? typeFilter.map((id) => Number(id))
                : undefined;
            const statuses = statusFilter.length > 0
                ? statusFilter
                : undefined;

            const data = await fetchMacRegistry({
                searchMac: searchTerm.trim() || undefined,
                typeIds,
                statuses,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                sortField,
                sortDirection,
                page,
                pageSize: 50,
            });
            setItems(Array.isArray(data.items) ? data.items : []);
            setTotal(typeof data.total === 'number' ? data.total : 0);
        } catch (e) {
            setError(e.message || 'Ошибка загрузки');
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, typeFilter, statusFilter, dateFrom, dateTo, sortField, sortDirection, page]);

    useEffect(() => {
        if (!ready || !canReadMacRegistry) return;
        loadTypes();
    }, [ready, canReadMacRegistry, loadTypes]);

    useEffect(() => {
        if (!ready || !canReadMacRegistry) return;
        loadData();
    }, [ready, canReadMacRegistry, loadData]);

    const toggleFilterSection = (key) => {
        setExpandedFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleTriStateFilter = (setter, options, key) => {
        setter((prev) => {
            const isNone = prev.length === 1 && prev[0] === '__NONE__';
            const isAllState = prev.length === 0 || options.every((k) => prev.includes(k));
            const currentlyChecked = !isNone && (isAllState || prev.includes(key));

            if (!currentlyChecked) {
                if (isNone) return [key];
                const next = [...prev];
                if (!next.includes(key)) next.push(key);
                if (options.every((k) => next.includes(k))) return [];
                return next;
            }
            if (prev.length === 0) {
                return options.filter((k) => k !== key);
            }
            const next = prev.filter((k) => k !== key);
            return next.length === 0 ? ['__NONE__'] : next;
        });
    };

    const typeOptionKeys = useMemo(
        () => equipmentTypes.map((t) => String(t.id)),
        [equipmentTypes]
    );

    const statusOptionKeys = useMemo(
        () => STATUS_FILTER_OPTIONS.map((s) => s.key),
        []
    );

    const isTriStateChecked = (filter, options, key) => {
        const isNone = filter.length === 1 && filter[0] === '__NONE__';
        const showAllChecked = filter.length === 0 && !isNone;
        return showAllChecked || (!isNone && filter.includes(key));
    };

    const isTriStateAllChecked = (filter, options) => {
        const isNone = filter.length === 1 && filter[0] === '__NONE__';
        return (filter.length === 0 || options.every((k) => filter.includes(k))) && !isNone;
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const handleMacInputChange = (e) => {
        setNewMac(e.target.value.toUpperCase());
    };

    const handleApplyDates = () => {
        setDateFrom(dateFromDraft || '');
        setDateTo(dateToDraft || '');
        setPage(0);
    };

    const handleResetDates = () => {
        setDateFromDraft('');
        setDateToDraft('');
        setDateFrom('');
        setDateTo('');
        setPage(0);
    };

    const handleAdd = async () => {
        if (!canAddMacRegistry || adding) return;
        setAddError('');
        const digits = normalizeMacDigits(newMac);
        if (digits.length !== 12) {
            setAddError('MAC-адрес должен содержать 12 символов');
            return;
        }
        if (!newTypeId) {
            setAddError('Выберите тип оборудования');
            return;
        }
        setAdding(true);
        try {
            const existsResp = await checkMacRegistryExists(digits);
            if (existsResp?.exists) {
                setAddError('MAC-адрес уже есть в реестре');
                return;
            }
            await createMacRegistryEntry({ mac: digits, equipmentTypeId: Number(newTypeId) });
            setNewMac('');
            setSelectedIds([]);
            await loadData();
        } catch (e) {
            setAddError(e.message || 'Ошибка добавления');
        } finally {
            setAdding(false);
        }
    };

    const runBulkAction = async (action) => {
        if (!isAdminAlloy || selectedIds.length === 0) return;
        setError('');
        try {
            if (action === 'block') await blockMacRegistryEntries(selectedIds);
            if (action === 'unblock') await unblockMacRegistryEntries(selectedIds);
            if (action === 'delete') await deleteMacRegistryEntries(selectedIds);
            setSelectedIds([]);
            await loadData();
        } catch (e) {
            setError(e.message || 'Ошибка операции');
        }
    };

    const selectedHasBlocked = useMemo(
        () => items.some((i) => selectedIds.includes(i.id) && i.status === 'BLOCKED'),
        [items, selectedIds]
    );
    const selectedHasUnblocked = useMemo(
        () => items.some((i) => selectedIds.includes(i.id) && i.status !== 'BLOCKED'),
        [items, selectedIds]
    );

    if (!ready) {
        return null;
    }

    return (
        <div className="welders-page mac-addresses-page">
            <div className="welders-page-header-row">
                <h1 className="welders-page-title-header">MAC Адреса</h1>
                <div className="welders-tiles-controls">
                    <button type="button" className="control-btn notifications-btn" onClick={() => navigate('/notifications')}>
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
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(0);
                            }}
                        />
                    </div>

                    <div className="filter-tile">
                        <button type="button" className="filter-tile-header" onClick={() => toggleFilterSection('type')}>
                            <span>Тип</span>
                            <span className="filter-arrow">{expandedFilters.type ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.type && (
                            <div className="filter-tile-content">
                                <label className="filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isTriStateAllChecked(typeFilter, typeOptionKeys)}
                                        onChange={(e) => setTypeFilter(e.target.checked ? [] : ['__NONE__'])}
                                    />
                                    <span>Все</span>
                                </label>
                                {equipmentTypes.map((type) => (
                                    <label className="filter-checkbox" key={type.id}>
                                        <input
                                            type="checkbox"
                                            checked={isTriStateChecked(typeFilter, typeOptionKeys, String(type.id))}
                                            onChange={() => toggleTriStateFilter(setTypeFilter, typeOptionKeys, String(type.id))}
                                        />
                                        <span>{type.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="filter-tile">
                        <button type="button" className="filter-tile-header" onClick={() => toggleFilterSection('status')}>
                            <span>Статус</span>
                            <span className="filter-arrow">{expandedFilters.status ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.status && (
                            <div className="filter-tile-content">
                                <label className="filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isTriStateAllChecked(statusFilter, statusOptionKeys)}
                                        onChange={(e) => setStatusFilter(e.target.checked ? [] : ['__NONE__'])}
                                    />
                                    <span>Все</span>
                                </label>
                                {STATUS_FILTER_OPTIONS.map((opt) => (
                                    <label className="filter-checkbox" key={opt.key}>
                                        <input
                                            type="checkbox"
                                            checked={isTriStateChecked(statusFilter, statusOptionKeys, opt.key)}
                                            onChange={() => toggleTriStateFilter(setStatusFilter, statusOptionKeys, opt.key)}
                                        />
                                        <span>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="filter-tile mac-date-filter-tile">
                        <button type="button" className="filter-tile-header" onClick={() => toggleFilterSection('date')}>
                            <span>Дата занесения</span>
                            <span className="filter-arrow">{expandedFilters.date ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.date && (
                            <div className="filter-tile-content mac-date-filter">
                                <div className="mac-date-filter-row">
                                    <span className="mac-date-filter-label">От</span>
                                    <WelderDateField value={dateFromDraft} onChange={setDateFromDraft} fixedPopup />
                                </div>
                                <div className="mac-date-filter-row">
                                    <span className="mac-date-filter-label">До</span>
                                    <WelderDateField value={dateToDraft} onChange={setDateToDraft} fixedPopup />
                                </div>
                                <div className="mac-date-filter-actions">
                                    <button type="button" className="mac-filter-ok-btn" onClick={handleApplyDates}>Ок</button>
                                    <button type="button" className="mac-filter-reset-btn" onClick={handleResetDates}>Сброс</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="equipment-content-column">
                    <div className="content-header mac-content-header">
                        <div className="mac-toolbar-tile mac-toolbar-mac">
                            <span className="mac-toolbar-label">MAC:</span>
                            <input
                                type="text"
                                className="mac-toolbar-input"
                                value={newMac}
                                onChange={handleMacInputChange}
                                disabled={!canAddMacRegistry}
                                autoComplete="off"
                                spellCheck={false}
                            />
                        </div>
                        <div className="mac-toolbar-tile mac-toolbar-type">
                            <span className="mac-toolbar-label">Тип</span>
                            <select
                                className="mac-toolbar-select"
                                value={newTypeId}
                                onChange={(e) => setNewTypeId(e.target.value)}
                                disabled={!canAddMacRegistry}
                            >
                                {equipmentTypes.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mac-toolbar-tile mac-toolbar-add">
                            <button
                                type="button"
                                className="mac-toolbar-add-btn"
                                onClick={handleAdd}
                                disabled={!canAddMacRegistry || adding}
                            >
                                <span>Добавить</span>
                                <span className="add-icon">+</span>
                            </button>
                        </div>
                        <div className="welders-stats-tile">
                            <div className="stat-item"><span>Всего: {total}</span></div>
                            <div className="stat-item"><span>Выбрано: {selectedIds.length}</span></div>
                        </div>
                        {isAdminAlloy && (
                            <>
                                <button
                                    type="button"
                                    className="mac-action-btn"
                                    disabled={!selectedHasUnblocked}
                                    onClick={() => runBulkAction('block')}
                                >
                                    <FaLock />
                                    <span>Блок</span>
                                </button>
                                <button
                                    type="button"
                                    className="mac-action-btn"
                                    disabled={!selectedHasBlocked}
                                    onClick={() => runBulkAction('unblock')}
                                >
                                    <FaLockOpen />
                                    <span>Снять блок</span>
                                </button>
                                <button
                                    type="button"
                                    className="delete-btn"
                                    disabled={selectedIds.length === 0}
                                    onClick={() => runBulkAction('delete')}
                                >
                                    <span>×</span>
                                    <span>Удалить</span>
                                </button>
                            </>
                        )}
                    </div>

                    {(error || addError) && (
                        <div className="mac-page-error">{error || addError}</div>
                    )}

                    <div className="welders-table-container">
                        <table className="welders-table mac-addresses-table">
                            <thead>
                            <tr>
                                <th />
                                <th onClick={() => toggleSort('id')} className={sortField === 'id' ? 'sort-active' : ''}>
                                    <span>№</span>
                                    <span className={`sort-arrow ${sortField === 'id' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'id' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                    </span>
                                </th>
                                <th onClick={() => toggleSort('mac')} className={sortField === 'mac' ? 'sort-active' : ''}>
                                    <span>MAC</span>
                                    <span className={`sort-arrow ${sortField === 'mac' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'mac' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                    </span>
                                </th>
                                <th onClick={() => toggleSort('equipmentTypeName')} className={sortField === 'equipmentTypeName' ? 'sort-active' : ''}>
                                    <span>Тип</span>
                                    <span className={`sort-arrow ${sortField === 'equipmentTypeName' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'equipmentTypeName' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                    </span>
                                </th>
                                <th onClick={() => toggleSort('dateCreated')} className={sortField === 'dateCreated' ? 'sort-active' : ''}>
                                    <span>Дата/время занесения</span>
                                    <span className={`sort-arrow ${sortField === 'dateCreated' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'dateCreated' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                    </span>
                                </th>
                                <th onClick={() => toggleSort('enteredByName')} className={sortField === 'enteredByName' ? 'sort-active' : ''}>
                                    <span>ФИО вводившего</span>
                                    <span className={`sort-arrow ${sortField === 'enteredByName' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'enteredByName' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
                                    </span>
                                </th>
                                <th onClick={() => toggleSort('sessionCount')} className={sortField === 'sessionCount' ? 'sort-active' : ''}>
                                    <span>Кол-во сессий</span>
                                    <span className={`sort-arrow ${sortField === 'sessionCount' ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
                                        {sortField === 'sessionCount' ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
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
                            {loading ? (
                                <tr><td colSpan={8}>Загрузка...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={8}>Нет данных</td></tr>
                            ) : items.map((row, index) => (
                                <tr
                                    key={row.id}
                                    className={`${selectedIds.includes(row.id) ? 'selected' : ''} ${row.status === 'BLOCKED' ? 'table-row-blocked' : ''}`}
                                >
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(row.id)}
                                            onChange={() => toggleSelect(row.id)}
                                        />
                                    </td>
                                    <td>{page * 50 + index + 1}</td>
                                    <td className="mac-cell">{row.mac}</td>
                                    <td>{row.equipmentTypeName || '—'}</td>
                                    <td>{row.dateCreatedDisplay || '—'}</td>
                                    <td>{row.enteredByName || '—'}</td>
                                    <td>{row.sessionCount ?? 0}</td>
                                    <td>
                                        <span className={`status-badge ${statusClass(row.statusLabel)}`}>
                                            {row.statusLabel}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MacAddressesPage;
