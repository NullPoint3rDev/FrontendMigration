import React, { useState, useEffect } from 'react';
import '../styles/weldersPage.css';
import { useNavigate } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import UserProfile from '../components/UserProfile';
import WelderIcon from '../images/WelderIcon.png';
import {
    getAllWelders,
    createWelder,
    updateWelder,
    deleteWelder
} from '../api/welderApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';

// Данные теперь загружаются с API сервера



function WeldersPage() {
    const [welders, setWelders] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [errors, setErrors] = useState({});
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [organizationUnitFilter, setOrganizationUnitFilter] = useState([]); // Массив выбранных подразделений
    const [hazardousGroupsFilter, setHazardousGroupsFilter] = useState([]); // Массив выбранных групп опасных произв. объектов
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
    const [expandedFilters, setExpandedFilters] = useState({
        department: true,
        hazardousGroups: true
    });
    const [selectedWelders, setSelectedWelders] = useState([]);
    const navigate = useNavigate();


    // Load welders from API only
    useEffect(() => {
        loadWelders();
        loadOrganizationUnits();
    }, []);


    const openAddModal = () => {
        setEditData({
            name: '',
            employeeId: '',
            grade: '',
            position: '',
            organizationUnit: null,
            admissionType: '',
            status: 'offline',
        });
        setErrors({});
        setModalOpen(true);
    };

    const handleEdit = (welder) => {
        setEditData({
            id: welder.id,
            name: welder.name || welder.fullName || '',
            employeeId: welder.employeeId || welder.tabNumber || '',
            grade: welder.grade || '',
            position: welder.position || '',
            organizationUnit: welder.organizationUnit || (welder.department ? { name: welder.department } : null),
            admissionType: welder.admissionType || '',
            status: welder.status || 'offline',
        });
        setErrors({});
        setModalOpen(true);
    };

    // Загрузка сварщиков с сервера
    const loadWelders = async () => {
        try {
            const data = await getAllWelders();
            console.log('welders from API:', data);
            setWelders(Array.isArray(data) ? data : []);
        } catch (err) {
            setErrors({ api: 'Ошибка загрузки сварщиков: ' + err.message });
            setWelders([]);
        }
    };

    // Загрузка подразделений
    const loadOrganizationUnits = async () => {
        try {
            const data = await getAllOrganizationUnits();
            setOrganizationUnits(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Ошибка загрузки подразделений:', err);
            setOrganizationUnits([]);
        }
    };

    useEffect(() => {
        loadWelders();
        loadOrganizationUnits();
    }, []);

    // Функция для форматирования статуса сварщика
    const getWelderStatusDisplay = (welder) => {
        const status = welder.status || 'offline';
        switch (status) {
            case 'online':
            case 'В сети':
                return { text: 'В сети', className: 'online', color: '#0FA626' };
            case 'offline':
            case 'Не в сети':
                return { text: 'Не в сети', className: 'offline', color: '#818EA1' };
            case 'blocked':
            case 'Заблокирован':
                return { text: 'Заблокирован', className: 'blocked', color: '#445569' };
            default:
                return { text: 'Не в сети', className: 'offline', color: '#818EA1' };
        }
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
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
                    case 'name': return (item.name || item.fullName || '').toLowerCase();
                    case 'employeeId': return (item.employeeId || item.tabNumber || '').toLowerCase();
                    case 'grade': return (item.grade || '').toLowerCase();
                    case 'position': return (item.position || '').toLowerCase();
                    case 'unit': return (item.organizationUnit?.name || item.department || '').toLowerCase();
                    case 'admissionType': return (item.admissionType || '').toLowerCase();
                    case 'status': return (item.status || '').toLowerCase();
                    default: return '';
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

    const handleSave = async (e) => {
        e.preventDefault();
        const newErrors = {};
        const trimmedName = (editData.name || '').trim();
        if (!trimmedName) {
            newErrors.name = 'Это поле обязательно';
        }

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        try {
            const welderData = {
                id: editData.id,
                name: trimmedName,
                employeeId: editData.employeeId || '',
                grade: editData.grade || '',
                position: editData.position || '',
                organizationUnit: editData.organizationUnit,
                admissionType: editData.admissionType || '',
                status: editData.status || 'offline',
            };

            if (!editData.id) {
                delete welderData.id;
            }

            if (editData.id) {
                await updateWelder(editData.id, welderData);
                alert('Сварщик успешно обновлен');
            } else {
                await createWelder(welderData);
                alert('Сварщик успешно создан');
            }
            await loadWelders();
            closeModal();
        } catch (err) {
            console.error('Ошибка сохранения сварщика:', err);
            setErrors({ api: err.message || 'Ошибка сохранения сварщика' });
        }
    };

    // Delete handler
    const handleDelete = async () => {
        if (selectedWelders.length === 0) {
            alert('Выберите сварщиков для удаления');
            return;
        }

        const confirmMessage = `Вы уверены, что хотите удалить ${selectedWelders.length} сварщик(ов)?`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            const deletePromises = selectedWelders.map(id => deleteWelder(id));
            await Promise.all(deletePromises);
            setSelectedWelders([]);
            await loadWelders();
            alert('Сварщики успешно удалены');
        } catch (err) {
            console.error('Ошибка удаления сварщиков:', err);
            alert('Ошибка удаления сварщиков: ' + err.message);
        }
    };

    const navigateToWelderProfile = (welderId) => {
        if (welderId) {
            navigate(`/welders/${welderId}`);
        }
    };

    const handleWelderSelect = (welderId, checked) => {
        if (checked) {
            setSelectedWelders([...selectedWelders, welderId]);
        } else {
            setSelectedWelders(selectedWelders.filter(id => id !== welderId));
        }
    };

    const toggleFilter = (filterName) => {
        setExpandedFilters(prev => ({
            ...prev,
            [filterName]: !prev[filterName]
        }));
    };

    const getFilteredWelders = (applySort = true) => {
        let filtered = welders;

        // Фильтр по подразделению
        if (organizationUnitFilter.length > 0) {
            if (organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__') {
                filtered = [];
            } else {
                filtered = filtered.filter(item => {
                    const unitName = item.organizationUnit?.name || item.department || '';
                    return organizationUnitFilter.includes(unitName);
                });
            }
        }

        // Фильтр по группам опасных произв. объектов
        if (hazardousGroupsFilter.length > 0) {
            if (hazardousGroupsFilter.length === 1 && hazardousGroupsFilter[0] === '__NONE__') {
                filtered = [];
            } else {
                filtered = filtered.filter(item => {
                    // Здесь нужно будет адаптировать под реальную структуру данных
                    const itemGroups = item.hazardousGroups || [];
                    return hazardousGroupsFilter.some(filterGroup =>
                        itemGroups.includes(filterGroup)
                    );
                });
            }
        }

        // Фильтр по поисковому запросу
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                (item.name || item.fullName || '').toLowerCase().includes(term) ||
                (item.employeeId || item.tabNumber || '').toLowerCase().includes(term) ||
                (item.position || '').toLowerCase().includes(term)
            );
        }

        return applySort ? getSorted(filtered) : filtered;
    };


    // Подготовка данных для фильтров
    const buildDepartmentTree = () => {
        const tree = [];
        const rootUnits = organizationUnits.filter(unit => !unit.parentId && !unit.parent_id);

        rootUnits.forEach(root => {
            const children = organizationUnits.filter(unit =>
                (unit.parentId === root.id || unit.parent_id === root.id)
            );
            if (children.length > 0) {
                tree.push({
                    id: root.id,
                    label: root.name,
                    children: children.map(child => ({
                        id: child.id,
                        label: child.name
                    }))
                });
            } else {
                tree.push({
                    id: root.id,
                    label: root.name
                });
            }
        });
        return tree;
    };

    const departments = buildDepartmentTree();


    // Группы опасных произв. объектов (примерная структура, нужно будет адаптировать под реальные данные)
    const hazardousGroups = [
        { id: 'all', label: 'Все' },
        { id: 'PTO', label: 'ПТО', children: [] },
        { id: 'KO', label: 'КО', children: [
                { id: 'KO1', label: 'Группа 1' },
                { id: 'KO2', label: 'Группа 2' },
                { id: 'KO3', label: 'Группа 3' },
                { id: 'KO4', label: 'Группа 4' },
                { id: 'KO5', label: 'Группа 5' }
            ]},
        { id: 'GO', label: 'ГО', children: [] },
        { id: 'NGDO', label: 'НГДО', children: [] },
        { id: 'MO', label: 'МО', children: [] },
        { id: 'OKHNVP', label: 'ОХНВП', children: [] },
        { id: 'GDO', label: 'ГДО', children: [] },
        { id: 'OTOG', label: 'ОТОГ', children: [] },
        { id: 'SK', label: 'СК', children: [] },
        { id: 'KSM', label: 'КСМ', children: [] }
    ];

    return (
        <div className="welders-page">
            {/* Page Title and Controls - Same line */}
            <div className="welders-page-header-row">
                <h1 className="welders-page-title-header">Сварщики</h1>
                <div className="welders-tiles-controls">
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
                            onClick={() => toggleFilter('department')}
                        >
                            <span>Подразделение</span>
                            <span className="filter-arrow">{expandedFilters.department ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.department && (() => {
                            // Получаем все подразделения (родительские и дочерние) для проверки "Все"
                            const allDepartmentLabels = [];
                            departments.forEach(dept => {
                                allDepartmentLabels.push(dept.label);
                                if (dept.children) {
                                    dept.children.forEach(child => {
                                        allDepartmentLabels.push(child.label);
                                    });
                                }
                            });
                            const isNoneSelected = organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__';
                            const allSelected = (organizationUnitFilter.length === 0 ||
                                organizationUnitFilter.length === allDepartmentLabels.length) && !isNoneSelected;
                            const showAllChecked = organizationUnitFilter.length === 0 && !isNoneSelected; // Если пусто - показываем все как выбранные

                            return (
                                <div className="filter-tile-content">
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Выбираем все
                                                    setOrganizationUnitFilter(allDepartmentLabels);
                                                } else {
                                                    // При снятии галочки с активного "Все" - сбрасываем все галочки
                                                    setOrganizationUnitFilter(['__NONE__']);
                                                }
                                            }}
                                        />
                                        <span>Все</span>
                                    </label>
                                    {departments.map(dept => (
                                        <div key={dept.id} className="filter-option">
                                            {dept.children ? (
                                                <>
                                                    <label className="filter-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={showAllChecked || organizationUnitFilter.includes(dept.label)}
                                                            onChange={(e) => {
                                                                const willBeChecked = e.target.checked;
                                                                const isNoneSelected = organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__';

                                                                if (isNoneSelected) {
                                                                    // Если было "__NONE__", удаляем его и добавляем выбранный элемент
                                                                    if (willBeChecked) {
                                                                        setOrganizationUnitFilter([dept.label]);
                                                                    }
                                                                } else if (organizationUnitFilter.length === 0) {
                                                                    // Если массив пустой (все выбрано)
                                                                    if (willBeChecked) {
                                                                        // Ставим галочку - ничего не делаем, все уже выбрано
                                                                        return;
                                                                    } else {
                                                                        // Снимаем галочку - выбираем все кроме текущего
                                                                        const allExceptCurrent = allDepartmentLabels.filter(label => label !== dept.label);
                                                                        setOrganizationUnitFilter(allExceptCurrent);
                                                                    }
                                                                } else {
                                                                    // Если массив не пустой
                                                                    if (willBeChecked) {
                                                                        // Добавляем в фильтр
                                                                        if (!organizationUnitFilter.includes(dept.label)) {
                                                                            setOrganizationUnitFilter(prev => [...prev, dept.label]);
                                                                        }
                                                                    } else {
                                                                        // Убираем из фильтра
                                                                        const newFilter = organizationUnitFilter.filter(label => label !== dept.label);
                                                                        setOrganizationUnitFilter(newFilter);
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <span>{dept.label}</span>
                                                    </label>
                                                    <div className="filter-sub-options">
                                                        {dept.children.map(child => (
                                                            <label key={child.id} className="filter-checkbox sub">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={showAllChecked || organizationUnitFilter.includes(child.label)}
                                                                    onChange={(e) => {
                                                                        const willBeChecked = e.target.checked;
                                                                        const isNoneSelected = organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__';

                                                                        if (isNoneSelected) {
                                                                            // Если было "__NONE__", удаляем его и добавляем выбранный элемент
                                                                            if (willBeChecked) {
                                                                                setOrganizationUnitFilter([child.label]);
                                                                            }
                                                                        } else if (organizationUnitFilter.length === 0) {
                                                                            // Если массив пустой (все выбрано)
                                                                            if (willBeChecked) {
                                                                                // Ставим галочку - ничего не делаем, все уже выбрано
                                                                                return;
                                                                            } else {
                                                                                // Снимаем галочку - выбираем все кроме текущего
                                                                                const allExceptCurrent = allDepartmentLabels.filter(label => label !== child.label);
                                                                                setOrganizationUnitFilter(allExceptCurrent);
                                                                            }
                                                                        } else {
                                                                            // Если массив не пустой
                                                                            if (willBeChecked) {
                                                                                // Добавляем в фильтр
                                                                                if (!organizationUnitFilter.includes(child.label)) {
                                                                                    setOrganizationUnitFilter(prev => [...prev, child.label]);
                                                                                }
                                                                            } else {
                                                                                // Убираем из фильтра
                                                                                const newFilter = organizationUnitFilter.filter(label => label !== child.label);
                                                                                setOrganizationUnitFilter(newFilter);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                <span>{child.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <label className="filter-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={showAllChecked || organizationUnitFilter.includes(dept.label)}
                                                        onChange={(e) => {
                                                            const willBeChecked = e.target.checked;
                                                            const isNoneSelected = organizationUnitFilter.length === 1 && organizationUnitFilter[0] === '__NONE__';

                                                            if (isNoneSelected) {
                                                                // Если было "__NONE__", удаляем его и добавляем выбранный элемент
                                                                if (willBeChecked) {
                                                                    setOrganizationUnitFilter([dept.label]);
                                                                }
                                                            } else if (organizationUnitFilter.length === 0) {
                                                                // Если массив пустой (все выбрано)
                                                                if (willBeChecked) {
                                                                    // Ставим галочку - ничего не делаем, все уже выбрано
                                                                    return;
                                                                } else {
                                                                    // Снимаем галочку - выбираем все кроме текущего
                                                                    const allExceptCurrent = allDepartmentLabels.filter(label => label !== dept.label);
                                                                    setOrganizationUnitFilter(allExceptCurrent);
                                                                }
                                                            } else {
                                                                // Если массив не пустой
                                                                if (willBeChecked) {
                                                                    // Добавляем в фильтр
                                                                    if (!organizationUnitFilter.includes(dept.label)) {
                                                                        setOrganizationUnitFilter(prev => [...prev, dept.label]);
                                                                    }
                                                                } else {
                                                                    // Убираем из фильтра
                                                                    const newFilter = organizationUnitFilter.filter(label => label !== dept.label);
                                                                    setOrganizationUnitFilter(newFilter);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <span>{dept.label}</span>
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    <div className="filter-tile">
                        <button
                            className="filter-tile-header"
                            onClick={() => toggleFilter('hazardousGroups')}
                        >
                            <span>Группы опасных произв. объектов:</span>
                            <span className="filter-arrow">{expandedFilters.hazardousGroups ? '▾' : '▸'}</span>
                        </button>
                        {expandedFilters.hazardousGroups && (() => {
                            const allGroupIds = hazardousGroups.filter(g => g.id !== 'all').flatMap(g =>
                                g.children ? [g.id, ...g.children.map(c => c.id)] : [g.id]
                            );
                            const isNoneSelected = hazardousGroupsFilter.length === 1 && hazardousGroupsFilter[0] === '__NONE__';
                            const isAllSelected = (hazardousGroupsFilter.length === 0 || hazardousGroupsFilter.length === allGroupIds.length) && !isNoneSelected;
                            const showAllChecked = hazardousGroupsFilter.length === 0 && !isNoneSelected;

                            return (
                                <div className="filter-tile-content">
                                    <label className="filter-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setHazardousGroupsFilter(allGroupIds);
                                                } else {
                                                    setHazardousGroupsFilter(['__NONE__']);
                                                }
                                            }}
                                        />
                                        <span>Все</span>
                                    </label>
                                    {hazardousGroups.filter(g => g.id !== 'all').map(group => {
                                        const hasChildren = group.children && group.children.length > 0;
                                        const isGroupChecked = showAllChecked || hazardousGroupsFilter.includes(group.id);

                                        return (
                                            <div key={group.id}>
                                                <label className="filter-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={isGroupChecked}
                                                        onChange={(e) => {
                                                            const willBeChecked = e.target.checked;
                                                            const isNoneSelected = hazardousGroupsFilter.length === 1 && hazardousGroupsFilter[0] === '__NONE__';

                                                            if (isNoneSelected) {
                                                                if (willBeChecked) {
                                                                    setHazardousGroupsFilter([group.id]);
                                                                }
                                                            } else if (hazardousGroupsFilter.length === 0) {
                                                                if (!willBeChecked) {
                                                                    const allExceptCurrent = allGroupIds.filter(id => id !== group.id);
                                                                    setHazardousGroupsFilter(allExceptCurrent);
                                                                }
                                                            } else {
                                                                if (willBeChecked) {
                                                                    if (!hazardousGroupsFilter.includes(group.id)) {
                                                                        setHazardousGroupsFilter(prev => [...prev, group.id]);
                                                                    }
                                                                } else {
                                                                    const newFilter = hazardousGroupsFilter.filter(id => id !== group.id);
                                                                    setHazardousGroupsFilter(newFilter);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <span>{group.label}</span>
                                                </label>
                                                {hasChildren && (
                                                    <div className="filter-sub-options">
                                                        {group.children.map(child => {
                                                            const isChildChecked = showAllChecked || hazardousGroupsFilter.includes(child.id);
                                                            return (
                                                                <label key={child.id} className="filter-checkbox sub">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChildChecked}
                                                                        onChange={(e) => {
                                                                            const willBeChecked = e.target.checked;
                                                                            const isNoneSelected = hazardousGroupsFilter.length === 1 && hazardousGroupsFilter[0] === '__NONE__';

                                                                            if (isNoneSelected) {
                                                                                if (willBeChecked) {
                                                                                    setHazardousGroupsFilter([child.id]);
                                                                                }
                                                                            } else if (hazardousGroupsFilter.length === 0) {
                                                                                if (!willBeChecked) {
                                                                                    const allExceptCurrent = allGroupIds.filter(id => id !== child.id);
                                                                                    setHazardousGroupsFilter(allExceptCurrent);
                                                                                }
                                                                            } else {
                                                                                if (willBeChecked) {
                                                                                    if (!hazardousGroupsFilter.includes(child.id)) {
                                                                                        setHazardousGroupsFilter(prev => [...prev, child.id]);
                                                                                    }
                                                                                } else {
                                                                                    const newFilter = hazardousGroupsFilter.filter(id => id !== child.id);
                                                                                    setHazardousGroupsFilter(newFilter);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <span>{child.label}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="equipment-content-column">
                    <div className="content-header">
                        <div className="add-device-tile">
                            <button className="add-device-btn" onClick={() => navigate('/welders/add')}>
                                <span className="add-icon">+</span>
                                <span>Добавить сварщика</span>
                            </button>
                        </div>
                        <div className="naks-register-tile">
                            <button className="naks-register-btn" onClick={() => {}}>
                                Открыть реестр НАКС
                            </button>
                        </div>
                        <div className="welders-stats-tile">
                            <div className="stat-item">
                                <img src={WelderIcon} alt="Welder" className="stat-icon" />
                                <span>Всего: {welders.length}</span>
                            </div>
                            <div className="stat-item">
                                <img
                                    src={WelderIcon}
                                    alt="Welder"
                                    className={`stat-icon ${selectedWelders.length > 0 ? 'stat-icon-selected' : ''}`}
                                />
                                <span>Выбрано: {selectedWelders.length}</span>
                            </div>
                        </div>
                        <button className="delete-btn" onClick={handleDelete} disabled={selectedWelders.length === 0}>
                            <span>×</span>
                            <span>Удалить</span>
                        </button>
                    </div>

                    <div className="welders-table-container">
                        <table className="welders-table">
                            <thead>
                            <tr>
                                <th></th>
                                <th onClick={() => toggleSort('name')}>
                                    <span>Сварщик</span>
                                    <span className="sort-arrow">▾</span>
                                </th>
                                <th onClick={() => toggleSort('employeeId')}>
                                    <span>Таб. №</span>
                                    <span className="sort-arrow">▾</span>
                                </th>
                                <th onClick={() => toggleSort('grade')}>
                                    <span>Разряд</span>
                                    <span className="sort-arrow">▾</span>
                                </th>
                                <th onClick={() => toggleSort('position')}>
                                    <span>Должность</span>
                                    <span className="sort-arrow">▾</span>
                                </th>
                                <th onClick={() => toggleSort('unit')}>
                                    <span>Подразделение</span>
                                    <span className="sort-arrow">▾</span>
                                </th>
                                <th onClick={() => toggleSort('admissionType')}>
                                    <span>Вид допуска</span>
                                    <span className="sort-arrow">▾</span>
                                </th>
                                <th onClick={() => toggleSort('status')}>
                                    <span>Статус</span>
                                    <span className="sort-arrow">▾</span>
                                </th>
                            </tr>
                            </thead>
                            <tbody>
                            {getFilteredWelders().map((welder) => {
                                const statusDisplay = getWelderStatusDisplay(welder);
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
                                        <td className="welder-name-cell">{welder.name || welder.fullName || 'Без имени'}</td>
                                        <td>{welder.employeeId || welder.tabNumber || 'Не указан'}</td>
                                        <td>{welder.grade || 'Не указан'}</td>
                                        <td>{welder.position || 'Не указана'}</td>
                                        <td>{welder.organizationUnit?.name || welder.department || 'Не указано'}</td>
                                        <td>{welder.admissionType || 'Не указан'}</td>
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
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Простое модальное окно для добавления/редактирования сварщика */}
            {modalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editData.id ? 'Редактировать сварщика' : 'Добавить сварщика'}</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>ФИО *</label>
                                <input
                                    type="text"
                                    value={editData.name || ''}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    required
                                />
                                {errors.name && <span className="error">{errors.name}</span>}
                            </div>
                            <div className="form-group">
                                <label>Табельный номер</label>
                                <input
                                    type="text"
                                    value={editData.employeeId || ''}
                                    onChange={(e) => setEditData({ ...editData, employeeId: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Разряд</label>
                                <input
                                    type="text"
                                    value={editData.grade || ''}
                                    onChange={(e) => setEditData({ ...editData, grade: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Должность</label>
                                <input
                                    type="text"
                                    value={editData.position || ''}
                                    onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Подразделение</label>
                                <select
                                    value={editData.organizationUnit?.id || ''}
                                    onChange={(e) => {
                                        const unit = organizationUnits.find(u => u.id === parseInt(e.target.value));
                                        setEditData({ ...editData, organizationUnit: unit || null });
                                    }}
                                >
                                    <option value="">Выберите подразделение</option>
                                    {organizationUnits.map(unit => (
                                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Вид допуска</label>
                                <input
                                    type="text"
                                    value={editData.admissionType || ''}
                                    onChange={(e) => setEditData({ ...editData, admissionType: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Статус</label>
                                <select
                                    value={editData.status || 'offline'}
                                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                >
                                    <option value="online">В сети</option>
                                    <option value="offline">Не в сети</option>
                                    <option value="blocked">Заблокирован</option>
                                </select>
                            </div>
                            {errors.api && <div className="error">{errors.api}</div>}
                            <div className="modal-footer">
                                <button type="button" onClick={closeModal}>Отмена</button>
                                <button type="submit">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WeldersPage;
