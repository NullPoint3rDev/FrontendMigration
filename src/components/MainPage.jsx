import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/main_page.css';

export default function MainPage() {
    return (
        <>
            <Navbar />
            <div className="main-content">
                <h2 className="neon-text">Добро пожаловать в систему управления сварочным процессом WELDTelecom</h2>
                <img src="/images/wt.webp" alt="Интерфейс WELDTelecom" style={{ maxWidth: 1800, margin: '85px auto', display: 'block' }} />
            </div>
        </>
    );
}