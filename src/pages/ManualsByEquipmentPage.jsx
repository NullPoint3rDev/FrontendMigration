import React from 'react';
import { useParams } from 'react-router-dom';


const manualsData = {
  1: [
    { name: 'МС.03.0044 Руководство  по эксплуатации МС-501 MX Pulse.pdf', file: '/manuals/МС.03.0044 Руководство  по эксплуатации МС -351 501 MX Pulse 2025.pdf' },
  ],
  2: [
    { name: 'МС.03.0109 Руководство по эксплуатации МС-315,500 Т2.pdf', file: '/manuals/МС.03.0109 Руководство по эксплуатации МС-315,500 Т2 ACDC нов лиц 2025.pdf' },
  ],
  3: [
    { name: 'МС.03.0012 Руководство по эксплуатации МС-500 М1.pdf', file: '/manuals/МС.03.0012 Руководство по эксплуатации МС-350 500 М1 2025.pdf' },
  ],
  4: [
    { name: 'МС.03.0013 Руководство по эксплуатации 1001 А1.pdf', file: '/manuals/МС.03.0013 Руководство по эксплуатации 1001 А1, 1251 А1 2025.pdf' },
  ],
  5: [
    { name: 'МС.03.0014 Руководство  по эксплуатации МС-501 MX.pdf', file: '/manuals/МС.03.0014 Руководство  по эксплуатации МС-501 MX 2025.pdf' },
  ],
  // 6: [
  //   { name: 'Руководство  БМ 500.pdf', file: '/manuals/БМ 500.pdf' },
  // ],
};

const equipmentNames = {
  1: 'MC-501-MXPULSE',
  2: 'T2',
  3: 'MC500M1',
  4: 'MC-1001A1',
  5: 'МС-501 MX',
 // 6: 'БМ 500',
};

const ManualsByEquipmentPage = () => {
  const { id } = useParams();
  const manuals = manualsData[id] || [];
  const equipmentName = equipmentNames[id] || '';

  return (
    <div className="manuals-list" style={{ maxWidth: 700, margin: '60px auto', background: 'rgba(255,255,255,0.03)', borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '2.5rem 2rem' }}>
      <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '2.5rem', color: '#fff', letterSpacing: 0.5 }}>Руководства для {equipmentName}</h2>
      {manuals.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc', fontSize: '1.1rem' }}>Нет руководств для этого аппарата.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {manuals.map((manual, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <span style={{ fontSize: '1.08rem', color: '#fff', fontWeight: 500 }}>{manual.name}</span>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href={manual.file} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--primary, #6C63FF)', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: 8, textDecoration: 'none', fontWeight: 500, fontSize: '1rem', transition: 'background 0.2s' }}>
                  Просмотреть
                </a>
                <a href={manual.file} download style={{ background: 'var(--secondary, #FF6584)', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: 8, textDecoration: 'none', fontWeight: 500, fontSize: '1rem', transition: 'background 0.2s' }}>
                  Скачать
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManualsByEquipmentPage; 