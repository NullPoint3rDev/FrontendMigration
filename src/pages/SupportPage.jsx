import React, { useState } from 'react';
import '../styles/equipmentPage.css';

const FAQ = [
  {
    question: 'Как управлять аппаратом?',
    answer: 'Для управления аппаратом перейдите на вкладку Ресурсы -> Сварочное оборудование.' +
        'После, на интересующем аппарате нажмите "Управление".'
  },
  {
    question: 'Как добавить нового пользователя?',
    answer: 'Пользователей может добавлять только администратор через раздел "Сотрудники".'
  },
  {
    question: 'Как загрузить документ в библиотеку?',
    answer: 'Перейдите в раздел "Обучение -> Библиотека" и используйте кнопку "Добавить".'
  },
];

const SupportPage = () => {
  const [form, setForm] = useState({ message: '', fio: '', phone: '' });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess(false);
    try {
      // username можно получить из localStorage или контекста, здесь для примера:
      const username = localStorage.getItem('username') || 'anonymous';
      const res = await fetch((process.env.REACT_APP_API_URL || 'http://192.168.10.137:8084/api') + '/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, username })
      });
      if (!res.ok) throw new Error('Ошибка отправки');
      setSuccess(true);
      setForm({ message: '', fio: '', phone: '' });
    } catch (e) {
      setError('Ошибка отправки обращения');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container equipment-page">
      <div className="header equipment-header">
        <h1 className="equipment-title">Поддержка</h1>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ color: '#fff', marginBottom: 16 }}>FAQ</h2>
        <div style={{ marginBottom: 32 }}>
          {FAQ.map((item, idx) => (
            <div key={idx} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: '#6C63FF' }}>{item.question}</div>
              <div style={{ color: '#fff', opacity: 0.85 }}>{item.answer}</div>
            </div>
          ))}
        </div>
        <h2 style={{ color: '#fff', marginBottom: 16 }}>Обратиться в поддержку</h2>
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.05)', padding: 24, borderRadius: 12, marginBottom: 32 }}>
          <div className="form-group">
            <label className="required">Суть обращения</label>
            <textarea name="message" value={form.message} onChange={handleChange} required style={{ width: '100%', minHeight: 80 }} />
          </div>
          <div className="form-group">
            <label className="required">ФИО</label>
            <input name="fio" value={form.fio} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          <div className="form-group">
            <label className="required">Телефон</label>
            <input name="phone" value={form.phone} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          {error && <div className="error-message" style={{ marginBottom: 8 }}>{error}</div>}
          {success && <div style={{ color: 'var(--accent)', marginBottom: 8 }}>Обращение отправлено!</div>}
          <button className="modal-btn save" type="submit" disabled={sending}>{sending ? 'Отправка...' : 'Отправить'}</button>
        </form>
      </div>
    </div>
  );
};

export default SupportPage; 