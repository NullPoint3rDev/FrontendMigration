import React from 'react';
import BaseReportPage from './BaseReportPage';

const ErrorsReportPage = () => {
    const reportConfig = {
        reportType: 'errors',
        title: 'Отчет о неисправностях',
        description: 'Анализ ошибок и неисправностей сварочного оборудования с детализацией по типам неисправностей. Отчет включает: Сварочный аппарат, Модель, Серийный номер, Неисправность, Количество, Продолжительность, Дата',
        icon: '⚠️'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default ErrorsReportPage;
