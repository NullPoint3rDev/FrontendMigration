import React, { useState, useEffect } from 'react';
import '../styles/reportPeriodModal.css';
import { getAllWeldingMachines } from '../api/weldingMachineApi';

const ReportPeriodModal = ({ isOpen, onClose, onGenerate, reportType }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('day');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [format, setFormat] = useState('EXCEL');
    const [equipment, setEquipment] = useState([]);
    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [loadingEquipment, setLoadingEquipment] = useState(false);

    // Загружаем список оборудования при открытии модального окна
    useEffect(() => {
        if (isOpen) {
            loadEquipment();
        }
    }, [isOpen]);

    const loadEquipment = async () => {
        setLoadingEquipment(true);
        try {
            const equipmentData = await getAllWeldingMachines();
            setEquipment(equipmentData);
            if (equipmentData.length > 0) {
                setSelectedEquipment(equipmentData[0].id.toString());
            }
        } catch (error) {
            console.error('Ошибка загрузки оборудования:', error);
        } finally {
            setLoadingEquipment(false);
        }
    };

    const periods = [
        { value: 'day', label: 'День', description: 'Отчет за текущий день' },
        { value: 'week', label: 'Неделя', description: 'Отчет за текущую неделю' },
        { value: 'month', label: 'Месяц', description: 'Отчет за текущий месяц' },
        { value: 'quarter', label: 'Квартал', description: 'Отчет за текущий квартал' },
        { value: 'year', label: 'Год', description: 'Отчет за текущий год' },
        { value: 'custom', label: 'Кастомный период', description: 'Выберите произвольный период' }
    ];

    const formats = [
        { value: 'EXCEL', label: 'Excel (.xlsx)', icon: '📊' },
        { value: 'PDF', label: 'PDF (.pdf)', icon: '📄' },
        { value: 'CSV', label: 'CSV (.csv)', icon: '📋' }
    ];

    const getReportTitle = () => {
        const titles = {
            'equipment': 'Отчет по работе оборудования',
            'welders': 'Отчет по работе сварщиков',
            'materials': 'Отчет по расходу проволоки',
            'welds': 'Отчет по сварочным швам',
            'errors': 'Отчет о неисправностях',
            'violations': 'Перечень швов, выполненных с нарушением',
            'tasks': 'Отчет о выполнении сварочного задания'
        };
        return titles[reportType] || 'Отчет';
    };

    const handleGenerate = () => {
        if (selectedPeriod === 'custom' && (!customDateFrom || !customDateTo)) {
            alert('Для кастомного периода выберите даты начала и окончания');
            return;
        }

        if (!selectedEquipment) {
            alert('Выберите оборудование для отчета');
            return;
        }

        const reportData = {
            reportType,
            period: selectedPeriod,
            format,
            dateFrom: selectedPeriod === 'custom' ? customDateFrom : null,
            dateTo: selectedPeriod === 'custom' ? customDateTo : null,
            equipmentId: selectedEquipment
        };

        onGenerate(reportData);
        onClose();
    };

    const handlePeriodChange = (period) => {
        setSelectedPeriod(period);
        if (period !== 'custom') {
            setCustomDateFrom('');
            setCustomDateTo('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{getReportTitle()}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Выбор оборудования */}
                    <div className="equipment-selection">
                        <h3>Выберите оборудование:</h3>
                        {loadingEquipment ? (
                            <div className="loading-equipment">Загрузка оборудования...</div>
                        ) : (
                            <select 
                                value={selectedEquipment} 
                                onChange={(e) => setSelectedEquipment(e.target.value)}
                                className="equipment-select"
                            >
                                {equipment.map((eq) => (
                                    <option key={eq.id} value={eq.id}>
                                        {eq.name} - {eq.model} (№{eq.serialNumber || eq.id})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="period-selection">
                        <h3>Выберите период формирования отчета:</h3>
                        <div className="period-options">
                            {periods.map((period) => (
                                <div
                                    key={period.value}
                                    className={`period-option ${selectedPeriod === period.value ? 'selected' : ''}`}
                                    onClick={() => handlePeriodChange(period.value)}
                                >
                                    <div className="period-radio">
                                        <div className={`radio-circle ${selectedPeriod === period.value ? 'checked' : ''}`}></div>
                                    </div>
                                    <div className="period-info">
                                        <div className="period-label">{period.label}</div>
                                        <div className="period-description">{period.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedPeriod === 'custom' && (
                        <div className="custom-dates">
                            <h3>Выберите период:</h3>
                            <div className="date-inputs">
                                <div className="date-input">
                                    <label>Дата начала:</label>
                                    <input
                                        type="date"
                                        value={customDateFrom}
                                        onChange={(e) => setCustomDateFrom(e.target.value)}
                                    />
                                </div>
                                <div className="date-input">
                                    <label>Дата окончания:</label>
                                    <input
                                        type="date"
                                        value={customDateTo}
                                        onChange={(e) => setCustomDateTo(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="format-selection">
                        <h3>Формат отчета:</h3>
                        <div className="format-options">
                            {formats.map((formatOption) => (
                                <div
                                    key={formatOption.value}
                                    className={`format-option ${format === formatOption.value ? 'selected' : ''}`}
                                    onClick={() => setFormat(formatOption.value)}
                                >
                                    <span className="format-icon">{formatOption.icon}</span>
                                    <span className="format-label">{formatOption.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-button" onClick={onClose}>
                        Отмена
                    </button>
                    <button 
                        className="generate-button" 
                        onClick={handleGenerate}
                        disabled={selectedPeriod === 'custom' && (!customDateFrom || !customDateTo) || !selectedEquipment}
                    >
                        Создать отчет
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportPeriodModal;
