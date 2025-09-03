import React from 'react';
import BaseReportPage from './BaseReportPage';

const EquipmentReportPage = () => {
    const reportConfig = {
        reportType: 'equipment',
        title: 'Отчет о работе оборудования',
        description: 'Детальный анализ работы сварочного оборудования с показателями производительности, расхода материалов и техническими параметрами. Отчет включает: Дата, Время, Сварщик, Режим, Сила тока, Масса проволоки, Напряжение, Проволока, Газ л/мин, Время сварки (с)',
        icon: '⚙️'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default EquipmentReportPage;
