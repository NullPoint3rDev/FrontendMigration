import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../api/api.js';
import { formatMoscowDateTime } from '../utils/moscowTime';
import './ReportArchive.css';

/**
 * Компонент для отображения архива отчетов
 */
const ReportArchive = ({ reportType, reportName }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchReportHistory();
    }, [reportType]);

    const fetchReportHistory = async () => {
        try {
            setLoading(true);
            console.log('ReportArchive: Загружаем историю для типа:', reportType);
            const url = `/api/reports/history/${reportType}`;
            console.log('ReportArchive: Вызываем URL:', url);
            const response = await fetch(url, {
                headers: await getAuthHeaders()
            });
            console.log('ReportArchive: Ответ от сервера:', response.status, response.statusText);
            
            if (response.ok) {
                // Сначала получаем текст ответа для диагностики
                const responseText = await response.text();
                console.log('ReportArchive: Текст ответа:', responseText);
                
                try {
                    const data = JSON.parse(responseText);
                    console.log('ReportArchive: Получены данные:', data);
                    setReports(data);
                } catch (parseError) {
                    console.error('ReportArchive: Ошибка парсинга JSON:', parseError);
                    console.error('ReportArchive: Неверный ответ от сервера:', responseText);
                    setError('Ошибка парсинга ответа сервера');
                }
            } else {
                console.error('ReportArchive: Ошибка ответа:', response.status, response.statusText);
                setError('Ошибка при загрузке истории отчетов');
            }
        } catch (err) {
            console.error('ReportArchive: Ошибка сети:', err);
            setError('Ошибка сети при загрузке истории отчетов');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => formatMoscowDateTime(dateString);

    const getFormatIcon = (format) => {
        switch (format.toUpperCase()) {
            case 'PDF':
                return '📄';
            case 'EXCEL':
                return '📊';
            case 'CSV':
                return '📋';
            default:
                return '📁';
        }
    };

    const getFormatColor = (format) => {
        switch (format.toUpperCase()) {
            case 'PDF':
                return '#dc3545';
            case 'EXCEL':
                return '#28a745';
            case 'CSV':
                return '#17a2b8';
            default:
                return '#6c757d';
        }
    };

    const handleDownload = async (report) => {
        try {
            console.log('ReportArchive: Попытка скачивания отчета:', report.fileName);
            
            // Генерируем отчет заново для скачивания
            const response = await fetch(`/api/reports/${report.reportType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(await getAuthHeaders())
                },
                body: JSON.stringify({
                    reportType: report.reportType,
                    format: report.format,
                    period: report.period,
                    dateFrom: null,
                    dateTo: null
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = report.fileName || `report_${report.reportType}_${report.format.toLowerCase()}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                console.log('ReportArchive: Отчет успешно скачан:', report.fileName);
            } else {
                console.error('ReportArchive: Ошибка при скачивании:', response.status);
                alert('Ошибка при скачивании отчета');
            }
        } catch (error) {
            console.error('ReportArchive: Ошибка при скачивании:', error);
            alert('Ошибка при скачивании отчета');
        }
    };

    if (loading) {
        return (
            <div className="report-archive">
                <div className="archive-header">
                    <h3>📚 Архив отчетов</h3>
                    <span className="archive-subtitle">История сгенерированных отчетов</span>
                </div>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Загрузка истории отчетов...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="report-archive">
                <div className="archive-header">
                    <h3>📚 Архив отчетов</h3>
                    <span className="archive-subtitle">История сгенерированных отчетов</span>
                </div>
                <div className="error-message">
                    <p>❌ {error}</p>
                    <button onClick={fetchReportHistory} className="retry-button">
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="report-archive">
            <div className="archive-header">
                <h3>📚 Архив отчетов</h3>
                <span className="archive-subtitle">
                    {reportName} • {reports.length} отчетов в истории
                </span>
            </div>
            
            {reports.length === 0 ? (
                <div className="empty-archive">
                    <div className="empty-icon">📭</div>
                    <p>История отчетов пуста</p>
                    <span>Сгенерируйте первый отчет, чтобы он появился здесь</span>
                </div>
            ) : (
                <div className="reports-list">
                    {reports.map((report, index) => (
                        <div key={index} className="report-item">
                            <div className="report-header">
                                <div className="report-format">
                                    <span 
                                        className="format-icon" 
                                        style={{ color: getFormatColor(report.format) }}
                                    >
                                        {getFormatIcon(report.format)}
                                    </span>
                                    <span className="format-text">{report.format}</span>
                                </div>
                                <div className="report-date">
                                    {formatDate(report.generatedAt)}
                                </div>
                            </div>
                            
                            <div className="report-details">
                                <div className="report-name">{report.reportName}</div>
                                <div className="report-period">Период: {report.period}</div>
                                <div className="report-info">
                                    <span className="file-size">{report.getFormattedFileSize ? report.getFormattedFileSize() : `${(report.fileSize / 1024).toFixed(1)} КБ`}</span>
                                    <span className="generated-by">Сгенерировано: {report.generatedBy}</span>
                                </div>
                            </div>
                            
                            <div className="report-actions">
                                <button 
                                    className="download-button"
                                    onClick={() => handleDownload(report)}
                                    title="Скачать отчет"
                                >
                                    📥 Скачать
                                </button>
                                <button className="info-button" title="Подробная информация">
                                    ℹ️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="archive-footer">
                <button 
                    onClick={fetchReportHistory} 
                    className="refresh-button"
                    title="Обновить историю"
                >
                    🔄 Обновить
                </button>
                <span className="archive-note">
                    Показываются последние 5 отчетов
                </span>
            </div>
        </div>
    );
};

export default ReportArchive;
