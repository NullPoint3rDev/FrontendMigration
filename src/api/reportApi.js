import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../services/api';

const BASE_URL = `${API_BASE_URL}/reports`;

export const reportApi = {
    // Получить типы отчетов
    getReportTypes: async () => {
        const res = await fetch(`${BASE_URL}/types`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return res.json();
    },

    // Получить форматы отчетов
    getReportFormats: async () => {
        const res = await fetch(`${BASE_URL}/formats`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return res.json();
    },

    // Получить периоды отчетов
    getReportPeriods: async () => {
        const res = await fetch(`${BASE_URL}/periods`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return res.json();
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
            'WIRE_CONSUMPTION': `${BASE_URL}/wire-consumption`,
            'WELDER_REPORT': `${BASE_URL}/welder`,
            'WORK_REPORT': `${BASE_URL}/work`
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
            'PDF': '.pdf'
        };
        
        const reportNames = {
            'WIRE_CONSUMPTION': 'wire_consumption_report',
            'WELDER_REPORT': 'welder_report',
            'WORK_REPORT': 'work_report'
        };

        return `${reportNames[reportType]}_${timestamp}${extensions[format]}`;
    }
}; 