import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import CreateTemplateModal from './CreateTemplateModal';
import ReportPeriodModal from './ReportPeriodModal';
import ReportViewer from './ReportViewer';
import {reportApi, reportHelpers} from '../api/reportApi';
import '../styles/myReportsPage.css';

const MyReportsPage = () => {
    const [templates, setTemplates] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isReportPeriodModalOpen, setIsReportPeriodModalOpen] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [generatedReports, setGeneratedReports] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [reportData, setReportData] = useState(null);

    // Загружаем шаблоны и отчеты при монтировании компонента
    useEffect(() => {
        loadTemplates();
        loadGeneratedReports();
    }, []);

    const loadTemplates = () => {
        const savedTemplates = localStorage.getItem('reportTemplates');
        if (savedTemplates) {
            try {
                const templates = JSON.parse(savedTemplates);
                // Сортируем шаблоны по дате создания (новые сначала)
                const sortedTemplates = templates.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0);
                    const dateB = new Date(b.createdAt || 0);
                    return dateB - dateA; // Новые сначала
                });
                setTemplates(sortedTemplates);
            } catch (error) {
                console.error('Ошибка загрузки шаблонов:', error);
                setTemplates([]);
            }
        }
    };

    const saveTemplates = (newTemplates) => {
        // Сортируем шаблоны по дате создания (новые сначала)
        const sortedTemplates = newTemplates.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Новые сначала
        });
        
        localStorage.setItem('reportTemplates', JSON.stringify(sortedTemplates));
        setTemplates(sortedTemplates);
    };

    const loadGeneratedReports = async () => {
        // Загружаем отчеты из localStorage
        const savedReports = localStorage.getItem('savedReports');
        let localReports = [];
        if (savedReports) {
            try {
                localReports = JSON.parse(savedReports);
            } catch (error) {
                console.error('Ошибка загрузки отчетов из localStorage:', error);
            }
        }
        
        // Загружаем отчеты из API (включая автоматически сгенерированные)
        try {
            const response = await fetch('/api/reports/history', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const apiReports = await response.json();
                console.log('MyReportsPage: Loaded reports from API:', apiReports);
                
                // Объединяем отчеты из localStorage и API, избегая дублирования
                const allReports = [...localReports];
                
                // Добавляем отчеты из API, если их нет в localStorage
                apiReports.forEach(apiReport => {
                    const exists = localReports.some(localReport => 
                        localReport.id === apiReport.id || 
                        (localReport.reportName === apiReport.reportName && 
                         localReport.generatedAt === apiReport.generatedAt)
                    );
                    if (!exists) {
                        allReports.push(apiReport);
                    }
                });
                
                setGeneratedReports(allReports);
            } else {
                console.error('Ошибка загрузки отчетов из API:', response.status);
                setGeneratedReports(localReports);
            }
        } catch (error) {
            console.error('Ошибка загрузки отчетов из API:', error);
            setGeneratedReports(localReports);
        }
    };

    const saveGeneratedReports = (newReports) => {
        localStorage.setItem('savedReports', JSON.stringify(newReports));
        setGeneratedReports(newReports);
    };

    const handleCreateTemplate = (templateData) => {
        const newTemplate = {
            id: templateData.id,
            name: templateData.name,
            reportType: templateData.reportType,
            columns: templateData.columns,
            format: templateData.format,
            selectedEquipment: templateData.selectedEquipment,
            createdAt: templateData.createdAt,
            lastUsed: null
        };

        // Если это редактирование, обновляем существующий шаблон
        if (templateData.id && templates.find(t => t.id === templateData.id)) {
            const updatedTemplates = templates.map(t => 
                t.id === templateData.id ? newTemplate : t
            );
            saveTemplates(updatedTemplates);
        } else {
            // Если это новый шаблон, добавляем его в начало списка
            const updatedTemplates = [newTemplate, ...templates];
            saveTemplates(updatedTemplates);
        }
        
        setIsCreateModalOpen(false);
    };

    const handleDeleteTemplate = (templateId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот шаблон?')) {
            const updatedTemplates = templates.filter(t => t.id !== templateId);
            saveTemplates(updatedTemplates);
        }
    };

    const handleToggleAuto = (template, isEnabled) => {
        try {
            // Проверяем, можно ли включить авто режим
            if (isEnabled && template.repeatType === 'never') {
                alert('Нельзя включить автоматический режим для шаблона с настройкой "Никогда".\n\nИзмените настройки повтора в шаблоне на другой вариант.');
                return;
            }

            if (isEnabled) {
                // Включаем авто режим (только на фронтенде)
                const updatedTemplates = templates.map(t => 
                    t.id === template.id 
                        ? { 
                            ...t, 
                            isAutoEnabled: true, 
                            automatedReportId: `auto_${template.id}_${Date.now()}` // Генерируем локальный ID
                        }
                        : t
                );
                saveTemplates(updatedTemplates);
                alert(`Автоматический режим включен для шаблона "${template.name}"!\n\nВ демо-версии это работает только на фронтенде.`);
            } else {
                // Отключаем авто режим
                const updatedTemplates = templates.map(t => 
                    t.id === template.id 
                        ? { ...t, isAutoEnabled: false, automatedReportId: null }
                        : t
                );
                saveTemplates(updatedTemplates);
                alert(`Автоматический режим отключен для шаблона "${template.name}"!`);
            }
        } catch (error) {
            console.error('Ошибка при переключении авто режима:', error);
            alert('Ошибка при изменении настроек автоматизации');
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот отчет?')) {
            try {
                // Удаляем отчет из localStorage (если он там есть)
                const updatedReports = generatedReports.filter(r => r.id !== reportId);
                saveGeneratedReports(updatedReports);
                
                // Для отчетов из API показываем сообщение
                const report = generatedReports.find(r => r.id === reportId);
                if (report && report.generatedAt) {
                    alert('Автоматически сгенерированные отчеты нельзя удалить через интерфейс. Используйте кнопку "Очистить все" для удаления всех отчетов.');
                }
            } catch (error) {
                console.error('Ошибка при удалении отчета:', error);
                alert('Ошибка при удалении отчета');
            }
        }
    };

    const handleClearAllReports = async () => {
        const confirmMessage = `Вы уверены, что хотите удалить ВСЕ отчеты (${generatedReports.length} штук)?\n\nЭто действие нельзя отменить!`;
        if (window.confirm(confirmMessage)) {
            try {
                // СНАЧАЛА очищаем отчеты из API
                const response = await fetch('/api/reports/history/clear', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    // Затем очищаем отчеты из localStorage
                    localStorage.removeItem('savedReports');
                    
                    // И сразу обновляем состояние
                    setGeneratedReports([]);
                    
                    // Принудительно перезагружаем отчеты для проверки
                    setTimeout(() => {
                        loadGeneratedReports();
                    }, 500);
                    
                    console.log('All reports cleared successfully');
                    alert('Все отчеты успешно удалены!');
                } else {
                    const errorText = await response.text();
                    throw new Error(`API Error: ${response.status} - ${errorText}`);
                }
            } catch (error) {
                console.error('Error clearing reports:', error);
                alert('Ошибка при очистке отчетов: ' + error.message);
            }
        }
    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setIsCreateModalOpen(true);
    };

    const handleCreateReportFromTemplate = (template) => {
        setCurrentTemplate(template);
        setIsReportPeriodModalOpen(true);
    };

    const handleGenerateReportFromTemplate = async (reportData) => {
        if (!currentTemplate) return;

        setLoading(true);
        try {
            console.log('Генерируем отчет по шаблону:', currentTemplate);
            console.log('Данные отчета:', reportData);
            
            // Создаем запрос для API
            const requestData = reportHelpers.createReportRequest(
                currentTemplate.reportType,
                currentTemplate.format,
                reportData.dateFrom,
                reportData.dateTo,
                reportData.period,
                {
                    weldingMachineId: reportData.equipmentId || null,
                    welderId: reportData.welderId || null
                }
            );
            
            console.log('Отправляем запрос на сервер:', requestData);
            
            // Получаем данные для просмотра онлайн
            const onlineData = await getReportDataForViewing(currentTemplate.reportType, requestData);
            
            // Показываем отчет онлайн
            if (onlineData && onlineData.length > 0) {
                const template = {
                    name: `${currentTemplate.name} - ${new Date().toLocaleDateString('ru-RU')}`,
                    columns: Object.keys(onlineData[0] || {}),
                    format: currentTemplate.format
                };
                
                setReportData(onlineData);
                setSelectedTemplate(template);
                console.log('Отчет по шаблону показан онлайн с реальными данными');
            }
            
            // Также скачиваем файл
            const blob = await reportApi.generateReport(currentTemplate.reportType, requestData);
            const filename = reportHelpers.getReportFilename(currentTemplate.reportType, currentTemplate.format);
            reportHelpers.downloadReport(blob, filename);
            
            console.log('Отчет по шаблону успешно сгенерирован, показан онлайн и скачан');
            
            // Обновляем lastUsed в шаблоне
            const updatedTemplates = templates.map(t => 
                t.id === currentTemplate.id 
                    ? { ...t, lastUsed: new Date().toISOString() }
                    : t
            );
            saveTemplates(updatedTemplates);
            
        } catch (error) {
            console.error('Ошибка генерации отчета:', error);
            alert('Ошибка при генерации отчета: ' + error.message);
        } finally {
            setLoading(false);
            setIsReportPeriodModalOpen(false);
            setCurrentTemplate(null);
        }
    };

    const getReportDataForViewing = async (reportType, requestData) => {
        try {
            // Получаем данные отчета для просмотра онлайн
            const data = await reportApi.getReportDataForViewing(reportType, requestData);
            return data;
        } catch (error) {
            console.error('Ошибка получения данных для просмотра:', error);
            return null;
        }
    };

    const handleCloseReport = () => {
        setReportData(null);
        setSelectedTemplate(null);
    };

    const handleOpenReport = async (template) => {
        // Просто открываем модальное окно для создания отчета
        setCurrentTemplate(template);
        setIsReportPeriodModalOpen(true);
    };

    const generateMockReportData = (template) => {
        // Генерируем тестовые данные на основе выбранных столбцов
        const mockData = [];
        const rowCount = 50; // Количество строк в отчете

        for (let i = 0; i < rowCount; i++) {
            const row = {};
            template.columns.forEach(column => {
                switch (column) {
                    case 'Дата':
                        row[column] = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
                        break;
                    case 'Время':
                        row[column] = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        break;
                    case 'Сварщик':
                        row[column] = `Сварщик ${Math.floor(Math.random() * 10) + 1}`;
                        break;
                    case 'Режим':
                        row[column] = ['Ручной', 'Автоматический', 'Полуавтоматический'][Math.floor(Math.random() * 3)];
                        break;
                    case 'Сила тока':
                        row[column] = `${Math.floor(Math.random() * 200) + 100} А`;
                        break;
                    case 'Масса проволоки':
                        row[column] = `${(Math.random() * 5 + 1).toFixed(2)} кг`;
                        break;
                    case 'Напряжение':
                        row[column] = `${(Math.random() * 20 + 20).toFixed(1)} В`;
                        break;
                    case 'Проволока':
                        row[column] = `Проволока ${Math.floor(Math.random() * 5) + 1}`;
                        break;
                    case 'Газ л/мин':
                        row[column] = `${(Math.random() * 10 + 5).toFixed(1)} л/мин`;
                        break;
                    case 'Время сварки (с)':
                        row[column] = `${Math.floor(Math.random() * 300) + 30} с`;
                        break;
                    case 'Подразделение':
                        row[column] = `Цех ${Math.floor(Math.random() * 5) + 1}`;
                        break;
                    case 'Количество выполненных швов':
                        row[column] = Math.floor(Math.random() * 20) + 1;
                        break;
                    case 'Качество работы (%)':
                        row[column] = `${Math.floor(Math.random() * 20) + 80}%`;
                        break;
                    case 'Оборудование':
                        row[column] = `Аппарат ${Math.floor(Math.random() * 10) + 1}`;
                        break;
                    case 'Тип неисправности':
                        row[column] = Math.random() > 0.8 ? 'Перегрев' : 'Нет';
                        break;
                    case 'Описание':
                        row[column] = 'Стандартная сварка';
                        break;
                    case 'Статус':
                        row[column] = ['Завершено', 'В процессе', 'Ошибка'][Math.floor(Math.random() * 3)];
                        break;
                    default:
                        row[column] = 'Данные';
                }
            });
            mockData.push(row);
        }

        return mockData;
    };


    const handleDownloadReport = async (report) => {
        try {
            // Используем данные из отчета
            let reportData = report.data || [];
            
            // Если данных нет в report.data, проверяем report.reportData
            if (!reportData || reportData.length === 0) {
                reportData = report.reportData || [];
            }
            
            // Проверяем, есть ли данные для скачивания
            if (!reportData || reportData.length === 0) {
                alert('Данные отчета недоступны для скачивания. Это автоматически сгенерированный отчет.');
                return;
            }
            
            if (report.format === 'xlsx') {
                // Создаем настоящий XLSX файл
                const worksheet = XLSX.utils.json_to_sheet(reportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');
                
                // Генерируем файл
                const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([excelBuffer], { 
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                });
                
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${report.name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // Экспорт в CSV
                const columns = Object.keys(reportData[0] || {});
                const csvContent = [
                    columns.join(','),
                    ...reportData.map(row => 
                        columns.map(column => `"${(row[column] || '').toString().replace(/"/g, '""')}"`).join(',')
                    )
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${report.name}_${new Date().toISOString().slice(0, 10)}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Ошибка скачивания отчета:', error);
            alert('Ошибка при скачивании отчета');
        }
    };

    return (
        <div className="my-reports-page">
            <div className="my-reports-container">
                <div className="my-reports-header">
                    <div className="header-content">
                        <div>
                            <h1 className="page-title">Мои отчеты</h1>
                            <p className="page-description">
                                Создавайте собственные шаблоны отчетов и просматривайте их прямо в браузере
                            </p>
                        </div>
                        <div className="header-actions">
                            <button 
                                className="refresh-reports-button"
                                onClick={loadGeneratedReports}
                                title="Обновить список отчетов"
                            >
                                <i className="fas fa-sync-alt"></i>
                                Обновить
                            </button>
                            <button 
                                className="clear-all-reports-button"
                                onClick={handleClearAllReports}
                                title="Удалить все отчеты"
                            >
                                <i className="fas fa-trash-alt"></i>
                                Очистить все
                            </button>
                        </div>
                    </div>
                </div>

                <div className="my-reports-content">
                    <div className="templates-section">
                        <div className="templates-header">
                            <h2>Мои шаблоны</h2>
                            <button 
                                className="add-template-button"
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                <span className="button-icon">+</span>
                                Добавить шаблон
                            </button>
                        </div>

                        {templates.length === 0 ? (
                            <div className="empty-templates">
                                <div className="empty-icon">📊</div>
                                <h3>У вас пока нет шаблонов отчетов</h3>
                                <p>Создайте свой первый шаблон, чтобы начать работу с отчетами</p>
                                <button 
                                    className="create-first-template-button"
                                    onClick={() => setIsCreateModalOpen(true)}
                                >
                                    Создать первый шаблон
                                </button>
                            </div>
                        ) : (
                            <div className="templates-list">
                                {templates.map(template => (
                                    <div 
                                        key={template.id} 
                                        className="template-item"
                                    >
                                        <div className="template-info">
                                            <h3 className="template-name">{template.name}</h3>
                                            <p className="template-details">
                                                Тип: {template.reportType} | 
                                                Столбцов: {template.columns.length} | 
                                                Формат: {template.format}
                                            </p>
                                            {template.lastUsed && (
                                                <p className="template-last-used">
                                                    Последнее использование: {new Date(template.lastUsed).toLocaleString('ru-RU')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="template-actions">
                                            <div className="auto-toggle-container">
                                                <label 
                                                    className={`auto-toggle-label ${template.repeatType === 'never' ? 'disabled' : ''}`}
                                                    onClick={(e) => {
                                                        if (template.repeatType === 'never') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }
                                                    }}
                                                >
                                                    <span className="auto-toggle-text">Авто</span>
                                                    <input
                                                        type="checkbox"
                                                        className="auto-toggle-switch"
                                                        checked={template.isAutoEnabled || false}
                                                        disabled={template.repeatType === 'never'}
                                                        onChange={(e) => {
                                                            if (template.repeatType === 'never') {
                                                                e.preventDefault();
                                                                return;
                                                            }
                                                            handleToggleAuto(template, e.target.checked);
                                                        }}
                                                        onClick={(e) => {
                                                            if (template.repeatType === 'never') {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <button 
                                                className="create-report-button"
                                                onClick={() => handleCreateReportFromTemplate(template)}
                                                disabled={loading}
                                            >
                                                📊 Создать отчет
                                            </button>
                                            <button 
                                                className="edit-button"
                                                onClick={() => handleEditTemplate(template)}
                                            >
                                                ✏️ Редактировать
                                            </button>
                                            <button 
                                                className="delete-button"
                                                onClick={() => handleDeleteTemplate(template.id)}
                                            >
                                                🗑️ Удалить
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Секция сгенерированных отчетов */}
                    <div className="reports-section">
                        <div className="reports-header">
                            <h2>Созданные отчеты</h2>
                            <span className="reports-subtitle">
                                {generatedReports.length} отчетов
                            </span>
                        </div>

                        {generatedReports.length === 0 ? (
                            <div className="empty-reports">
                                <div className="empty-icon">📭</div>
                                <h3>Отчеты не найдены</h3>
                                <p>Создайте отчет из шаблона, чтобы он появился здесь</p>
                            </div>
                        ) : (
                            <div className="reports-table-container">
                                <table className="reports-table">
                                    <thead>
                                        <tr>
                                            <th>Тип отчета</th>
                                            <th>Дата создания</th>
                                            <th>Формат</th>
                                            <th>Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {generatedReports.map((report, index) => (
                                            <tr key={`report-${report.id || index}-${report.reportName || report.name || 'unknown'}`} className="report-row">
                                                <td className="report-type-cell">
                                                    <div className="report-name">
                                                        {report.reportName || report.name || 'Без названия'}
                                                        {report.isAutoGenerated && (
                                                            <span className="auto-generated-badge">🤖 Авто</span>
                                                        )}
                                                    </div>
                                                    <div className="report-details">
                                                        <span className="report-type">Тип: {report.reportType || 'Неизвестно'}</span>
                                                        {report.period && <span className="report-period">Период: {report.period}</span>}
                                                        {report.rowCount && <span className="report-rows">Строк: {report.rowCount}</span>}
                                                    </div>
                                                </td>
                                                <td className="report-date-cell">
                                                    {new Date(report.generatedAt || report.createdAt || Date.now()).toLocaleString('ru-RU')}
                                                </td>
                                                <td className="report-format-cell">
                                                    <span className="format-badge">{report.format || 'Неизвестно'}</span>
                                                </td>
                                                <td className="report-actions-cell">
                                                    <div className="report-actions">
                                                        <button 
                                                            className="view-button"
                                                            onClick={() => {
                                                                // Проверяем, есть ли данные для просмотра
                                                                if (report.data && Array.isArray(report.data) && report.data.length > 0) {
                                                                    const template = {
                                                                        name: report.reportName || report.name,
                                                                        columns: Object.keys(report.data[0] || {}),
                                                                        format: report.format
                                                                    };
                                                                    // Отчеты теперь скачиваются сразу, просмотр не требуется
                                                                } else {
                                                                    // Для отчетов из API проверяем, есть ли данные
                                                                    if (report.reportData && Array.isArray(report.reportData) && report.reportData.length > 0) {
                                                                        // Если есть данные, показываем их как обычный отчет
                                                                        const template = {
                                                                            name: report.reportName || report.name || 'Автоматический отчет',
                                                                            columns: Object.keys(report.reportData[0] || {}),
                                                                            format: report.format
                                                                        };
                                                                        // Отчеты теперь скачиваются сразу, просмотр не требуется
                                                                    } else {
                                                                        // Если данных нет, показываем сообщение
                                                                        alert('Данные отчета недоступны для просмотра. Это автоматически сгенерированный отчет.');
                                                                    }
                                                                }
                                                            }}
                                                            title="Просмотреть отчет"
                                                        >
                                                            👁️ Просмотр
                                                        </button>
                                                        <button 
                                                            className="download-button"
                                                            onClick={() => handleDownloadReport(report)}
                                                            title="Скачать отчет"
                                                        >
                                                            📥 Скачать
                                                        </button>
                                                        <button 
                                                            className="delete-button"
                                                            onClick={() => handleDeleteReport(report.id)}
                                                            title="Удалить отчет"
                                                        >
                                                            🗑️ Удалить
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Модальное окно создания шаблона */}
            <CreateTemplateModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingTemplate(null);
                }}
                onCreate={handleCreateTemplate}
                editingTemplate={editingTemplate}
            />

            {/* Модальное окно выбора периода для создания отчета */}
            <ReportPeriodModal
                isOpen={isReportPeriodModalOpen}
                onClose={() => {
                    setIsReportPeriodModalOpen(false);
                    setCurrentTemplate(null);
                }}
                onGenerate={handleGenerateReportFromTemplate}
                reportType={currentTemplate?.reportType || 'equipment'}
            />

            {/* Компонент просмотра отчета */}
            {reportData && selectedTemplate && (
                <ReportViewer
                    data={reportData}
                    template={selectedTemplate}
                    onClose={handleCloseReport}
                />
            )}
            
        </div>
    );
};

export default MyReportsPage;
