import React, { useEffect, useState } from 'react';
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../api/employeeApi';
import {
  getAllOrganizationUnits,
  getAllUserRoles,
  getAllStatuses,
  getUserPhotoUrl,
  userAccountApi
} from '../api/userAccountApi';
import '../styles/employees.css';

const emptyEmployee = {
  id: null,
  username: '',
  password: '',
  fullName: '',
  email: '',
  employeeType: '',
  organizationUnit: null,
  userRoleId: '',
  position: '',
  phone: '',
  status: '',
  photo: null,
};

const employeeTypes = [
  { value: 'ADMIN', label: 'Администратор' },
  { value: 'MANAGER', label: 'Менеджер' },
  { value: 'REGULATOR', label: 'Регулировщик' },
  { value: 'WELDER', label: 'Сварщик' },
  { value: 'QC', label: 'ОТК' },
  { value: 'PROGRAMMER', label: 'Программист' }
];

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
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

  // Фильтры
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    role: '',
    organizationUnit: '',
    employeeType: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchUnits();
    fetchRoles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, filters]);

  const applyFilters = () => {
    let filtered = [...employees];

    // Поиск по имени, логину, email, должности, типу
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.fullName?.toLowerCase().includes(searchLower) ||
        emp.username?.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower) ||
        emp.position?.toLowerCase().includes(searchLower) ||
        employeeTypes.find(type => type.value === emp.employeeType)?.label.toLowerCase().includes(searchLower)
      );
    }

    // Фильтр по статусу
    if (filters.status) {
      filtered = filtered.filter(emp => emp.status === filters.status);
    }

    // Фильтр по роли
    if (filters.role) {
      filtered = filtered.filter(emp => emp.userRole?.id === parseInt(filters.role));
    }

    // Фильтр по подразделению
    if (filters.organizationUnit) {
      filtered = filtered.filter(emp => emp.organizationUnit?.id === parseInt(filters.organizationUnit));
    }

    // Фильтр по типу сотрудника
    if (filters.employeeType) {
      filtered = filtered.filter(emp => emp.employeeType === filters.employeeType);
    }

    setFilteredEmployees(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      role: '',
      organizationUnit: '',
      employeeType: ''
    });
  };

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
      employeeType: employee.employeeType || '',
      password: '',
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
        username: editData.username,
        fullName: editData.fullName,
        email: editData.email,
        employeeType: editData.employeeType,
        position: editData.position,
        phone: editData.phone,
        status: editData.status,
        photo: photoId,
        organizationUnit: editData.organizationUnit,
        userRoleId: editData.userRoleId
      };
      
      // Добавляем пароль только если он указан (для создания или изменения)
      if (editData.password) {
        payload.password = editData.password;
      }
      
      if (isEdit) {
        await updateEmployee(editData.id, payload);
      } else {
        await createEmployee(payload);
      }
      
      await fetchEmployees();
      closeModal();
    } catch (e) {
      setError('Ошибка сохранения: ' + (e.message || 'Неизвестная ошибка'));
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

  const isAdmin = (employee) => {
    return employee.userRole?.description?.toLowerCase().includes('администратор');
  };

  if (loading && employees.length === 0) {
    return (
      <div className="employees-page">
        <div className="employees-header">
          <h1 className="employees-title">Сотрудники</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1 className="employees-title">Сотрудники</h1>
        <button className="add-employee-btn" onClick={openAddModal} disabled={loading}>
          <i className="fas fa-plus"></i>
          Добавить сотрудника
        </button>
      </div>

      {/* Фильтры */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Поиск по имени, логину, email, должности, типу..."
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Все статусы</option>
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <select
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Все роли</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.description}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <select
              name="organizationUnit"
              value={filters.organizationUnit}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Все подразделения</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <select
              name="employeeType"
              value={filters.employeeType}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Все типы</option>
              {employeeTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <button className="clear-filters-btn" onClick={clearFilters}>
            Очистить фильтры
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Список сотрудников */}
      <div className="employees-list">
        <div className="employees-table-header">
          <div className="employee-cell">Фото</div>
          <div className="employee-cell">ФИО</div>
          <div className="employee-cell">Логин</div>
          <div className="employee-cell">Тип</div>
          <div className="employee-cell">Должность</div>
          <div className="employee-cell">Подразделение</div>
          <div className="employee-cell">Роль</div>
          <div className="employee-cell">Статус</div>
          <div className="employee-cell">Действия</div>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="no-employees">
            {employees.length === 0 ? 'Сотрудники не найдены' : 'По вашему запросу ничего не найдено'}
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div 
              key={emp.id} 
              className={`employee-row ${isAdmin(emp) ? 'admin-row' : ''}`}
            >
              <div className="employee-cell">
                {emp.photo ? (
                  <img
                    src={getUserPhotoUrl(emp.photo)}
                    alt="avatar"
                    className="employee-avatar"
                  />
                ) : (
                  <div className="employee-avatar-placeholder">
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
              <div className="employee-cell">
                <div className="employee-name">
                  {emp.fullName || emp.username}
                </div>
              </div>
                             <div className="employee-cell">{emp.username}</div>
               <div className="employee-cell employee-type-cell">
                 <span className="employee-type-badge">
                   {employeeTypes.find(type => type.value === emp.employeeType)?.label || '-'}
                 </span>
               </div>
               <div className="employee-cell">{emp.position || '-'}</div>
              <div className="employee-cell">{emp.organizationUnit?.name || '-'}</div>
              <div className="employee-cell">
                <span className={`role-badge ${isAdmin(emp) ? 'admin-role' : ''}`}>
                  {emp.userRole?.description || '-'}
                </span>
              </div>
              <div className="employee-cell">
                <span className={`status-badge status-${emp.status?.toLowerCase()}`}>
                  {Array.isArray(statuses) && statuses.find(s => s.value === emp.status)?.label || emp.status || '-'}
                </span>
              </div>
              <div className="employee-cell">
                <div className="employee-actions">
                  <button 
                    className="edit-btn" 
                    onClick={() => openEditModal(emp)}
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-btn" 
                    onClick={() => handleDelete(emp.id)}
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно */}
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
                <label className="form-label">Тип сотрудника</label>
                <select className="form-input" name="employeeType" value={editData.employeeType} onChange={handleInputChange} required>
                  <option value="">Выберите тип сотрудника</option>
                  {employeeTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
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
                    <option key={role.id} value={role.id}>{role.description}</option>
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