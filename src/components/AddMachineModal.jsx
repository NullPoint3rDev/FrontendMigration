import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';
import {
    buildEquipmentHierarchy,
    getMachinesFromUnit,
    getAllEquipmentFromHierarchy,
} from '../utils/equipmentHierarchy';
import '../styles/createOrganizationUnitModal.css';
import '../styles/addMachineModal.css';
import './ReportsPage.css';

const AddMachineModal = ({ isOpen, onClose, onAdd, selectedMachineIds = [] }) => {
    const [machines, setMachines] = useState([]);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [expandedUnits, setExpandedUnits] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    const linkedIds = useMemo(
        () => new Set((selectedMachineIds || []).map((id) => Number(id))),
        [selectedMachineIds]
    );

    const equipmentHierarchy = useMemo(
        () => buildEquipmentHierarchy(organizationUnits, machines),
        [organizationUnits, machines]
    );

    useEffect(() => {
        if (!isOpen) return;
        loadData();
        setSelectedIds(new Set());
        setSearchTerm('');
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || equipmentHierarchy.length === 0) return;
        const expanded = {};
        equipmentHierarchy.forEach((unit) => {
            expanded[unit.id] = true;
        });
        setExpandedUnits(expanded);
    }, [isOpen, equipmentHierarchy]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [machinesData, unitsData] = await Promise.all([
                getAllWeldingMachines(),
                getAllOrganizationUnits(),
            ]);
            setMachines(Array.isArray(machinesData) ? machinesData : []);
            setOrganizationUnits(Array.isArray(unitsData) ? unitsData : []);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            setMachines([]);
            setOrganizationUnits([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleMachine = (machineId) => {
        if (linkedIds.has(machineId)) return;
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(machineId)) next.delete(machineId);
            else next.add(machineId);
            return next;
        });
    };

    const toggleUnit = (unitId) => {
        const findUnit = (units, id) => {
            for (const u of units) {
                if (u.id === id) return u;
                if (u.children?.length) {
                    const found = findUnit(u.children, id);
                    if (found) return found;
                }
            }
            return null;
        };
        const unit = findUnit(equipmentHierarchy, unitId);
        if (!unit) return;

        const selectable = getMachinesFromUnit(unit).filter((m) => !linkedIds.has(m.id));
        const selectableIds = selectable.map((m) => m.id);
        if (selectableIds.length === 0) return;

        const allSelected = selectableIds.every((id) => selectedIds.has(id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                selectableIds.forEach((id) => next.delete(id));
            } else {
                selectableIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const toggleUnitExpanded = (unitId) => {
        setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
    };

    const handleToggleAll = () => {
        const allIds = getAllEquipmentFromHierarchy(equipmentHierarchy).filter((id) => !linkedIds.has(id));
        const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allIds));
        }
    };

    const handleAdd = () => {
        const picked = [];
        const walk = (units) => {
            units.forEach((unit) => {
                (unit.machines || []).forEach((m) => {
                    if (selectedIds.has(m.id) && !linkedIds.has(m.id)) {
                        picked.push(m.machine || machines.find((x) => x.id === m.id));
                    }
                });
                if (unit.children?.length) walk(unit.children);
            });
        };
        walk(equipmentHierarchy);
        onAdd(picked.filter(Boolean));
        onClose();
    };

    const getModelDisplay = useCallback((item) => {
        if (!item) return 'Не указана';
        if (item.deviceModel === 'MONITORING_BLOCK') return 'Блок Мониторинга';
        if (item.deviceModel === 'CORE') return 'CORE PULSE';
        return item.model || item.deviceModel?.name || 'Не указана';
    }, []);

    const getEquipmentUnitState = useCallback((unit) => {
        const unitMachines = getMachinesFromUnit(unit).filter((m) => !linkedIds.has(m.id));
        const selectedCount = unitMachines.filter((m) => selectedIds.has(m.id)).length;
        const allSelected = unitMachines.length > 0 && selectedCount === unitMachines.length;
        const someSelected = selectedCount > 0;

        if (unit.children?.length > 0) {
            const childrenStates = unit.children.map((c) => getEquipmentUnitState(c));
            const allChildrenChecked = childrenStates.every((s) => s.checked);
            const someChildrenChecked = childrenStates.some((s) => s.checked || s.indeterminate);
            let someInChildren = false;
            unit.children.forEach((child) => {
                const childMachines = getMachinesFromUnit(child).filter((m) => !linkedIds.has(m.id));
                if (childMachines.some((m) => selectedIds.has(m.id))) someInChildren = true;
            });
            if (allChildrenChecked) {
                if (unitMachines.length > 0) {
                    return allSelected ? { checked: true, indeterminate: false } : { checked: false, indeterminate: true };
                }
                return { checked: true, indeterminate: false };
            }
            if (someChildrenChecked || someSelected || someInChildren) {
                return { checked: false, indeterminate: true };
            }
            return { checked: false, indeterminate: false };
        }

        if (unitMachines.length > 0) {
            if (allSelected) return { checked: true, indeterminate: false };
            if (someSelected) return { checked: false, indeterminate: true };
        }
        return { checked: false, indeterminate: false };
    }, [linkedIds, selectedIds]);

    const renderEquipmentUnit = (unit, level = 0) => {
        const unitState = getEquipmentUnitState(unit);
        const isUnitChecked = Boolean(unitState?.checked ?? false);
        const isUnitIndeterminate = Boolean(unitState?.indeterminate ?? false);
        const searchLower = searchTerm ? searchTerm.toLowerCase() : '';

        const filteredMachines = (unit.machines || []).filter((m) => {
            if (!searchLower) return true;
            const machine = m.machine || machines.find((x) => x.id === m.id);
            const name = (m.name || '').toLowerCase();
            const model = getModelDisplay(machine).toLowerCase();
            const inventory = (machine?.inventoryNumber || '').toLowerCase();
            return name.includes(searchLower) || model.includes(searchLower) || inventory.includes(searchLower);
        });

        const unitNameMatch = !searchLower || unit.name.toLowerCase().includes(searchLower);
        const hasMatchingChildren = unit.children?.some((child) => {
            const childNameMatch = !searchLower || child.name.toLowerCase().includes(searchLower);
            const childHasMachines = (child.machines || []).some((m) => {
                const machine = m.machine || machines.find((x) => x.id === m.id);
                const name = (m.name || '').toLowerCase();
                const model = getModelDisplay(machine).toLowerCase();
                return !searchLower || name.includes(searchLower) || model.includes(searchLower);
            });
            return childNameMatch || childHasMachines;
        });

        if (searchLower && !unitNameMatch && filteredMachines.length === 0 && !hasMatchingChildren) {
            return null;
        }

        const hasContent = filteredMachines.length > 0 || (unit.children && unit.children.length > 0);
        const indentSize = 12;
        const paddingLeft = level * indentSize;
        const isExpanded = searchLower ? true : expandedUnits[unit.id];

        return (
            <div key={unit.id} className="parameter-item-expandable" style={{ marginLeft: `${paddingLeft}px` }}>
                <div className="parameter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={isUnitChecked}
                        ref={(input) => {
                            if (input) input.indeterminate = isUnitIndeterminate;
                        }}
                        onChange={() => toggleUnit(unit.id)}
                    />
                    <span
                        className="parameter-label"
                        style={{ flex: 1, cursor: 'pointer', color: isUnitIndeterminate ? '#F6B243' : undefined }}
                        onClick={() => toggleUnitExpanded(unit.id)}
                    >
                        {unit.name}
                    </span>
                    {hasContent && (
                        <button
                            type="button"
                            className="org-unit-expand-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleUnitExpanded(unit.id);
                            }}
                        >
                            {isExpanded ? (
                                <FaChevronDown className="expand-icon" />
                            ) : (
                                <FaChevronRight className="expand-icon" />
                            )}
                        </button>
                    )}
                </div>
                {isExpanded && (
                    <div className="parameter-expanded-content" style={{ marginLeft: '0', paddingLeft: '0' }}>
                        {unit.children?.map((child) => renderEquipmentUnit(child, level + 1)).filter(Boolean)}
                        {filteredMachines.map((m) => {
                            const machine = m.machine || machines.find((x) => x.id === m.id);
                            const isLinked = linkedIds.has(m.id);
                            const isChecked = isLinked || selectedIds.has(m.id);
                            return (
                                <label
                                    key={m.id}
                                    className={`parameter-sub-item add-machine-tree-machine${isLinked ? ' is-linked' : ''}`}
                                    style={{ marginLeft: `${indentSize}px`, paddingLeft: '0' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={isLinked}
                                        onChange={() => toggleMachine(m.id)}
                                    />
                                    <span className="add-machine-tree-machine-name">{m.name}</span>
                                    {machine && (
                                        <span className="add-machine-tree-machine-meta">
                                            {getModelDisplay(machine)}
                                            {machine.inventoryNumber ? ` · ${machine.inventoryNumber}` : ''}
                                        </span>
                                    )}
                                    {isLinked && (
                                        <span className="add-machine-tree-linked-badge">Уже привязан</span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const selectableCount = getAllEquipmentFromHierarchy(equipmentHierarchy).filter((id) => !linkedIds.has(id)).length;
    const allSelectableSelected = selectableCount > 0
        && getAllEquipmentFromHierarchy(equipmentHierarchy)
            .filter((id) => !linkedIds.has(id))
            .every((id) => selectedIds.has(id));

    const newSelectionCount = [...selectedIds].filter((id) => !linkedIds.has(id)).length;

    if (!isOpen) return null;

    return (
        <div className="create-org-unit-modal-overlay" onClick={onClose}>
            <div
                className="create-org-unit-modal-content add-machine-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" className="create-org-unit-modal-close" onClick={onClose}>
                    ×
                </button>

                <h2 className="create-org-unit-modal-title">Выбрать аппараты</h2>

                <div className="add-machine-modal-body">
                    <input
                        type="text"
                        className="add-machine-search-input"
                        placeholder="Поиск по названию, модели, инвентарному номеру..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <div className="add-machine-tree-panel parameters-list">
                        {loading ? (
                            <div className="add-machine-tree-empty">Загрузка оборудования...</div>
                        ) : equipmentHierarchy.length === 0 ? (
                            <div className="add-machine-tree-empty">Нет доступного оборудования</div>
                        ) : (
                            <>
                                <label className="parameter-item">
                                    <input
                                        type="checkbox"
                                        checked={allSelectableSelected}
                                        onChange={handleToggleAll}
                                        disabled={selectableCount === 0}
                                    />
                                    <span className="parameter-label">Все</span>
                                </label>
                                {equipmentHierarchy.map((unit) => renderEquipmentUnit(unit)).filter(Boolean)}
                            </>
                        )}
                    </div>

                    {newSelectionCount > 0 && (
                        <p className="add-machine-selection-hint">
                            Выбрано для добавления: {newSelectionCount}
                        </p>
                    )}
                </div>

                <div className="create-org-unit-modal-actions">
                    <button
                        type="button"
                        className="create-org-unit-btn cancel"
                        onClick={onClose}
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        className="create-org-unit-btn create"
                        onClick={handleAdd}
                        disabled={newSelectionCount === 0}
                    >
                        Добавить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMachineModal;
