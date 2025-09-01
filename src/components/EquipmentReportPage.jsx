import React from 'react';
import BaseReportPage from './BaseReportPage';

const EquipmentReportPage = () => {
    const reportConfig = {
        reportType: 'equipment',
        title: 'Отчет по работе оборудования',
        description: 'Детальный анализ работы сварочного оборудования с показателями производительности, расхода материалов и техническими параметрами',
        icon: '⚙️'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default EquipmentReportPage;
