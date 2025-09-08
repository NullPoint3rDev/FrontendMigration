import React, { useState, useEffect } from 'react';
import { reportApi, reportHelpers } from '../api/reportApi';
import * as XLSX from 'xlsx';
import '../styles/reportsList.css';

const ReportsList = ({ reportType, reportName, onViewReport }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadReports();
    }, [reportType]);

    const loadReports = async () => {
        try {
            setLoading(true);
            // Загружаем отчеты из localStorage
            const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
            const filteredReports = savedReports.filter(report => report.reportType === reportType);
            setReports(filteredReports);
        } catch (error) {
            console.error('Ошибка загрузки отчетов:', error);
            setError('Ошибка при загрузке отчетов');
        } finally {
            setLoading(false);
        }
    };

    const generateMockReports = () => {
        const mockReports = [];
        const reportCount = Math.floor(Math.random() * 5) + 1;
        
        for (let i = 0; i < reportCount; i++) {
            const report = {
                id: `report_${reportType}_${i + 1}`,
                name: `${reportName} #${i + 1}`,
                reportType: reportType,
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                format: ['xlsx', 'csv'][Math.floor(Math.random() * 2)],
                period: ['day', 'week', 'month'][Math.floor(Math.random() * 3)],
                rowCount: Math.floor(Math.random() * 100) + 10,
                data: reportApi.reportHelpers.generateReportData(reportType, 20) // Генерируем данные для просмотра
            };
            mockReports.push(report);
        }
        
        return mockReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    };

    const handleViewReport = (report) => {
        if (onViewReport) {
            onViewReport(report);
        }
    };

    const handleDownloadReport = async (report) => {
        try {
            // Используем уже сохраненные данные отчета
            const reportData = report.data || [];
            
            console.log('Скачиваем отчет:', report);
            console.log('Формат отчета:', report.format);
            console.log('Данные отчета:', reportData.length, 'строк');
            
            // Преобразуем формат для совместимости
            const format = report.format === 'EXCEL' ? 'xlsx' : report.format.toLowerCase();
            console.log('Преобразованный формат:', format);
            
            if (format === 'xlsx') {
                // Создаем XLSX файл
                const worksheet = XLSX.utils.json_to_sheet(reportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');
                
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
            } else if (format === 'csv') {
                // Создаем CSV файл
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

    const handleDeleteReport = async (reportId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот отчет?')) {
            try {
                // Удаляем отчет из localStorage
                const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
                const updatedReports = savedReports.filter(r => r.id !== reportId);
                localStorage.setItem('savedReports', JSON.stringify(updatedReports));
                
                // Обновляем локальное состояние
                setReports(reports.filter(r => r.id !== reportId));
            } catch (error) {
                console.error('Ошибка удаления отчета:', error);
                alert('Ошибка при удалении отчета');
            }
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getFormatIcon = (format) => {
        const normalizedFormat = format === 'EXCEL' ? 'xlsx' : format.toLowerCase();
        return normalizedFormat === 'xlsx' ? '📊' : '📋';
    };

    if (loading) {
        return (
            <div className="reports-list">
                <div className="reports-header">
                    <h3>📋 Сгенерированные отчеты</h3>
                    <span className="reports-subtitle">История отчетов</span>
                </div>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Загрузка отчетов...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="reports-list">
                <div className="reports-header">
                    <h3>📋 Сгенерированные отчеты</h3>
                    <span className="reports-subtitle">История отчетов</span>
                </div>
                <div className="error-message">
                    <p>❌ {error}</p>
                    <button onClick={loadReports} className="retry-button">
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="reports-list">
            <div className="reports-header">
                <h3>📋 Сгенерированные отчеты</h3>
                <span className="reports-subtitle">
                    {reportName} • {reports.length} отчетов
                </span>
            </div>
            
            {reports.length === 0 ? (
                <div className="empty-reports">
                    <div className="empty-icon">📭</div>
                    <p>Отчеты не найдены</p>
                    <span>Сгенерируйте первый отчет, чтобы он появился здесь</span>
                </div>
            ) : (
                <div className="reports-items">
                    {reports.map((report) => (
                        <div key={report.id} className="report-item">
                            <div className="report-info">
                                <div className="report-name">{report.name}</div>
                                <div className="report-details">
                                    <span className="report-format">
                                        {getFormatIcon(report.format)} {report.format.toUpperCase()}
                                    </span>
                                    <span className="report-period">Период: {report.period}</span>
                                    <span className="report-rows">Строк: {report.rowCount}</span>
                                </div>
                                <div className="report-date">
                                    Создан: {formatDate(report.createdAt)}
                                </div>
                            </div>
                            
                            <div className="report-actions">
                                <button 
                                    className="view-button"
                                    onClick={() => handleViewReport(report)}
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
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="reports-footer">
                <button 
                    onClick={loadReports} 
                    className="refresh-button"
                    title="Обновить список"
                >
                    🔄 Обновить
                </button>
            </div>
        </div>
    );
};

export default ReportsList;
