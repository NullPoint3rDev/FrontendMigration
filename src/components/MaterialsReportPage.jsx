import React from 'react';
import BaseReportPage from './BaseReportPage';

const MaterialsReportPage = () => {
    const reportConfig = {
        reportType: 'materials',
        title: 'Отчет по расходу материалов',
        description: 'Детальный учет расхода сварочных материалов: проволоки, газа, электродов и других расходных материалов',
        icon: '🔧'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default MaterialsReportPage;
