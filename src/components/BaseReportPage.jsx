import React, { useState } from 'react';
import ReportPeriodModal from './ReportPeriodModal';
import ReportsList from './ReportsList';
import ReportViewer from './ReportViewer';
import { reportApi, reportHelpers } from '../api/reportApi';
import '../styles/baseReportPage.css';

const BaseReportPage = ({ reportType, title, description, icon, commonErrors }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [reportData, setReportData] = useState(null);

    const handleCreateReport = () => {
        setIsModalOpen(true);
    };

    const handleGenerateReport = async (reportData) => {
        setLoading(true);
        try {
            console.log('Генерируем отчет:', reportData);
            console.log('Формат из модального окна:', reportData.format);
            
            // Генерируем данные отчета
            const data = reportHelpers.generateReportData(reportType, 50);
            
            // Создаем объект отчета для сохранения
            const report = {
                id: `report_${reportType}_${Date.now()}`,
                name: `${title} - ${new Date().toLocaleDateString('ru-RU')}`,
                reportType: reportType,
                format: reportData.format === 'EXCEL' ? 'xlsx' : reportData.format.toLowerCase(),
                period: reportData.period,
                dateFrom: reportData.dateFrom,
                dateTo: reportData.dateTo,
                equipmentId: reportData.equipmentId,
                data: data,
                createdAt: new Date().toISOString(),
                rowCount: data.length
            };
            
            // Сохраняем отчет (пока в localStorage, потом можно на сервер)
            const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
            savedReports.push(report);
            localStorage.setItem('savedReports', JSON.stringify(savedReports));
            
            // Создаем template для ReportViewer
            const template = {
                name: report.name,
                columns: Object.keys(data[0] || {}),
                format: report.format
            };
            
            // Показываем отчет онлайн
            setReportData(data);
            setSelectedReport(template);
            
        } catch (error) {
            console.error('Ошибка генерации отчета:', error);
            alert('Ошибка при генерации отчета: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseReport = () => {
        setReportData(null);
        setSelectedReport(null);
    };

    return (
        <div className="base-report-page">
            <div className="report-header">
                <div className="report-icon">
                    {icon}
                </div>
                <div className="report-title-section">
                    <h1 className="report-title">{title}</h1>
                    <p className="report-description">{description}</p>
                </div>
            </div>

            <div className="report-content">
                {/* Типичные неисправности для отчета о неисправностях */}
                {commonErrors && (
                    <div className="common-errors">
                        <h3>Типичные неисправности:</h3>
                        <div className="errors-list">
                            {commonErrors.map((error, index) => (
                                <div key={index} className="error-item">
                                    <span className="error-icon">⚠️</span>
                                    {error}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="report-actions">
                    <button 
                        className="create-report-button"
                        onClick={handleCreateReport}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="loading-spinner"></span>
                                Создание отчета...
                            </>
                        ) : (
                            <>
                                <span className="button-icon">📋</span>
                                Создать отчет
                            </>
                        )}
                    </button>
                </div>
                
                {/* Список отчетов */}
                <ReportsList 
                    reportType={reportType} 
                    reportName={title}
                    onViewReport={(report) => {
                        const template = {
                            name: report.name,
                            columns: Object.keys(report.data[0] || {}),
                            format: report.format
                        };
                        setReportData(report.data);
                        setSelectedReport(template);
                    }}
                />
            </div>

            <ReportPeriodModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onGenerate={handleGenerateReport}
                reportType={reportType}
            />

            {/* Компонент просмотра отчета */}
            {reportData && selectedReport && (
                <ReportViewer
                    data={reportData}
                    template={selectedReport}
                    onClose={handleCloseReport}
                />
            )}
        </div>
    );
};

export default BaseReportPage;
