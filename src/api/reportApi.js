import { apiRequest } from '../services/api';

const BASE_URL = 'http://localhost:8080/api/reports';

export const reportApi = {
    // Получить типы отчетов
    getReportTypes: () => {
        return apiRequest(`${BASE_URL}/types`, 'GET');
    },

    // Получить форматы отчетов
    getReportFormats: () => {
        return apiRequest(`${BASE_URL}/formats`, 'GET');
    },

    // Получить периоды отчетов
    getReportPeriods: () => {
        return apiRequest(`${BASE_URL}/periods`, 'GET');
    },

    // Сгенерировать отчет по расходу проволоки
    generateWireConsumptionReport: (requestData) => {
        return apiRequest(`${BASE_URL}/wire-consumption`, 'POST', requestData, {
            responseType: 'blob'
        });
    },

    // Сгенерировать отчет по сварщику
    generateWelderReport: (requestData) => {
        return apiRequest(`${BASE_URL}/welder`, 'POST', requestData, {
            responseType: 'blob'
        });
    },

    // Сгенерировать отчет по работе
    generateWorkReport: (requestData) => {
        return apiRequest(`${BASE_URL}/work`, 'POST', requestData, {
            responseType: 'blob'
        });
    },

    // Универсальный метод для генерации отчетов
    generateReport: (reportType, requestData) => {
        const endpoints = {
            'WIRE_CONSUMPTION': `${BASE_URL}/wire-consumption`,
            'WELDER_REPORT': `${BASE_URL}/welder`,
            'WORK_REPORT': `${BASE_URL}/work`
        };

        const endpoint = endpoints[reportType];
        if (!endpoint) {
            throw new Error(`Неизвестный тип отчета: ${reportType}`);
        }

        return apiRequest(endpoint, 'POST', requestData, {
            responseType: 'blob'
        });
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