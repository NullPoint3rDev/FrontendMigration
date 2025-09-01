import React from 'react';
import BaseReportPage from './BaseReportPage';

const ErrorsReportPage = () => {
    const reportConfig = {
        reportType: 'errors',
        title: 'Отчет по ошибкам сварочного оборудования',
        description: 'Анализ ошибок и неисправностей сварочного оборудования с рекомендациями по устранению',
        icon: '⚠️'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default ErrorsReportPage;
