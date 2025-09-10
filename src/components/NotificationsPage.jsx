import React, { useState, useEffect } from 'react';
import NotificationsSection from './NotificationsSection';
import AutomatedReportsSection from './AutomatedReportsSection';
import '../styles/notificationsPage.css';

const NotificationsPage = () => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (newValue) => {
        setActiveTab(newValue);
    };

    return (
        <div className="notifications-page">
            <div className="notifications-header">
                <h1 className="notifications-title">Уведомления</h1>
            </div>
            
            <div className="notifications-tabs">
                <div className="tab-buttons">
                    <button 
                        className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
                        onClick={() => handleTabChange(0)}
                    >
                        <i className="fas fa-bell"></i>
                        Уведомления
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
                        onClick={() => handleTabChange(1)}
                    >
                        <i className="fas fa-clock"></i>
                        Автоматизированные отчеты
                    </button>
                </div>
                
                <div className="tab-content">
                    {activeTab === 0 && <NotificationsSection />}
                    {activeTab === 1 && <AutomatedReportsSection />}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
