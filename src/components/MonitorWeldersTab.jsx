import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/weldersPage.css';
import '../styles/monitorWeldersTab.css';
import WelderIcon from '../images/WelderIcon.png';
import { getAllWelders, getWelderById, updateWelder } from '../api/welderApi';
import { getCertificationsByWelderId } from '../api/certificationApi';

function welderLinkedToMachine(welder, machineId) {
    if (!machineId || !welder) return false;
    const machines = welder.weldingMachines || [];
    return machines.some((m) => Number(m.id) === Number(machineId));
}

function enrichWelderFromCertifications(welder, certifications) {
    let weldingMethodsSummary = '';
    let permitTypeSummary = '';

    if (certifications && certifications.length > 0) {
        const activeCerts = certifications.filter((cert) => cert.status === 'ACTIVE');
        if (activeCerts.length > 0) {
            const methods = activeCerts
                .flatMap((cert) => cert.weldingMethods || [])
                .filter((method, index, self) => self.indexOf(method) === index);
            weldingMethodsSummary = methods.length > 0 ? methods.join(', ') : '';

            const groups = activeCerts
                .flatMap((cert) => cert.techGroups || [])
                .filter((group, index, self) => self.indexOf(group) === index);
            permitTypeSummary = groups.length > 0 ? groups.join(', ') : '';
        }
    }

    return { ...welder, weldingMethodsSummary, permitTypeSummary };
}

function getWelderStatusDisplay(welder, onlineWelderId) {
    if (onlineWelderId != null && Number(welder.id) === Number(onlineWelderId)) {
        return { text: 'В сети', className: 'online', color: '#0FA626' };
    }
    const status = String(welder.status || '').toUpperCase();
    if (status === 'DISMISSED' || status === 'INACTIVE') {
        return { text: 'Заблокирован', className: 'blocked', color: '#445569' };
    }
    switch (welder.uiStatus || welder.status) {
        case 'online':
        case 'В сети':
            return { text: 'В сети', className: 'online', color: '#0FA626' };
        case 'blocked':
        case 'Заблокирован':
            return { text: 'Заблокирован', className: 'blocked', color: '#445569' };
        default:
            return { text: 'Не в сети', className: 'offline', color: '#818EA1' };
    }
}

function MonitorWeldersTab({ machineId, organizationUnit, onlineWelderId }) {
    const navigate = useNavigate();
    const [welders, setWelders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [selectedWelders, setSelectedWelders] = useState([]);
    const [sortField, setSortField] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    const loadWelders = useCallback(async () => {
        if (!machineId) {
            setWelders([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError(null);
        try {
            const data = await getAllWelders();
            const all = Array.isArray(data) ? data : [];
            const linked = all.filter((w) => welderLinkedToMachine(w, machineId));

            const enriched = await Promise.all(
                linked.map(async (welder) => {
                    try {
                        const certifications = await getCertificationsByWelderId(welder.id);
                        return enrichWelderFromCertifications(welder, certifications);
                    } catch (_) {
                        return enrichWelderFromCertifications(welder, []);
                    }
                })
            );

            setWelders(enriched);
        } catch (err) {
            setLoadError(err?.message || 'Ошибка загрузки сварщиков');
            setWelders([]);
        } finally {
            setLoading(false);
        }
    }, [machineId]);

    useEffect(() => {
        loadWelders();
    }, [loadWelders]);

    useEffect(() => {
        setSelectedWelders([]);
    }, [machineId]);

    const getDepartmentDisplay = (welder) => {
        const name = (welder.department || welder.organizationUnit?.name || '').trim();
        return name || organizationUnit || '—';
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedWelders = useMemo(() => {
        const sorted = [...welders].sort((a, b) => {
            const getVal = (item) => {
                switch (sortField) {
                    case 'name':
                        return (item.name || '').toLowerCase();
                    case 'employeeId':
                        return (item.employeeId || '').toLowerCase();
                    case 'grade':
                        return String(item.grade || '').toLowerCase();
                    case 'position':
                        return (item.position || '').toLowerCase();
                    case 'unit':
                        return getDepartmentDisplay(item).toLowerCase();
                    case 'weldingMethods':
                        return (item.weldingMethodsSummary || '').toLowerCase();
                    case 'permitType':
                        return (item.permitTypeSummary || '').toLowerCase();
                    case 'status':
                        return getWelderStatusDisplay(item, onlineWelderId).text.toLowerCase();
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
    }, [welders, sortField, sortDirection, onlineWelderId, organizationUnit]);

    const handleWelderSelect = (welderId, checked) => {
        if (checked) {
            setSelectedWelders((prev) => [...prev, welderId]);
        } else {
            setSelectedWelders((prev) => prev.filter((id) => id !== welderId));
        }
    };

    const handleAddWelder = () => {
        navigate('/welders');
    };

    const handleCreateWelder = () => {
        navigate('/welders/add', {
            state: { prefilledMachineId: machineId },
        });
    };

    const handleUnbind = async () => {
        if (selectedWelders.length === 0) {
            return;
        }
        const confirmMessage = `Отвязать ${selectedWelders.length} сварщик(ов) от этого аппарата?`;
        if (!window.confirm(confirmMessage)) {
            return;
        }
        try {
            await Promise.all(
                selectedWelders.map(async (welderId) => {
                    const cached = welders.find((w) => Number(w.id) === Number(welderId));
                    const welder = (await getWelderById(welderId)) || cached;
                    const linkedMachines =
                        (welder?.weldingMachines && welder.weldingMachines.length > 0
                            ? welder.weldingMachines
                            : cached?.weldingMachines) || [];
                    const machineIds = linkedMachines
                        .map((m) => Number(m.id))
                        .filter((id) => Number.isFinite(id) && id !== Number(machineId));
                    const rfidCodes =
                        welder?.rfidPasses && welder.rfidPasses.length > 0
                            ? welder.rfidPasses.map((p) => p.code)
                            : welder?.rfidCode
                                ? welder.rfidCode.split(',').map((c) => c.trim()).filter(Boolean)
                                : undefined;
                    const payload = {
                        name: welder.name,
                        status: welder.status,
                        department: welder.department || null,
                        position: welder.position || null,
                        grade: welder.grade || null,
                        employeeId: welder.employeeId || null,
                        // Пустой массив явно снимает все привязки к аппаратам; null на бэкенде игнорируется
                        machineIds,
                    };
                    if (rfidCodes !== undefined) {
                        payload.rfidCodes = rfidCodes;
                    }
                    await updateWelder(welderId, payload);
                })
            );
            setSelectedWelders([]);
            await loadWelders();
        } catch (err) {
            alert('Ошибка отвязки сварщиков: ' + (err?.message || 'неизвестная ошибка'));
        }
    };

    const navigateToWelderProfile = (welderId) => {
        if (welderId) {
            navigate(`/welders/add/${welderId}`);
        }
    };

    const renderSortArrow = (field) => (
        <span className={`sort-arrow ${sortField === field ? (sortDirection === 'asc' ? 'sort-asc' : 'sort-desc') : ''}`}>
            {sortField === field ? (sortDirection === 'asc' ? '▴' : '▾') : '▾'}
        </span>
    );

    return (
        <div className="monitor-welders-tab">
            <div className="content-header monitor-welders-tab__header">
                <div className="add-device-tile">
                    <button type="button" className="add-device-btn" onClick={handleAddWelder}>
                        <img src={WelderIcon} alt="" className="monitor-welders-btn-icon" />
                        <span>Добавить сварщика</span>
                    </button>
                </div>
                <div className="add-device-tile">
                    <button type="button" className="add-device-btn" onClick={handleCreateWelder}>
                        <img src={WelderIcon} alt="" className="monitor-welders-btn-icon" />
                        <span>Создать сварщика</span>
                    </button>
                </div>
                <div className="welders-stats-tile monitor-welders-tab__stats">
                    <div className="stat-item">
                        <img src={WelderIcon} alt="" className="stat-icon" />
                        <span>Всего: {welders.length}</span>
                    </div>
                    <div className="stat-item">
                        <img
                            src={WelderIcon}
                            alt=""
                            className={`stat-icon ${selectedWelders.length > 0 ? 'stat-icon-selected' : ''}`}
                        />
                        <span>Выбрано: {selectedWelders.length}</span>
                    </div>
                </div>
                <button
                    type="button"
                    className="delete-btn monitor-welders-tab__delete-btn"
                    onClick={handleUnbind}
                    disabled={selectedWelders.length === 0}
                >
                    <span>×</span>
                    <span>Удалить</span>
                </button>
            </div>

            {loadError && (
                <div className="monitor-welders-tab__error" role="alert">
                    {loadError}
                </div>
            )}

            <div className="welders-table-container monitor-welders-tab__table-wrap">
                {loading ? (
                    <div className="monitor-welders-tab__loading">Загрузка…</div>
                ) : (
                    <table className="welders-table">
                        <thead>
                        <tr>
                            <th aria-label="Выбор" />
                            <th
                                onClick={() => toggleSort('name')}
                                className={sortField === 'name' ? 'sort-active' : ''}
                            >
                                <span>Сварщик</span>
                                {renderSortArrow('name')}
                            </th>
                            <th
                                onClick={() => toggleSort('employeeId')}
                                className={sortField === 'employeeId' ? 'sort-active' : ''}
                            >
                                <span>Таб. №</span>
                                {renderSortArrow('employeeId')}
                            </th>
                            <th
                                onClick={() => toggleSort('grade')}
                                className={sortField === 'grade' ? 'sort-active' : ''}
                            >
                                <span>Разряд</span>
                                {renderSortArrow('grade')}
                            </th>
                            <th
                                onClick={() => toggleSort('position')}
                                className={sortField === 'position' ? 'sort-active' : ''}
                            >
                                <span>Должность</span>
                                {renderSortArrow('position')}
                            </th>
                            <th
                                onClick={() => toggleSort('unit')}
                                className={sortField === 'unit' ? 'sort-active' : ''}
                            >
                                <span>Подразделение</span>
                                {renderSortArrow('unit')}
                            </th>
                            <th
                                onClick={() => toggleSort('weldingMethods')}
                                className={sortField === 'weldingMethods' ? 'sort-active' : ''}
                            >
                                <span>Способ свар.</span>
                                {renderSortArrow('weldingMethods')}
                            </th>
                            <th
                                onClick={() => toggleSort('permitType')}
                                className={`admission-type-header ${sortField === 'permitType' ? 'sort-active' : ''}`}
                            >
                                <span>Вид допуска</span>
                                {renderSortArrow('permitType')}
                            </th>
                            <th
                                onClick={() => toggleSort('status')}
                                className={sortField === 'status' ? 'sort-active' : ''}
                            >
                                <span>Статус</span>
                                {renderSortArrow('status')}
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {sortedWelders.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="monitor-welders-tab__empty">
                                    Нет сварщиков, привязанных к этому аппарату
                                </td>
                            </tr>
                        ) : (
                            sortedWelders.map((welder) => {
                                const statusDisplay = getWelderStatusDisplay(welder, onlineWelderId);
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
                                        <td className="welder-name-cell">{welder.name || '—'}</td>
                                        <td>{welder.employeeId || '—'}</td>
                                        <td>{welder.grade || '—'}</td>
                                        <td>{welder.position || '—'}</td>
                                        <td>{getDepartmentDisplay(welder)}</td>
                                        <td className="welding-methods-cell">{welder.weldingMethodsSummary || ''}</td>
                                        <td className="admission-type-cell">{welder.permitTypeSummary || ''}</td>
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
                            })
                        )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default MonitorWeldersTab;
