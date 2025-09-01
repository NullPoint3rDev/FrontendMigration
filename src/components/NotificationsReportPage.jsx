import React from 'react';
import BaseReportPage from './BaseReportPage';

const NotificationsReportPage = () => {
    const reportConfig = {
        reportType: 'notifications',
        title: 'Отправка уведомлений и отчетов по эл. почте',
        description: 'Автоматическая отправка отчетов и уведомлений по электронной почте с настраиваемыми параметрами',
        icon: '📧'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default NotificationsReportPage;
