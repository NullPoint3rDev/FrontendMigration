import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/welderProfile.css';

function WelderProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [welder, setWelder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWelder = () => {
      const savedWelders = localStorage.getItem('welders');
      if (savedWelders) {
        const welders = JSON.parse(savedWelders);
        const foundWelder = welders.find(w => String(w.id) === String(id));
        if (foundWelder) {
          setWelder(foundWelder);
        }
      }
      setLoading(false);
    };

    loadWelder();
  }, [id]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!welder) {
    return (
        <div className="not-found">
          <h2>Сварщик не найден</h2>
          <button onClick={() => navigate('/welders')}>Вернуться к списку сварщиков</button>
        </div>
    );
  }

  return (
      <div className="welder-profile">
        <div className="profile-header">
          <button className="back-btn" onClick={() => navigate('/welders')}>
            ← Назад к списку сварщиков
          </button>
          <h1>{welder.name}</h1>
        </div>

        <div className="profile-content">
          <div className="info-section">
            <h2>Основная информация</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Статус</label>
                <p>{welder.status}</p>
              </div>
              <div className="info-item">
                <label>Подразделение</label>
                <p>{welder.department}</p>
              </div>
              <div className="info-item">
                <label>Должность</label>
                <p>{welder.position}</p>
              </div>
              <div className="info-item">
                <label>Разряд</label>
                <p>{welder.grade}</p>
              </div>
              <div className="info-item">
                <label>Табельный номер</label>
                <p>{welder.employeeId}</p>
              </div>
              <div className="info-item">
                <label>RFID код</label>
                <p>{welder.rfidCode || 'Не указан'}</p>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h2>Даты</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Дата приема на работу</label>
                <p>{welder.hireDate || 'Не указана'}</p>
              </div>
              <div className="info-item">
                <label>Дата рождения</label>
                <p>{welder.birthDate || 'Не указана'}</p>
              </div>
              <div className="info-item">
                <label>Дата аттестации</label>
                <p>{welder.certificationDate || 'Не указана'}</p>
              </div>
              <div className="info-item">
                <label>Дата следующей аттестации</label>
                <p>{welder.nextCertificationDate || 'Не указана'}</p>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h2>Контактная информация</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Телефон</label>
                <p>{welder.phone || 'Не указан'}</p>
              </div>
              <div className="info-item">
                <label>Адрес</label>
                <p>{welder.address || 'Не указан'}</p>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h2>Образование</h2>
            <p className="education-info">{welder.education || 'Информация отсутствует'}</p>
          </div>
        </div>
      </div>
  );
}

export default WelderProfilePage; 