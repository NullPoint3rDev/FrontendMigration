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

            let data = await res.json();
            // Для соответствия требованиям исключаем PDF для фронтенда
            if (Array.isArray(data)) {
                data = data.filter(f => f !== 'PDF');
            }
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
    },

    // Сохранить отчет в базе данных
    saveReport: async (reportData) => {
        try {
            const res = await fetch(`${BASE_URL}/save`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(reportData)
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Ошибка сохранения отчета:', error);
            throw error;
        }
    },

    // Получить список сохраненных отчетов
    getSavedReports: async (reportType) => {
        try {
            const res = await fetch(`${BASE_URL}/saved/${reportType}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Ошибка получения отчетов:', error);
            throw error;
        }
    },

    // Получить данные отчета для просмотра
    getReportData: async (reportId) => {
        try {
            const res = await fetch(`${BASE_URL}/data/${reportId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Ошибка получения данных отчета:', error);
            throw error;
        }
    },

    // Получить данные отчета для просмотра онлайн
    getReportDataForViewing: async (reportType, requestData) => {
        try {
            const res = await fetch(`${BASE_URL}/data/${reportType}`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Ошибка получения данных отчета для просмотра:', error);
            throw error;
        }
    },

    // Удалить отчет
    deleteReport: async (reportId) => {
        try {
            const res = await fetch(`${BASE_URL}/delete/${reportId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Ошибка удаления отчета:', error);
            throw error;
        }
    },

    // Генерация отчета на основе нового шаблона ReportTemplate
    generateReportFromTemplate: async (templateId, periodStartDate, periodEndDate, periodStartTime, periodEndTime) => {
        try {
            const requestBody = {
                templateId: templateId,
                periodStartDate: periodStartDate,
                periodEndDate: periodEndDate,
                periodStartTime: periodStartTime,
                periodEndTime: periodEndTime
            };

            const response = await fetch(`${BASE_URL}/generate-from-template`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Получаем файл как blob
            const blob = await response.blob();

            // Создаем ссылку для скачивания
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Получаем имя файла из заголовков
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'report.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            return { success: true };
        } catch (error) {
            console.error('Ошибка генерации отчета:', error);
            throw error;
        }
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
    },

    // Генерация данных для разных типов отчетов
    generateReportData: (reportType, rowCount = 50) => {
        const mockData = [];

        for (let i = 0; i < rowCount; i++) {
            const row = {};

            switch (reportType) {
                case 'equipment':
                    row['Дата'] = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
                    row['Время'] = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    row['Сварщик'] = `Сварщик ${Math.floor(Math.random() * 10) + 1}`;
                    row['Режим'] = ['Ручной', 'Автоматический', 'Полуавтоматический'][Math.floor(Math.random() * 3)];
                    row['Сила тока'] = `${Math.floor(Math.random() * 200) + 100} А`;
                    row['Масса проволоки'] = `${(Math.random() * 5 + 1).toFixed(2)} кг`;
                    row['Напряжение'] = `${(Math.random() * 20 + 20).toFixed(1)} В`;
                    row['Проволока'] = `Проволока ${Math.floor(Math.random() * 5) + 1}`;
                    row['Газ л/мин'] = `${(Math.random() * 10 + 5).toFixed(1)} л/мин`;
                    row['Время сварки (с)'] = `${Math.floor(Math.random() * 300) + 30} с`;
                    break;

                case 'welders':
                    row['ID сварщика'] = Math.floor(Math.random() * 1000) + 1;
                    row['ФИО'] = `Сварщик ${Math.floor(Math.random() * 10) + 1}`;
                    row['Подразделение'] = `Цех ${Math.floor(Math.random() * 5) + 1}`;
                    row['Квалификация'] = ['3 разряд', '4 разряд', '5 разряд', '6 разряд'][Math.floor(Math.random() * 4)];
                    row['Время работы (часы)'] = `${(Math.random() * 8 + 1).toFixed(1)} ч`;
                    row['Количество выполненных швов'] = Math.floor(Math.random() * 50) + 1;
                    row['Расход проволоки (кг)'] = `${(Math.random() * 10 + 1).toFixed(2)} кг`;
                    row['Средний ток (А)'] = `${Math.floor(Math.random() * 200) + 100} А`;
                    row['Среднее напряжение (В)'] = `${(Math.random() * 20 + 20).toFixed(1)} В`;
                    row['Качество работы (%)'] = `${Math.floor(Math.random() * 20) + 80}%`;
                    row['Дата последней работы'] = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
                    break;

                case 'materials':
                    row['Сварщик'] = `Сварщик ${Math.floor(Math.random() * 10) + 1}`;
                    row['Должность'] = 'Сварщик';
                    row['Время в сети'] = `${(Math.random() * 8 + 1).toFixed(1)} ч`;
                    row['Время горения дуги'] = `${(Math.random() * 6 + 1).toFixed(1)} ч`;
                    row['С превышением тока 340А'] = `${(Math.random() * 2).toFixed(1)} ч`;
                    row['Эффективность работы'] = `${Math.floor(Math.random() * 20) + 80}%`;
                    row['Энергия (кВт*ч)'] = `${(Math.random() * 50 + 10).toFixed(1)} кВт*ч`;
                    row['Проволока'] = `Проволока ${Math.floor(Math.random() * 5) + 1}`;
                    row['Расход (кг)'] = `${(Math.random() * 10 + 1).toFixed(2)} кг`;
                    break;

                case 'welds':
                    row['ID шва'] = Math.floor(Math.random() * 10000) + 1;
                    row['Тип шва'] = ['Стыковой', 'Угловой', 'Тавровый', 'Нахлесточный'][Math.floor(Math.random() * 4)];
                    row['Сварщик'] = `Сварщик ${Math.floor(Math.random() * 10) + 1}`;
                    row['Оборудование'] = `Аппарат ${Math.floor(Math.random() * 10) + 1}`;
                    row['Материал'] = `Сталь ${Math.floor(Math.random() * 5) + 1}`;
                    row['Длина (мм)'] = Math.floor(Math.random() * 1000) + 100;
                    row['Толщина (мм)'] = `${(Math.random() * 20 + 1).toFixed(1)} мм`;
                    row['Ток (А)'] = `${Math.floor(Math.random() * 200) + 100} А`;
                    row['Напряжение (В)'] = `${(Math.random() * 20 + 20).toFixed(1)} В`;
                    row['Скорость (мм/мин)'] = `${Math.floor(Math.random() * 100) + 50} мм/мин`;
                    row['Качество (%)'] = `${Math.floor(Math.random() * 20) + 80}%`;
                    row['Дата'] = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
                    break;

                case 'errors':
                    row['Дата'] = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
                    row['Оборудование'] = `Аппарат ${Math.floor(Math.random() * 10) + 1}`;
                    row['Тип неисправности'] = ['Перегрев', 'Неисправность подачи', 'Проблема с газом', 'Электрическая неисправность'][Math.floor(Math.random() * 4)];
                    row['Описание'] = 'Описание неисправности';
                    row['Статус'] = ['Исправлено', 'В работе', 'Требует внимания'][Math.floor(Math.random() * 3)];
                    row['Общее количество неисправностей'] = Math.floor(Math.random() * 10) + 1;
                    break;

                case 'tasks':
                    row['ID задания'] = Math.floor(Math.random() * 10000) + 1;
                    row['Название'] = `Задание ${Math.floor(Math.random() * 100) + 1}`;
                    row['Описание'] = 'Описание сварочного задания';
                    row['Сварщик'] = `Сварщик ${Math.floor(Math.random() * 10) + 1}`;
                    row['Оборудование'] = `Аппарат ${Math.floor(Math.random() * 10) + 1}`;
                    row['Материал'] = `Сталь ${Math.floor(Math.random() * 5) + 1}`;
                    row['Плановая дата'] = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
                    row['Фактическая дата'] = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
                    row['Статус'] = ['Завершено', 'В процессе', 'Отложено'][Math.floor(Math.random() * 3)];
                    row['Прогресс (%)'] = `${Math.floor(Math.random() * 100)}%`;
                    row['Приоритет'] = ['Высокий', 'Средний', 'Низкий'][Math.floor(Math.random() * 3)];
                    break;

                default:
                    row['Данные'] = 'Тестовые данные';
            }

            mockData.push(row);
        }

        return mockData;
    }
}; 