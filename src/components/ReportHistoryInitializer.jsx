import React, { useEffect } from 'react';
import { getAuthHeaders } from '../api/api';

/**
 * Компонент для инициализации тестовых данных истории отчетов
 * Выполняется один раз при загрузке приложения
 */
const ReportHistoryInitializer = () => {
    useEffect(() => {
        const initializeTestData = async () => {
            try {
                console.log('ReportHistoryInitializer: Начинаем инициализацию тестовых данных');
                console.log('ReportHistoryInitializer: Вызываем URL: /api/reports/history/init-test-data');
                
                // Инициализируем тестовые данные для истории отчетов
                const response = await fetch('/api/reports/history/init-test-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(await getAuthHeaders())
                    },
                });
                
                console.log('ReportHistoryInitializer: Ответ от сервера:', response.status, response.statusText);
                
                if (response.ok) {
                    console.log('ReportHistoryInitializer: Тестовые данные истории отчетов инициализированы');
                } else {
                    console.warn('ReportHistoryInitializer: Не удалось инициализировать тестовые данные истории отчетов');
                    // Получаем текст ответа для диагностики
                    const responseText = await response.text();
                    console.warn('ReportHistoryInitializer: Текст ответа:', responseText);
                }
            } catch (error) {
                console.warn('ReportHistoryInitializer: Ошибка при инициализации тестовых данных истории отчетов:', error);
            }
        };

        // Выполняем инициализацию только один раз
        initializeTestData();
    }, []);

    // Этот компонент не отображает ничего
    return null;
};

export default ReportHistoryInitializer;
