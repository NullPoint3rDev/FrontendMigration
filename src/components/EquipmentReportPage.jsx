import React from 'react';
import BaseReportPage from './BaseReportPage';

const EquipmentReportPage = () => {
    const reportConfig = {
        reportType: 'equipment',
        title: 'Отчет о работе оборудования',
        description: 'Детальный анализ работы сварочного оборудования с показателями производительности, расхода материалов и техническими параметрами. Отчет включает: Дата, Время, Сварщик, Режим, Сила тока, Масса проволоки, Напряжение, Проволока, Газ л/мин, Время сварки (с)',
        icon: '⚙️',
        reportStructure: [
            {
                field: 'Дата',
                description: 'Дата проведения сварочных работ'
            },
            {
                field: 'Время',
                description: 'Время начала сварочных работ'
            },
            {
                field: 'Сварщик',
                description: 'ФИО сварщика, выполняющего работы'
            },
            {
                field: 'Режим',
                description: 'Режим работы сварочного аппарата (MIG/MAG, TIG и др.)'
            },
            {
                field: 'Сила тока',
                description: 'Сила тока в амперах (А)'
            },
            {
                field: 'Масса проволоки',
                description: 'Масса израсходованной проволоки в граммах'
            },
            {
                field: 'Напряжение',
                description: 'Напряжение в вольтах (В)'
            },
            {
                field: 'Проволока',
                description: 'Тип и диаметр используемой проволоки'
            },
            {
                field: 'Газ л/мин',
                description: 'Расход защитного газа в литрах в минуту'
            },
            {
                field: 'Время сварки (с)',
                description: 'Продолжительность сварочных работ в секундах'
            }
        ]
    };

    return <BaseReportPage {...reportConfig} />;
};

export default EquipmentReportPage;
