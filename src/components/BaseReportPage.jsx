import React, { useState } from 'react';
import ReportPeriodModal from './ReportPeriodModal';
import { reportApi, reportHelpers } from '../api/reportApi';
import '../styles/baseReportPage.css';

const BaseReportPage = ({ reportType, title, description, icon }) => {
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
                dateTo: reportData.dateTo
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
                <div className="report-info-card">
                    <h3>Информация об отчете</h3>
                    <p>
                        Данный отчет предоставляет детальную информацию по выбранному направлению 
                        с возможностью экспорта в различные форматы (Excel, PDF, CSV).
                    </p>
                    
                    <div className="report-features">
                        <div className="feature">
                            <span className="feature-icon">📊</span>
                            <span>Детальная аналитика</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">📅</span>
                            <span>Гибкий выбор периода</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">💾</span>
                            <span>Экспорт в Excel/PDF/CSV</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">⚡</span>
                            <span>Быстрая генерация</span>
                        </div>
                    </div>
                </div>

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

                <div className="report-preview">
                    <h3>Предварительный просмотр</h3>
                    <div className="preview-placeholder">
                        <div className="preview-icon">📊</div>
                        <p>Отчет будет сгенерирован после выбора параметров</p>
                        <small>Выберите период и формат для создания отчета</small>
                    </div>
                </div>
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
