import React from 'react';
import BaseReportPage from './BaseReportPage';

const TasksReportPage = () => {
    const reportConfig = {
        reportType: 'tasks',
        title: 'Отчет о выполнении сварочного задания',
        description: 'Анализ выполнения сварочных заданий, сроков, качества и эффективности работ',
        icon: '📋'
    };

    return <BaseReportPage {...reportConfig} />;
};

export default TasksReportPage;
