import React from 'react';
import { useNavigate } from 'react-router-dom';

const equipmentList = [
  { id: 1, name: 'MC-501-MXPULSE', image: '/images/mx_pulse.webp' },
  { id: 2, name: 'T2', image: '/images/T2.jpg' },
  { id: 3, name: 'MC500M1', image: '/images/MC500M1.jpg' },
  { id: 4, name: 'MC-1001A1', image: '/images/MC-1001A1.jpg' },
  { id: 5, name: 'МС-501 MX', image: '/images/МС-501 MX.jpg' },
 // { id: 6, name: 'БМ 500', image: '/images/БМ 500.jpg' },
];

const ManualsPage = () => {
  const navigate = useNavigate();

  const handleEquipmentClick = (equipment) => {
    navigate(`/manuals/${equipment.id}`);
  };

  return (
    <div className="equipment-list">
      <h2 style={{textAlign: 'center', marginBottom: '2rem'}}>Руководства по эксплуатации</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem', justifyContent: 'center' }}>
        {equipmentList.map((eq) => (
          <div
            key={eq.id}
            className="equipment-item"
            style={{ cursor: 'pointer', width: 340, minHeight: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: 18, background: 'rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', transition: 'transform 0.2s', position: 'relative' }}
            onClick={() => handleEquipmentClick(eq)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <img src={eq.image} alt={eq.name} className="equipment-image" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 14, marginBottom: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }} />
            <div className="equipment-info" style={{width: '100%', textAlign: 'center'}}>
              <h3 style={{fontSize: '1.25rem', fontWeight: 600, color: '#fff', margin: 0, letterSpacing: 0.5}}>{eq.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManualsPage; 