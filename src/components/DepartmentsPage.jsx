import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';
import { 
    getAllOrganizationUnits, 
    createOrganizationUnit, 
    updateOrganizationUnit, 
    deleteOrganizationUnit 
} from '../api/organizationUnitApi';

const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Load departments from API
    const loadDepartments = async () => {
        try {
            setLoading(true);
            console.log('Начинаем загрузку подразделений...');
            const data = await getAllOrganizationUnits();
            console.log('Полученные данные подразделений:', data);
            console.log('Тип данных:', typeof data);
            console.log('Это массив?', Array.isArray(data));
            console.log('Количество подразделений:', data ? data.length : 0);
            setDepartments(Array.isArray(data) ? data : []);
            console.log('Состояние departments обновлено');
        } catch (error) {
            console.error('Ошибка загрузки подразделений:', error);
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDepartments();
    }, []);

    const openAddModal = () => {
        setEditData({
            name: '',
            description: '',
            parentDepartment: '',
            level: 1,
            address: '',
            phone: '',
            email: ''
        });
        setErrors({});
        setModalOpen(true);
    };

    const openEditModal = (department) => {
        setEditData(department);
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

    const handleSave = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!editData.name) newErrors.name = 'Это поле обязательно';
        if (!editData.description) newErrors.description = 'Это поле обязательно';

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        try {
            setLoading(true);
            
            // Подготавливаем данные в правильном формате для API
            const apiData = {
                name: editData.name,
                description: editData.description,
                address: editData.address || '',
                phone: editData.phone || '',
                email: editData.email || '',
                level: editData.level || 1,
                parentDepartment: editData.parentDepartment ? { id: editData.parentDepartment } : null,
                organization: {
                    id: 1 // Дефолтная организация
                }
            };
            console.log('Отправляемые данные:', apiData);
            
            if (editData.id) {
                await updateOrganizationUnit(editData.id, apiData);
            } else {
                await createOrganizationUnit(apiData);
            }
            await loadDepartments();
            closeModal();
        } catch (error) {
            console.error('Ошибка сохранения подразделения:', error);
            setErrors({ api: error.message || 'Ошибка сохранения' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это подразделение?')) {
            try {
                setLoading(true);
                console.log('Удаляем подразделение с ID:', id);
                await deleteOrganizationUnit(id);
                console.log('Подразделение удалено, обновляем список...');
                await loadDepartments();
                console.log('Список обновлен после удаления');
            } catch (error) {
                console.error('Ошибка удаления подразделения:', error);
                alert('Ошибка удаления подразделения: ' + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading && departments.length === 0) {
        return (
            <div className="equipment-page">
                <div className="equipment-header">
                    <h1 className="equipment-title">Подразделения</h1>
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
                <h1 className="equipment-title">Подразделения</h1>
                <button className="add-equipment-btn" onClick={openAddModal} disabled={loading}>
                    <i className="fas fa-plus"></i>
                    Добавить подразделение
                </button>
            </div>

            <div className="equipment-grid">
                {console.log('Рендеринг departments:', departments)}
                {departments.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                        Подразделения не найдены. Количество: {departments.length}
                    </div>
                )}
                {departments.map((department) => (
                    <div key={department.id} className="equipment-card">
                        <div className="equipment-info">
                            <h3 className="equipment-name">{department.name}</h3>
                            <p className="equipment-model">{department.description}</p>
                            <div className="equipment-details">
                                <div className="detail-item">
                                    <span className="detail-label">Уровень:</span>
                                    {department.level || 'Не указан'}
                                </div>
                                {department.parentDepartment && (
                                    <div className="detail-item">
                                        <span className="detail-label">Родительское подразделение:</span>
                                        {department.parentDepartment.name}
                                    </div>
                                )}
                                {department.address && (
                                    <div className="detail-item">
                                        <span className="detail-label">Адрес:</span>
                                        {department.address}
                                    </div>
                                )}
                                {department.phone && (
                                    <div className="detail-item">
                                        <span className="detail-label">Телефон:</span>
                                        {department.phone}
                                    </div>
                                )}
                                {department.email && (
                                    <div className="detail-item">
                                        <span className="detail-label">Email:</span>
                                        {department.email}
                                    </div>
                                )}
                            </div>
                            <div className="equipment-actions">
                                <button
                                    className="action-btn edit-btn"
                                    onClick={() => openEditModal(department)}
                                    disabled={loading}
                                >
                                    <i className="fas fa-edit"></i>
                                    Редактировать
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(department.id)}
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
                                {editData.id ? 'Редактировать подразделение' : 'Добавить подразделение'}
                            </h2>
                            <button className="close-btn" onClick={closeModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Название подразделения</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={editData.name || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите название подразделения"
                                    disabled={loading}
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
                                    disabled={loading}
                                />
                                {errors.description && <p className="error-message">{errors.description}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Родительское подразделение</label>
                                <select
                                    name="parentDepartment"
                                    value={editData.parentDepartment?.id || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option value="">Нет родительского подразделения</option>
                                    {departments
                                        .filter(dept => dept.level < 3 && dept.id !== editData.id)
                                        .map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Уровень</label>
                                <input
                                    type="number"
                                    name="level"
                                    value={editData.level || 1}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    min="1"
                                    max="5"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Адрес</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={editData.address || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите адрес"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Телефон</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={editData.phone || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите номер телефона"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={editData.email || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Введите email"
                                    disabled={loading}
                                />
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

export default DepartmentsPage;
