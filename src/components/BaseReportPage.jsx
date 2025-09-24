import React, { useState } from 'react';
import ReportPeriodModal from './ReportPeriodModal';
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
            
            // Создаем запрос для API
            const requestData = reportHelpers.createReportRequest(
                reportType,
                reportData.format,
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
            const onlineData = await getReportDataForViewing(reportType, requestData);
            
            // Показываем отчет онлайн
            if (onlineData && onlineData.length > 0) {
                const template = {
                    name: `${title} - ${new Date().toLocaleDateString('ru-RU')}`,
                    columns: Object.keys(onlineData[0] || {}),
                    format: reportData.format
                };
                
                setReportData(onlineData);
                setSelectedReport(template);
                console.log('Отчет показан онлайн с реальными данными');
            }
            
            // Также скачиваем файл
            const blob = await reportApi.generateReport(reportType, requestData);
            const filename = reportHelpers.getReportFilename(reportType, reportData.format);
            reportHelpers.downloadReport(blob, filename);
            
            console.log('Отчет успешно сгенерирован, показан онлайн и скачан');
            
        } catch (error) {
            console.error('Ошибка генерации отчета:', error);
            alert('Ошибка при генерации отчета: ' + error.message);
        } finally {
            setLoading(false);
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
                
                {/* Информация о том, что отчеты показываются онлайн и скачиваются */}
                <div className="reports-info">
                    <div className="info-icon">ℹ️</div>
                    <div className="info-text">
                        <h4>Отчеты показываются онлайн и скачиваются</h4>
                        <p>После создания отчета он будет показан на экране и автоматически скачан в папку "Загрузки"</p>
                    </div>
                </div>
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
