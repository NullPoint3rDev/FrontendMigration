import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import CreateTemplateModal from './CreateTemplateModal';
import ReportViewer from './ReportViewer';
import '../styles/myReportsPage.css';

const MyReportsPage = () => {
    const [templates, setTemplates] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Загружаем шаблоны из localStorage при монтировании компонента
    useEffect(() => {
        loadTemplates();
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

    const handleCreateTemplate = (templateData) => {
        const newTemplate = {
            id: Date.now().toString(),
            name: templateData.name,
            columns: templateData.columns,
            period: templateData.period,
            format: templateData.format,
            createdAt: new Date().toISOString(),
            lastUsed: null
        };

        const updatedTemplates = [...templates, newTemplate];
        saveTemplates(updatedTemplates);
        setIsCreateModalOpen(false);
    };

    const handleDeleteTemplate = (templateId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот шаблон?')) {
            const updatedTemplates = templates.filter(t => t.id !== templateId);
            saveTemplates(updatedTemplates);
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

    const handleDownloadReport = async (template) => {
        try {
            // Генерируем данные для скачивания
            const mockData = generateMockReportData(template);
            
            if (template.format === 'xlsx') {
                // Создаем настоящий XLSX файл
                const worksheet = XLSX.utils.json_to_sheet(mockData);
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
                link.setAttribute('download', `${template.name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // Экспорт в CSV
                const csvContent = [
                    template.columns.join(','),
                    ...mockData.map(row => 
                        template.columns.map(column => `"${row[column] || ''}"`).join(',')
                    )
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${template.name}_${new Date().toISOString().slice(0, 10)}.csv`);
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
                                        className="template-item clickable"
                                        onClick={() => handleOpenReport(template)}
                                    >
                                        <div className="template-info">
                                            <h3 className="template-name">{template.name}</h3>
                                            <p className="template-details">
                                                Столбцов: {template.columns.length} | 
                                                Формат: {template.format} | 
                                                Период: {template.period}
                                            </p>
                                            {template.lastUsed && (
                                                <p className="template-last-used">
                                                    Последнее использование: {new Date(template.lastUsed).toLocaleString('ru-RU')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="template-actions">
                                            <button 
                                                className="download-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadReport(template);
                                                }}
                                                disabled={loading}
                                            >
                                                📥 Скачать
                                            </button>
                                            <button 
                                                className="delete-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTemplate(template.id);
                                                }}
                                            >
                                                Удалить
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
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateTemplate}
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
