import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';

const EnterpriseMapPage = () => {
    const [equipment, setEquipment] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [viewMode, setViewMode] = useState('map'); // 'map' или 'list'
    const [filterStatus, setFilterStatus] = useState('all');

    // Load equipment from localStorage
    useEffect(() => {
        const savedEquipment = localStorage.getItem('mapEquipment');
        if (savedEquipment) {
            setEquipment(JSON.parse(savedEquipment));
        }
    }, []);

    // Save equipment to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('mapEquipment', JSON.stringify(equipment));
    }, [equipment]);

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
        setSelectedEquipment(equipmentItem);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedEquipment(null);
    };

    const filteredEquipment = equipment.filter(item => {
        if (filterStatus === 'all') return true;
        return item.status === filterStatus;
    });

    const MapView = () => (
        <div className="map-container">
            <div className="map-grid">
                {/* Зоны */}
                <div className="map-zone" style={{ top: '50px', left: '50px', width: '200px', height: '150px' }}>
                    <div className="zone-label">Цех №1</div>
                </div>
                
                <div className="map-zone" style={{ top: '250px', left: '350px', width: '200px', height: '150px' }}>
                    <div className="zone-label">Цех №2</div>
                </div>

                {/* Оборудование на карте */}
                {filteredEquipment.map((item) => (
                    <div
                        key={item.id}
                        className={`map-equipment ${item.status}`}
                        style={{
                            left: item.coordinates?.x || 100,
                            top: item.coordinates?.y || 100
                        }}
                        onClick={() => handleEquipmentClick(item)}
                        title={`${item.name} - ${getStatusLabel(item.status)}`}
                    >
                        <div className="equipment-icon">
                            {item.status === 'active' && <i className="fas fa-check-circle"></i>}
                            {item.status === 'maintenance' && <i className="fas fa-wrench"></i>}
                            {item.status === 'error' && <i className="fas fa-exclamation-triangle"></i>}
                            {item.status === 'inactive' && <i className="fas fa-circle"></i>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const ListView = () => (
        <div className="equipment-grid">
            {filteredEquipment.map((item) => (
                <div key={item.id} className="equipment-card">
                    <div className="equipment-info">
                        <h3 className="equipment-name">{item.name}</h3>
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

            {modalOpen && selectedEquipment && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {selectedEquipment.name}
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
                                    <span>X: {selectedEquipment.coordinates?.x}, Y: {selectedEquipment.coordinates?.y}</span>
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
        </div>
    );
};

export default EnterpriseMapPage;
