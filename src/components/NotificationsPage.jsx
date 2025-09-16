import React, { useState, useEffect } from 'react';
import NotificationsSection from './NotificationsSection';
import NotificationConstructor from './NotificationConstructor';
import '../styles/notificationsPage.css';

const NotificationsPage = () => {
    return (
        <div className="notifications-page">
            <div className="notifications-header">
                <h1 className="notifications-title">Уведомления</h1>
            </div>
            
            <div className="notifications-content">
                {/* Конструктор уведомлений */}
                <div className="notification-constructor-section">
                    <NotificationConstructor />
                </div>
                
                {/* Список уведомлений */}
                <div className="notifications-list-section">
                    <NotificationsSection />
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
