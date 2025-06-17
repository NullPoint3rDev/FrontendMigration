import React from 'react';
import '../styles/about_page.css';

const documents = [
  {
    id: 1,
    title: 'Свидетельство о регистрации программы ЭВМ',
    description: 'Официальное свидетельство о регистрации программы для ЭВМ',
    fileName: 'Свидетельство о рег-ии прог ЭВМ.pdf',
    icon: 'fas fa-file-pdf'
  },
  {
    id: 2,
    title: 'Свидетельство на товарный знак',
    description: 'Свидетельство о регистрации товарного знака',
    fileName: 'СВИДЕТЕЛЬСТВО ТОВАРНЫЙ ЗНАК.pdf',
    icon: 'fas fa-file-pdf'
  },
  {
    id: 3,
    title: 'Патент на WT',
    description: 'Патент на технологию WT',
    fileName: 'Патент на WT.pdf',
    icon: 'fas fa-certificate'
  }
];

const AboutPage = () => {
  const handleDownload = (fileName) => {
    const fileUrl = `/docs/${fileName}`;
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="about-page">
      <div className="about-header">
        <h1 className="about-title">О программе WeldTelecom</h1>
      </div>

      <div className="about-content">
        <section className="about-section">
          <div className="about-text">
            <h2>Инновационные решения для сварочного производства</h2>
            <p>
              WeldTelecom - ведущий разработчик систем мониторинга сварочного оборудования. 
              Наша компания специализируется на создании интеллектуальных решений для 
              повышения эффективности и качества сварочных работ.
            </p>
            <p>
              Мы разрабатываем и внедряем современные технологии, которые позволяют 
              предприятиям оптимизировать производственные процессы, снижать затраты и 
              повышать качество выпускаемой продукции.
            </p>
          </div>
          <div className="about-image">
            <img 
              src="/images/wt_about1.webp" 
              alt="WeldTelecom технологии" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/wt.webp';
              }}
            />
          </div>
        </section>

        <section className="about-section reverse">
          <div className="about-text">
            <h2>Наши преимущества</h2>
            <ul className="features-list">
              <li>Собственные разработки и патенты</li>
              <li>Интеграция с любым сварочным оборудованием</li>
              <li>Мониторинг в реальном времени</li>
              <li>Аналитика и отчетность</li>
              <li>Техническая поддержка 24/7</li>
              <li>Опыт работы с крупнейшими предприятиями</li>
            </ul>
          </div>
          <div className="about-image">
            <img 
              src="/images/wt_about2.webp" 
              alt="Преимущества WeldTelecom" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/wt.webp';
              }}
            />
          </div>
        </section>

        <section className="about-section">
          <div className="about-text">
            <h2>Технологии будущего</h2>
            <p>
              Наши системы используют передовые технологии искусственного интеллекта 
              и машинного обучения для анализа сварочных процессов. Это позволяет 
              предсказывать возможные дефекты и оптимизировать параметры сварки 
              для достижения наилучших результатов.
            </p>
            <p>
              Мы постоянно совершенствуем наши решения, внедряя новые функции и 
              улучшая существующие возможности системы.
            </p>
          </div>
          <div className="about-image">
            <img 
              src="/images/wt_about3.webp" 
              alt="Технологии WeldTelecom" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/wt.webp';
              }}
            />
          </div>
        </section>

        <section className="documents-section">
          <h2>Документация и сертификаты</h2>
          <div className="documents-grid">
            {documents.map(doc => (
              <div key={doc.id} className="document-card" onClick={() => handleDownload(doc.fileName)}>
                <div className="document-icon">
                  <i className={doc.icon}></i>
                </div>
                <div className="document-info">
                  <h3>{doc.title}</h3>
                  <p>{doc.description}</p>
                </div>
                <button className="download-btn">
                  <i className="fas fa-download"></i>
                  Скачать
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="contact-section">
          <h2>Свяжитесь с нами</h2>
          <div className="contact-info">
            <div className="contact-item">
              <i className="fas fa-phone"></i>
              <p>+7 (920) 000 02 76</p>
            </div>
            <div className="contact-item">
              <i className="fas fa-envelope"></i>
              <p>https://alloynn.com/weldtelecom/</p>
            </div>
            <div className="contact-item">
              <i className="fas fa-map-marker-alt"></i>
              <p>г. Нижний Новгород</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage; 