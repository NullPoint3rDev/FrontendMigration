import React from 'react';
import BaseReportPage from './BaseReportPage';

const ErrorsReportPage = () => {
    const reportConfig = {
        reportType: 'errors',
        title: 'Отчет о неисправностях',
        description: 'Анализ ошибок и неисправностей сварочного оборудования с детализацией по типам неисправностей. Отчет включает: Дата, Оборудование, Тип неисправности, Описание, Статус',
        icon: '⚠️'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default ErrorsReportPage;
