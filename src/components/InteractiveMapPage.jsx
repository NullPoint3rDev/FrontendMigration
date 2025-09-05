import React, { useState, useEffect, useRef } from 'react';
import '../styles/interactiveMap.css';
import { plantMapApi } from '../api/plantMapApi';

const InteractiveMapPage = () => {
    const [mapType, setMapType] = useState('enterprise'); // 'enterprise' или 'workshop'
    const [equipment, setEquipment] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [availableUnits, setAvailableUnits] = useState([]);
    const [selectedWorkshop, setSelectedWorkshop] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingStart, setDrawingStart] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [editMode, setEditMode] = useState(false);
    
    const mapRef = useRef(null);
    const canvasRef = useRef(null);

    // Загружаем данные из API и localStorage
    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('InteractiveMapPage: Загружаем данные из API');
                // Загружаем карту предприятия из API
                const plantMap = await plantMapApi.getDefaultPlantMap(1);
                if (plantMap) {
                    console.log('InteractiveMapPage: Получена карта из API:', plantMap);
                    setEquipment(plantMap.elements || []);
                    setWorkshops(plantMap.workshops || []);
                }
                
                // Загружаем подразделения
                const units = await plantMapApi.getAvailableOrganizationUnits(1);
                console.log('InteractiveMapPage: Получены подразделения:', units);
                setAvailableUnits(units);
            } catch (error) {
                console.error('Ошибка загрузки данных из API:', error);
                // Fallback к localStorage
                const savedEquipment = localStorage.getItem('interactiveMapEquipment');
                const savedWorkshops = localStorage.getItem('interactiveMapWorkshops');
                
                if (savedEquipment) {
                    try {
                        setEquipment(JSON.parse(savedEquipment));
                    } catch (error) {
                        console.error('Ошибка при загрузке оборудования из localStorage:', error);
                    }
                }
                
                if (savedWorkshops) {
                    try {
                        setWorkshops(JSON.parse(savedWorkshops));
                    } catch (error) {
                        console.error('Ошибка при загрузке цехов из localStorage:', error);
                    }
                }
            }
        };
        
        loadData();
    }, []);

    // Сохраняем данные в localStorage
    useEffect(() => {
        localStorage.setItem('interactiveMapEquipment', JSON.stringify(equipment));
    }, [equipment]);

    useEffect(() => {
        localStorage.setItem('interactiveMapWorkshops', JSON.stringify(workshops));
    }, [workshops]);

    // Обработчик начала перетаскивания
    const handleDragStart = (e, item, type) => {
        setDraggedItem({ ...item, type });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    };

    // Обработчик перетаскивания над картой
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Обработчик сброса элемента на карту
    const handleDrop = async (e) => {
        e.preventDefault();
        
        // Получаем данные из dataTransfer
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;

        try {
            const itemData = JSON.parse(data);
            console.log('InteractiveMapPage handleDrop: Получены данные:', itemData);

            const rect = mapRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

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

                console.log('InteractiveMapPage: Создаем цех из подразделения:', newWorkshop);
                
                // Добавляем цех через API
                const createdWorkshop = await plantMapApi.addWorkshopToMap(1, newWorkshop);
                console.log('InteractiveMapPage: Цех создан:', createdWorkshop);
                
                // Обновляем локальное состояние
                setWorkshops(prev => [...prev, createdWorkshop]);
                
            } else if (itemData.type === 'equipment') {
                // Размещаем оборудование
                const newEquipment = {
                    ...itemData,
                    id: Date.now(),
                    coordinates: { x, y },
                    workshopId: mapType === 'workshop' ? selectedWorkshop?.id : null
                };
                setEquipment(prev => [...prev, newEquipment]);
            } else if (itemData.type === 'workshop') {
                // Создаем новый цех (старая логика)
                const newWorkshop = {
                    ...itemData,
                    id: Date.now(),
                    coordinates: { x, y },
                    width: 200,
                    height: 150,
                    name: `Цех ${workshops.length + 1}`
                };
                setWorkshops(prev => [...prev, newWorkshop]);
            }
            
        } catch (error) {
            console.error('Ошибка при размещении элемента:', error);
        }
    };

    // Обработчик клика по оборудованию
    const handleEquipmentClick = (item) => {
        setSelectedItem(item);
        setModalOpen(true);
    };

    // Обработчик клика по цеху
    const handleWorkshopClick = (workshop) => {
        if (mapType === 'enterprise') {
            setSelectedWorkshop(workshop);
            setMapType('workshop');
        }
    };

    // Обработчик начала рисования цеха
    const handleMouseDown = (e) => {
        if (mapType === 'enterprise' && editMode) {
            setIsDrawing(true);
            const rect = mapRef.current.getBoundingClientRect();
            setDrawingStart({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    // Обработчик рисования цеха
    const handleMouseMove = (e) => {
        if (isDrawing && drawingStart) {
            const rect = mapRef.current.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            // Обновляем canvas для предварительного просмотра
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#6C63FF';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                drawingStart.x,
                drawingStart.y,
                currentX - drawingStart.x,
                currentY - drawingStart.y
            );
        }
    };

    // Обработчик завершения рисования цеха
    const handleMouseUp = (e) => {
        if (isDrawing && drawingStart) {
            const rect = mapRef.current.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            
            const width = Math.abs(endX - drawingStart.x);
            const height = Math.abs(endY - drawingStart.y);
            
            if (width > 50 && height > 50) {
                const newWorkshop = {
                    id: Date.now(),
                    name: `Цех ${workshops.length + 1}`,
                    coordinates: {
                        x: Math.min(drawingStart.x, endX),
                        y: Math.min(drawingStart.y, endY)
                    },
                    width,
                    height
                };
                setWorkshops(prev => [...prev, newWorkshop]);
            }
            
            setIsDrawing(false);
            setDrawingStart(null);
            
            // Очищаем canvas
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    // Закрытие модального окна
    const closeModal = () => {
        setModalOpen(false);
        setSelectedItem(null);
    };

    // Удаление элемента
    const handleDelete = async (id, type) => {
        console.log('handleDelete вызвана с id:', id, 'type:', type);
        try {
            if (type === 'equipment') {
                console.log('Удаляем оборудование через API, id:', id);
                // Удаляем оборудование через API
                await plantMapApi.removeElementFromMap(id);
                setEquipment(prev => prev.filter(item => item.id !== id));
                console.log('Оборудование успешно удалено');
            } else if (type === 'workshop') {
                console.log('Удаляем цех через API, id:', id);
                // Удаляем цех через API
                await plantMapApi.removeWorkshopFromMap(id);
                setWorkshops(prev => prev.filter(item => item.id !== id));
                // Удаляем оборудование из удаленного цеха
                setEquipment(prev => prev.filter(item => item.workshopId !== id));
                console.log('Цех успешно удален');
            }
            
            // Принудительно обновляем состояние немедленно
            forceUpdate();
            
        } catch (error) {
            console.error('Ошибка при удалении элемента:', error);
            // Показываем пользователю ошибку
            alert('Не удалось удалить элемент. Попробуйте еще раз.');
        }
        
        // Закрываем модальное окно только если оно открыто
        if (modalOpen) {
            closeModal();
        }
    };

    // Возврат к карте предприятия
    const handleBackToEnterprise = () => {
        setMapType('enterprise');
        setSelectedWorkshop(null);
    };

    // Принудительное обновление состояния
    const forceUpdate = () => {
        setEquipment(prev => [...prev]);
        setWorkshops(prev => [...prev]);
    };

    // Панель инструментов
    const Toolbar = () => (
        <div className="map-toolbar">
            <div className="toolbar-section">
                <h3>Тип карты</h3>
                <div className="toolbar-buttons">
                    <button
                        className={`toolbar-btn ${mapType === 'enterprise' ? 'active' : ''}`}
                        onClick={() => setMapType('enterprise')}
                    >
                        <i className="fas fa-building"></i>
                        Предприятие
                    </button>
                    <button
                        className={`toolbar-btn ${mapType === 'workshop' ? 'active' : ''}`}
                        onClick={() => setMapType('workshop')}
                        disabled={!selectedWorkshop}
                    >
                        <i className="fas fa-industry"></i>
                        Цех
                    </button>
                </div>
            </div>

            {mapType === 'enterprise' && (
                <div className="toolbar-section">
                    <h3>Режим редактирования</h3>
                    <div className="toolbar-buttons">
                        <button
                            className={`toolbar-btn ${editMode ? 'active' : ''}`}
                            onClick={() => setEditMode(!editMode)}
                        >
                            <i className="fas fa-pencil-alt"></i>
                            {editMode ? 'Выключить' : 'Включить'} рисование
                        </button>
                        <button
                            className="toolbar-btn clear-btn"
                            onClick={() => {
                                if (window.confirm('Очистить все элементы с карты?')) {
                                    setEquipment([]);
                                    setWorkshops([]);
                                }
                            }}
                            title="Очистить все элементы"
                        >
                            <i className="fas fa-trash-alt"></i>
                            Очистить все
                        </button>

                    </div>
                </div>
            )}

            {mapType === 'workshop' && selectedWorkshop && (
                <div className="toolbar-section">
                    <h3>Текущий цех: {selectedWorkshop.name}</h3>
                    <button
                        className="toolbar-btn back-btn"
                        onClick={handleBackToEnterprise}
                    >
                        <i className="fas fa-arrow-left"></i>
                        Назад к предприятию
                    </button>
                </div>
            )}
        </div>
    );

    // Панель элементов для перетаскивания
    const DraggablePanel = () => (
        <div className="draggable-panel">
            <div className="panel-section">
                <h3>Подразделения</h3>
                <div className="draggable-items">
                    {availableUnits.map((unit) => (
                        <div
                            key={unit.id}
                            className="draggable-item organization-unit-item"
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
                            <i className="fas fa-building"></i>
                            <span>{unit.name}</span>
                            <small>Уровень {unit.level || 1}</small>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="panel-section">
                <h3>Оборудование</h3>
                <div className="draggable-items">
                    <div
                        className="draggable-item equipment-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, {
                            name: 'Сварочный аппарат',
                            type: 'welding_machine',
                            status: 'active'
                        }, 'equipment')}
                    >
                        <i className="fas fa-bolt"></i>
                        <span>Сварочный аппарат</span>
                    </div>
                    <div
                        className="draggable-item equipment-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, {
                            name: 'Блок мониторинга',
                            type: 'monitoring_block',
                            status: 'active'
                        }, 'equipment')}
                    >
                        <i className="fas fa-desktop"></i>
                        <span>Блок мониторинга</span>
                    </div>
                    <div
                        className="draggable-item equipment-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, {
                            name: 'Роутер',
                            type: 'controller',
                            status: 'active'
                        }, 'equipment')}
                    >
                        <i className="fas fa-microchip"></i>
                        <span>Роутер</span>
                    </div>
                </div>
            </div>

            {mapType === 'enterprise' && (
                <div className="panel-section">
                    <h3>Цеха</h3>
                    <div className="draggable-items">
                        <div
                            className="draggable-item workshop-item"
                            draggable
                            onDragStart={(e) => handleDragStart(e, {
                                name: 'Новый цех',
                                type: 'workshop'
                            }, 'workshop')}
                        >
                            <i className="fas fa-industry"></i>
                            <span>Новый цех</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Основная карта
    const InteractiveMap = () => (
        <div 
            className="interactive-map"
            ref={mapRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <canvas
                ref={canvasRef}
                className="drawing-canvas"
                width={800}
                height={600}
            />
            
            {/* Цеха */}
            {workshops.map((workshop) => {
                return (
                                    <div
                    key={workshop.id}
                    className={`map-workshop ${mapType === 'workshop' && selectedWorkshop?.id === workshop.id ? 'selected' : ''}`}
                    style={{
                        left: workshop.positionX || workshop.coordinates?.x || 0,
                        top: workshop.positionY || workshop.coordinates?.y || 0,
                        width: workshop.width,
                        height: workshop.height,
                        backgroundColor: workshop.color || '#4A90E2',
                        opacity: workshop.opacity || 0.3,
                        borderColor: workshop.borderColor || '#2E5C8A'
                    }}
                    onClick={() => handleWorkshopClick(workshop)}
                    title={workshop.name}
                >
                        <div className="workshop-label">{workshop.name}</div>
                                            {editMode && (
                        <button
                            className="delete-workshop-btn"
                            onMouseUp={(e) => {
                                e.stopPropagation();
                                handleDelete(workshop.id, 'workshop');
                            }}
                            style={{ zIndex: 1000 }}
                            title={`Удалить цех "${workshop.name}"`}
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    )}
                    </div>
                );
            })}

            {/* Оборудование */}
            {equipment
                .filter(item => {
                    const shouldShow = mapType === 'enterprise' || 
                        (mapType === 'workshop' && item.workshopId === selectedWorkshop?.id);
                    return shouldShow;
                })
                .map((item) => (
                    <div
                        key={item.id}
                        className={`map-equipment ${item.status}`}
                        style={{
                            left: item.coordinates.x,
                            top: item.coordinates.y
                        }}
                        onClick={() => handleEquipmentClick(item)}
                        title={`${item.name} - ${item.status}`}
                    >
                        <div className="equipment-icon">
                            {item.type === 'welding_machine' && <i className="fas fa-bolt"></i>}
                            {item.type === 'monitoring_block' && <i className="fas fa-desktop"></i>}
                            {item.type === 'controller' && <i className="fas fa-microchip"></i>}
                        </div>
                        {editMode && (
                            <button
                                className="delete-equipment-btn"
                                onMouseUp={(e) => {
                                    e.stopPropagation();
                                    handleDelete(item.id, 'equipment');
                                }}
                                style={{ zIndex: 1000 }}
                                title={`Удалить оборудование "${item.name}"`}
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                        )}
                    </div>
                ))}
        </div>
    );

    return (
        <div className="interactive-map-page">
            <div className="page-header">
                <h1 className="page-title">Интерактивная карта</h1>
            </div>

            <div className="map-layout">
                <Toolbar />
                <div className="map-container">
                    <InteractiveMap />
                </div>
                <DraggablePanel />
            </div>

            {/* Модальное окно для просмотра/редактирования */}
            {modalOpen && selectedItem && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{selectedItem.name}</h2>
                            <button className="close-btn" onClick={closeModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="item-details">
                                <div className="detail-row">
                                    <span className="detail-label">Тип:</span>
                                    <span>{selectedItem.type}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Статус:</span>
                                    <span>{selectedItem.status}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Координаты:</span>
                                    <span>X: {selectedItem.coordinates?.x}, Y: {selectedItem.coordinates?.y}</span>
                                </div>
                                {selectedItem.workshopId && (
                                    <div className="detail-row">
                                        <span className="detail-label">Цех:</span>
                                        <span>{workshops.find(w => w.id === selectedItem.workshopId)?.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={closeModal}>
                                Закрыть
                            </button>
                            {editMode && (
                                <button 
                                    className="delete-btn"
                                    onClick={() => handleDelete(selectedItem.id, 'equipment')}
                                >
                                    <i className="fas fa-trash"></i>
                                    Удалить
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InteractiveMapPage;
