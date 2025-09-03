import React, { useState } from 'react';
import ReportPeriodModal from './ReportPeriodModal';
import ReportArchive from './ReportArchive';
import { reportApi, reportHelpers } from '../api/reportApi';
import '../styles/baseReportPage.css';

const BaseReportPage = ({ reportType, title, description, icon, reportStructure, commonErrors }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreateReport = () => {
        setIsModalOpen(true);
    };

    const handleGenerateReport = async (reportData) => {
        setLoading(true);
        try {
            console.log('Генерируем отчет:', reportData);
            
            // Преобразуем данные для API
            const apiRequestData = {
                reportType: reportData.reportType,
                format: reportData.format,
                period: reportData.period,
                dateFrom: reportData.dateFrom,
                dateTo: reportData.dateTo,
                equipmentId: reportData.equipmentId
            };
            
            // Генерируем отчет через API
            const blob = await reportApi.generateReport(reportData.reportType, apiRequestData);
            const filename = reportHelpers.getReportFilename(reportData.reportType, reportData.format);
            reportHelpers.downloadReport(blob, filename);
            
            alert('Отчет успешно сгенерирован!');
        } catch (error) {
            console.error('Ошибка генерации отчета:', error);
            alert('Ошибка при генерации отчета: ' + error.message);
        } finally {
            setLoading(false);
        }
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
                {/* Структура отчета */}
                {reportStructure && (
                    <div className="report-structure">
                        <h3>Структура отчета:</h3>
                        <div className="structure-grid">
                            {reportStructure.map((field, index) => (
                                <div key={index} className="structure-field">
                                    <div className="field-name">{field.field}</div>
                                    <div className="field-description">{field.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                
                {/* Архив отчетов */}
                <ReportArchive 
                    reportType={reportType} 
                    reportName={title} 
                />
            </div>

            <ReportPeriodModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onGenerate={handleGenerateReport}
                reportType={reportType}
            />
        </div>
    );
};

export default BaseReportPage;
