import React, { useEffect, useRef, useState } from 'react';
import '../styles/organizations.css';

export default function OrganizationModal({ visible, onClose, organization, onSave, onDelete }) {
  const modalRef = useRef();
  const [form, setForm] = useState({
    name: '',
    fullName: '',
    businessArea: '',
    email: '',
    website: '',
    phones: '',
    address: '',
    director: '',
    inn: '',
    ogrn: ''
  });

  useEffect(() => {
    if (organization) {
      setForm({
        ...organization,
        phones: Array.isArray(organization.phones) ? organization.phones.join(', ') : organization.phones || ''
      });
    } else {
      setForm({
        name: '',
        fullName: '',
        businessArea: '',
        email: '',
        website: '',
        phones: '',
        address: '',
        director: '',
        inn: '',
        ogrn: ''
      });
    }
  }, [organization, visible]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose]);

  if (!visible) return null;

  const handleChange = e => setForm({ ...form, [e.target.id]: e.target.value });

  const handleSubmit = e => {
    e.preventDefault();
    onSave({
      ...form,
      phones: form.phones.split(',').map(p => p.trim())
    });
  };

  return (
      <div className="modal active">
        <div className="modal-content" ref={modalRef}>
          <div className="modal-header">
            <h2 className="modal-title">{organization ? 'Редактировать организацию' : 'Добавить организацию'}</h2>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="required">Наименование</label>
              <input type="text" id="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Полное наименование организации</label>
              <input type="text" id="fullName" value={form.fullName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Сфера деятельности</label>
              <input type="text" id="businessArea" value={form.businessArea} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" id="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Сайт организации</label>
              <input type="url" id="website" value={form.website} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Номера телефонов</label>
              <input type="text" id="phones" value={form.phones} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Адрес</label>
              <input type="text" id="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Руководитель</label>
              <input type="text" id="director" value={form.director} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>ИНН</label>
              <input type="text" id="inn" value={form.inn} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>ОГРН(ОГРНИП)</label>
              <input type="text" id="ogrn" value={form.ogrn} onChange={handleChange} />
            </div>
            <div className="modal-footer">
              {organization && (
                  <button type="button" className="modal-btn delete" onClick={() => onDelete(organization.id)}>
                    Удалить
                  </button>
              )}
              <div>
                <button type="button" className="modal-btn cancel" onClick={onClose}>Отмена</button>
                <button type="submit" className="modal-btn save">Сохранить</button>
              </div>
            </div>
          </form>
        </div>
      </div>
  );
}