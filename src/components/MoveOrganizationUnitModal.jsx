import React, { useState, useEffect, useMemo } from 'react';
import { FaChevronRight, FaChevronDown, FaCheck } from 'react-icons/fa';
import { updateOrganizationUnit } from '../api/organizationUnitApi';
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

const MoveOrganizationUnitModal = ({ isOpen, onClose, existingUnits = [], onSuccess }) => {
    const [moveUnitId, setMoveUnitId] = useState(null);
    const [targetParentId, setTargetParentId] = useState('');
    const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
    const [toDropdownOpen, setToDropdownOpen] = useState(false);
    const [expandedFrom, setExpandedFrom] = useState({});
    const [expandedTo, setExpandedTo] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const hierarchy = useMemo(() => buildHierarchy(existingUnits), [existingUnits]);

    /** Дерево только перемещаемых: корни = дети корневых подразделений (родительские в модалке не показываем) */
    const movableTree = useMemo(() => {
        const roots = [];
        (hierarchy || []).forEach((root) => {
            (root.children || []).forEach((child) => roots.push(child));
        });
        return roots;
    }, [hierarchy]);

    const moveUnit = useMemo(() => {
        if (moveUnitId == null) return null;
        const find = (nodes) => {
            for (const node of nodes || []) {
                if (normalizeId(node.id) === normalizeId(moveUnitId)) return node;
                const inChild = find(node.children);
                if (inChild) return inChild;
            }
            return null;
        };
        return find(hierarchy);
    }, [moveUnitId, hierarchy, movableTree]);

    const forbiddenTargetIds = useMemo(() => {
        if (!moveUnit) return new Set();
        return collectUnitAndDescendantIds(moveUnit);
    }, [moveUnit]);

    useEffect(() => {
        if (isOpen) {
            setMoveUnitId(null);
            setTargetParentId('');
            setFromDropdownOpen(false);
            setToDropdownOpen(false);
            setError('');
        }
    }, [isOpen]);

    const toggleFromExpand = (unitId) => {
        setExpandedFrom((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
    };
    const toggleToExpand = (unitId) => {
        setExpandedTo((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
    };

    const renderFromOption = (unit, level = 0) => {
        const hasChildren = unit.children && unit.children.length > 0;
        const isExpanded = expandedFrom[unit.id];
        const indent = level * 32;
        const isSelected = normalizeId(moveUnitId) === normalizeId(unit.id);
        return (
            <React.Fragment key={unit.id}>
                <div
                    className={`move-modal-unit-option ${isSelected ? 'selected' : ''}`}
                    style={{ marginLeft: `${indent}px`, paddingLeft: '12px' }}
                    onClick={() => {
                        setMoveUnitId(unit.id);
                        setFromDropdownOpen(false);
                        setTargetParentId('');
                    }}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            className="move-modal-expand-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFromExpand(unit.id);
                            }}
                        >
                            {isExpanded ? <FaChevronDown className="expand-icon" /> : <FaChevronRight className="expand-icon" />}
                        </button>
                    ) : (
                        <span className="move-modal-spacer" />
                    )}
                    <span className="move-modal-option-name">{unit.name}</span>
                </div>
                {hasChildren && isExpanded && unit.children.map((child) => renderFromOption(child, level + 1))}
            </React.Fragment>
        );
    };

    const renderToOption = (unit, level = 0) => {
        const hasChildren = unit.children && unit.children.length > 0;
        const isExpanded = expandedTo[unit.id];
        const indent = level * 32;
        const id = normalizeId(unit.id);
        const isForbidden = forbiddenTargetIds.has(id);
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
        if (moveUnitId == null || moveUnitId === '') {
            setError('Выберите подразделение для перемещения');
            return;
        }
        const targetId = targetParentId === '' || targetParentId == null ? null : normalizeId(targetParentId);
        if (targetId == null) {
            setError('Выберите подразделение «В»');
            return;
        }
        if (forbiddenTargetIds.has(targetId)) {
            setError('Нельзя переместить подразделение в себя или в своего потомка');
            return;
        }
        setLoading(true);
        try {
            const unit = existingUnits.find((u) => normalizeId(u.id) === normalizeId(moveUnitId));
            const payload = {
                name: unit?.name ?? '',
                parentDepartment: targetId ? { id: targetId } : null
            };
            await updateOrganizationUnit(moveUnitId, payload);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Ошибка перемещения подразделения:', err);
            const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message ?? 'Не удалось переместить подразделение';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setMoveUnitId(null);
        setTargetParentId('');
        setError('');
        onClose();
    };

    const fromLabel = moveUnitId != null
        ? (existingUnits.find((u) => normalizeId(u.id) === normalizeId(moveUnitId))?.name ?? 'Выберите подразделение')
        : 'Выберите подразделение';
    const toLabel = targetParentId !== '' && targetParentId != null
        ? (existingUnits.find((u) => normalizeId(u.id) === normalizeId(targetParentId))?.name ?? 'В:')
        : 'Выберите подразделение';

    if (!isOpen) return null;

    return (
        <div className="create-org-unit-modal-overlay">
            <div className="create-org-unit-modal-content move-org-unit-modal-content">
                <button type="button" className="create-org-unit-modal-close" onClick={handleClose}>
                    ×
                </button>
                <h2 className="create-org-unit-modal-title">Переместить подразделение</h2>

                <form onSubmit={handleSubmit} className="create-org-unit-form">
                    <div className="create-org-unit-form-field">
                        <label>Переместить подразделение:</label>
                        <div className="move-modal-unit-select-container">
                            <div
                                className={`move-modal-unit-select-dropdown ${fromDropdownOpen ? 'open' : ''}`}
                                onClick={() => {
                                    setFromDropdownOpen(!fromDropdownOpen);
                                    setToDropdownOpen(false);
                                }}
                            >
                                <span className="move-modal-unit-select-label">{fromLabel}</span>
                                <span className={`move-modal-unit-select-arrow ${fromDropdownOpen ? 'open' : ''}`}>
                                    <FaChevronDown />
                                </span>
                            </div>
                            {fromDropdownOpen && (
                                <div className="move-modal-unit-select-options">
                                    {movableTree.length > 0 ? (
                                        movableTree.map((unit) => renderFromOption(unit))
                                    ) : (
                                        <div className="move-modal-unit-option" style={{ padding: '8px 12px', color: '#7B8BA6' }}>
                                            Нет подразделений для перемещения (родительские перемещать нельзя)
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="create-org-unit-form-field">
                        <label>В:</label>
                        <div className="move-modal-unit-select-container">
                            <div
                                className={`move-modal-unit-select-dropdown ${toDropdownOpen ? 'open' : ''}`}
                                onClick={() => {
                                    setToDropdownOpen(!toDropdownOpen);
                                    setFromDropdownOpen(false);
                                }}
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
