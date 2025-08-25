import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';
import { 
    getAllNetworkEquipment, 
    createNetworkEquipment, 
    updateNetworkEquipment, 
    deleteNetworkEquipment 
} from '../api/networkEquipmentApi';

const NetworkEquipmentPage = () => {
    const [equipment, setEquipment] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Load equipment from API
    useEffect(() => {
        loadEquipment();
    }, []);

    const loadEquipment = async () => {
        try {
            setLoading(true);
            const data = await getAllNetworkEquipment();
            setEquipment(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Ошибка загрузки оборудования:', error);
            setEquipment([]);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditData({
            name: '',
            type: '',
            ipAddress: '',
            macAddress: '',
            location: '',
            description: '',
            status: 'Active'
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
            case 'MONITORING_BLOCK':
                return 'Блок мониторинга';
            case 'RADIO_RECEIVER':
                return 'Радио-приемник';
            case 'ROUTER':
                return 'Роутер';
            default:
                return 'Неизвестно';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'Active':
                return 'Активен';
            case 'Inactive':
                return 'Неактивен';
            case 'Maintenance':
                return 'Обслуживание';
            default:
                return 'Неизвестно';
        }
    };

    const handleSave = async (e) => {
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

        try {
            setLoading(true);
            if (editData.id) {
                await updateNetworkEquipment(editData.id, editData);
            } else {
                await createNetworkEquipment(editData);
            }
            await loadEquipment();
            closeModal();
        } catch (error) {
            console.error('Ошибка сохранения оборудования:', error);
            setErrors({ api: error.message || 'Ошибка сохранения' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это оборудование?')) {
            try {
                setLoading(true);
                await deleteNetworkEquipment(id);
                await loadEquipment();
            } catch (error) {
                console.error('Ошибка удаления оборудования:', error);
                alert('Ошибка удаления оборудования: ' + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading && equipment.length === 0) {
        return (
            <div className="equipment-page">
                <div className="equipment-header">
                    <h1 className="equipment-title">Сетевое оборудование системы мониторинга</h1>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    Загрузка...
                </div>
            </div>
        );
    }

    return (
        <div className="equipment-page">
            <div className="equipment-header">
                <h1 className="equipment-title">Сетевое оборудование системы мониторинга</h1>
                <button className="add-equipment-btn" onClick={openAddModal} disabled={loading}>
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
                                        {new Date(item.lastSeen).toLocaleString()}
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
                                    disabled={loading}
                                >
                                    <i className="fas fa-edit"></i>
                                    Редактировать
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(item.id)}
                                    disabled={loading}
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
                                    disabled={loading}
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
                                    disabled={loading}
                                >
                                    <option value="">Выберите тип</option>
                                    <option value="MONITORING_BLOCK">Блок мониторинга</option>
                                    <option value="RADIO_RECEIVER">Радио-приемник</option>
                                    <option value="ROUTER">Роутер</option>
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
                                    disabled={loading}
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
                                    disabled={loading}
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
                                    disabled={loading}
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
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Статус</label>
                                <select
                                    name="status"
                                    value={editData.status || 'Active'}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    disabled={loading}
                                >
                                    <option value="Active">Активен</option>
                                    <option value="Inactive">Неактивен</option>
                                    <option value="Maintenance">Обслуживание</option>
                                </select>
                            </div>

                            {errors.api && <p className="error-message">{errors.api}</p>}

                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={closeModal} disabled={loading}>
                                    Отмена
                                </button>
                                <button type="submit" className="save-btn" disabled={loading}>
                                    {loading ? 'Сохранение...' : (editData.id ? 'Сохранить' : 'Добавить')}
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
