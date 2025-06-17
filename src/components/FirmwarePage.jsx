import React from 'react';
import '../styles/firmware_page.css';

const machines = [
  {
    id: 1,
    name: 'МС-501 MX',
    image: '/images/МС-501 MX.jpg',
    description: 'МС-501 MX',
    firmwareFiles: [
      {
        name: 'МС-501 MX v1.2.3',
        file: 'MC501MX_v1.2.3.hex',
        date: '2024-02-15',
        description: 'Прошивка для платы МС-01-0244-02'
      },
      {
        name: 'МС-501 MX v1.1.0',
        file: 'MC501MX_v1.1.0.hex',
        date: '2023-12-10',
        description: 'Базовая версия прошивки'
      }
    ],
    instructions: [
      {
        name: 'Инструкция по прошивке платы МС-01-0244-02',
        file: 'public/docs/Инструкция по прошивке платы 244-01.docx',
        type: '.docx'
      },
      // {
      //   name: 'Описание изменений',
      //   file: 'MC501MX_changelog.txt',
      //   type: 'TXT'
      // }
    ]
  },
  {
    id: 2,
    name: 'БМ 500',
    image: '/images/БМ 500.jpg',
    description: 'Блок механизма подачи проволоки БМ 500',
    firmwareFiles: [
      {
        name: 'БМ 500 v2.0.1',
        file: 'BM500_v2.0.1.hex',
        date: '2024-01-20',
        description: 'Улучшенный контроль подачи проволоки'
      }
    ],
    instructions: [
      {
        name: 'Инструкция по прошивке',
        file: 'BM500_firmware_guide.pdf',
        type: 'PDF'
      }
    ]
  },
  {
    id: 3,
    name: 'T2',
    image: '/images/T2.jpg',
    description: 'Сварочный аппарат T2',
    firmwareFiles: [
      {
        name: 'T2 v3.1.0',
        file: 'T2_v3.1.0.hex',
        date: '2024-02-01',
        description: 'Новые режимы сварки и улучшенный интерфейс'
      },
      {
        name: 'T2 v3.0.2',
        file: 'T2_v3.0.2.hex',
        date: '2023-11-25',
        description: 'Исправление ошибок и оптимизация'
      }
    ],
    instructions: [
      {
        name: 'Руководство по обновлению',
        file: 'T2_update_manual.pdf',
        type: 'PDF'
      },
      {
        name: 'Технические заметки',
        file: 'T2_tech_notes.txt',
        type: 'TXT'
      }
    ]
  }
];

const FirmwarePage = () => {
  const handleDownload = (fileName) => {
    const fileUrl = `/firmware/${fileName}`;
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="firmware-page">
      <div className="firmware-header">
        <h1>Прошивки и обновления</h1>
        <p>Здесь вы можете скачать последние версии прошивок для сварочного оборудования WeldTelecom</p>
      </div>

      <div className="machines-grid">
        {machines.map(machine => (
          <div key={machine.id} className="machine-card">
            <div className="machine-image">
              <img src={machine.image} alt={machine.name} />
            </div>
            
            <div className="machine-info">
              <h2>{machine.name}</h2>
              <p>{machine.description}</p>
              
              <div className="firmware-section">
                <h3>Прошивки</h3>
                {machine.firmwareFiles.map((firmware, index) => (
                  <div key={index} className="firmware-item">
                    <div className="firmware-info">
                      <h4>{firmware.name}</h4>
                      <p>{firmware.description}</p>
                      <span className="firmware-date">Дата выпуска: {firmware.date}</span>
                    </div>
                    <button 
                      className="download-btn"
                      onClick={() => handleDownload(firmware.file)}
                    >
                      <i className="fas fa-download"></i>
                      Скачать
                    </button>
                  </div>
                ))}
              </div>

              <div className="instructions-section">
                <h3>Инструкции</h3>
                <div className="instructions-grid">
                  {machine.instructions.map((instruction, index) => (
                    <div key={index} className="instruction-item">
                      <div className="instruction-icon">
                        <i className={`fas fa-${instruction.type === 'PDF' ? 'file-pdf' : 'file-alt'}`}></i>
                      </div>
                      <div className="instruction-info">
                        <h4>{instruction.name}</h4>
                        <span className="file-type">{instruction.type}</span>
                      </div>
                      <button 
                        className="download-btn"
                        onClick={() => handleDownload(instruction.file)}
                      >
                        <i className="fas fa-download"></i>
                        Скачать
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FirmwarePage; 