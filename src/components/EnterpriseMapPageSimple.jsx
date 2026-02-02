import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaArrowRight, FaTimes } from 'react-icons/fa';
import UserProfile from './UserProfile';
import CreateOrganizationUnitModal from './CreateOrganizationUnitModal';
import OrganizationLogo from '../images/OrganizationLogo.png';
import OrganizationUnitsList from './OrganizationUnitsList';
import UnitDetailsPanel from './UnitDetailsPanel';
import { getAllOrganizationUnits, deleteOrganizationUnit } from '../api/organizationUnitApi';
import { getAllWelders } from '../api/welderApi';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import '../styles/enterpriseMapPage.css';

const EnterpriseMapPageSimple = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedUnitLevel, setSelectedUnitLevel] = useState(0);
    const [expandedUnits, setExpandedUnits] = useState({});
    const [welders, setWelders] = useState([]);
    const [weldingMachines, setWeldingMachines] = useState([]);
    const [unitStats, setUnitStats] = useState({});
    const navigate = useNavigate();

    // Загружаем подразделения из API при монтировании компонента
    useEffect(() => {
        loadOrganizationUnits();
        loadWelders();
        loadWeldingMachines();
    }, []);

    // Вычисляем статистику при изменении данных
    useEffect(() => {
        if (organizationUnits.length > 0) {
            calculateStats();
        }
    }, [organizationUnits, welders, weldingMachines]);

    const loadWelders = async () => {
        try {
            const data = await getAllWelders();
            setWelders(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки сварщиков:', err);
            setWelders([]);
        }
    };

    const loadWeldingMachines = async () => {
        try {
            const data = await getAllWeldingMachines();
            setWeldingMachines(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки сварочного оборудования:', err);
            setWeldingMachines([]);
        }
    };

    // Функция для построения иерархии подразделений
    const buildHierarchy = (units) => {
        if (!units || units.length === 0) return [];

        const unitMap = new Map();
        const rootUnits = [];

        const normalizeId = (id) => {
            if (id == null) return null;
            return typeof id === 'string' ? parseInt(id) : id;
        };

        units.forEach(unit => {
            const normalizedId = normalizeId(unit.id);
            unitMap.set(normalizedId, {
                ...unit,
                id: normalizedId,
                children: []
            });
        });

        units.forEach(unit => {
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

    // Функция для подсчета всех дочерних подразделений (рекурсивно) используя иерархию
    const countChildUnits = (unitId, hierarchy) => {
        const findUnitInHierarchy = (units, targetId) => {
            for (const unit of units) {
                if (unit.id === targetId || unit.id === parseInt(targetId)) {
                    return unit;
                }
                const found = findUnitInHierarchy(unit.children || [], targetId);
                if (found) return found;
            }
            return null;
        };

        const countChildrenRecursive = (unit) => {
            if (!unit || !unit.children) return 0;
            let count = unit.children.length;
            unit.children.forEach(child => {
                count += countChildrenRecursive(child);
            });
            return count;
        };

        const unit = findUnitInHierarchy(hierarchy, unitId);
        return unit ? countChildrenRecursive(unit) : 0;
    };

    // Функция для подсчета сварщиков в подразделении и его дочерних подразделениях
    const countWeldersInUnit = (unitId, allUnits) => {
        const unit = allUnits.find(u => u.id === unitId);
        if (!unit) return 0;

        const unitIds = [unitId];
        const unitNames = [unit.name];

        // Собираем все дочерние подразделения
        const collectChildIds = (parentId) => {
            allUnits.forEach(u => {
                const parentIdValue = u.parentId || u.parent_id;
                if (parentIdValue === parentId || parentIdValue === parseInt(parentId)) {
                    unitIds.push(u.id);
                    unitNames.push(u.name);
                    collectChildIds(u.id);
                }
            });
        };
        collectChildIds(unitId);

        return welders.filter(w => {
            const welderUnitId = w.organizationUnitId || w.organizationUnit?.id;
            const welderDepartment = w.organizationUnit?.name || w.department;

            // Проверяем по ID
            if (welderUnitId && (unitIds.includes(welderUnitId) || unitIds.includes(parseInt(welderUnitId)))) {
                return true;
            }

            // Проверяем по названию
            if (welderDepartment && unitNames.includes(welderDepartment)) {
                return true;
            }

            return false;
        }).length;
    };

    // Функция для подсчета сварочного оборудования в подразделении и его дочерних подразделениях
    const countWeldingMachinesInUnit = (unitId, allUnits) => {
        const unit = allUnits.find(u => u.id === unitId);
        if (!unit) return 0;

        const unitIds = [unitId];
        const unitNames = [unit.name];

        // Собираем все дочерние подразделения
        const collectChildIds = (parentId) => {
            allUnits.forEach(u => {
                const parentIdValue = u.parentId || u.parent_id;
                if (parentIdValue === parentId || parentIdValue === parseInt(parentId)) {
                    unitIds.push(u.id);
                    unitNames.push(u.name);
                    collectChildIds(u.id);
                }
            });
        };
        collectChildIds(unitId);

        return weldingMachines.filter(m => {
            const machineUnitId = m.organizationUnitId || m.organizationUnit?.id;
            const machineDepartment = m.organizationUnit?.name || m.department;

            // Проверяем по ID
            if (machineUnitId && (unitIds.includes(machineUnitId) || unitIds.includes(parseInt(machineUnitId)))) {
                return true;
            }

            // Проверяем по названию
            if (machineDepartment && unitNames.includes(machineDepartment)) {
                return true;
            }

            return false;
        }).length;
    };

    const calculateStats = () => {
        const stats = {};
        const hierarchy = buildHierarchy(organizationUnits);
        organizationUnits.forEach(unit => {
            const unitId = unit.id;
            stats[unitId] = {
                users: 0, // Пока нет API для пользователей
                subdivisions: countChildUnits(unitId, hierarchy),
                weldingMachines: countWeldingMachinesInUnit(unitId, organizationUnits),
                welders: countWeldersInUnit(unitId, organizationUnits)
            };
        });
        setUnitStats(stats);
    };

    const loadOrganizationUnits = async () => {
        try {
            setLoading(true);
            setError('');
            const units = await getAllOrganizationUnits();
            console.log('Загружены подразделения из API:', units);
            setOrganizationUnits(units || []);
        } catch (err) {
            console.error('Ошибка загрузки подразделений:', err);
            setError('Не удалось загрузить подразделения');
            setOrganizationUnits([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (selectedUnits.length === 0) {
            alert('Выберите подразделения для удаления');
            return;
        }

        const confirmMessage = `Вы уверены, что хотите удалить ${selectedUnits.length} подразделение(й)? Это действие нельзя отменить.`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setIsDeleting(true);
            setError('');

            // Удаляем все выбранные подразделения
            const deletePromises = selectedUnits.map(unitId => deleteOrganizationUnit(unitId));
            await Promise.all(deletePromises);

            console.log('Подразделения успешно удалены');

            // Очищаем выбор и перезагружаем список
            setSelectedUnits([]);
            await loadOrganizationUnits();
        } catch (err) {
            console.error('Ошибка удаления подразделений:', err);
            setError('Не удалось удалить подразделения');
            alert('Ошибка при удалении подразделений. Попробуйте еще раз.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="enterprise-map-page">
            {/* Page Title and Controls - Same line */}
            <div className="enterprise-map-header-row">
                <h1 className="enterprise-map-page-title">Карта предприятия</h1>
                <div className="tiles-controls">
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

            {/* Tiles Section */}
            <div className="enterprise-map-tiles">
                {/* Left side tiles */}
                <div className="tiles-left">
                    <div className="action-tile search-tile">
                        <div className="search-container">
                            <input
                                type="text"
                                className="tile-search-input"
                                placeholder="Поиск"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <FaSearch className="search-icon" />
                        </div>
                    </div>
                    <div className="action-tile add-tile">
                        <button
                            className="tile-btn add-btn"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <img src={OrganizationLogo} alt="Organization" className="add-btn-icon" />
                            Добавить подразделение +
                        </button>
                    </div>
                </div>

                {/* Right side tiles */}
                <div className="tiles-right">
                    <div className="action-tile">
                        <button className="tile-btn move-btn">
                            <FaArrowRight className="btn-icon" />
                            Переместить
                        </button>
                    </div>
                    <div className="action-tile">
                        <button
                            className="tile-btn delete-btn"
                            onClick={handleDelete}
                            disabled={isDeleting || selectedUnits.length === 0}
                        >
                            <FaTimes className="btn-icon" />
                            Удалить
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Organization Units List */}
            <div className="enterprise-map-content">
                {loading ? (
                    <div style={{ padding: '20px', color: '#F9F3FD' }}>Загрузка подразделений...</div>
                ) : error ? (
                    <div style={{ padding: '20px', color: '#ff6b6b' }}>{error}</div>
                ) : (
                    <>
                        <OrganizationUnitsList
                            units={organizationUnits}
                            selectedUnits={selectedUnits}
                            onSelectionChange={setSelectedUnits}
                            selectedUnitId={selectedUnit?.id}
                            onUnitClick={(unit, level) => {
                                setSelectedUnit(unit);
                                setSelectedUnitLevel(level || 0);
                            }}
                            onExpandedUnitsChange={(expanded) => {
                                setExpandedUnits(expanded);
                            }}
                            onEdit={(unit) => {
                                console.log('Edit unit:', unit);
                                // TODO: Implement edit functionality
                            }}
                            unitStats={unitStats}
                        />
                        {selectedUnit && (
                            <UnitDetailsPanel selectedUnit={selectedUnit} level={selectedUnitLevel} />
                        )}
                        {/* Секция "Неорганизованные" отображается после панелей */}
                        <div className="org-units-list-container">
                            <table className="org-units-table">
                                <tbody>
                                <tr className="org-units-divider">
                                    <td colSpan="5"></td>
                                </tr>
                                <tr className="org-units-section-header">
                                    <td colSpan="5">Неорганизованные</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Create Organization Unit Modal */}
            <CreateOrganizationUnitModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                existingUnits={organizationUnits}
                onSuccess={async () => {
                    // После успешного создания перезагружаем список из API
                    await loadOrganizationUnits();
                }}
            />
        </div>
    );
};

export default EnterpriseMapPageSimple;

