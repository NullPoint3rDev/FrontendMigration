import React, { useEffect, useState } from 'react';
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAllOrganizationUnits,
  getAllUserRoles,
  getAllStatuses,
  getUserPhotoUrl,
  userAccountApi
} from '../api/employeeApi';
import '../styles/equipmentPage.css';

const emptyEmployee = {
  id: null,
  username: '',
  password: '', // Добавляем поле для пароля
  fullName: '',
  email: '',
  organizationUnit: null,
  userRoleId: '',
  position: '',
  phone: '',
  status: '',
  photo: null,
};

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(emptyEmployee);
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [units, setUnits] = useState([]);
  const [roles, setRoles] = useState([]);
  const [statuses, setStatuses] = useState(getAllStatuses());
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchUnits();
    fetchRoles();
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

  const fetchUnits = async () => {
    try {
      const data = await getAllOrganizationUnits();
      setUnits(Array.isArray(data) ? data : []);
    } catch (e) {
      setUnits([]);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await getAllUserRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (e) {
      setRoles([]);
    }
  };

  const openAddModal = () => {
    setEditData(emptyEmployee);
    setIsEdit(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setModalOpen(true);
  };

  const openEditModal = (employee) => {
    setEditData({
      ...employee,
      userRoleId: employee.userRole?.id || '',
      status: employee.status || '',
      organizationUnit: employee.organizationUnit || null,
      password: '', // Не показываем пароль при редактировании
    });
    setIsEdit(true);
    setAvatarFile(null);
    setAvatarPreview(employee.photo ? getUserPhotoUrl(employee.photo) : null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditData(emptyEmployee);
    setError('');
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUnitChange = (e) => {
    const unitId = e.target.value;
    const unit = units.find(u => String(u.id) === String(unitId));
    setEditData((prev) => ({ ...prev, organizationUnit: unit ? { id: unit.id, name: unit.name } : null }));
  };

  const handleRoleChange = (e) => {
    setEditData((prev) => ({ ...prev, userRoleId: e.target.value }));
  };

  const handleStatusChange = (e) => {
    setEditData((prev) => ({ ...prev, status: e.target.value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    setAvatarFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let photoId = editData.photo;
      if (avatarFile) {
        const uploadRes = await userAccountApi.uploadUserPhoto(avatarFile);
        photoId = uploadRes;
      }
      
      const payload = {
        ...editData,
        photo: photoId,
      };
      
      if (isEdit) {
        await updateEmployee(editData.id, payload);
      } else {
        await createEmployee(payload);
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

  if (loading && employees.length === 0) {
    return (
      <div className="equipment-page">
        <div className="equipment-header">
          <h1 className="equipment-title">Сотрудники</h1>
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
        <h1 className="equipment-title">Сотрудники</h1>
        <button className="add-equipment-btn" onClick={openAddModal} disabled={loading}>
          <i className="fas fa-plus"></i>
          Добавить сотрудника
        </button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      <div className="equipment-grid">
        {employees.map((emp) => (
          <div className="equipment-card" key={emp.id}>
            {emp.photo && (
              <img
                src={getUserPhotoUrl(emp.photo)}
                alt="avatar"
                className="equipment-image"
                style={{ objectFit: 'cover', height: 120, width: 120, borderRadius: '50%', margin: '0 auto 1rem auto' }}
              />
            )}
            <div className="equipment-info">
              <div className="equipment-name">{emp.fullName || emp.username}</div>
              <div className="equipment-model">{emp.position}</div>
              <div className="detail-item"><span className="detail-label">Логин:</span> {emp.username}</div>
              <div className="detail-item"><span className="detail-label">Email:</span> {emp.email}</div>
              <div className="detail-item"><span className="detail-label">Телефон:</span> {emp.phone}</div>
              <div className="detail-item"><span className="detail-label">Подразделение:</span> {emp.organizationUnit?.name || '-'}</div>
              <div className="detail-item"><span className="detail-label">Роль:</span> {emp.userRole?.name || '-'}</div>
              <div className="detail-item"><span className="detail-label">Статус:</span> {Array.isArray(statuses) && statuses.find(s => s.value === emp.status)?.label || emp.status}</div>
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
              {!isEdit && (
                <div className="form-group">
                  <label className="form-label">Пароль</label>
                  <input className="form-input" type="password" name="password" value={editData.password} onChange={handleInputChange} required />
                </div>
              )}
              {isEdit && (
                <div className="form-group">
                  <label className="form-label">Новый пароль (оставьте пустым, если не хотите менять)</label>
                  <input className="form-input" type="password" name="password" value={editData.password} onChange={handleInputChange} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">ФИО</label>
                <input className="form-input" name="fullName" value={editData.fullName} onChange={handleInputChange} required />
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
              <div className="form-group">
                <label className="form-label">Подразделение</label>
                <select className="form-input" value={editData.organizationUnit?.id || ''} onChange={handleUnitChange} required>
                  <option value="">Выберите подразделение</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Роль</label>
                <select className="form-input" value={editData.userRoleId || ''} onChange={handleRoleChange} required>
                  <option value="">Выберите роль</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Статус</label>
                <select className="form-input" value={editData.status || ''} onChange={handleStatusChange} required>
                  <option value="">Выберите статус</option>
                  {statuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Аватарка</label>
                <input className="form-input" type="file" accept="image/*" onChange={handleAvatarChange} />
                {avatarPreview && (
                  <img src={avatarPreview} alt="avatar preview" style={{ width: 80, height: 80, borderRadius: '50%', marginTop: 8 }} />
                )}
              </div>
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