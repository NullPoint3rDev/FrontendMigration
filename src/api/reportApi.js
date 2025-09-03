import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const BASE_URL = `${API_BASE_URL}/reports`;

export const reportApi = {
    // Получить типы отчетов
    getReportTypes: async () => {
        try {
            console.log('Отправляем запрос на получение типов отчетов...');
            const res = await fetch(`${BASE_URL}/types`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            console.log('Статус ответа для типов отчетов:', res.status);
            
            if (!res.ok) {
                console.error('Ошибка получения типов отчетов:', res.status, res.statusText);
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            console.log('Полученные типы отчетов:', data);
            return data;
        } catch (error) {
            console.error('Ошибка в getReportTypes:', error);
            throw error;
        }
    },

    // Получить форматы отчетов
    getReportFormats: async () => {
        try {
            console.log('Отправляем запрос на получение форматов отчетов...');
            const res = await fetch(`${BASE_URL}/formats`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            console.log('Статус ответа для форматов отчетов:', res.status);
            
            if (!res.ok) {
                console.error('Ошибка получения форматов отчетов:', res.status, res.statusText);
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            console.log('Полученные форматы отчетов:', data);
            return data;
        } catch (error) {
            console.error('Ошибка в getReportFormats:', error);
            throw error;
        }
    },

    // Получить периоды отчетов
    getReportPeriods: async () => {
        try {
            console.log('Отправляем запрос на получение периодов отчетов...');
            const res = await fetch(`${BASE_URL}/periods`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            console.log('Статус ответа для периодов отчетов:', res.status);
            
            if (!res.ok) {
                console.error('Ошибка получения периодов отчетов:', res.status, res.statusText);
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            console.log('Полученные периоды отчетов:', data);
            return data;
        } catch (error) {
            console.error('Ошибка в getReportPeriods:', error);
            throw error;
        }
    },

    // Сгенерировать отчет по расходу проволоки
    generateWireConsumptionReport: async (requestData) => {
        const res = await fetch(`${BASE_URL}/wire-consumption`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestData)
        });
        return res.blob();
    },

    // Сгенерировать отчет по сварщику
    generateWelderReport: async (requestData) => {
        const res = await fetch(`${BASE_URL}/welder`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestData)
        });
        return res.blob();
    },

    // Сгенерировать отчет по работе
    generateWorkReport: async (requestData) => {
        const res = await fetch(`${BASE_URL}/work`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestData)
        });
        return res.blob();
    },

    // Универсальный метод для генерации отчетов
    generateReport: async (reportType, requestData) => {
        const endpoints = {
            // Старые типы отчетов
            'WIRE_CONSUMPTION': `${BASE_URL}/wire-consumption`,
            'WELDER_REPORT': `${BASE_URL}/welder`,
            'WORK_REPORT': `${BASE_URL}/work`,
            
            // Новые типы отчетов согласно требованиям
            'equipment': `${BASE_URL}/equipment`,
            'welders': `${BASE_URL}/welders`,
            'materials': `${BASE_URL}/materials`,
            'welds': `${BASE_URL}/welds`,
            'errors': `${BASE_URL}/errors`,
            'violations': `${BASE_URL}/violations`,
            'tasks': `${BASE_URL}/tasks`
        };

        const endpoint = endpoints[reportType];
        if (!endpoint) {
            throw new Error(`Неизвестный тип отчета: ${reportType}`);
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestData)
        });
        return res.blob();
    }
};

// Вспомогательные функции для работы с отчетами
export const reportHelpers = {
    // Скачать файл отчета
    downloadReport: (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    // Создать стандартный запрос отчета
    createReportRequest: (reportType, format, dateFrom, dateTo, period, filters = {}) => {
        return {
            reportType,
            format,
            dateFrom,
            dateTo,
            period,
            ...filters
        };
    },

    // Получить имя файла для отчета
    getReportFilename: (reportType, format) => {
        const timestamp = new Date().toISOString().slice(0, 10);
        const extensions = {
            'EXCEL': '.xlsx',
            'PDF': '.pdf',
            'CSV': '.csv'
        };
        
        const reportNames = {
            // Старые типы отчетов
            'WIRE_CONSUMPTION': 'wire_consumption_report',
            'WELDER_REPORT': 'welder_report',
            'WORK_REPORT': 'work_report',
            
            // Новые типы отчетов согласно требованиям
            'equipment': 'equipment_work_report',
            'welders': 'welders_work_report',
            'materials': 'wire_consumption_report',
            'welds': 'welds_quality_report',
            'errors': 'equipment_errors_report',
            'violations': 'welds_violations_report',
            'tasks': 'welding_tasks_report'
        };

        return `${reportNames[reportType]}_${timestamp}${extensions[format]}`;
    }
}; 