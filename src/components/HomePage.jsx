import React from 'react';
import '../styles/main_page.css';

const HomePage = () => {
    return (
        <div className="main-content">
            <h2 className="neon-text">
                Добро пожаловать в систему управления сварочным процессом WELDTelecom
            </h2>
            <img
                src={require('../assets/images/wt.webp')}
                alt="Интерфейс WELDTelecom"
                style={{
                    maxWidth: '1800px',
                    margin: '85px auto',
                    display: 'block',
                    width: '90%',
                    borderRadius: '20px',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.4)'
                }}
            />
        </div>
    );
};

export default HomePage; 