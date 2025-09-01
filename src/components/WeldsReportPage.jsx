import React from 'react';
import BaseReportPage from './BaseReportPage';

const WeldsReportPage = () => {
    const reportConfig = {
        reportType: 'welds',
        title: 'Отчет по сварочным швам',
        description: 'Анализ качества сварочных швов, параметров сварки и соответствия техническим требованиям',
        icon: '🔗'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default WeldsReportPage;
