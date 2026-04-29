import React, { Suspense, lazy, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaSearch, FaArrowRight, FaTimes, FaArrowLeft } from 'react-icons/fa';
import OrganizationLogo from '../images/OrganizationLogo.png';
import ResourcesLogo from '../images/ResourcesLogo.png';
import WelderIcon from '../images/WelderIcon.png';
import OrganizationUnitsList from './OrganizationUnitsList';
import UnitDetailsPanel from './UnitDetailsPanel';
import { getRoles, getAllUserAccounts } from '../api/userAccountApi';
import { getAllOrganizationUnits, getOrganizationUnitsByOrganization, deleteOrganizationUnit } from '../api/organizationUnitApi';
import { getAllWelders } from '../api/welderApi';
import { getAllWeldingMachines, createWeldingMachine } from '../api/weldingMachineApi';
import { api } from '../services/api';
import '../styles/enterpriseMapPage.css';

const CreateOrganizationUnitModal = lazy(() => import('./CreateOrganizationUnitModal'));
const MoveOrganizationUnitModal = lazy(() => import('./MoveOrganizationUnitModal'));
const AddEquipmentModal = lazy(() => import('./AddEquipmentModal'));

const ENTERPRISE_MAP_EXPANDED_KEY = 'enterpriseMapExpandedUnits';
const ENTERPRISE_MAP_SELECTED_UNIT_KEY = 'enterpriseMapSelectedUnit';

function loadExpandedUnitsFromStorage() {
    try {
        const raw = localStorage.getItem(ENTERPRISE_MAP_EXPANDED_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        // Нормализуем ключи к числам для надёжного совпадения с unit.id в дереве
        const result = {};
        Object.keys(parsed).forEach((k) => {
            const num = /^\d+$/.test(k) ? parseInt(k, 10) : k;
            result[num] = !!parsed[k];
        });
        return result;
    } catch (_) {}
    return {};
}

function saveExpandedUnitsToStorage(obj) {
    try {
        if (!obj || typeof obj !== 'object') return;
        localStorage.setItem(ENTERPRISE_MAP_EXPANDED_KEY, JSON.stringify(obj));
    } catch (_) {}
}

function loadSelectedUnitFromStorage() {
    try {
        const raw = localStorage.getItem(ENTERPRISE_MAP_SELECTED_UNIT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const id = parsed?.selectedUnitId;
        if (id == null) return null;
        const numId = typeof id === 'string' && /^\d+$/.test(id) ? parseInt(id, 10) : id;
        return {
            selectedUnitId: numId,
            selectedUnitLevel: typeof parsed.selectedUnitLevel === 'number' ? parsed.selectedUnitLevel : 0
        };
    } catch (_) {}
    return null;
}

function saveSelectedUnitToStorage(selectedUnitId, selectedUnitLevel) {
    try {
        if (selectedUnitId == null) {
            localStorage.removeItem(ENTERPRISE_MAP_SELECTED_UNIT_KEY);
        } else {
            localStorage.setItem(ENTERPRISE_MAP_SELECTED_UNIT_KEY, JSON.stringify({ selectedUnitId, selectedUnitLevel }));
        }
    } catch (_) {}
}

function EnterpriseMapPageSimpleContent({ initialUser = null }) {
    const { organizationId } = useParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddEquipmentModalOpen, setIsAddEquipmentModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedUnitLevel, setSelectedUnitLevel] = useState(0);
    const [expandedUnits, setExpandedUnits] = useState(() => loadExpandedUnitsFromStorage());
    const [welders, setWelders] = useState([]);
    const [weldingMachines, setWeldingMachines] = useState([]);
    const [userAccounts, setUserAccounts] = useState([]);
    /** Аппарат/сварщик для перемещения (галочка в панели). Подразделение — по выбранной строке дерева (selectedUnit). */
    const [moveSelection, setMoveSelection] = useState(null);
    const [isAlloyAdmin, setIsAlloyAdmin] = useState(false);
    const [allUnitsForAdminMove, setAllUnitsForAdminMove] = useState([]);
    const [activeOrganizationsForAdminMove, setActiveOrganizationsForAdminMove] = useState([]);
    const [unitStats, setUnitStats] = useState({});
    const navigate = useNavigate();
    const hasRestoredSelectionRef = useRef(false);

    // Загружаем подразделения при монтировании (название предприятия — в оболочке страницы)
    useEffect(() => {
        setMoveSelection(null);
        loadOrganizationUnits();
        loadWelders();
        loadWeldingMachines();
        loadUserAccounts();
    }, [organizationId]);

    useEffect(() => {
        const detectAdminAlloyScope = async () => {
            try {
                const currentUser = initialUser ?? (await api.getCurrentUser());
                const rolesData = await getRoles();
                const roleId = currentUser?.userRoleId ?? currentUser?.userRole?.id;
                const role = (Array.isArray(rolesData) ? rolesData : []).find(
                    (r) => String(r.id) === String(roleId)
                );
                const roleName = String(role?.name || '').toUpperCase();
                const adminAlloy =
                    roleName.includes('ADMIN') &&
                    (roleName.includes('ALLOY') || roleName.includes('ЭЛЛОЙ'));
                setIsAlloyAdmin(adminAlloy);
                if (adminAlloy) {
                    const [units, organizations] = await Promise.all([
                        getAllOrganizationUnits(),
                        api.get('/organizations'),
                    ]);
                    setAllUnitsForAdminMove(Array.isArray(units) ? units : []);
                    setActiveOrganizationsForAdminMove(Array.isArray(organizations) ? organizations : []);
                } else {
                    setAllUnitsForAdminMove([]);
                    setActiveOrganizationsForAdminMove([]);
                }
            } catch (_) {
                setIsAlloyAdmin(false);
                setAllUnitsForAdminMove([]);
                setActiveOrganizationsForAdminMove([]);
            }
        };
        detectAdminAlloyScope();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizationId, initialUser]);

    // Вычисляем статистику при изменении данных; при пустом списке сбрасываем
    useEffect(() => {
        if (organizationUnits.length > 0) {
            calculateStats();
        } else {
            setUnitStats({});
        }
    }, [organizationUnits, welders, weldingMachines, userAccounts]);

    // Сохраняем развернутые подразделения в localStorage при изменении
    useEffect(() => {
        saveExpandedUnitsToStorage(expandedUnits);
    }, [expandedUnits]);

    // Сохраняем выбранное подразделение (для unit-details-content) при изменении
    useEffect(() => {
        saveSelectedUnitToStorage(selectedUnit?.id ?? null, selectedUnitLevel);
    }, [selectedUnit?.id, selectedUnitLevel]);

    // Восстанавливаем выбранное подразделение и развёрнутые узлы после первой загрузки списка
    useEffect(() => {
        if (organizationUnits.length === 0 || hasRestoredSelectionRef.current) return;
        hasRestoredSelectionRef.current = true;
        const hierarchy = buildHierarchy(organizationUnits);
        const saved = loadSelectedUnitFromStorage();
        if (!saved || saved.selectedUnitId == null) return;
        const found = findUnitAndLevelInHierarchy(hierarchy, saved.selectedUnitId);
        if (!found) return;
        setSelectedUnit(found.unit);
        setSelectedUnitLevel(found.level);
        // Разворачиваем всех предков выбранного узла, чтобы путь к нему был виден
        const ancestorIds = getAncestorIds(hierarchy, saved.selectedUnitId);
        if (ancestorIds && ancestorIds.length > 0) {
            setExpandedUnits((prev) => {
                const next = { ...prev };
                ancestorIds.forEach((id) => { next[id] = true; });
                next[found.unit.id] = true;
                return next;
            });
        }
    }, [organizationUnits]);

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

    const loadUserAccounts = async () => {
        try {
            const data = await getAllUserAccounts();
            setUserAccounts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки пользователей:', err);
            setUserAccounts([]);
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

    // Поиск подразделения в иерархии по id с возвратом уровня (для восстановления выбора)
    const findUnitAndLevelInHierarchy = (units, targetId, level = 0) => {
        if (!units || !units.length) return null;
        const norm = (id) => id == null ? null : (typeof id === 'string' ? parseInt(id, 10) : id);
        const target = norm(targetId);
        for (const unit of units) {
            if (norm(unit.id) === target) return { unit, level };
            const found = findUnitAndLevelInHierarchy(unit.children || [], target, level + 1);
            if (found) return found;
        }
        return null;
    };

    // Собрать id всех предков узла (путь от корня до родителя узла) для разворота дерева
    const getAncestorIds = (units, targetId, ancestorIds = []) => {
        if (!units || !units.length) return null;
        const norm = (id) => id == null ? null : (typeof id === 'string' ? parseInt(id, 10) : id);
        const target = norm(targetId);
        for (const unit of units) {
            if (norm(unit.id) === target) return ancestorIds;
            const found = getAncestorIds(unit.children || [], target, [...ancestorIds, unit.id]);
            if (found) return found;
        }
        return null;
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

        // Собираем все дочерние подразделения (рекурсивно)
        const norm = (id) => (id == null ? null : typeof id === 'string' ? parseInt(id, 10) : id);
        const collectChildIds = (parentId) => {
            const normParentId = norm(parentId);
            allUnits.forEach(u => {
                const parentIdValue = u.parentId ?? u.parent_id ?? (u.parentDepartment?.id != null ? u.parentDepartment.id : null);
                if (norm(parentIdValue) === normParentId) {
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

    // Пользователи (учётные записи), привязанные к подразделению и вложенным — по тем же правилам, что сварщики
    const countUsersInUnit = (unitId, allUnits) => {
        const unit = allUnits.find((u) => String(u.id) === String(unitId));
        if (!unit) return 0;

        const unitIds = [unitId];
        const unitNames = [unit.name];

        const norm = (id) => (id == null ? null : typeof id === 'string' ? parseInt(id, 10) : id);
        const collectChildIds = (parentId) => {
            const normParentId = norm(parentId);
            allUnits.forEach((u) => {
                const parentIdValue = u.parentId ?? u.parent_id ?? (u.parentDepartment?.id != null ? u.parentDepartment.id : null);
                if (norm(parentIdValue) === normParentId) {
                    unitIds.push(u.id);
                    unitNames.push(u.name);
                    collectChildIds(u.id);
                }
            });
        };
        collectChildIds(unitId);

        return userAccounts.filter((user) => {
            const status = String(user.status || '').toLowerCase();
            if (status === 'deleted') return false;

            const userUnitId = user.organizationUnitId ?? user.organizationUnit?.id;
            const userUnitName = user.organizationUnit?.name;

            if (userUnitId != null) {
                const uid = norm(userUnitId);
                if (unitIds.some((id) => norm(id) === uid)) return true;
            }
            if (userUnitName && unitNames.includes(userUnitName)) return true;

            return false;
        }).length;
    };

    // Функция для подсчета сварочного оборудования в подразделении и его дочерних подразделениях
    const countWeldingMachinesInUnit = (unitId, allUnits) => {
        const unit = allUnits.find(u => u.id === unitId);
        if (!unit) return 0;

        const unitIds = [unitId];
        const unitNames = [unit.name];

        // Собираем все дочерние подразделения (рекурсивно)
        const norm = (id) => (id == null ? null : typeof id === 'string' ? parseInt(id, 10) : id);
        const collectChildIds = (parentId) => {
            const normParentId = norm(parentId);
            allUnits.forEach(u => {
                const parentIdValue = u.parentId ?? u.parent_id ?? (u.parentDepartment?.id != null ? u.parentDepartment.id : null);
                if (norm(parentIdValue) === normParentId) {
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
                users: countUsersInUnit(unitId, organizationUnits),
                subdivisions: countChildUnits(unitId, hierarchy),
                weldingMachines: countWeldingMachinesInUnit(unitId, organizationUnits), // с учётом вложенных
                welders: countWeldersInUnit(unitId, organizationUnits) // с учётом вложенных
            };
        });
        setUnitStats(stats);
    };

    // Поиск: показываем подразделения, в названии которых есть запрос, и всех их предков (путь в дереве)
    const filteredOrganizationUnits = useMemo(() => {
        const term = (searchTerm || '').trim().toLowerCase();
        if (!term) return organizationUnits;
        const norm = (id) => (id == null ? null : typeof id === 'string' ? parseInt(id, 10) : id);
        const matching = organizationUnits.filter(
            (u) => (u.name || '').toLowerCase().includes(term)
        );
        if (matching.length === 0) return organizationUnits;
        const parentMap = new Map();
        organizationUnits.forEach((u) => {
            const pid = u.parentId ?? u.parent_id ?? u.parentDepartment?.id;
            if (pid != null) parentMap.set(norm(u.id), norm(pid));
        });
        const visibleIds = new Set(matching.map((u) => norm(u.id)));
        matching.forEach((u) => {
            let id = norm(u.id);
            while (parentMap.has(id)) {
                id = parentMap.get(id);
                visibleIds.add(id);
            }
        });
        return organizationUnits.filter((u) => visibleIds.has(norm(u.id)));
    }, [organizationUnits, searchTerm]);

    // При поиске автоматически раскрываем путь до каждого совпадения
    useEffect(() => {
        const term = (searchTerm || '').trim().toLowerCase();
        if (!term || organizationUnits.length === 0) return;
        const norm = (id) => (id == null ? null : typeof id === 'string' ? parseInt(id, 10) : id);
        const matching = organizationUnits.filter((u) => (u.name || '').toLowerCase().includes(term));
        if (matching.length === 0) return;
        const parentMap = new Map();
        organizationUnits.forEach((u) => {
            const pid = u.parentId ?? u.parent_id ?? u.parentDepartment?.id;
            if (pid != null) parentMap.set(norm(u.id), norm(pid));
        });
        const toExpand = {};
        matching.forEach((u) => {
            let id = norm(u.id);
            toExpand[id] = true;
            while (parentMap.has(id)) {
                id = parentMap.get(id);
                toExpand[id] = true;
            }
        });
        setExpandedUnits((prev) => ({ ...prev, ...toExpand }));
    }, [searchTerm, organizationUnits]);

    const loadOrganizationUnits = async () => {
        try {
            setLoading(true);
            setError('');
            const units = organizationId
                ? await getOrganizationUnitsByOrganization(organizationId)
                : await getAllOrganizationUnits();
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

    const weldersForEquipmentModal = useMemo(() => {
        if (!Array.isArray(organizationUnits) || organizationUnits.length === 0) return [];
        const unitIds = new Set(organizationUnits.map((u) => String(u.id)));
        const unitNames = new Set(organizationUnits.map((u) => u.name).filter(Boolean));
        return (welders || []).filter((w) => {
            const ouId = w.organizationUnit?.id ?? w.organizationUnitId;
            if (ouId != null && unitIds.has(String(ouId))) return true;
            const name = w.organizationUnit?.name || w.department;
            return name && unitNames.has(name);
        });
    }, [welders, organizationUnits]);

    const machinesForMoveModal = useMemo(() => {
        if (!Array.isArray(organizationUnits) || organizationUnits.length === 0) return [];
        const unitIds = new Set(organizationUnits.map((u) => String(u.id)));
        const unitNames = new Set(organizationUnits.map((u) => u.name).filter(Boolean));
        return (weldingMachines || []).filter((m) => {
            const ouId = m.organizationUnit?.id ?? m.organizationUnitId;
            if (ouId != null && unitIds.has(String(ouId))) return true;
            const name = m.organizationUnit?.name || m.department;
            return name && unitNames.has(name);
        });
    }, [weldingMachines, organizationUnits]);

    const unitsForMoveModal = useMemo(() => {
        if (!isAlloyAdmin) return organizationUnits;
        const activeOrgIds = new Set(
            (activeOrganizationsForAdminMove || [])
                .map((o) => o?.id)
                .filter((id) => id != null)
                .map(String)
        );
        if (activeOrgIds.size === 0) return [];
        return (allUnitsForAdminMove || []).filter((u) => {
            const orgId = u?.organization?.id ?? u?.organizationId ?? u?.organization_id ?? null;
            return orgId != null && activeOrgIds.has(String(orgId));
        });
    }, [isAlloyAdmin, allUnitsForAdminMove, activeOrganizationsForAdminMove, organizationUnits]);

    const handleUnitCheckboxSelectionChange = (nextSelectedUnits) => {
        // Нельзя одновременно выбирать типы: выбор подразделения снимает выбор аппарата/сварщика
        if (Array.isArray(nextSelectedUnits) && nextSelectedUnits.length > 0) {
            setMoveSelection(null);
        }
        setSelectedUnits(nextSelectedUnits);
    };

    const handleMoveSelectionChange = (nextMoveSelection) => {
        // Нельзя одновременно выбирать типы: выбор аппарата/сварщика снимает чекбоксы подразделений
        if (nextMoveSelection && nextMoveSelection.id != null) {
            setSelectedUnits([]);
        }
        setMoveSelection(nextMoveSelection);
    };

    /** Цель для модалки «Переместить»: сначала аппарат/сварщик из панели, иначе подразделение по клику в дереве */
    const moveTargetForModal = useMemo(() => {
        if (moveSelection?.id != null) return moveSelection;
        if (selectedUnit?.id != null) return { kind: 'unit', id: selectedUnit.id };
        return null;
    }, [moveSelection, selectedUnit]);

    const openAddEquipmentModal = () => {
        setIsAddEquipmentModalOpen(true);
    };

    const openMoveModal = () => {
        if (!moveTargetForModal) {
            alert(
                'Выберите подразделение в дереве (клик по строке) или отметьте аппарат или сварщика в панели справа.'
            );
            return;
        }
        setIsMoveModalOpen(true);
    };

    const handleSaveEquipmentFromModal = async (data) => {
        const convertDateToISO = (dateString) => {
            if (!dateString) return null;
            if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
                return `${dateString}T00:00:00`;
            }
            if (/^\d{2}\.\d{2}\.\d{4}/.test(dateString)) {
                const [day, month, year] = dateString.split('.');
                return `${year}-${month}-${day}T00:00:00`;
            }
            try {
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}T00:00:00`;
                }
            } catch (_) {}
            return null;
        };

        let deviceModel = '';
        const modelLower = (data.model || '').toLowerCase().trim();
        if (modelLower === 'core' || modelLower === 'core pulse' || modelLower.includes('core')) {
            deviceModel = 'CORE';
        } else if (modelLower === 'блок мониторинга' || modelLower === 'monitoring_block' || modelLower.includes('мониторинг')) {
            deviceModel = 'MONITORING_BLOCK';
        } else {
            const upperModel = (data.model || '').toUpperCase().trim();
            if (upperModel === 'CORE' || upperModel === 'MONITORING_BLOCK') {
                deviceModel = upperModel;
            } else {
                deviceModel = data.model || '';
            }
        }

        const trimmedName = (data.name || '').trim();
        const newErrors = {};
        if (!trimmedName) newErrors.name = 'Это поле обязательно';
        if (!deviceModel) newErrors.deviceModel = 'Выберите модель устройства';
        let mac = (data.macAddress || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (!mac || mac.length !== 12) {
            newErrors.mac = 'MAC-адрес должен содержать 12 символов (только 0-9, A-F)';
        }
        const orgUnit = organizationUnits.find((unit) => unit.name === data.department);
        if (!orgUnit) {
            newErrors.organizationUnit = 'Выберите подразделение';
        }
        if (!data.commissioningDate) {
            newErrors.commissionDate = 'Укажите дату ввода в эксплуатацию';
        } else {
            const commissionDateObj = new Date(data.commissioningDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (commissionDateObj > today) {
                newErrors.commissionDate = 'Дата ввода в эксплуатацию не может быть в будущем';
            }
        }

        const selectedUnitId = orgUnit?.id;
        if (trimmedName && selectedUnitId) {
            const duplicateName = (weldingMachines || []).some((machine) => {
                const machineUnitId = machine.organizationUnit?.id || machine.organizationUnitId;
                return machineUnitId === selectedUnitId &&
                    (machine.name || '').trim().toLowerCase() === trimmedName.toLowerCase();
            });
            if (duplicateName) {
                newErrors.name = 'В этом подразделении уже есть аппарат с таким названием';
            }
        }

        const maintenanceIntervalValue = data.maintenanceInterval !== '' && data.maintenanceInterval != null
            ? Number(data.maintenanceInterval)
            : null;
        if (maintenanceIntervalValue != null && (Number.isNaN(maintenanceIntervalValue) || maintenanceIntervalValue < 0)) {
            newErrors.maintenanceInterval = 'Значение должно быть неотрицательным числом';
        }

        const maintenanceReminderValue = data.maintenanceReminderHours !== '' && data.maintenanceReminderHours != null
            ? Number(data.maintenanceReminderHours)
            : null;
        if (maintenanceReminderValue != null && (Number.isNaN(maintenanceReminderValue) || maintenanceReminderValue < 0)) {
            newErrors.maintenanceReminderHours = 'Укажите корректное количество часов';
        }

        if (Object.keys(newErrors).length) {
            const validationError = new Error('Ошибки валидации');
            validationError.errors = newErrors;
            throw validationError;
        }

        const commissionDateValue = convertDateToISO(data.commissioningDate);
        const lastServiceValue = convertDateToISO(data.lastMaintenanceDate);

        const organizationUnitForApi = orgUnit
            ? { id: orgUnit.id, name: orgUnit.name || '' }
            : null;

        const machineData = {
            name: trimmedName,
            deviceModel,
            mac,
            commissionDate: commissionDateValue,
            manufactureYear: null,
            lastService: lastServiceValue,
            serialNumber: data.serialNumber || '',
            inventoryNumber: data.inventoryNumber || '',
            organizationUnit: organizationUnitForApi,
            weldingMachineType: null,
            assignedWelders: data.approvedWelders || [],
            maintenanceInterval: maintenanceIntervalValue,
            maintenanceRegulation: maintenanceIntervalValue,
            userServiceNotifiedBeforeHours: maintenanceReminderValue,
        };

        const isCoreSelected = deviceModel === 'CORE';
        if (isCoreSelected) {
            const corePayload = {
                options: {
                    gasControl: Boolean(data.options?.gasControl),
                    rfid: Boolean(data.options?.rfid),
                    bvo: Boolean(data.options?.bvo),
                },
                wtModuleMac: '',
                maintenance: {
                    intervalHours: maintenanceIntervalValue,
                    lastServiceDate: lastServiceValue,
                    technicianName: '',
                    technicianPass: '',
                },
                responsibleUserId: null,
                allowedWelders: data.approvedWelders || [],
                maintenanceReminderHours: maintenanceReminderValue,
            };
            machineData.modules = JSON.stringify(corePayload);
        } else {
            machineData.modules = null;
        }

        try {
            await createWeldingMachine(machineData);
        } catch (err) {
            const apiError = new Error(err.message || 'Ошибка сохранения оборудования');
            apiError.errors = { api: err.message || 'Ошибка сохранения оборудования' };
            throw apiError;
        }
        alert('Оборудование успешно создано');
        await loadWeldingMachines();
        setIsAddEquipmentModalOpen(false);
    };

    return (
        <>
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
                    <div className="action-tile add-tile enterprise-map-extra-tile">
                        <button
                            type="button"
                            className="tile-btn add-btn"
                            onClick={openAddEquipmentModal}
                        >
                            <img src={ResourcesLogo} alt="" className="add-btn-icon" />
                            Добавить аппарат
                        </button>
                    </div>
                    <div className="action-tile add-tile enterprise-map-extra-tile">
                        <button
                            type="button"
                            className="tile-btn add-btn"
                            onClick={() => navigate('/welders/add')}
                        >
                            <img src={WelderIcon} alt="" className="add-btn-icon" />
                            Добавить сварщика
                        </button>
                    </div>
                </div>

                {/* Right side tiles */}
                <div className="tiles-right">
                    <div className="action-tile">
                        <button
                            type="button"
                            className="tile-btn move-btn"
                            onClick={openMoveModal}
                        >
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
                    <div className="enterprise-map-empty-state" style={{ color: '#ff6b6b' }}>{error}</div>
                ) : (
                    <>
                        <div className="org-units-list-container enterprise-map-units-container">
                            {filteredOrganizationUnits.length === 0 ? (
                                <div className="enterprise-map-empty-state">
                                    Подразделений пока нет. Нажмите «Добавить подразделение» выше, чтобы создать первое.
                                </div>
                            ) : (
                                <OrganizationUnitsList
                                    units={filteredOrganizationUnits}
                                    selectedUnits={selectedUnits}
                                    onSelectionChange={handleUnitCheckboxSelectionChange}
                                    selectedUnitId={selectedUnit?.id}
                                    expandedUnits={expandedUnits}
                                    onUnitClick={(unit, level) => {
                                        setSelectedUnit(unit);
                                        setSelectedUnitLevel(level || 0);
                                    }}
                                    onExpandedUnitsChange={setExpandedUnits}
                                    onEdit={(unit) => {
                                        console.log('Edit unit:', unit);
                                        // TODO: Implement edit functionality
                                    }}
                                    unitStats={unitStats}
                                />
                            )}
                        </div>
                        {selectedUnit && (
                            <UnitDetailsPanel
                                selectedUnit={selectedUnit}
                                level={selectedUnitLevel}
                                moveSelection={moveSelection}
                                onMoveSelectionChange={handleMoveSelectionChange}
                            />
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
            {isCreateModalOpen && (
                <Suspense fallback={null}>
                    <CreateOrganizationUnitModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        existingUnits={organizationUnits}
                        organizationId={organizationId ?? null}
                        onSuccess={async () => {
                            await loadOrganizationUnits();
                        }}
                    />
                </Suspense>
            )}
            {isMoveModalOpen && (
                <Suspense fallback={null}>
                    <MoveOrganizationUnitModal
                        isOpen={isMoveModalOpen}
                        onClose={() => setIsMoveModalOpen(false)}
                        moveSelection={moveTargetForModal}
                        existingUnits={unitsForMoveModal}
                        machines={machinesForMoveModal}
                        welders={weldersForEquipmentModal}
                        onSuccess={async () => {
                            setMoveSelection(null);
                            setSelectedUnits([]);
                            await Promise.all([loadOrganizationUnits(), loadWelders(), loadWeldingMachines()]);
                        }}
                    />
                </Suspense>
            )}
            {isAddEquipmentModalOpen && (
                <Suspense fallback={null}>
                    <AddEquipmentModal
                        isOpen={isAddEquipmentModalOpen}
                        onClose={() => setIsAddEquipmentModalOpen(false)}
                        welders={weldersForEquipmentModal}
                        organizationUnits={organizationUnits}
                        onSave={handleSaveEquipmentFromModal}
                    />
                </Suspense>
            )}
        </>
    );
}

export default EnterpriseMapPageSimpleContent;

