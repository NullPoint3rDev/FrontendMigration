import React, { useEffect, useState } from 'react';
import '../styles/organizations.css';
import { createOrganization, getAllOrganizations } from '../api/organizationApi';

const defaultOrganizations = [
  {
    id: '1',
    name: 'ООО "СварТех"',
    fullName: 'Общество с ограниченной ответственностью "СварТех"',
    businessArea: 'Производство сварочного оборудования',
    email: 'info@svartech.ru',
    website: 'https://svartech.ru',
    phones: ['+7 (495) 123-45-67', '+7 (495) 765-43-21'],
    address: 'г. Москва, ул. Сварочная, д. 1',
    director: 'Иванов Иван Иванович',
    inn: '7700123456',
    ogrn: '1027700123456',
  },
  {
    id: '2',
    name: 'ЗАО "МеталлСвар"',
    fullName: 'Закрытое акционерное общество "МеталлСвар"',
    businessArea: 'Металлообработка и сварка',
    email: 'contact@metallsvar.ru',
    website: 'https://metallsvar.ru',
    phones: ['+7 (812) 234-56-78'],
    address: 'г. Санкт-Петербург, пр. Металлистов, д. 10',
    director: 'Петров Петр Петрович',
    inn: '7812345678',
    ogrn: '1037812345678',
  },
];

const emptyOrg = {
  id: '',
  name: '',
  fullName: '',
  businessArea: '',
  email: '',
  website: '',
  phones: '',
  address: '',
  director: '',
  inn: '',
  ogrn: '',
};

function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOrg, setEditOrg] = useState(emptyOrg);
  const [isEdit, setIsEdit] = useState(false);

  // Загрузка организаций с сервера
  useEffect(() => {
    async function fetchOrgs() {
      try {
        const orgs = await getAllOrganizations();
        setOrganizations(orgs);
      } catch (e) {
        setOrganizations([]);
      }
    }
    fetchOrgs();
  }, []);

  const openAddModal = () => {
    setEditOrg(emptyOrg);
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEditModal = (org) => {
    setEditOrg({ ...org, phones: org.phones.join(', ') });
    setIsEdit(true);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditOrg(emptyOrg);
    setIsEdit(false);
  };

  const handleChange = (e) => {
    setEditOrg({ ...editOrg, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const orgData = {
      ...editOrg,
      phones: editOrg.phones.split(',').map((p) => p.trim()).filter(Boolean),
    };
    if (isEdit) {
      // TODO: реализовать updateOrganization аналогично create
    } else {
      try {
        await createOrganization(orgData);
        // После успешного создания — обновить список с сервера:
        const orgs = await getAllOrganizations();
        setOrganizations(orgs);
      } catch (err) {
        alert('Ошибка при создании организации');
      }
    }
    closeModal();
  };

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить эту организацию?')) {
      setOrganizations((prev) => prev.filter((org) => org.id !== editOrg.id));
      closeModal();
    }
  };

  return (
      <div>
        <div className="container">
          <div className="header">
            <h1>Организации</h1>
            <button className="add-btn" onClick={openAddModal}>Добавить</button>
          </div>
          <table className="organizations-table">
            <thead>
            <tr>
              <th>Наименование</th>
              <th>Действия</th>
            </tr>
            </thead>
            <tbody>
            {organizations.map((org) => (
                <tr key={org.id}>
                  <td>{org.name}</td>
                  <td>
                    <button className="action-btn edit" onClick={() => openEditModal(org)}>
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
              <h2 className="modal-title">{isEdit ? 'Редактировать организацию' : 'Добавить организацию'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="required">Наименование</label>
                <input type="text" name="name" value={editOrg.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Полное наименование организации</label>
                <input type="text" name="fullName" value={editOrg.fullName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Сфера деятельности</label>
                <input type="text" name="businessArea" value={editOrg.businessArea} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={editOrg.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Сайт организации</label>
                <input type="url" name="website" value={editOrg.website} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Номера телефонов</label>
                <input type="text" name="phones" value={editOrg.phones} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Адрес</label>
                <input type="text" name="address" value={editOrg.address} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Руководитель</label>
                <input type="text" name="director" value={editOrg.director} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>ИНН</label>
                <input type="text" name="inn" value={editOrg.inn} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>ОГРН(ОГРНИП)</label>
                <input type="text" name="ogrn" value={editOrg.ogrn} onChange={handleChange} />
              </div>
              <div className="modal-footer">
                {isEdit && (
                    <button type="button" className="modal-btn delete" onClick={handleDelete}>Удалить</button>
                )}
                <div>
                  <button type="button" className="modal-btn cancel" onClick={closeModal}>Отмена</button>
                  <button type="submit" className="modal-btn save">Сохранить</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
}

export default OrganizationsPage; 