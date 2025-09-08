import React, { useState, useEffect } from 'react';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import '../styles/createTemplateModal.css';

const CreateTemplateModal = ({ isOpen, onClose, onCreate }) => {
    const [templateName, setTemplateName] = useState('');
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('day');
    const [selectedFormat, setSelectedFormat] = useState('xlsx');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [selectedShift, setSelectedShift] = useState('');
    const [equipment, setEquipment] = useState([]);
    const [selectedEquipment, setSelectedEquipment] = useState([]);
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
        } catch (error) {
            console.error('Ошибка загрузки оборудования:', error);
        } finally {
            setLoadingEquipment(false);
        }
    };

    // Доступные столбцы для выбора
    const availableColumns = [
        'Дата',
        'Время', 
        'Сварщик',
        'Режим',
        'Сила тока',
        'Масса проволоки',
        'Напряжение',
        'Проволока',
        'Газ л/мин',
        'Время сварки (с)',
        'Подразделение',
        'Количество выполненных швов',
        'Качество работы (%)',
        'Оборудование',
        'Тип неисправности',
        'Описание',
        'Статус'
    ];

    // Периоды отчетов
    const periods = [
        { value: 'day', label: 'День', description: 'Отчет за текущий день' },
        { value: 'week', label: 'Неделя', description: 'Отчет за текущую неделю' },
        { value: 'month', label: 'Месяц', description: 'Отчет за текущий месяц' },
        { value: 'year', label: 'Год', description: 'Отчет за текущий год' },
        { value: 'shift', label: 'Смена', description: 'Отчет за выбранную смену' },
        { value: 'custom', label: 'Кастомный интервал', description: 'Выберите произвольный период' }
    ];

    // Смены
    const shifts = [
        { value: '1', label: '1-я смена', description: '8:00 - 16:00' },
        { value: '2', label: '2-я смена', description: '16:00 - 0:00' },
        { value: '3', label: '3-я смена', description: '0:00 - 8:00' }
    ];

    // Форматы отчетов
    const formats = [
        { value: 'xlsx', label: 'Excel (.xlsx)', icon: '📊' },
        { value: 'csv', label: 'CSV (.csv)', icon: '📋' }
    ];

    const handleColumnToggle = (column) => {
        setSelectedColumns(prev => 
            prev.includes(column) 
                ? prev.filter(c => c !== column)
                : [...prev, column]
        );
    };

    const handleSelectAllColumns = () => {
        setSelectedColumns(availableColumns);
    };

    const handleDeselectAllColumns = () => {
        setSelectedColumns([]);
    };

    const handleEquipmentToggle = (equipmentId) => {
        setSelectedEquipment(prev => 
            prev.includes(equipmentId) 
                ? prev.filter(id => id !== equipmentId)
                : [...prev, equipmentId]
        );
    };

    const handleSelectAllEquipment = () => {
        setSelectedEquipment(equipment.map(eq => eq.id));
    };

    const handleDeselectAllEquipment = () => {
        setSelectedEquipment([]);
    };

    const handlePeriodChange = (period) => {
        setSelectedPeriod(period);
        if (period !== 'custom') {
            setCustomDateFrom('');
            setCustomDateTo('');
        }
        if (period !== 'shift') {
            setSelectedShift('');
        }
    };

    const handleCreate = () => {
        if (!templateName.trim()) {
            alert('Введите название шаблона');
            return;
        }

        if (selectedColumns.length === 0) {
            alert('Выберите хотя бы один столбец для отчета');
            return;
        }

        if (selectedPeriod === 'custom' && (!customDateFrom || !customDateTo)) {
            alert('Для кастомного периода выберите даты начала и окончания');
            return;
        }

        if (selectedPeriod === 'shift' && !selectedShift) {
            alert('Выберите смену для отчета');
            return;
        }

        if (selectedEquipment.length === 0) {
            alert('Выберите хотя бы один аппарат для отчета');
            return;
        }

        const templateData = {
            name: templateName.trim(),
            columns: selectedColumns,
            period: selectedPeriod,
            format: selectedFormat,
            customDateFrom: selectedPeriod === 'custom' ? customDateFrom : null,
            customDateTo: selectedPeriod === 'custom' ? customDateTo : null,
            shift: selectedPeriod === 'shift' ? selectedShift : null,
            equipment: selectedEquipment
        };

        onCreate(templateData);
        
        // Сброс формы
        setTemplateName('');
        setSelectedColumns([]);
        setSelectedPeriod('day');
        setSelectedFormat('xlsx');
        setCustomDateFrom('');
        setCustomDateTo('');
        setSelectedShift('');
        setSelectedEquipment([]);
    };

    const handleClose = () => {
        // Сброс формы при закрытии
        setTemplateName('');
        setSelectedColumns([]);
        setSelectedPeriod('day');
        setSelectedFormat('xlsx');
        setCustomDateFrom('');
        setCustomDateTo('');
        setSelectedShift('');
        setSelectedEquipment([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Создать шаблон отчета</h2>
                    <button className="close-button" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Название шаблона */}
                    <div className="form-section">
                        <h3>Название шаблона</h3>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Введите название шаблона"
                            className="template-name-input"
                        />
                    </div>

                    {/* Выбор столбцов */}
                    <div className="form-section">
                        <div className="section-header">
                            <h3>Выберите столбцы для отчета</h3>
                            <div className="column-controls">
                                <button 
                                    type="button"
                                    className="control-button select-all"
                                    onClick={handleSelectAllColumns}
                                >
                                    Выбрать все
                                </button>
                                <button 
                                    type="button"
                                    className="control-button deselect-all"
                                    onClick={handleDeselectAllColumns}
                                >
                                    Снять все
                                </button>
                            </div>
                        </div>
                        <div className="columns-grid">
                            {availableColumns.map(column => (
                                <label key={column} className="column-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.includes(column)}
                                        onChange={() => handleColumnToggle(column)}
                                    />
                                    <span className="checkbox-label">{column}</span>
                                </label>
                            ))}
                        </div>
                        <div className="selected-count">
                            Выбрано столбцов: {selectedColumns.length} из {availableColumns.length}
                        </div>
                    </div>

                    {/* Выбор оборудования */}
                    <div className="form-section">
                        <div className="section-header">
                            <h3>Выберите аппараты для отчета</h3>
                            <div className="equipment-controls">
                                <button 
                                    type="button"
                                    className="control-button select-all"
                                    onClick={handleSelectAllEquipment}
                                >
                                    Выбрать все
                                </button>
                                <button 
                                    type="button"
                                    className="control-button deselect-all"
                                    onClick={handleDeselectAllEquipment}
                                >
                                    Снять все
                                </button>
                            </div>
                        </div>
                        {loadingEquipment ? (
                            <div className="loading-equipment">Загрузка оборудования...</div>
                        ) : (
                            <div className="equipment-grid">
                                {equipment.map(eq => (
                                    <label key={eq.id} className="equipment-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedEquipment.includes(eq.id)}
                                            onChange={() => handleEquipmentToggle(eq.id)}
                                        />
                                        <div className="equipment-info">
                                            <span className="equipment-name">{eq.name}</span>
                                            <span className="equipment-details">
                                                {eq.model} (№{eq.serialNumber || eq.id})
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                        <div className="selected-count">
                            Выбрано аппаратов: {selectedEquipment.length} из {equipment.length}
                        </div>
                    </div>

                    {/* Выбор периода */}
                    <div className="form-section">
                        <h3>Временной интервал</h3>
                        <div className="period-options">
                            {periods.map(period => (
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

                    {/* Выбор смены (если выбран период "смена") */}
                    {selectedPeriod === 'shift' && (
                        <div className="form-section">
                            <h3>Выберите смену</h3>
                            <div className="shift-options">
                                {shifts.map(shift => (
                                    <div
                                        key={shift.value}
                                        className={`shift-option ${selectedShift === shift.value ? 'selected' : ''}`}
                                        onClick={() => setSelectedShift(shift.value)}
                                    >
                                        <div className="shift-radio">
                                            <div className={`radio-circle ${selectedShift === shift.value ? 'checked' : ''}`}></div>
                                        </div>
                                        <div className="shift-info">
                                            <div className="shift-label">{shift.label}</div>
                                            <div className="shift-description">{shift.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Кастомный период */}
                    {selectedPeriod === 'custom' && (
                        <div className="form-section">
                            <h3>Выберите период</h3>
                            <div className="custom-dates">
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

                    {/* Выбор формата */}
                    <div className="form-section">
                        <h3>Формат отчета</h3>
                        <div className="format-options">
                            {formats.map(format => (
                                <div
                                    key={format.value}
                                    className={`format-option ${selectedFormat === format.value ? 'selected' : ''}`}
                                    onClick={() => setSelectedFormat(format.value)}
                                >
                                    <span className="format-icon">{format.icon}</span>
                                    <span className="format-label">{format.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-button" onClick={handleClose}>
                        Отмена
                    </button>
                    <button 
                        className="create-button" 
                        onClick={handleCreate}
                        disabled={!templateName.trim() || selectedColumns.length === 0 || selectedEquipment.length === 0}
                    >
                        Создать шаблон
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTemplateModal;
