import React, { useState, useEffect, useRef } from 'react';
import { plantMapApi } from '../api/plantMapApi';
import '../styles/equipmentPage.css';

const EnterpriseMapPage = () => {
    const [equipment, setEquipment] = useState([]);
    const [availableEquipment, setAvailableEquipment] = useState([]);
    const [availableUnits, setAvailableUnits] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [currentPlantMap, setCurrentPlantMap] = useState(null);
    const [parentUnits, setParentUnits] = useState([]); // Родительские подразделения
    const [selectedParentUnitId, setSelectedParentUnitId] = useState(null); // Выбранное родительское подразделение
    
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [viewMode, setViewMode] = useState('map'); // 'map' или 'list'
    const [filterStatus, setFilterStatus] = useState('all');
    const [editMode, setEditMode] = useState(false);
    const [drawingWorkshop, setDrawingWorkshop] = useState(false);
    const [workshopModalOpen, setWorkshopModalOpen] = useState(false);
    const [newWorkshop, setNewWorkshop] = useState({ name: '', description: '', color: '#4A90E2' });
    const [draggedEquipment, setDraggedEquipment] = useState(null);
    const [mapScale, setMapScale] = useState(1);
    const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
    const [isDraggingMap, setIsDraggingMap] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    
    // Состояния загрузки и ошибок
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadingEquipment, setLoadingEquipment] = useState(false);
    
    const mapRef = useRef(null);
    const drawingRef = useRef(null);

    // Загрузка данных при монтировании компонента
    useEffect(() => {
        loadInitialData();
    }, []);

    // Загрузка дочерних подразделений при изменении родительского подразделения
    useEffect(() => {
        if (selectedParentUnitId) {
            console.log('useEffect: selectedParentUnitId изменился на:', selectedParentUnitId);
            loadAvailableUnits(1, selectedParentUnitId);
        }
    }, [selectedParentUnitId]);

    const loadInitialData = async () => {
        try {
            console.log('loadInitialData: Начинаем загрузку данных');
            setLoading(true);
            setError(null);
            
            // Загружаем родительские подразделения для организации ID = 1
            console.log('loadInitialData: Загружаем родительские подразделения');
            await loadParentUnits(1);
            
            console.log('loadInitialData: Загружаем оборудование');
            await loadAvailableEquipment(1);
            
            // Загружаем карту предприятия
            console.log('loadInitialData: Загружаем карту предприятия');
            await loadPlantMap();
            
        } catch (error) {
            console.error('Ошибка загрузки начальных данных:', error);
            setError('Не удалось загрузить данные. Проверьте подключение к серверу.');
        } finally {
            setLoading(false);
        }
    };


    const loadPlantMap = async () => {
        try {
            console.log('loadPlantMap: Загружаем карту для организации: 1');
            setLoading(true);
            const plantMap = await plantMapApi.getDefaultPlantMap(1);
            console.log('loadPlantMap: Получена карта:', plantMap);
            
            if (plantMap) {
                setCurrentPlantMap(plantMap);
                setEquipment(plantMap.elements || []);
                setWorkshops(plantMap.workshops || []);
                console.log('loadPlantMap: Карта установлена, элементов:', plantMap.elements?.length || 0, 'цехов:', plantMap.workshops?.length || 0);
            } else {
                // Если карта не найдена, создаем новую
                console.log('loadPlantMap: Карта не найдена, создаем новую');
                await createDefaultPlantMap();
            }
        } catch (error) {
            console.error('Ошибка загрузки карты предприятия:', error);
            setError('Не удалось загрузить карту предприятия.');
        } finally {
            setLoading(false);
        }
    };

    const createDefaultPlantMap = async () => {
        try {
            const newPlantMap = await plantMapApi.createPlantMap({
                organizationId: 1,
                name: 'Основная карта предприятия',
                description: 'Схематичная карта основного производственного комплекса',
                width: 1200,
                height: 800,
                isDefault: true
            });
            
            setCurrentPlantMap(newPlantMap);
            setEquipment([]);
            setWorkshops([]);
        } catch (error) {
            console.error('Ошибка создания карты предприятия:', error);
            setError('Не удалось создать карту предприятия.');
        }
    };

    const loadParentUnits = async (organizationId) => {
        console.log('loadParentUnits вызвана с organizationId:', organizationId);
        if (!organizationId) {
            console.log('organizationId не задан, пропускаем загрузку родительских подразделений');
            return;
        }
        
        try {
            console.log('Начинаем загрузку родительских подразделений для организации:', organizationId);
            const units = await plantMapApi.getAvailableOrganizationUnits(organizationId);
            console.log('Получены все подразделения:', units);
            
            // Фильтруем только родительские подразделения (без parentId или с parentId = null)
            const parentUnits = units.filter(unit => !unit.parentId);
            console.log('Родительские подразделения:', parentUnits);
            setParentUnits(parentUnits);
            
            // Автоматически выбираем первое родительское подразделение
            if (parentUnits.length > 0 && !selectedParentUnitId) {
                const firstParentId = parentUnits[0].id;
                setSelectedParentUnitId(firstParentId);
                console.log('Автоматически выбрано родительское подразделение:', parentUnits[0].name);
                
                // Сразу загружаем дочерние подразделения для выбранного родителя
                const childUnits = units.filter(unit => unit.parentId === firstParentId);
                console.log('Автоматически загружены дочерние подразделения:', childUnits);
                setAvailableUnits(childUnits);
            }
        } catch (error) {
            console.error('Ошибка загрузки родительских подразделений:', error);
            setParentUnits([]);
        }
    };

    const loadAvailableUnits = async (organizationId, parentUnitId) => {
        console.log('loadAvailableUnits вызвана с organizationId:', organizationId, 'parentUnitId:', parentUnitId);
        if (!organizationId) {
            console.log('organizationId не задан, пропускаем загрузку подразделений');
            return;
        }
        
        try {
            console.log('Начинаем загрузку подразделений для организации:', organizationId);
            const units = await plantMapApi.getAvailableOrganizationUnits(organizationId);
            console.log('Получены все подразделения:', units);
            
            // Если выбран родитель, показываем только его дочерние подразделения
            if (parentUnitId) {
                const childUnits = units.filter(unit => unit.parentId === parentUnitId);
                console.log('Дочерние подразделения для родителя', parentUnitId, ':', childUnits);
                setAvailableUnits(childUnits);
            } else {
                // Если родитель не выбран, показываем пустой список
                console.log('Родительское подразделение не выбрано, показываем пустой список');
                setAvailableUnits([]);
            }
        } catch (error) {
            console.error('Ошибка загрузки подразделений:', error);
            setAvailableUnits([]);
        }
    };

    const loadAvailableEquipment = async (organizationId) => {
        console.log('loadAvailableEquipment вызвана с organizationId:', organizationId);
        if (!organizationId) {
            console.log('organizationId не задан, пропускаем загрузку оборудования');
            return;
        }
        
        try {
            console.log('Начинаем загрузку доступного оборудования для организации:', organizationId);
            setLoadingEquipment(true);
            const equipment = await plantMapApi.getAvailableWeldingMachines(organizationId);
            console.log('Получено оборудование:', equipment);
            setAvailableEquipment(equipment);
        } catch (error) {
            console.error('Ошибка загрузки доступного оборудования:', error);
            
            // Временное решение: если backend не готов, используем моковые данные
            if (error.message === 'Something went wrong' || error.message.includes('404')) {
                console.log('Backend API для доступного оборудования еще не готов, используем моковые данные');
                const mockEquipment = [
                    { id: 1, name: 'Сварочный аппарат T2', type: 'welding_machine', status: 'active' },
                    { id: 2, name: 'Сварочный аппарат MC-500', type: 'welding_machine', status: 'active' },
                    { id: 3, name: 'Сварочный аппарат MX Pulse', type: 'welding_machine', status: 'maintenance' },
                ];
                setAvailableEquipment(mockEquipment);
            } else {
                // В случае других ошибок используем пустой массив
                console.log('Используем пустой массив из-за ошибки:', error.message);
                setAvailableEquipment([]);
            }
        } finally {
            setLoadingEquipment(false);
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active':
                return 'Активен';
            case 'maintenance':
                return 'Обслуживание';
            case 'error':
                return 'Ошибка';
            case 'inactive':
                return 'Неактивен';
            default:
                return 'Неизвестно';
        }
    };

    const getEquipmentTypeLabel = (type) => {
        switch (type) {
            case 'welding_machine':
                return 'Сварочный аппарат';
            case 'monitoring_block':
                return 'Блок мониторинга';
            default:
                return 'Оборудование';
        }
    };

    const handleEquipmentClick = (equipmentItem) => {
        if (!editMode) {
            setSelectedEquipment(equipmentItem);
            setModalOpen(true);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedEquipment(null);
    };

    const closeWorkshopModal = () => {
        setWorkshopModalOpen(false);
        setNewWorkshop({ name: '', description: '', color: '#4A90E2' });
    };

    const handleDragStart = (e, equipment) => {
        if (editMode) {
            setDraggedEquipment(equipment);
            e.dataTransfer.effectAllowed = 'move';
        }
    };

    const handleDragOver = (e) => {
        if (editMode) {
            e.preventDefault();
            e.dataTransfer.effectAllowed = 'move';
        }
    };

    const handleDrop = async (e) => {
        if (editMode) {
            e.preventDefault();
            const rect = mapRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - mapOffset.x) / mapScale;
            const y = (e.clientY - rect.top - mapOffset.y) / mapScale;

            // Получаем данные из dataTransfer
            const data = e.dataTransfer.getData('text/plain');
            if (!data) return;

            try {
                const itemData = JSON.parse(data);
                console.log('handleDrop: Получены данные для размещения:', itemData);

                if (itemData.type === 'organization_unit') {
                    // Создаем новый цех на основе подразделения
                    const newWorkshop = {
                        name: itemData.name,
                        description: itemData.description || `Подразделение: ${itemData.name}`,
                        positionX: x,
                        positionY: y,
                        width: 200,
                        height: 100,
                        color: '#4A90E2',
                        borderColor: '#2E5C8A',
                        opacity: 0.3,
                        organizationUnitId: itemData.id
                    };

                    console.log('handleDrop: Создаем цех из подразделения:', newWorkshop);
                    
                    // Добавляем цех через API
                    const createdWorkshop = await plantMapApi.addWorkshopToMap(1, newWorkshop);
                    console.log('handleDrop: Цех создан:', createdWorkshop);
                    
                    // Обновляем локальное состояние
                    setWorkshops(prev => [...prev, createdWorkshop]);
                    
                } else if (draggedEquipment) {
                    // Обработка оборудования (существующая логика)
                    const updatedElement = await plantMapApi.updateElementPosition(
                        draggedEquipment.id, 
                        x, 
                        y
                    );
                    
                    const updatedEquipment = equipment.map(item => 
                        item.id === draggedEquipment.id 
                            ? { ...item, coordinates: { x, y } }
                            : item
                    );
                    setEquipment(updatedEquipment);
                }
                
            } catch (error) {
                console.error('Ошибка при размещении элемента:', error);
                setError('Не удалось разместить элемент на карте.');
            }
            
            setDraggedEquipment(null);
        }
    };

    const handleMapMouseDown = (e) => {
        if (editMode && drawingWorkshop) {
            const rect = mapRef.current.getBoundingClientRect();
            const startX = (e.clientX - rect.left - mapOffset.x) / mapScale;
            const startY = (e.clientY - rect.top - mapOffset.y) / mapScale;
            
            drawingRef.current = { startX, startY, endX: startX, endY: startY };
        } else if (editMode) {
            setIsDraggingMap(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMapMouseMove = (e) => {
        if (editMode && drawingWorkshop && drawingRef.current) {
            const rect = mapRef.current.getBoundingClientRect();
            const endX = (e.clientX - rect.left - mapOffset.x) / mapScale;
            const endY = (e.clientY - rect.top - mapOffset.y) / mapScale;
            
            drawingRef.current.endX = endX;
            drawingRef.current.endY = endY;
        } else if (editMode && isDraggingMap) {
            const deltaX = e.clientX - lastMousePos.x;
            const deltaY = e.clientY - lastMousePos.y;
            
            setMapOffset(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMapMouseUp = async () => {
        if (editMode && drawingWorkshop && drawingRef.current) {
            const { startX, startY, endX, endY } = drawingRef.current;
            
            try {
                const workshopData = {
                    name: `Цех ${workshops.length + 1}`,
                    description: 'Новый цех',
                    positionX: Math.min(startX, endX),
                    positionY: Math.min(startY, endY),
                    width: Math.abs(endX - startX),
                    height: Math.abs(endY - startY),
                    color: newWorkshop.color,
                    borderColor: '#2E5C8A',
                    opacity: 0.3
                };
                
                // Создаем цех через API
                const newWorkshopData = await plantMapApi.addWorkshopToMap(
                    currentPlantMap.id, 
                    workshopData
                );
                
                // Обновляем локальное состояние
                setWorkshops(prev => [...prev, newWorkshopData]);
                setNewWorkshop(workshopData);
                setWorkshopModalOpen(true);
                
            } catch (error) {
                console.error('Ошибка создания цеха:', error);
                setError('Не удалось создать цех.');
            }
            
            setDrawingWorkshop(false);
            drawingRef.current = null;
        }
        
        setIsDraggingMap(false);
    };

    const addEquipmentToMap = async (equipmentItem) => {
        if (editMode && currentPlantMap) {
            try {
                const elementData = {
                    elementType: 'WELDING_MACHINE',
                    elementId: equipmentItem.id,
                    positionX: 100,
                    positionY: 100,
                    width: 40,
                    height: 40,
                    rotation: 0,
                    zIndex: 1
                };
                
                // Добавляем элемент через API
                const newElement = await plantMapApi.addElementToMap(
                    currentPlantMap.id, 
                    elementData
                );
                
                // Обновляем локальное состояние
                setEquipment(prev => [...prev, newElement]);
                
            } catch (error) {
                console.error('Ошибка добавления оборудования:', error);
                setError('Не удалось добавить оборудование на карту.');
            }
        }
    };

    const removeEquipmentFromMap = async (equipmentId) => {
        if (editMode) {
            try {
                await plantMapApi.removeElementFromMap(equipmentId);
                setEquipment(prev => prev.filter(item => item.id !== equipmentId));
            } catch (error) {
                console.error('Ошибка удаления оборудования:', error);
                setError('Не удалось удалить оборудование с карты.');
            }
        }
    };

    const removeWorkshopFromMap = async (workshopId) => {
        console.log('removeWorkshopFromMap вызвана, workshopId:', workshopId, 'editMode:', editMode);
        if (editMode) {
            // Находим цех для отображения названия в подтверждении
            const workshop = workshops.find(w => w.id === workshopId);
            const workshopName = workshop ? workshop.name : 'цех';
            
            console.log('Найден цех для удаления:', workshop);
            
            // Подтверждение удаления
            if (window.confirm(`Вы уверены, что хотите удалить "${workshopName}" с карты?`)) {
                try {
                    console.log('removeWorkshopFromMap: Удаляем цех с ID:', workshopId);
                    await plantMapApi.removeWorkshopFromMap(workshopId);
                    setWorkshops(prev => prev.filter(workshop => workshop.id !== workshopId));
                    console.log('removeWorkshopFromMap: Цех успешно удален');
                } catch (error) {
                    console.error('Ошибка удаления цеха:', error);
                    setError('Не удалось удалить цех с карты.');
                }
            } else {
                console.log('Пользователь отменил удаление');
            }
        } else {
            console.log('Режим редактирования не включен, удаление невозможно');
        }
    };

    const updateWorkshop = async (workshopId, updates) => {
        try {
            const updatedWorkshop = await plantMapApi.updateWorkshop(workshopId, updates);
            setWorkshops(prev => prev.map(workshop => 
                workshop.id === workshopId ? updatedWorkshop : workshop
            ));
        } catch (error) {
            console.error('Ошибка обновления цеха:', error);
            setError('Не удалось обновить цех.');
        }
    };



    const filteredEquipment = equipment.filter(item => {
        if (filterStatus === 'all') return true;
        return item.status === filterStatus;
    });

    // Обработка ошибок
    if (error) {
        return (
            <div className="equipment-page">
                <div className="error-container">
                    <h2>Произошла ошибка</h2>
                    <p>{error}</p>
                    <button 
                        className="retry-btn"
                        onClick={() => {
                            setError(null);
                            loadInitialData();
                        }}
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    // Отображение загрузки
    if (loading) {
        return (
            <div className="equipment-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Загрузка карты предприятия...</p>
                </div>
            </div>
        );
    }

    const MapView = () => (
        <div className="map-container">
            <div 
                className="map-grid"
                ref={mapRef}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onMouseDown={handleMapMouseDown}
                onMouseMove={handleMapMouseMove}
                onMouseUp={handleMapMouseUp}
                style={{
                    transform: `scale(${mapScale}) translate(${mapOffset.x}px, ${mapOffset.y}px)`,
                    cursor: drawingWorkshop ? 'crosshair' : isDraggingMap ? 'grabbing' : 'grab'
                }}
            >
                {/* Цеха */}
                {workshops.map((workshop) => (
                    <div
                        key={workshop.id}
                        className="map-workshop"
                        style={{
                            position: 'absolute',
                            left: workshop.positionX,
                            top: workshop.positionY,
                            width: workshop.width,
                            height: workshop.height,
                            backgroundColor: workshop.color,
                            border: `2px solid ${workshop.borderColor}`,
                            opacity: workshop.opacity,
                            cursor: editMode ? 'pointer' : 'default'
                        }}
                        onClick={() => {
                            console.log('Цех кликнут, editMode:', editMode);
                            if (editMode) {
                                setWorkshopModalOpen(true);
                            }
                        }}
                        title={workshop.name}
                    >
                        <div className="workshop-label">{workshop.name}</div>
                        {editMode && (
                            <>
                                <button 
                                    className="remove-workshop-btn"
                                    tabIndex={0}
                                    onMouseDown={(e) => {
                                        console.log('Кнопка удаления mousedown, workshop.id:', workshop.id);
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        console.log('Кнопка удаления кликнута, workshop.id:', workshop.id);
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeWorkshopFromMap(workshop.id);
                                    }}
                                    onTouchStart={(e) => {
                                        console.log('Кнопка удаления touchstart, workshop.id:', workshop.id);
                                        e.stopPropagation();
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            console.log('Кнопка удаления нажата с клавиатуры, workshop.id:', workshop.id);
                                            e.preventDefault();
                                            e.stopPropagation();
                                            removeWorkshopFromMap(workshop.id);
                                        }
                                    }}
                                >
                                    ×
                                </button>
                                {/* Временный индикатор для отладки */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-30px',
                                    right: '-10px',
                                    background: 'yellow',
                                    color: 'black',
                                    padding: '2px 4px',
                                    fontSize: '10px',
                                    borderRadius: '3px',
                                    zIndex: 30
                                }}>
                                    DEL
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {/* Оборудование на карте */}
                {filteredEquipment.map((item) => (
                    <div
                        key={item.id}
                        className={`map-equipment ${item.status}`}
                        style={{
                            position: 'absolute',
                            left: item.coordinates?.x || item.positionX || 100,
                            top: item.coordinates?.y || item.positionY || 100,
                            cursor: editMode ? 'move' : 'pointer'
                        }}
                        draggable={editMode}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={() => handleEquipmentClick(item)}
                        title={`${item.elementName || item.name} - ${getStatusLabel(item.status)}`}
                    >
                        <div className="equipment-icon">
                            {item.status === 'active' && <i className="fas fa-check-circle"></i>}
                            {item.status === 'maintenance' && <i className="fas fa-wrench"></i>}
                            {item.status === 'error' && <i className="fas fa-exclamation-triangle"></i>}
                            {item.status === 'inactive' && <i className="fas fa-circle"></i>}
                        </div>
                        {editMode && (
                            <button 
                                className="remove-equipment-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeEquipmentFromMap(item.id);
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}

                {/* Индикатор рисования цеха */}
                {drawingWorkshop && drawingRef.current && (
                    <div
                        className="drawing-preview"
                        style={{
                            position: 'absolute',
                            left: Math.min(drawingRef.current.startX, drawingRef.current.endX),
                            top: Math.min(drawingRef.current.startY, drawingRef.current.endY),
                            width: Math.abs(drawingRef.current.endX - drawingRef.current.startX),
                            height: Math.abs(drawingRef.current.endY - drawingRef.current.startY),
                            border: '2px dashed #4A90E2',
                            backgroundColor: 'rgba(74, 144, 226, 0.1)',
                            pointerEvents: 'none'
                        }}
                    />
                )}
            </div>

            {/* Панель с доступными элементами */}
            {editMode && (
                <div className="equipment-panel">
                    <h3>
                        {selectedParentUnitId 
                            ? `Подразделения (${parentUnits.find(p => p.id === selectedParentUnitId)?.name || 'Выбранное'})`
                            : 'Выберите подразделение'
                        }
                    </h3>
                    <div className="equipment-list">
                        {availableUnits.map((unit) => (
                            <div
                                key={unit.id}
                                className="available-equipment-item"
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', JSON.stringify({
                                        id: unit.id,
                                        name: unit.name,
                                        type: 'organization_unit',
                                        description: unit.description,
                                        level: unit.level
                                    }));
                                }}
                            >
                                <div className="equipment-icon">
                                    <i className="fas fa-building"></i>
                                </div>
                                <div className="equipment-info">
                                    <div className="equipment-name">{unit.name}</div>
                                    <div className="equipment-type">Уровень {unit.level || 1}</div>
                                    {unit.description && (
                                        <div className="equipment-description">{unit.description}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <h3>Доступное оборудование</h3>
                    {loadingEquipment ? (
                        <div className="loading-text">Загрузка...</div>
                    ) : (
                        <div className="equipment-list">
                            {availableEquipment.map((item) => (
                                <div
                                    key={item.id}
                                    className="available-equipment-item"
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', JSON.stringify(item));
                                    }}
                                >
                                    <div className="equipment-icon">
                                        <i className="fas fa-cog"></i>
                                    </div>
                                    <div className="equipment-info">
                                        <div className="equipment-name">{item.name}</div>
                                        <div className="equipment-type">{getEquipmentTypeLabel(item.type)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Элементы управления картой */}
            <div className="map-controls">
                <button 
                    className="map-control-btn"
                    onClick={() => setMapScale(prev => Math.min(prev + 0.1, 2))}
                    title="Увеличить"
                >
                    <i className="fas fa-plus"></i>
                </button>
                <button 
                    className="map-control-btn"
                    onClick={() => setMapScale(prev => Math.max(prev - 0.1, 0.5))}
                    title="Уменьшить"
                >
                    <i className="fas fa-minus"></i>
                </button>
                <button 
                    className="map-control-btn"
                    onClick={() => {
                        setMapScale(1);
                        setMapOffset({ x: 0, y: 0 });
                    }}
                    title="Сбросить масштаб"
                >
                    <i className="fas fa-home"></i>
                </button>
            </div>
        </div>
    );

    const ListView = () => (
        <div className="equipment-grid">
            {filteredEquipment.map((item) => (
                <div key={item.id} className="equipment-card">
                    <div className="equipment-info">
                        <h3 className="equipment-name">{item.elementName || item.name}</h3>
                        <p className="equipment-model">{getEquipmentTypeLabel(item.type)}</p>
                        <div className="equipment-details">
                            <div className="detail-item">
                                <span className="detail-label">Расположение:</span>
                                {item.location?.zone}, этаж {item.location?.floor}
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Отдел:</span>
                                {item.department}
                            </div>
                            {item.operator && (
                                <div className="detail-item">
                                    <span className="detail-label">Оператор:</span>
                                    {item.operator}
                                </div>
                            )}
                            <div className="detail-item">
                                <span className="detail-label">Последняя активность:</span>
                                {item.lastActivity}
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Статус:</span>
                                {getStatusLabel(item.status)}
                            </div>
                        </div>
                        <div className="equipment-actions">
                            <button
                                className="action-btn edit-btn"
                                onClick={() => handleEquipmentClick(item)}
                            >
                                <i className="fas fa-eye"></i>
                                Просмотр
                            </button>
                            <button
                                className="action-btn control-btn"
                            >
                                <i className="fas fa-cog"></i>
                                Настройки
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="equipment-page">
            <div className="equipment-header">
                <h1 className="equipment-title">Карта предприятия</h1>
                <div className="header-controls">
                    {/* Выбор родительского подразделения */}
                    <select
                        className="parent-unit-select"
                        value={selectedParentUnitId || ''}
                        onChange={(e) => setSelectedParentUnitId(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={parentUnits.length === 0}
                    >
                        <option value="">Выберите подразделение</option>
                        {parentUnits.map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Все</option>
                        <option value="active">Активные</option>
                        <option value="maintenance">Обслуживание</option>
                        <option value="error">Ошибки</option>
                        <option value="inactive">Неактивные</option>
                    </select>
                    
                    <button
                        className={`edit-mode-btn ${editMode ? 'active' : ''}`}
                        onClick={() => setEditMode(!editMode)}
                        title={editMode ? 'Выйти из режима редактирования' : 'Войти в режим редактирования'}
                    >
                        <i className="fas fa-edit"></i>
                        {editMode ? 'Режим просмотра' : 'Режим редактирования'}
                    </button>

                    {editMode && (
                        <button
                            className={`drawing-btn ${drawingWorkshop ? 'active' : ''}`}
                            onClick={() => setDrawingWorkshop(!drawingWorkshop)}
                            title={drawingWorkshop ? 'Отменить рисование цеха' : 'Нарисовать цех'}
                        >
                            <i className="fas fa-vector-square"></i>
                            {drawingWorkshop ? 'Отменить' : 'Цех'}
                        </button>
                    )}
                    
                    <button
                        className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
                        onClick={() => setViewMode('map')}
                    >
                        <i className="fas fa-map"></i>
                        Карта
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        <i className="fas fa-list"></i>
                        Список
                    </button>
                </div>
            </div>

            {viewMode === 'map' ? <MapView /> : <ListView />}

            {/* Модальное окно для оборудования */}
            {modalOpen && selectedEquipment && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {selectedEquipment.elementName || selectedEquipment.name}
                            </h2>
                            <button className="close-btn" onClick={closeModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="equipment-details-modal">
                                <div className="detail-row">
                                    <span className="detail-label">Тип:</span>
                                    <span>{getEquipmentTypeLabel(selectedEquipment.type)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Статус:</span>
                                    <span>{getStatusLabel(selectedEquipment.status)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Расположение:</span>
                                    <span>{selectedEquipment.location?.zone}, этаж {selectedEquipment.location?.floor}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Координаты:</span>
                                    <span>X: {selectedEquipment.coordinates?.x || selectedEquipment.positionX}, Y: {selectedEquipment.coordinates?.y || selectedEquipment.positionY}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Отдел:</span>
                                    <span>{selectedEquipment.department}</span>
                                </div>
                                {selectedEquipment.operator && (
                                    <div className="detail-row">
                                        <span className="detail-label">Оператор:</span>
                                        <span>{selectedEquipment.operator}</span>
                                    </div>
                                )}
                                <div className="detail-row">
                                    <span className="detail-label">Последняя активность:</span>
                                    <span>{selectedEquipment.lastActivity}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={closeModal}>
                                Закрыть
                            </button>
                            <button className="save-btn">
                                <i className="fas fa-cog"></i>
                                Настройки
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно для редактирования цеха */}
            {workshopModalOpen && (
                <div className="modal-overlay" onClick={closeWorkshopModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Редактировать цех</h2>
                            <button className="close-btn" onClick={closeWorkshopModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Название цеха:</label>
                                <input
                                    type="text"
                                    value={newWorkshop.name}
                                    onChange={(e) => setNewWorkshop(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Введите название цеха"
                                />
                            </div>
                            <div className="form-group">
                                <label>Описание:</label>
                                <textarea
                                    value={newWorkshop.description}
                                    onChange={(e) => setNewWorkshop(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Введите описание цеха"
                                />
                            </div>
                            <div className="form-group">
                                <label>Цвет:</label>
                                <input
                                    type="color"
                                    value={newWorkshop.color}
                                    onChange={(e) => setNewWorkshop(prev => ({ ...prev, color: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={closeWorkshopModal}>
                                Отмена
                            </button>
                            <button className="save-btn" onClick={closeWorkshopModal}>
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnterpriseMapPage;
