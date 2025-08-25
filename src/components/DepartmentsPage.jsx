import React, { useState, useEffect } from 'react';
import '../styles/equipmentPage.css';

const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState({});
    const [errors, setErrors] = useState({});

    // Load departments from localStorage
    useEffect(() => {
        const savedDepartments = localStorage.getItem('departments');
        if (savedDepartments) {
            setDepartments(JSON.parse(savedDepartments));
        }
    }, []);

    // Save departments to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('departments', JSON.stringify(departments));
    }, [departments]);

    const openAddModal = () => {
        setEditData({
            name: '',
            description: '',
            parentDepartment: '',
            level: 1
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

    const handleSave = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!editData.name) newErrors.name = 'Это поле обязательно';
        if (!editData.description) newErrors.description = 'Это поле обязательно';

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        if (editData.id) {
            setDepartments(prev =>
                prev.map(dept => dept.id === editData.id ? editData : dept)
            );
        } else {
            const newDepartment = {
                ...editData,
                id: Date.now().toString(),
                employeeCount: 0
            };
            setDepartments(prev => [...prev, newDepartment]);
        }
        closeModal();
    };

    const handleDelete = (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это подразделение?')) {
            setDepartments(prev => prev.filter(dept => dept.id !== id));
        }
    };

    return (
        <div className="equipment-page">
            <div className="equipment-header">
                <h1 className="equipment-title">Подразделения</h1>
                <button className="add-equipment-btn" onClick={openAddModal}>
                    <i className="fas fa-plus"></i>
                    Добавить подразделение
                </button>
            </div>

            <div className="equipment-grid">
                {departments.map((department) => (
                    <div key={department.id} className="equipment-card">
                        <div className="equipment-info">
                            <h3 className="equipment-name">{department.name}</h3>
                            <p className="equipment-model">{department.description}</p>
                            <div className="equipment-details">
                                <div className="detail-item">
                                    <span className="detail-label">Уровень:</span>
                                    {department.level}
                                </div>
                                {department.parentDepartment && (
                                    <div className="detail-item">
                                        <span className="detail-label">Родительское подразделение:</span>
                                        {department.parentDepartment}
                                    </div>
                                )}
                                <div className="detail-item">
                                    <span className="detail-label">Количество сотрудников:</span>
                                    {department.employeeCount || 0} чел.
                                </div>
                            </div>
                            <div className="equipment-actions">
                                <button
                                    className="action-btn edit-btn"
                                    onClick={() => openEditModal(department)}
                                >
                                    <i className="fas fa-edit"></i>
                                    Редактировать
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(department.id)}
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
                                <label className="form-label">Родительское подразделение</label>
                                <select
                                    name="parentDepartment"
                                    value={editData.parentDepartment || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                >
                                    <option value="">Нет родительского подразделения</option>
                                    {departments
                                        .filter(dept => dept.level < 3 && dept.id !== editData.id)
                                        .map((dept) => (
                                            <option key={dept.id} value={dept.name}>
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
                                />
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

export default DepartmentsPage;
