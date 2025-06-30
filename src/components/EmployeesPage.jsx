import React, { useEffect, useState } from 'react';
import { getAllEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/userAccountApi';
import '../styles/equipmentPage.css';

const emptyEmployee = {
  id: null,
  username: '',
  fullName: '',
  email: '',
  organizationUnit: null,
  position: '',
  phone: '',
  status: '',
};

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(emptyEmployee);
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (e) {
      setError('Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditData(emptyEmployee);
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEditModal = (employee) => {
    setEditData(employee);
    setIsEdit(true);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditData(emptyEmployee);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await updateEmployee(editData.id, editData);
      } else {
        await createEmployee(editData);
      }
      await fetchEmployees();
      closeModal();
    } catch (e) {
      setError('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить сотрудника?')) return;
    setLoading(true);
    try {
      await deleteEmployee(id);
      await fetchEmployees();
    } catch (e) {
      setError('Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="equipment-page">
      <div className="equipment-header">
        <h1 className="equipment-title">Сотрудники</h1>
        <button className="add-equipment-btn" onClick={openAddModal}>Добавить сотрудника</button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      <div className="equipment-grid">
        {employees.map((emp) => (
          <div className="equipment-card" key={emp.id}>
            <div className="equipment-info">
              <div className="equipment-name">{emp.fullName || emp.username}</div>
              <div className="equipment-model">{emp.position}</div>
              <div className="detail-item"><span className="detail-label">Email:</span> {emp.email}</div>
              <div className="detail-item"><span className="detail-label">Телефон:</span> {emp.phone}</div>
              <div className="detail-item"><span className="detail-label">Подразделение:</span> {emp.organizationUnit?.name || '-'}</div>
              <div className="detail-item"><span className="detail-label">Статус:</span> {emp.status}</div>
            </div>
            <div className="equipment-actions">
              <button className="edit-btn action-btn" onClick={() => openEditModal(emp)}>Редактировать</button>
              <button className="delete-btn action-btn" onClick={() => handleDelete(emp.id)}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{isEdit ? 'Редактировать сотрудника' : 'Добавить сотрудника'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Логин</label>
                <input className="form-input" name="username" value={editData.username} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">ФИО</label>
                <input className="form-input" name="fullName" value={editData.fullName} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" name="email" value={editData.email} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Должность</label>
                <input className="form-input" name="position" value={editData.position} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Телефон</label>
                <input className="form-input" name="phone" value={editData.phone} onChange={handleInputChange} />
              </div>
              {/* TODO: добавить выбор подразделения, статус, роль и другие поля при необходимости */}
              <div className="modal-actions">
                <button className="save-btn" type="submit" disabled={loading}>{isEdit ? 'Сохранить' : 'Добавить'}</button>
                <button className="cancel-btn" type="button" onClick={closeModal}>Отмена</button>
              </div>
              {error && <div className="error-message">{error}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage; 