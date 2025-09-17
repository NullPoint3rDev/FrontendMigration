import React, { useState, useEffect } from 'react';
import NotificationsSection from './NotificationsSection';
import NotificationConstructor from './NotificationConstructor';
import NotificationTemplatesList from './NotificationTemplatesList';
import '../styles/notificationsPage.css';

const NotificationsPage = () => {
    const [templates, setTemplates] = useState([]);

    // Загружаем шаблоны уведомлений из localStorage
    useEffect(() => {
        const loadTemplates = () => {
            const savedTemplates = JSON.parse(localStorage.getItem('notificationTemplates') || '[]');
            setTemplates(savedTemplates);
        };

        loadTemplates();

        // Слушаем изменения в localStorage для обновления списка
        const handleStorageChange = () => {
            loadTemplates();
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Также обновляем при изменении в том же окне
        const interval = setInterval(loadTemplates, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    const handleTemplateCreated = () => {
        // Обновляем список шаблонов после создания нового
        const savedTemplates = JSON.parse(localStorage.getItem('notificationTemplates') || '[]');
        setTemplates(savedTemplates);
    };

    const handleTemplateDeleted = (templateId) => {
        // Обновляем список после удаления шаблона
        const updatedTemplates = templates.filter(t => t.id !== templateId);
        setTemplates(updatedTemplates);
    };

    return (
        <div className="notifications-page">
            <div className="notifications-header">
                <h1 className="notifications-title">Уведомления</h1>
            </div>
            
            <div className="notifications-content">
                {/* Конструктор уведомлений */}
                <div className="notification-constructor-section">
                    <NotificationConstructor onTemplateCreated={handleTemplateCreated} />
                </div>
                
                {/* Список шаблонов уведомлений */}
                <div className="notification-templates-section">
                    <NotificationTemplatesList 
                        templates={templates} 
                        onTemplateDeleted={handleTemplateDeleted}
                    />
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
