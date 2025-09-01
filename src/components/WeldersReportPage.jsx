import React from 'react';
import BaseReportPage from './BaseReportPage';

const WeldersReportPage = () => {
    const reportConfig = {
        reportType: 'welders',
        title: 'Отчет по работе сварщиков',
        description: 'Анализ производительности сварщиков, качества работы, расхода материалов и времени выполнения задач',
        icon: '👷'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default WeldersReportPage;
