import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';
import { 
    getAllWPS, 
    createWPS, 
    updateWPS, 
    deleteWPS 
} from '../api/wpsApi';
import { 
    exportWPSToExcel, 
    exportWPSToCSV, 
    exportAllWPSToExcel, 
    exportAllWPSToCSV 
} from '../utils/wpsExporter';

const WPSPage = () => {
    const [wpsList, setWpsList] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false); // Added loading state

    // Load WPS from API
    useEffect(() => {
        loadWPS();
    }, []);

    const loadWPS = async () => {
        try {
            setLoading(true);
            console.log('Загружаем список WPS...');
            const data = await getAllWPS();
            console.log('Получены данные WPS:', data);
            
            if (Array.isArray(data)) {
                setWpsList(data);
                console.log('Список WPS обновлен, количество элементов:', data.length);
            } else {
                console.warn('Получены неверные данные WPS:', data);
                setWpsList([]);
            }
        } catch (error) {
            console.error('Ошибка загрузки WPS:', error);
            setWpsList([]);
        } finally {
            setLoading(false);
        }
    };

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
            status: 'Active'
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
        let value = e.target.value;
        
        // Принудительно исправляем статус, если он некорректен
        if (e.target.name === 'status') {
            if (value === 'active') value = 'Active';
            if (value === 'pending') value = 'Pending';
            if (value === 'inactive') value = 'Inactive';
            if (value === 'blocked') value = 'Blocked';
            if (value === 'deleted') value = 'Deleted';
        }
        
        setEditData({ ...editData, [e.target.name]: value });
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'Active':
                return 'Активна';
            case 'Pending':
                return 'В ожидании';
            case 'Inactive':
                return 'Неактивна';
            case 'Blocked':
                return 'Заблокирована';
            case 'Deleted':
                return 'Удалена';
            default:
                return 'Неизвестно';
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        console.log('Начинаем сохранение WPS...');
        console.log('Данные для сохранения:', editData);
        
        // Принудительно исправляем статус перед отправкой
        if (editData.status === 'active') {
            editData.status = 'Active';
        }
        
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

        try {
            setLoading(true);
            if (editData.id) {
                await updateWPS(editData.id, editData);
                console.log('WPS обновлен:', editData);
            } else {
                // Принудительно устанавливаем корректный статус для нового WPS
                const dataToSend = {
                    ...editData,
                    status: editData.status === 'active' ? 'Active' : editData.status
                };
                
                console.log('Отправляем данные на сервер:', JSON.stringify(dataToSend, null, 2));
                await createWPS(dataToSend);
                console.log('WPS добавлен:', dataToSend);
            }
            
            // Принудительно обновляем список WPS
            await loadWPS();
            closeModal();
        } catch (error) {
            console.error('Ошибка сохранения WPS:', error);
            alert('Произошла ошибка при сохранении WPS: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту технологическую карту?')) {
            try {
                setLoading(true);
                await deleteWPS(id);
                console.log('WPS удален:', id);
                
                // Принудительно обновляем список WPS
                await loadWPS();
            } catch (error) {
                console.error('Ошибка удаления WPS:', error);
                alert('Произошла ошибка при удалении WPS: ' + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDownload = async (wps) => {
        try {
            console.log('Начинаем экспорт WPS:', wps.name);
            
            // Пытаемся экспортировать в Excel
            const excelSuccess = await exportWPSToExcel(wps);
            
            if (!excelSuccess) {
                // Если Excel не удался, экспортируем в CSV
                console.log('Excel недоступен, экспортируем в CSV');
                exportWPSToCSV(wps);
            }
            
        } catch (error) {
            console.error('Ошибка при экспорте WPS:', error);
            // Если произошла ошибка, пробуем экспортировать в CSV
            try {
                exportWPSToCSV(wps);
            } catch (csvError) {
                alert('Произошла ошибка при экспорте WPS: ' + error.message);
            }
        }
    };

    const exportAllWPS = async () => {
        try {
            if (wpsList.length === 0) {
                alert('Нет WPS для экспорта');
                return;
            }

            console.log('Начинаем экспорт всех WPS, количество:', wpsList.length);
            
            // Пытаемся экспортировать в Excel
            const excelSuccess = await exportAllWPSToExcel(wpsList);
            
            if (!excelSuccess) {
                // Если Excel не удался, экспортируем в CSV
                console.log('Excel недоступен, экспортируем все в CSV');
                exportAllWPSToCSV(wpsList);
            }
            
        } catch (error) {
            console.error('Ошибка при экспорте всех WPS:', error);
            // Если произошла ошибка, пробуем экспортировать в CSV
            try {
                exportAllWPSToCSV(wpsList);
            } catch (csvError) {
                alert('Произошла ошибка при экспорте всех WPS: ' + error.message);
            }
        }
    };

    return (
        <div className="equipment-page">
            <div className="equipment-header">
                <h1 className="equipment-title">Технологические карты сварки (WPS)</h1>
                <div className="header-controls">
                    {wpsList.length > 0 && (
                        <button 
                            className="export-all-btn" 
                            onClick={() => exportAllWPS()}
                            disabled={loading}
                            title="Экспортировать все WPS в Excel"
                        >
                            <i className="fas fa-download"></i>
                            Экспорт всех
                        </button>
                    )}
                    <button className="add-equipment-btn" onClick={openAddModal} disabled={loading}>
                        <i className="fas fa-plus"></i>
                        {loading ? 'Загрузка...' : 'Добавить WPS'}
                    </button>
                </div>
            </div>

            <div className="equipment-grid">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p>Загрузка WPS...</p>
                    </div>
                ) : wpsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p>Нет доступных технологических карт. Добавьте новые.</p>
                    </div>
                ) : (
                    wpsList.map((wps) => (
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
                                    title="Экспортировать в Excel"
                                >
                                    <i className="fas fa-file-excel"></i>
                                    Excel
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
                ))
                )}
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
                                    value={editData.status || 'Active'}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option value="Active">Активна</option>
                                    <option value="Pending">В ожидании</option>
                                    <option value="Inactive">Неактивна</option>
                                    <option value="Blocked">Заблокирована</option>
                                    <option value="Deleted">Удалена</option>
                                </select>
                            </div>

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

export default WPSPage;
