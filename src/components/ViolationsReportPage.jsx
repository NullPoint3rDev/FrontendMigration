import React from 'react';
import BaseReportPage from './BaseReportPage';

const ViolationsReportPage = () => {
    const reportConfig = {
        reportType: 'violations',
        title: 'Перечень швов, выполненных с нарушением',
        description: 'Детальный анализ сварочных швов, выполненных с нарушениями технологических требований',
        icon: '❌'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default ViolationsReportPage;
