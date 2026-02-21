import React, { useState, useEffect, useMemo } from 'react';
import { FaChevronRight, FaChevronDown, FaCheck } from 'react-icons/fa';
import { updateWelder } from '../api/welderApi';
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

const MoveWeldersModal = ({ isOpen, onClose, selectedWelderIds = [], welders = [], organizationUnits = [], onSuccess }) => {
    const [targetUnitId, setTargetUnitId] = useState(null);
    const [toDropdownOpen, setToDropdownOpen] = useState(false);
    const [expandedTo, setExpandedTo] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const hierarchy = useMemo(() => buildHierarchy(organizationUnits), [organizationUnits]);

    const selectedWelders = useMemo(
        () => welders.filter((w) => selectedWelderIds.includes(w.id) || selectedWelderIds.includes(normalizeId(w.id))),
        [welders, selectedWelderIds]
    );

    useEffect(() => {
        if (isOpen) {
            setTargetUnitId(null);
            setToDropdownOpen(false);
            setError('');
        }
    }, [isOpen]);

    const toggleToExpand = (unitId) => {
        setExpandedTo((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
    };

    const renderToOption = (unit, level = 0) => {
        const hasChildren = unit.children && unit.children.length > 0;
        const isExpanded = expandedTo[unit.id];
        const indent = level * 32;
        const isSelected = targetUnitId != null && normalizeId(targetUnitId) === normalizeId(unit.id);
        return (
            <React.Fragment key={unit.id}>
                <div
                    className={`move-modal-unit-option ${isSelected ? 'selected' : ''}`}
                    style={{ marginLeft: `${indent}px`, paddingLeft: '12px' }}
                    onClick={() => {
                        setTargetUnitId(unit.id);
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
        if (selectedWelders.length === 0) {
            setError('Нет выбранных сварщиков');
            return;
        }
        const targetId = targetUnitId == null ? null : normalizeId(targetUnitId);
        const targetUnit = organizationUnits.find((u) => normalizeId(u.id) === targetId);
        const departmentName = targetUnit?.name ?? '';
        if (!departmentName) {
            setError('Выберите подразделение «В»');
            return;
        }
        setLoading(true);
        try {
            for (const welder of selectedWelders) {
                const payload = {
                    name: welder.name || welder.fullName || '',
                    department: departmentName,
                    status: welder.status,
                    position: welder.position || null,
                    employeeId: welder.employeeId || null,
                    grade: welder.grade || null
                };
                await updateWelder(welder.id, payload);
            }
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Ошибка перемещения сварщиков:', err);
            const msg =
                err.response?.data?.message ?? err.response?.data?.error ?? err.message ?? 'Не удалось переместить сварщиков';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTargetUnitId(null);
        setError('');
        onClose();
    };

    const toLabel =
        targetUnitId != null
            ? organizationUnits.find((u) => normalizeId(u.id) === normalizeId(targetUnitId))?.name ?? 'Выберите подразделение'
            : 'Выберите подразделение';

    if (!isOpen) return null;

    return (
        <div className="create-org-unit-modal-overlay" onClick={handleClose}>
            <div className="create-org-unit-modal-content move-org-unit-modal-content" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="create-org-unit-modal-close" onClick={handleClose}>
                    ×
                </button>
                <h2 className="create-org-unit-modal-title">Переместить сварщиков</h2>

                <form onSubmit={handleSubmit} className="create-org-unit-form">
                    <div className="create-org-unit-form-field">
                        <label>Выбрано сварщиков: {selectedWelders.length}</label>
                    </div>

                    <div className="create-org-unit-form-field">
                        <label>В:</label>
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

export default MoveWeldersModal;
