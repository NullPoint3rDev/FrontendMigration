import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import CreateTemplateModal from './CreateTemplateModal';
import ReportPeriodModal from './ReportPeriodModal';
import ReportViewer from './ReportViewer';
import { reportHelpers } from '../api/reportApi';
import '../styles/myReportsPage.css';

const MyReportsPage = () => {
    const [templates, setTemplates] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isReportPeriodModalOpen, setIsReportPeriodModalOpen] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [generatedReports, setGeneratedReports] = useState([]);

    // Загружаем шаблоны и отчеты из localStorage при монтировании компонента
    useEffect(() => {
        loadTemplates();
        loadGeneratedReports();
    }, []);

    const loadTemplates = () => {
        const savedTemplates = localStorage.getItem('reportTemplates');
        if (savedTemplates) {
            try {
                setTemplates(JSON.parse(savedTemplates));
            } catch (error) {
                console.error('Ошибка загрузки шаблонов:', error);
                setTemplates([]);
            }
        }
    };

    const saveTemplates = (newTemplates) => {
        localStorage.setItem('reportTemplates', JSON.stringify(newTemplates));
        setTemplates(newTemplates);
    };

    const loadGeneratedReports = () => {
        const savedReports = localStorage.getItem('savedReports');
        if (savedReports) {
            try {
                setGeneratedReports(JSON.parse(savedReports));
            } catch (error) {
                console.error('Ошибка загрузки отчетов:', error);
                setGeneratedReports([]);
            }
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
            // Если это новый шаблон, добавляем его
            const updatedTemplates = [...templates, newTemplate];
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
            // Генерируем данные отчета на основе типа отчета из шаблона
            const data = reportHelpers.generateReportData(currentTemplate.reportType, 50);
            
            // Добавляем столбцы Дата и Время в начало данных
            const dataWithDateTime = data.map((row, index) => ({
                'Дата': new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU'),
                'Время': new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                ...row
            }));

            // Создаем объект отчета для сохранения
            const report = {
                id: `report_${currentTemplate.reportType}_${Date.now()}`,
                name: `${currentTemplate.name} - ${new Date().toLocaleDateString('ru-RU')}`,
                reportType: currentTemplate.reportType,
                format: currentTemplate.format,
                period: reportData.period,
                dateFrom: reportData.dateFrom,
                dateTo: reportData.dateTo,
                equipmentId: reportData.equipmentId,
                data: dataWithDateTime,
                createdAt: new Date().toISOString(),
                rowCount: dataWithDateTime.length,
                templateId: currentTemplate.id
            };
            
            // Сохраняем отчет
            const updatedReports = [...generatedReports, report];
            saveGeneratedReports(updatedReports);
            
            // Показываем отчет онлайн
            const template = {
                name: report.name,
                columns: ['Дата', 'Время', ...currentTemplate.columns],
                format: report.format
            };
            
            setReportData(dataWithDateTime);
            setSelectedTemplate(template);
            
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

    const handleOpenReport = async (template) => {
        setLoading(true);
        try {
            // Здесь будет логика генерации отчета на основе шаблона
            // Пока что создаем тестовые данные
            const mockData = generateMockReportData(template);
            
            setReportData(mockData);
            setSelectedTemplate(template);

            // Обновляем время последнего использования
            const updatedTemplates = templates.map(t => 
                t.id === template.id 
                    ? { ...t, lastUsed: new Date().toISOString() }
                    : t
            );
            saveTemplates(updatedTemplates);
        } catch (error) {
            console.error('Ошибка открытия отчета:', error);
            alert('Ошибка при открытии отчета');
        } finally {
            setLoading(false);
        }
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

    const handleCloseReport = () => {
        setReportData(null);
        setSelectedTemplate(null);
    };

    const handleDownloadReport = async (report) => {
        try {
            // Используем данные из отчета
            const reportData = report.data || [];
            
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
                    <h1 className="page-title">Мои отчеты</h1>
                    <p className="page-description">
                        Создавайте собственные шаблоны отчетов и просматривайте их прямо в браузере
                    </p>
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
                            <div className="reports-list">
                                {generatedReports.map((report) => (
                                    <div key={report.id} className="report-item">
                                        <div className="report-info">
                                            <div className="report-name">{report.name}</div>
                                            <div className="report-details">
                                                <span className="report-type">Тип: {report.reportType}</span>
                                                <span className="report-format">Формат: {report.format}</span>
                                                <span className="report-period">Период: {report.period}</span>
                                                <span className="report-rows">Строк: {report.rowCount}</span>
                                            </div>
                                            <div className="report-date">
                                                Создан: {new Date(report.createdAt).toLocaleString('ru-RU')}
                                            </div>
                                        </div>
                                        
                                        <div className="report-actions">
                                            <button 
                                                className="view-button"
                                                onClick={() => {
                                                    const template = {
                                                        name: report.name,
                                                        columns: Object.keys(report.data[0] || {}),
                                                        format: report.format
                                                    };
                                                    setReportData(report.data);
                                                    setSelectedTemplate(template);
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
                                        </div>
                                    </div>
                                ))}
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
