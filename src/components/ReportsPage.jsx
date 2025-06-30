import React, { useState, useEffect } from 'react';
import { reportApi, reportHelpers } from '../api/reportApi';
import '../styles/reports.css';

const ReportsPage = () => {
    const [reportTypes, setReportTypes] = useState([]);
    const [formats, setFormats] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedReportType, setSelectedReportType] = useState('');
    const [selectedFormat, setSelectedFormat] = useState('EXCEL');
    const [selectedPeriod, setSelectedPeriod] = useState('DAY');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [weldingMachineId, setWeldingMachineId] = useState('');
    const [welderId, setWelderId] = useState('');

    useEffect(() => {
        loadReportOptions();
    }, []);

    const loadReportOptions = async () => {
        try {
            console.log('Загружаем опции отчетов...');
            
            const [typesResponse, formatsResponse, periodsResponse] = await Promise.all([
                reportApi.getReportTypes(),
                reportApi.getReportFormats(),
                reportApi.getReportPeriods()
            ]);
            
            console.log('Ответ от API типов отчетов:', typesResponse);
            console.log('Ответ от API форматов:', formatsResponse);
            console.log('Ответ от API периодов:', periodsResponse);
            
            // Защита от неверных ответов
            const types = Array.isArray(typesResponse) ? typesResponse : [];
            const formatsData = Array.isArray(formatsResponse) ? formatsResponse : [];
            const periodsData = Array.isArray(periodsResponse) ? periodsResponse : [];
            
            console.log('Обработанные типы отчетов:', types);
            console.log('Обработанные форматы:', formatsData);
            console.log('Обработанные периоды:', periodsData);
            
            setReportTypes(types);
            setFormats(formatsData);
            setPeriods(periodsData);
        } catch (error) {
            console.error('Ошибка загрузки опций отчетов:', error);
            // Устанавливаем пустые массивы в случае ошибки
            setReportTypes([]);
            setFormats([]);
            setPeriods([]);
        }
    };

    const handleGenerateReport = async () => {
        if (!selectedReportType) {
            alert('Выберите тип отчета');
            return;
        }

        setLoading(true);
        try {
            const requestData = reportHelpers.createReportRequest(
                selectedReportType,
                selectedFormat,
                dateFrom,
                dateTo,
                selectedPeriod,
                {
                    weldingMachineId: weldingMachineId || null,
                    welderId: welderId || null
                }
            );

            const blob = await reportApi.generateReport(selectedReportType, requestData);
            const filename = reportHelpers.getReportFilename(selectedReportType, selectedFormat);
            reportHelpers.downloadReport(blob, filename);
        } catch (error) {
            console.error('Ошибка генерации отчета:', error);
            alert('Ошибка при генерации отчета');
        } finally {
            setLoading(false);
        }
    };

    const getReportDescription = (type) => {
        const descriptions = {
            'WIRE_CONSUMPTION': 'Отчет по расходу проволоки за выбранный период',
            'WELDER_REPORT': 'Отчет по работе сварщика за выбранный период',
            'WORK_REPORT': 'Детальный отчет по работе аппаратов за выбранный период'
        };
        return descriptions[type] || '';
    };

    return (
        <div className="reports-page">
            <div className="reports-container">
                <h1>Генерация отчетов</h1>
                
                <div className="report-form">
                    <div className="form-group">
                        <label>Тип отчета:</label>
                        <select 
                            value={selectedReportType} 
                            onChange={(e) => setSelectedReportType(e.target.value)}
                        >
                            <option value="">Выберите тип отчета</option>
                            {Array.isArray(reportTypes) && reportTypes.map(type => (
                                <option key={type} value={type}>
                                    {type === 'WIRE_CONSUMPTION' && 'Расход проволоки'}
                                    {type === 'WELDER_REPORT' && 'Отчет по сварщику'}
                                    {type === 'WORK_REPORT' && 'Отчет по работе'}
                                </option>
                            ))}
                        </select>
                        {selectedReportType && (
                            <p className="report-description">
                                {getReportDescription(selectedReportType)}
                            </p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Формат:</label>
                        <select 
                            value={selectedFormat} 
                            onChange={(e) => setSelectedFormat(e.target.value)}
                        >
                            {Array.isArray(formats) && formats.map(format => (
                                <option key={format} value={format}>
                                    {format === 'EXCEL' && 'Excel (.xlsx)'}
                                    {format === 'PDF' && 'PDF (.pdf)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Период:</label>
                        <select 
                            value={selectedPeriod} 
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            {Array.isArray(periods) && periods.map(period => (
                                <option key={period} value={period}>
                                    {period === 'DAY' && 'День'}
                                    {period === 'MONTH' && 'Месяц'}
                                    {period === 'YEAR' && 'Год'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Дата с:</label>
                        <input 
                            type="date" 
                            value={dateFrom} 
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Дата по:</label>
                        <input 
                            type="date" 
                            value={dateTo} 
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>ID аппарата (необязательно):</label>
                        <input 
                            type="number" 
                            value={weldingMachineId} 
                            onChange={(e) => setWeldingMachineId(e.target.value)}
                            placeholder="Введите ID аппарата"
                        />
                    </div>

                    <div className="form-group">
                        <label>ID сварщика (необязательно):</label>
                        <input 
                            type="number" 
                            value={welderId} 
                            onChange={(e) => setWelderId(e.target.value)}
                            placeholder="Введите ID сварщика"
                        />
                    </div>

                    <button 
                        className="generate-button" 
                        onClick={handleGenerateReport}
                        disabled={loading || !selectedReportType}
                    >
                        {loading ? 'Генерация...' : 'Сгенерировать отчет'}
                    </button>
                </div>

                <div className="report-info">
                    <h3>Доступные отчеты:</h3>
                    <ul>
                        <li>
                            <strong>Расход проволоки</strong> - показывает расход проволоки по каждому аппарату 
                            за выбранный период с детализацией по сварщикам
                        </li>
                        <li>
                            <strong>Отчет по сварщику</strong> - статистика работы сварщика: общий расход проволоки, 
                            время работы, количество сессий, средние показатели
                        </li>
                        <li>
                            <strong>Отчет по работе</strong> - детальная информация о работе аппаратов: ток, напряжение, 
                            время, режим, тип сварки, расход и подача проволоки
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage; 