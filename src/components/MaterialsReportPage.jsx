import React from 'react';
import BaseReportPage from './BaseReportPage';

const MaterialsReportPage = () => {
    const reportConfig = {
        reportType: 'materials',
        title: 'Отчет по расходу проволоки',
        description: 'Детальный учет расхода сварочной проволоки с показателями эффективности работы сварщиков. Отчет включает: Сварщик, Должность, Время в сети, Время горения дуги, Эффективность работы, Энергия, Проволока, Расход (кг)',
        icon: '🔧'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default MaterialsReportPage;
