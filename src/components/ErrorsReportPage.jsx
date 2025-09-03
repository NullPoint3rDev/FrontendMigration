import React from 'react';
import BaseReportPage from './BaseReportPage';

const ErrorsReportPage = () => {
    const reportConfig = {
        reportType: 'errors',
        title: 'Отчет о неисправностях',
        description: 'Анализ ошибок и неисправностей сварочного оборудования с детализацией по типам неисправностей. Отчет включает: Сварочный аппарат, Модель, Серийный номер, Неисправность, Количество, Продолжительность, Дата',
        icon: '⚠️',
        commonErrors: [
            'Недостаточный уровень жидкости',
            'Нет потока жидкости',
            'Не подключено подающее устройство',
            'Узел контроля газа не подключен',
            'Ошибка системы охлаждения',
            'Проблемы с подачей проволоки',
            'Неисправность системы зажигания дуги'
        ]
    };

    return <BaseReportPage {...reportConfig} />;
};

export default ErrorsReportPage;
