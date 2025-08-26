import React, { useEffect, useState } from 'react';
import '../styles/welders.css';
import { getAllEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/userAccountApi';

const defaultWelders = [
  {
    id: '1',
    name: 'Иванов Иван Иванович',
    status: 'активен',
    department: 'ООО "СварТех"',
    position: 'Сварщик 6-го разряда',
    grade: '6',
    employeeId: '12345',
    hireDate: '2020-01-15',
    birthDate: '1985-05-20',
    certificationDate: '2023-01-10',
    nextCertificationDate: '2024-01-10',
    phone: '+7 (999) 123-45-67',
    address: 'г. Москва, ул. Ленина, д. 10, кв. 15',
    rfidCode: 'A1B2C3D4',
    education: 'Среднее профессиональное образование, ГПТУ №7'
  }
];

const emptyWelder = {
  id: '',
  name: '',
  status: 'активен',
  department: '',
  position: '',
  grade: '',
  employeeId: '',
  hireDate: '',
  birthDate: '',
  certificationDate: '',
  nextCertificationDate: '',
  phone: '',
  address: '',
  rfidCode: '',
  education: ''
};

function WeldersPage() {
  const [welders, setWelders] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editWelder, setEditWelder] = useState(emptyWelder);
  const [isEdit, setIsEdit] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load organizations from localStorage for department dropdown
  useEffect(() => {
    const savedOrgs = localStorage.getItem('organizations');
    if (savedOrgs) {
      setOrganizations(JSON.parse(savedOrgs));
    }
  }, []);

  // Load welders from API
  const loadWelders = async () => {
    try {
      setLoading(true);
      const data = await getAllEmployees();
      setWelders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Ошибка загрузки сварщиков:', error);
      setWelders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWelders();
  }, []);

  const openAddModal = () => {
    setEditWelder(emptyWelder);
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEditModal = (welder) => {
    setEditWelder(welder);
    setIsEdit(true);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditWelder(emptyWelder);
    setIsEdit(false);
  };

  const handleChange = (e) => {
    setEditWelder({ ...editWelder, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (isEdit) {
        await updateEmployee(editWelder.id, editWelder);
      } else {
        await createEmployee(editWelder);
      }
      await loadWelders();
      closeModal();
    } catch (error) {
      console.error('Ошибка сохранения сварщика:', error);
      alert('Ошибка сохранения: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Вы уверены, что хотите удалить этого сварщика?')) {
      try {
        setLoading(true);
        await deleteEmployee(editWelder.id);
        await loadWelders();
        closeModal();
      } catch (error) {
        console.error('Ошибка удаления сварщика:', error);
        alert('Ошибка удаления: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && welders.length === 0) {
    return (
      <div>
        <div className="container">
          <div className="header">
            <h1>Сварщики</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Загрузка...
          </div>
        </div>
      </div>
    );
  }

  return (
      <div>
        <div className="container">
          <div className="header">
            <h1>Сварщики</h1>
            <button className="add-btn" onClick={openAddModal} disabled={loading}>Добавить</button>
          </div>
          <table className="welders-table">
            <thead>
            <tr>
              <th>ФИО</th>
              <th>Статус</th>
              <th>Подразделение</th>
              <th>Действия</th>
            </tr>
            </thead>
            <tbody>
            {welders.map((welder) => (
                <tr key={welder.id}>
                  <td>{welder.name}</td>
                  <td>{welder.status}</td>
                  <td>{welder.department}</td>
                  <td>
                    <button className="action-btn edit" onClick={() => openEditModal(welder)} disabled={loading}>
                      <span>Изменить</span>
                    </button>
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        <div className={`modal${modalOpen ? ' active' : ''}`} onClick={e => { if (e.target.classList.contains('modal')) closeModal(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{isEdit ? 'Редактировать сварщика' : 'Добавить сварщика'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="required">ФИО</label>
                <input type="text" name="name" value={editWelder.name} onChange={handleChange} required disabled={loading} />
              </div>

              <div className="form-group">
                <label className="required">Статус</label>
                <select name="status" value={editWelder.status} onChange={handleChange} required>
                  <option value="активен">Активен</option>
                  <option value="неактивен">Неактивен</option>
                </select>
              </div>

              <div className="form-group">
                <label className="required">Подразделение</label>
                <select name="department" value={editWelder.department} onChange={handleChange} required>
                  <option value="">Выберите организацию</option>
                  {organizations.map(org => (
                      <option key={org.id} value={org.name}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Должность</label>
                <input type="text" name="position" value={editWelder.position} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Разряд</label>
                <input type="text" name="grade" value={editWelder.grade} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Табельный номер</label>
                <input type="text" name="employeeId" value={editWelder.employeeId} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Дата приема на работу</label>
                <input type="date" name="hireDate" value={editWelder.hireDate} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Дата рождения</label>
                <input type="date" name="birthDate" value={editWelder.birthDate} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Дата аттестации</label>
                <input type="date" name="certificationDate" value={editWelder.certificationDate} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Дата следующей аттестации</label>
                <input type="date" name="nextCertificationDate" value={editWelder.nextCertificationDate} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Номер телефона</label>
                <input type="tel" name="phone" value={editWelder.phone} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Адрес</label>
                <input type="text" name="address" value={editWelder.address} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Код бесконтактной карты (RFID)</label>
                <input type="text" name="rfidCode" value={editWelder.rfidCode} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Сведения об образовании</label>
                <textarea name="education" value={editWelder.education} onChange={handleChange} />
              </div>

              <div className="modal-footer">
                {isEdit && (
                    <button type="button" className="modal-btn delete" onClick={handleDelete} disabled={loading}>Удалить</button>
                )}
                <div>
                  <button type="button" className="modal-btn cancel" onClick={closeModal} disabled={loading}>Отмена</button>
                  <button type="submit" className="modal-btn save" disabled={loading}>
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
}

export default WeldersPage; 