import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';

const WPSPage = () => {
    const [wpsList, setWpsList] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [errors, setErrors] = useState({});

    // Load WPS from localStorage
    useEffect(() => {
        const savedWPS = localStorage.getItem('wpsList');
        if (savedWPS) {
            setWpsList(JSON.parse(savedWPS));
        }
    }, []);

    // Save WPS to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('wpsList', JSON.stringify(wpsList));
    }, [wpsList]);

    const openAddModal = () => {
        setEditData({
            name: '',
            description: '',
            weldingMethod: '',
            materialType: '',
            thickness: '',
            currentMin: '',
            currentMax: '',
            voltageMin: '',
            voltageMax: '',
            feedRate: '',
            gasConsumption: '',
            gostStandard: '',
            status: 'active'
        });
        setErrors({});
        setModalOpen(true);
    };

    const openEditModal = (wps) => {
        setEditData(wps);
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

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active':
                return 'Активна';
            case 'draft':
                return 'Черновик';
            case 'archived':
                return 'Архив';
            default:
                return 'Неизвестно';
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!editData.name) newErrors.name = 'Это поле обязательно';
        if (!editData.description) newErrors.description = 'Это поле обязательно';
        if (!editData.weldingMethod) newErrors.weldingMethod = 'Это поле обязательно';
        if (!editData.materialType) newErrors.materialType = 'Это поле обязательно';
        if (!editData.thickness) newErrors.thickness = 'Это поле обязательно';
        if (!editData.currentMin) newErrors.currentMin = 'Это поле обязательно';
        if (!editData.currentMax) newErrors.currentMax = 'Это поле обязательно';
        if (!editData.voltageMin) newErrors.voltageMin = 'Это поле обязательно';
        if (!editData.voltageMax) newErrors.voltageMax = 'Это поле обязательно';
        if (!editData.feedRate) newErrors.feedRate = 'Это поле обязательно';
        if (!editData.gasConsumption) newErrors.gasConsumption = 'Это поле обязательно';
        if (!editData.gostStandard) newErrors.gostStandard = 'Это поле обязательно';

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        if (editData.id) {
            setWpsList(prev =>
                prev.map(wps => wps.id === editData.id ? editData : wps)
            );
        } else {
            const newWPS = {
                ...editData,
                id: Date.now().toString(),
                createdAt: new Date().toLocaleDateString(),
                updatedAt: new Date().toLocaleDateString()
            };
            setWpsList(prev => [...prev, newWPS]);
        }
        closeModal();
    };

    const handleDelete = (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту технологическую карту?')) {
            setWpsList(prev => prev.filter(wps => wps.id !== id));
        }
    };

    const handleDownload = (wps) => {
        // TODO: Реализовать скачивание WPS в формате PDF
        console.log('Скачивание WPS:', wps.name);
        alert('Функция скачивания будет реализована позже');
    };

    return (
        <div className="equipment-page">
            <div className="equipment-header">
                <h1 className="equipment-title">Технологические карты сварки (WPS)</h1>
                <button className="add-equipment-btn" onClick={openAddModal}>
                    <i className="fas fa-plus"></i>
                    Добавить WPS
                </button>
            </div>

            <div className="equipment-grid">
                {wpsList.map((wps) => (
                    <div key={wps.id} className="equipment-card">
                        <div className="equipment-info">
                            <h3 className="equipment-name">{wps.name}</h3>
                            <p className="equipment-model">{wps.description}</p>
                            <div className="equipment-details">
                                <div className="detail-item">
                                    <span className="detail-label">Метод сварки:</span>
                                    {wps.weldingMethod}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Материал:</span>
                                    {wps.materialType}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Толщина:</span>
                                    {wps.thickness}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Ток:</span>
                                    {wps.currentMin}-{wps.currentMax} А
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Напряжение:</span>
                                    {wps.voltageMin}-{wps.voltageMax} В
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Скорость подачи:</span>
                                    {wps.feedRate}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Расход газа:</span>
                                    {wps.gasConsumption}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">ГОСТ:</span>
                                    {wps.gostStandard}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Статус:</span>
                                    {getStatusLabel(wps.status)}
                                </div>
                            </div>
                            <div className="equipment-actions">
                                <button
                                    className="action-btn edit-btn"
                                    onClick={() => openEditModal(wps)}
                                >
                                    <i className="fas fa-edit"></i>
                                    Редактировать
                                </button>
                                <button
                                    className="action-btn control-btn"
                                    onClick={() => handleDownload(wps)}
                                >
                                    <i className="fas fa-download"></i>
                                    Скачать
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(wps.id)}
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
                                {editData.id ? 'Редактировать WPS' : 'Добавить WPS'}
                            </h2>
                            <button className="close-btn" onClick={closeModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Название WPS</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={editData.name || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите название WPS"
                                />
                                {errors.name && <p className="error-message">{errors.name}</p>}
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
                                {errors.description && <p className="error-message">{errors.description}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Метод сварки</label>
                                <select
                                    name="weldingMethod"
                                    value={editData.weldingMethod || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option value="">Выберите метод</option>
                                    <option value="MIG">MIG</option>
                                    <option value="TIG">TIG</option>
                                    <option value="MMA">MMA</option>
                                    <option value="SAW">SAW</option>
                                </select>
                                {errors.weldingMethod && <p className="error-message">{errors.weldingMethod}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Тип материала</label>
                                <input
                                    type="text"
                                    name="materialType"
                                    value={editData.materialType || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите тип материала"
                                />
                                {errors.materialType && <p className="error-message">{errors.materialType}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Толщина</label>
                                <input
                                    type="text"
                                    name="thickness"
                                    value={editData.thickness || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите толщину"
                                />
                                {errors.thickness && <p className="error-message">{errors.thickness}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Минимальный ток (А)</label>
                                <input
                                    type="number"
                                    name="currentMin"
                                    value={editData.currentMin || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите минимальный ток"
                                />
                                {errors.currentMin && <p className="error-message">{errors.currentMin}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Максимальный ток (А)</label>
                                <input
                                    type="number"
                                    name="currentMax"
                                    value={editData.currentMax || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите максимальный ток"
                                />
                                {errors.currentMax && <p className="error-message">{errors.currentMax}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Минимальное напряжение (В)</label>
                                <input
                                    type="number"
                                    name="voltageMin"
                                    value={editData.voltageMin || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите минимальное напряжение"
                                />
                                {errors.voltageMin && <p className="error-message">{errors.voltageMin}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Максимальное напряжение (В)</label>
                                <input
                                    type="number"
                                    name="voltageMax"
                                    value={editData.voltageMax || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите максимальное напряжение"
                                />
                                {errors.voltageMax && <p className="error-message">{errors.voltageMax}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Скорость подачи</label>
                                <input
                                    type="text"
                                    name="feedRate"
                                    value={editData.feedRate || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите скорость подачи"
                                />
                                {errors.feedRate && <p className="error-message">{errors.feedRate}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Расход газа</label>
                                <input
                                    type="text"
                                    name="gasConsumption"
                                    value={editData.gasConsumption || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите расход газа"
                                />
                                {errors.gasConsumption && <p className="error-message">{errors.gasConsumption}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">ГОСТ</label>
                                <input
                                    type="text"
                                    name="gostStandard"
                                    value={editData.gostStandard || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите ГОСТ"
                                />
                                {errors.gostStandard && <p className="error-message">{errors.gostStandard}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Статус</label>
                                <select
                                    name="status"
                                    value={editData.status || 'active'}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option value="active">Активна</option>
                                    <option value="draft">Черновик</option>
                                    <option value="archived">Архив</option>
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

export default WPSPage;
