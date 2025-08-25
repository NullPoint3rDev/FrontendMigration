import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';

const NetworkEquipmentPage = () => {
    const [equipment, setEquipment] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [errors, setErrors] = useState({});

    // Load equipment from localStorage
    useEffect(() => {
        const savedEquipment = localStorage.getItem('networkEquipment');
        if (savedEquipment) {
            setEquipment(JSON.parse(savedEquipment));
        }
    }, []);

    // Save equipment to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('networkEquipment', JSON.stringify(equipment));
    }, [equipment]);

    const openAddModal = () => {
        setEditData({
            name: '',
            type: '',
            ipAddress: '',
            macAddress: '',
            location: '',
            description: '',
            status: 'active'
        });
        setErrors({});
        setModalOpen(true);
    };

    const openEditModal = (equipmentItem) => {
        setEditData(equipmentItem);
        setErrors({});
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditData({});
        setErrors({});
    };

    const handleInputChange = (e) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };

    const getEquipmentTypeLabel = (type) => {
        switch (type) {
            case 'monitoring_block':
                return 'Блок мониторинга';
            case 'hub':
                return 'Радио-приемник';
            case 'router':
                return 'Роутер';
            default:
                return 'Неизвестно';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active':
                return 'Активен';
            case 'inactive':
                return 'Неактивен';
            case 'maintenance':
                return 'Обслуживание';
            default:
                return 'Неизвестно';
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!editData.name) newErrors.name = 'Это поле обязательно';
        if (!editData.type) newErrors.type = 'Это поле обязательно';
        if (!editData.ipAddress) newErrors.ipAddress = 'Это поле обязательно';
        if (!editData.macAddress) newErrors.macAddress = 'Это поле обязательно';
        if (!editData.location) newErrors.location = 'Это поле обязательно';

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        if (editData.id) {
            setEquipment(prev =>
                prev.map(item => item.id === editData.id ? editData : item)
            );
        } else {
            const newEquipment = {
                ...editData,
                id: Date.now().toString(),
                lastSeen: new Date().toLocaleString()
            };
            setEquipment(prev => [...prev, newEquipment]);
        }
        closeModal();
    };

    const handleDelete = (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это оборудование?')) {
            setEquipment(prev => prev.filter(item => item.id !== id));
        }
    };

    return (
        <div className="equipment-page">
            <div className="equipment-header">
                <h1 className="equipment-title">Сетевое оборудование системы мониторинга</h1>
                <button className="add-equipment-btn" onClick={openAddModal}>
                    <i className="fas fa-plus"></i>
                    Добавить оборудование
                </button>
            </div>

            <div className="equipment-grid">
                {equipment.map((item) => (
                    <div key={item.id} className="equipment-card">
                        <div className="equipment-info">
                            <h3 className="equipment-name">{item.name}</h3>
                            <p className="equipment-model">{getEquipmentTypeLabel(item.type)}</p>
                            <div className="equipment-details">
                                <div className="detail-item">
                                    <span className="detail-label">IP адрес:</span>
                                    {item.ipAddress}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">MAC адрес:</span>
                                    {item.macAddress}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Расположение:</span>
                                    {item.location}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Статус:</span>
                                    {getStatusLabel(item.status)}
                                </div>
                                {item.lastSeen && (
                                    <div className="detail-item">
                                        <span className="detail-label">Последняя активность:</span>
                                        {item.lastSeen}
                                    </div>
                                )}
                            </div>
                            {item.description && (
                                <div className="equipment-description">
                                    <span className="detail-label">Описание:</span>
                                    {item.description}
                                </div>
                            )}
                            <div className="equipment-actions">
                                <button
                                    className="action-btn edit-btn"
                                    onClick={() => openEditModal(item)}
                                >
                                    <i className="fas fa-edit"></i>
                                    Редактировать
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(item.id)}
                                >
                                    <i className="fas fa-trash"></i>
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {modalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editData.id ? 'Редактировать оборудование' : 'Добавить оборудование'}
                            </h2>
                            <button className="close-btn" onClick={closeModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Название оборудования</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={editData.name || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите название оборудования"
                                />
                                {errors.name && <p className="error-message">{errors.name}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Тип оборудования</label>
                                <select
                                    name="type"
                                    value={editData.type || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option value="">Выберите тип</option>
                                    <option value="monitoring_block">Блок мониторинга</option>
                                    <option value="hub">Концентратор</option>
                                    <option value="router">Роутер</option>
                                </select>
                                {errors.type && <p className="error-message">{errors.type}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">IP адрес</label>
                                <input
                                    type="text"
                                    name="ipAddress"
                                    value={editData.ipAddress || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите IP адрес"
                                />
                                {errors.ipAddress && <p className="error-message">{errors.ipAddress}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">MAC адрес</label>
                                <input
                                    type="text"
                                    name="macAddress"
                                    value={editData.macAddress || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите MAC адрес"
                                />
                                {errors.macAddress && <p className="error-message">{errors.macAddress}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Расположение</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={editData.location || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите расположение"
                                />
                                {errors.location && <p className="error-message">{errors.location}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Описание</label>
                                <textarea
                                    name="description"
                                    value={editData.description || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите описание"
                                    rows="3"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Статус</label>
                                <select
                                    name="status"
                                    value={editData.status || 'active'}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option value="active">Активен</option>
                                    <option value="inactive">Неактивен</option>
                                    <option value="maintenance">Обслуживание</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={closeModal}>
                                    Отмена
                                </button>
                                <button type="submit" className="save-btn">
                                    {editData.id ? 'Сохранить' : 'Добавить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkEquipmentPage;
