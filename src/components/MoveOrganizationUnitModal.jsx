import React, { useState, useEffect, useMemo } from 'react';
import { FaChevronRight, FaChevronDown, FaCheck } from 'react-icons/fa';
import { updateOrganizationUnit } from '../api/organizationUnitApi';
import { getWeldingMachineById, updateWeldingMachine } from '../api/weldingMachineApi';
import { getWelderById, updateWelder } from '../api/welderApi';
import '../styles/createOrganizationUnitModal.css';
import '../styles/moveOrganizationUnitModal.css';

const normalizeId = (id) => (id == null ? null : typeof id === 'string' ? parseInt(id, 10) : id);

function buildHierarchy(units) {
    if (!units || units.length === 0) return [];
    const unitMap = new Map();
    const rootUnits = [];
    units.forEach((unit) => {
        const normalizedId = normalizeId(unit.id);
        unitMap.set(normalizedId, { ...unit, id: normalizedId, children: [] });
    });
    units.forEach((unit) => {
        const normalizedId = normalizeId(unit.id);
        const unitNode = unitMap.get(normalizedId);
        const parentIdValue =
            unit.parentId != null
                ? unit.parentId
                : unit.parent_id != null
                    ? unit.parent_id
                    : unit.parentDepartment?.id != null
                        ? unit.parentDepartment.id
                        : null;
        if (parentIdValue != null) {
            const normalizedParentId = normalizeId(parentIdValue);
            if (unitMap.has(normalizedParentId)) {
                unitMap.get(normalizedParentId).children.push(unitNode);
            } else {
                rootUnits.push(unitNode);
            }
        } else {
            rootUnits.push(unitNode);
        }
    });
    return rootUnits;
}

/** Все id поддерева (сам узел + все потомки) */
function collectUnitAndDescendantIds(unit) {
    const ids = new Set();
    const walk = (u) => {
        if (!u) return;
        ids.add(normalizeId(u.id));
        (u.children || []).forEach(walk);
    };
    walk(unit);
    return ids;
}

function findUnitInHierarchy(nodes, unitId) {
    const nid = normalizeId(unitId);
    for (const node of nodes || []) {
        if (normalizeId(node.id) === nid) return node;
        const found = findUnitInHierarchy(node.children, unitId);
        if (found) return found;
    }
    return null;
}

const TITLES = {
    unit: 'Переместить подразделение',
    machine: 'Переместить аппарат',
    welder: 'Переместить сварщика',
};

/**
 * moveSelection: { kind: 'unit'|'machine'|'welder', id: number } — объект уже выбран на карте (галочка)
 * Один дропдаун: целевое подразделение внутри предприятия
 */
const MoveOrganizationUnitModal = ({
                                       isOpen,
                                       onClose,
                                       moveSelection = null,
                                       existingUnits = [],
                                       machines = [],
                                       welders = [],
                                       onSuccess,
                                   }) => {
    const [targetParentId, setTargetParentId] = useState('');
    const [toDropdownOpen, setToDropdownOpen] = useState(false);
    const [expandedTo, setExpandedTo] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const hierarchy = useMemo(() => buildHierarchy(existingUnits), [existingUnits]);

    const moveUnitNode = useMemo(() => {
        if (!moveSelection || moveSelection.kind !== 'unit') return null;
        return findUnitInHierarchy(hierarchy, moveSelection.id);
    }, [moveSelection, hierarchy]);

    const forbiddenTargetIds = useMemo(() => {
        if (!moveUnitNode) return new Set();
        return collectUnitAndDescendantIds(moveUnitNode);
    }, [moveUnitNode]);

    const currentMachineUnitId = useMemo(() => {
        if (!moveSelection || moveSelection.kind !== 'machine') return null;
        const m = machines.find((x) => normalizeId(x.id) === normalizeId(moveSelection.id));
        if (!m) return null;
        return normalizeId(m.organizationUnit?.id ?? m.organizationUnitId ?? null);
    }, [moveSelection, machines]);

    const currentWelderUnitId = useMemo(() => {
        if (!moveSelection || moveSelection.kind !== 'welder') return null;
        const w = welders.find((x) => normalizeId(x.id) === normalizeId(moveSelection.id));
        if (!w) return null;
        return normalizeId(w.organizationUnit?.id ?? w.organizationUnitId ?? null);
    }, [moveSelection, welders]);

    // Сброс только при открытии/закрытии окна (не при смене moveSelection), иначе форма и loading ломаются во время запроса
    useEffect(() => {
        if (!isOpen) {
            setLoading(false);
            return;
        }
        setTargetParentId('');
        setToDropdownOpen(false);
        setExpandedTo({});
        setError('');
    }, [isOpen]);

    const toggleToExpand = (unitId) => {
        setExpandedTo((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
    };

    const renderToOption = (unit, level = 0) => {
        const hasChildren = unit.children && unit.children.length > 0;
        const isExpanded = expandedTo[unit.id];
        const indent = level * 32;
        const id = normalizeId(unit.id);
        let isForbidden = false;
        if (moveSelection?.kind === 'unit') {
            isForbidden = forbiddenTargetIds.has(id);
        } else if (moveSelection?.kind === 'machine' && currentMachineUnitId != null) {
            isForbidden = id === currentMachineUnitId;
        } else if (moveSelection?.kind === 'welder' && currentWelderUnitId != null) {
            isForbidden = id === currentWelderUnitId;
        }
        const isSelected = targetParentId !== '' && normalizeId(targetParentId) === id;
        return (
            <React.Fragment key={unit.id}>
                <div
                    className={`move-modal-unit-option ${isSelected ? 'selected' : ''} ${isForbidden ? 'disabled' : ''}`}
                    style={{ marginLeft: `${indent}px`, paddingLeft: '12px' }}
                    onClick={() => {
                        if (isForbidden) return;
                        setTargetParentId(unit.id);
                        setToDropdownOpen(false);
                    }}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            className="move-modal-expand-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleToExpand(unit.id);
                            }}
                        >
                            {isExpanded ? <FaChevronDown className="expand-icon" /> : <FaChevronRight className="expand-icon" />}
                        </button>
                    ) : (
                        <span className="move-modal-spacer" />
                    )}
                    <span className="move-modal-option-name">{unit.name}</span>
                </div>
                {hasChildren && isExpanded && unit.children.map((child) => renderToOption(child, level + 1))}
            </React.Fragment>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!moveSelection || !moveSelection.kind || moveSelection.id == null) {
            setError('Не выбран объект для перемещения');
            return;
        }
        const targetId = targetParentId === '' || targetParentId == null ? null : normalizeId(targetParentId);
        if (targetId == null) {
            setError('Выберите подразделение');
            return;
        }

        const targetUnit = existingUnits.find((u) => normalizeId(u.id) === targetId);
        if (!targetUnit) {
            setError('Целевое подразделение не найдено');
            return;
        }

        if (moveSelection.kind === 'unit') {
            if (forbiddenTargetIds.has(targetId)) {
                setError('Нельзя переместить подразделение в себя или в своего потомка');
                return;
            }
        }

        setLoading(true);
        try {
            if (moveSelection.kind === 'unit') {
                const unit = existingUnits.find((u) => normalizeId(u.id) === normalizeId(moveSelection.id));
                const payload = {
                    name: unit?.name ?? '',
                    parentDepartment: targetId ? { id: targetId } : null,
                };
                await updateOrganizationUnit(moveSelection.id, payload);
            } else if (moveSelection.kind === 'machine') {
                const machine = await getWeldingMachineById(moveSelection.id);
                if (!machine || machine.id == null) {
                    setError('Аппарат не найден');
                    setLoading(false);
                    return;
                }
                await updateWeldingMachine(machine.id, {
                    ...machine,
                    organizationUnit: { id: targetUnit.id, name: targetUnit.name || '' },
                });
            } else if (moveSelection.kind === 'welder') {
                const welder = await getWelderById(moveSelection.id);
                if (!welder || !welder.id) {
                    setError('Сварщик не найден');
                    setLoading(false);
                    return;
                }
                await updateWelder(welder.id, {
                    ...welder,
                    department: targetUnit.name || '',
                    organizationUnit: { id: targetUnit.id, name: targetUnit.name || '' },
                });
            }
            if (onSuccess) {
                await Promise.resolve(onSuccess());
            }
            onClose();
        } catch (err) {
            console.error('Ошибка перемещения:', err);
            const msg =
                err.response?.data?.message ??
                err.response?.data?.error ??
                err.message ??
                'Не удалось выполнить перемещение';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTargetParentId('');
        setError('');
        onClose();
    };

    const toLabel =
        targetParentId !== '' && targetParentId != null
            ? existingUnits.find((u) => normalizeId(u.id) === normalizeId(targetParentId))?.name ?? 'Выберите подразделение'
            : 'Выберите подразделение';

    if (!isOpen || !moveSelection || !moveSelection.kind) return null;

    const title = TITLES[moveSelection.kind] || 'Переместить';

    return (
        <div className="create-org-unit-modal-overlay">
            <div className="create-org-unit-modal-content move-org-unit-modal-content">
                <button type="button" className="create-org-unit-modal-close" onClick={handleClose}>
                    ×
                </button>
                <h2 className="create-org-unit-modal-title">{title}</h2>

                <form onSubmit={handleSubmit} className="create-org-unit-form">
                    <div className="create-org-unit-form-field">
                        <label>Выберите подразделение</label>
                        <div className="move-modal-unit-select-container">
                            <div
                                className={`move-modal-unit-select-dropdown ${toDropdownOpen ? 'open' : ''}`}
                                onClick={() => setToDropdownOpen(!toDropdownOpen)}
                            >
                                <span className="move-modal-unit-select-label">{toLabel}</span>
                                <span className={`move-modal-unit-select-arrow ${toDropdownOpen ? 'open' : ''}`}>
                                    <FaChevronDown />
                                </span>
                            </div>
                            {toDropdownOpen && (
                                <div className="move-modal-unit-select-options">
                                    {hierarchy.length > 0 ? (
                                        hierarchy.map((unit) => renderToOption(unit))
                                    ) : (
                                        <div className="move-modal-unit-option" style={{ padding: '8px 12px', color: '#7B8BA6' }}>
                                            Нет подразделений
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && <div className="create-org-unit-error-message">{error}</div>}

                    <div className="create-org-unit-modal-actions">
                        <button type="button" className="create-org-unit-btn cancel" onClick={handleClose}>
                            Отмена
                        </button>
                        <button type="submit" className="create-org-unit-btn create" disabled={loading}>
                            <FaCheck className="btn-icon" />
                            Переместить
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MoveOrganizationUnitModal;
