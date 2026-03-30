import React, { useState, useRef } from 'react';
import { FaChevronRight, FaChevronDown, FaUser, FaEdit } from 'react-icons/fa';
import OrganizationLogo from '../images/OrganizationLogo.png';
import ResourcesLogo from '../images/ResourcesLogo.png';
import WelderIcon from '../images/WelderIcon.png';
import '../styles/organizationUnitsList.css';

const OrganizationUnitsList = ({
                                   units,
                                   onEdit,
                                   selectedUnits,
                                   onSelectionChange,
                                   onUnitClick,
                                   selectedUnitId,
                                   expandedUnits: expandedUnitsProp,
                                   onExpandedUnitsChange,
                                   selectedUnitLevel,
                                   unitStats,
                               }) => {
    const [internalExpanded, setInternalExpanded] = useState({});
    const expandedUnits = expandedUnitsProp !== undefined ? expandedUnitsProp : internalExpanded;

    // Компонент Tooltip для всплывающих подсказок
    const Tooltip = ({ text, children }) => {
        const tooltipRef = useRef(null);
        const wrapperRef = useRef(null);

        const handleMouseEnter = () => {
            if (tooltipRef.current && wrapperRef.current) {
                const rect = wrapperRef.current.getBoundingClientRect();
                const tooltipWidth = 300;
                const tooltipHeight = tooltipRef.current.offsetHeight || 100;
                const spacing = 8;

                let top = rect.top - tooltipHeight - spacing;
                let left = rect.left + rect.width / 2;

                // Проверка границ экрана
                if (top < 0) {
                    top = rect.bottom + spacing;
                }
                if (left - tooltipWidth / 2 < 0) {
                    left = tooltipWidth / 2;
                } else if (left + tooltipWidth / 2 > window.innerWidth) {
                    left = window.innerWidth - tooltipWidth / 2;
                }

                tooltipRef.current.style.top = `${top}px`;
                tooltipRef.current.style.left = `${left}px`;
            }
        };

        return (
            <div
                className="tooltip-wrapper"
                ref={wrapperRef}
                onMouseEnter={handleMouseEnter}
            >
                {children}
                <span className="tooltip-text" ref={tooltipRef}>{text}</span>
            </div>
        );
    };

    const toggleExpand = (unitId) => {
        const newExpanded = {
            ...expandedUnits,
            [unitId]: !expandedUnits[unitId]
        };
        if (expandedUnitsProp !== undefined) {
            onExpandedUnitsChange?.(newExpanded);
        } else {
            setInternalExpanded(newExpanded);
            onExpandedUnitsChange?.(newExpanded);
        }
    };

    // Построение иерархии
    const buildHierarchy = (units) => {
        if (!units || units.length === 0) return [];

        const unitMap = new Map();
        const rootUnits = [];

        // Нормализуем ID для единообразия (все в числа)
        const normalizeId = (id) => {
            if (id == null) return null;
            return typeof id === 'string' ? parseInt(id) : id;
        };

        // Создаем карту всех подразделений с пустыми массивами children
        units.forEach(unit => {
            const normalizedId = normalizeId(unit.id);
            unitMap.set(normalizedId, {
                ...unit,
                id: normalizedId,
                children: []
            });
        });

        // Строим дерево
        units.forEach(unit => {
            const normalizedId = normalizeId(unit.id);
            const unitNode = unitMap.get(normalizedId);

            // Проверяем все возможные варианты: parentId, parent_id, parentDepartment (объект)
            let parentIdValue = null;
            if (unit.parentId != null) {
                parentIdValue = unit.parentId;
            } else if (unit.parent_id != null) {
                parentIdValue = unit.parent_id;
            } else if (unit.parentDepartment != null && unit.parentDepartment.id != null) {
                parentIdValue = unit.parentDepartment.id;
            }

            // Если есть parentId и родитель существует в карте, добавляем к родителю
            if (parentIdValue != null) {
                const normalizedParentId = normalizeId(parentIdValue);
                if (unitMap.has(normalizedParentId)) {
                    const parent = unitMap.get(normalizedParentId);
                    parent.children.push(unitNode);
                } else {
                    // Родитель не найден - считаем корневым
                    rootUnits.push(unitNode);
                }
            } else {
                // Если нет parentId - это корневой элемент
                rootUnits.push(unitNode);
            }
        });

        return rootUnits;
    };

    const renderUnit = (unit, level = 0, isLast = false, parentHasMoreSiblings = false, parentId = null) => {
        const isExpanded = expandedUnits[unit.id];
        const hasChildren = unit.children && unit.children.length > 0;
        // Увеличиваем отступ для каждого уровня вложенности (как в ReportsPage)
        // Каждый уровень добавляет 32px отступа для визуализации иерархии (как в ReportsPage)
        const indent = level * 32;
        const isChild = level > 0;

        return (
            <React.Fragment key={unit.id}>
                <tr
                    className={`org-unit-row ${isChild ? 'org-unit-child' : ''} ${isLast ? 'org-unit-last-child' : ''}`}
                    data-level={level}
                    data-has-children={hasChildren}
                    data-is-expanded={isExpanded}
                    data-is-last={isLast}
                    style={isChild ? { '--indent-width': `${indent}px` } : {}}
                    onClick={() => {
                        if (onUnitClick) {
                            onUnitClick(unit, level);
                        }
                    }}
                >
                    <td
                        className={isChild ? 'org-unit-child-cell' : ''}
                        data-is-last={isLast}
                        data-level={level}
                    >
                        <div className="org-unit-cell" style={{ marginLeft: `${indent}px` }}>
                            <input
                                type="checkbox"
                                className="org-unit-checkbox"
                                title="Удаление"
                                checked={selectedUnits && selectedUnits.includes(unit.id)}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    if (onSelectionChange) {
                                        const isChecked = e.target.checked;
                                        if (isChecked) {
                                            onSelectionChange([...(selectedUnits || []), unit.id]);
                                        } else {
                                            onSelectionChange((selectedUnits || []).filter(id => id !== unit.id));
                                        }
                                    }
                                }}
                            />
                            {hasChildren && (
                                <button
                                    className="org-unit-expand-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpand(unit.id);
                                    }}
                                >
                                    {isExpanded ? (
                                        <FaChevronDown className="expand-icon" />
                                    ) : (
                                        <FaChevronRight className="expand-icon" />
                                    )}
                                </button>
                            )}
                            {!hasChildren && <span className="org-unit-spacer" />}
                            <span className={`org-unit-name ${selectedUnitId === unit.id ? 'org-unit-name-active' : 'org-unit-name-inactive'}`}>
                                {unit.name}
                            </span>
                        </div>
                    </td>
                    <td>
                        <Tooltip text="Количество пользователей в подразделении и во вложенных">
                            <div className="org-unit-stat-tile">
                                <FaUser className="stat-icon" />
                                <span className="stat-number">{unitStats[unit.id]?.users || 0}</span>
                            </div>
                        </Tooltip>
                    </td>
                    <td>
                        <Tooltip text="Количество дочерних подразделений">
                            <div className="org-unit-stat-tile">
                                <img src={OrganizationLogo} alt="Organization" className="stat-icon-img" />
                                <span className="stat-number">{unitStats[unit.id]?.subdivisions || 0}</span>
                            </div>
                        </Tooltip>
                    </td>
                    <td>
                        <Tooltip text="Количество сварочных аппаратов в подразделении и во вложенных">
                            <div className="org-unit-stat-tile">
                                <img src={ResourcesLogo} alt="Resources" className="stat-icon-img" />
                                <span className="stat-number">{unitStats[unit.id]?.weldingMachines || 0}</span>
                            </div>
                        </Tooltip>
                    </td>
                    <td>
                        <Tooltip text="Количество сварщиков в подразделении и во вложенных">
                            <div className="org-unit-stat-tile">
                                <img src={WelderIcon} alt="Welder" className="stat-icon-img" />
                                <span className="stat-number">{unitStats[unit.id]?.welders || 0}</span>
                            </div>
                        </Tooltip>
                    </td>
                    <td className="org-unit-edit-cell">
                        <button
                            className="org-unit-edit-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit && onEdit(unit);
                            }}
                        >
                            <FaEdit className="edit-icon" />
                        </button>
                    </td>
                </tr>
                {hasChildren && isExpanded && unit.children.map((child, index) => {
                    const isLastChild = index === unit.children.length - 1;
                    const parentHasMoreSiblings = !isLast; // Если родитель не последний, значит есть еще сиблинги
                    return renderUnit(child, level + 1, isLastChild, parentHasMoreSiblings, unit.id);
                })}
            </React.Fragment>
        );
    };

    const hierarchy = buildHierarchy(units);
    // Неорганизованные - это те, у которых нет parentId, но они не попали в корневые
    // (на самом деле все корневые уже в hierarchy, так что unorganizedUnits будет пустым)
    // Но оставим для будущего использования
    const unorganizedUnits = [];

    return (
        <div className="org-units-list-container">
            <table className="org-units-table">
                <tbody>
                {hierarchy.map((unit, index) => {
                    const isLast = index === hierarchy.length - 1;
                    return renderUnit(unit, 0, isLast, false, null);
                })}
                </tbody>
            </table>
        </div>
    );
};

export default OrganizationUnitsList;

