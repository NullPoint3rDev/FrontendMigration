import React from 'react';
import '../styles/plugPage.css';
import NotificationPlug from '../images/NotificationPlug.jpg';

const NotificationsPage = () => {
    return (
        <div className="plug-page">
            <div className="plug-image-container">
                <img src={NotificationPlug} alt="Уведомления" className="plug-image" />
            </div>
            <div className="plug-text">Пока не доварили</div>
        </div>
    );
};

export default NotificationsPage;
