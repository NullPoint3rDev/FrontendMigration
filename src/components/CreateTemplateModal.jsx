import React, { useState, useEffect } from 'react';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import '../styles/createTemplateModal.css';

const CreateTemplateModal = ({ isOpen, onClose, onCreate, editingTemplate = null }) => {
    const [templateName, setTemplateName] = useState('');
    const [selectedReportType, setSelectedReportType] = useState('');
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [selectedFormat, setSelectedFormat] = useState('EXCEL');
    const [equipment, setEquipment] = useState([]);
    const [selectedMachine, setSelectedMachine] = useState('');
    const [repeatType, setRepeatType] = useState('never'); // never, daily, weekly, monthly, quarterly, custom
    const [autoTime, setAutoTime] = useState('09:00');
    const [selectedDays, setSelectedDays] = useState([]); // для ежедневного повтора
    const [weeklyDate, setWeeklyDate] = useState(''); // для еженедельного повтора - дата
    const [monthlyDate, setMonthlyDate] = useState(''); // для ежемесячного повтора - дата
    const [quarterlyDate, setQuarterlyDate] = useState(''); // для квартального повтора - дата
    const [selectedQuarter, setSelectedQuarter] = useState(1); // для квартального повтора
    const [customDate, setCustomDate] = useState(''); // для кастомной даты
    const [emailAddress, setEmailAddress] = useState(''); // для отправки отчета на email

    // Загружаем список оборудования при открытии модального окна
    useEffect(() => {
        if (isOpen) {
            loadEquipment();
            // Если редактируем шаблон, заполняем поля
            if (editingTemplate) {
                setTemplateName(editingTemplate.name);
                setSelectedReportType(editingTemplate.reportType);
                setSelectedColumns(editingTemplate.columns);
                setSelectedFormat(editingTemplate.format);
            } else {
                // Сбрасываем поля при создании нового шаблона
                setTemplateName('');
                setSelectedReportType('');
                setSelectedColumns([]);
                setSelectedFormat('EXCEL');
                setSelectedMachine('');
                setRepeatType('never');
                setAutoTime('09:00');
                setSelectedDays([]);
                setWeeklyDate('');
                setMonthlyDate('');
                setQuarterlyDate('');
                setSelectedQuarter(1);
                setCustomDate('');
                setEmailAddress('');
            }
        }
    }, [isOpen, editingTemplate]);

    // Автоматически выбираем столбцы при выборе типа отчета
    useEffect(() => {
        if (selectedReportType && reportTypeColumns[selectedReportType]) {
            // Если это редактирование, сохраняем только доступные столбцы
            if (editingTemplate) {
                const availableColumns = reportTypeColumns[selectedReportType];
                const filteredColumns = selectedColumns.filter(col => availableColumns.includes(col));
                setSelectedColumns(filteredColumns.length > 0 ? filteredColumns : availableColumns);
            } else {
                // При создании нового шаблона выбираем все доступные столбцы
                setSelectedColumns(reportTypeColumns[selectedReportType]);
            }
        } else if (!selectedReportType) {
            // Если тип отчета не выбран, очищаем выбор столбцов
            setSelectedColumns([]);
        }
    }, [selectedReportType, editingTemplate]);

    const loadEquipment = async () => {
        try {
            const equipmentData = await getAllWeldingMachines();
            setEquipment(equipmentData);
        } catch (error) {
            console.error('Ошибка загрузки оборудования:', error);
        }
    };

    // Типы отчетов
    const reportTypes = [
        { value: 'equipment', label: 'По работе оборудования' },
        { value: 'welders', label: 'По работе сварщиков' },
        { value: 'materials', label: 'По расходу материалов' },
        { value: 'welds', label: 'По сварочным швам' },
        { value: 'errors', label: 'По ошибкам сварочного оборудования' },
        { value: 'violations', label: 'По нарушениям' }
    ];

    // Столбцы для каждого типа отчета
    const reportTypeColumns = {
        equipment: [
            'Сварщик', 'Режим', 'Сила тока', 'Масса проволоки', 'Напряжение', 
            'Проволока', 'Газ л/мин', 'Время сварки (с)'
        ],
        welders: [
            'ID сварщика', 'ФИО', 'Подразделение', 'Квалификация', 'Время работы (часы)',
            'Количество выполненных швов', 'Расход проволоки (кг)', 'Средний ток (А)',
            'Среднее напряжение (В)', 'Качество работы (%)', 'Дата последней работы'
        ],
        materials: [
            'Сварщик', 'Должность', 'Время в сети', 'Время горения дуги', 'С превышением тока 340А',
            'Эффективность работы', 'Энергия (кВт*ч)', 'Проволока', 'Расход (кг)'
        ],
        welds: [
            'ID шва', 'Тип шва', 'Сварщик', 'Оборудование', 'Материал', 'Длина (мм)',
            'Толщина (мм)', 'Ток (А)', 'Напряжение (В)', 'Скорость (мм/мин)', 'Качество (%)'
        ],
        errors: [
            'Оборудование', 'Тип неисправности', 'Описание', 'Статус', 'Общее количество неисправностей'
        ],
        violations: [
            'Сварщик', 'Тип нарушения', 'Описание', 'Статус', 'Дата нарушения'
        ]
    };

    // Все доступные столбцы (для определения недоступных)
    const allColumns = [
        'Сварщик', 'Режим', 'Сила тока', 'Масса проволоки', 'Напряжение', 'Проволока', 'Газ л/мин', 'Время сварки (с)',
        'ID сварщика', 'ФИО', 'Подразделение', 'Квалификация', 'Время работы (часы)', 'Количество выполненных швов',
        'Расход проволоки (кг)', 'Средний ток (А)', 'Среднее напряжение (В)', 'Качество работы (%)', 'Дата последней работы',
        'Должность', 'Время в сети', 'Время горения дуги', 'С превышением тока 340А', 'Эффективность работы',
        'Энергия (кВт*ч)', 'Расход (кг)', 'ID шва', 'Тип шва', 'Оборудование', 'Материал', 'Длина (мм)',
        'Толщина (мм)', 'Ток (А)', 'Скорость (мм/мин)', 'Качество (%)', 'Тип неисправности', 'Описание', 'Статус',
        'Общее количество неисправностей', 'Тип нарушения', 'Дата нарушения'
    ];

    // Форматы отчетов
    const formats = [
        { value: 'EXCEL', label: 'Excel (.xlsx)', icon: '📊' },
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
        if (selectedReportType && reportTypeColumns[selectedReportType]) {
            setSelectedColumns(reportTypeColumns[selectedReportType]);
        }
    };

    const handleDeselectAllColumns = () => {
        setSelectedColumns([]);
    };

    // Функции для работы с днями недели
    const weekDays = [
        { value: 1, label: 'Понедельник' },
        { value: 2, label: 'Вторник' },
        { value: 3, label: 'Среда' },
        { value: 4, label: 'Четверг' },
        { value: 5, label: 'Пятница' },
        { value: 6, label: 'Суббота' },
        { value: 0, label: 'Воскресенье' }
    ];

    const months = [
        { value: 1, label: 'Январь' },
        { value: 2, label: 'Февраль' },
        { value: 3, label: 'Март' },
        { value: 4, label: 'Апрель' },
        { value: 5, label: 'Май' },
        { value: 6, label: 'Июнь' },
        { value: 7, label: 'Июль' },
        { value: 8, label: 'Август' },
        { value: 9, label: 'Сентябрь' },
        { value: 10, label: 'Октябрь' },
        { value: 11, label: 'Ноябрь' },
        { value: 12, label: 'Декабрь' }
    ];

    const quarters = [
        { value: 1, label: '1 квартал (Январь-Март)' },
        { value: 2, label: '2 квартал (Апрель-Июнь)' },
        { value: 3, label: '3 квартал (Июль-Сентябрь)' },
        { value: 4, label: '4 квартал (Октябрь-Декабрь)' }
    ];

    const handleDayToggle = (dayValue) => {
        setSelectedDays(prev => 
            prev.includes(dayValue) 
                ? prev.filter(day => day !== dayValue)
                : [...prev, dayValue]
        );
    };

    const handleSelectAllDays = () => {
        if (selectedDays.length === weekDays.length) {
            // Если все дни выбраны, снимаем выбор со всех
            setSelectedDays([]);
        } else {
            // Иначе выбираем все дни
            setSelectedDays(weekDays.map(day => day.value));
        }
    };

    // Убрано: handleWeekDayToggle для еженедельного повтора



    const handleCreate = () => {
        if (!templateName.trim()) {
            alert('Введите название шаблона');
            return;
        }

        if (!selectedReportType) {
            alert('Выберите тип отчета');
            return;
        }

        if (selectedColumns.length === 0) {
            alert('Выберите хотя бы один столбец для отчета');
            return;
        }

        if (!selectedMachine) {
            alert('Выберите аппарат для отчета');
            return;
        }

        // Валидация для ежедневного повтора
        if (repeatType === 'daily' && selectedDays.length === 0) {
            alert('Выберите хотя бы один день недели для ежедневного повтора');
            return;
        }

        // Валидация для еженедельного повтора
        if (repeatType === 'weekly' && !weeklyDate) {
            alert('Выберите дату для еженедельного повтора');
            return;
        }

        // Валидация для ежемесячного повтора
        if (repeatType === 'monthly' && !monthlyDate) {
            alert('Выберите дату для ежемесячного повтора');
            return;
        }

        // Валидация для квартального повтора
        if (repeatType === 'quarterly' && !quarterlyDate) {
            alert('Выберите дату для квартального повтора');
            return;
        }

        // Валидация для одноразового выполнения
        if (repeatType === 'custom' && !customDate) {
            alert('Выберите дату для одноразового выполнения');
            return;
        }

        // Валидация email адреса для повторяющихся отчетов
        if (repeatType !== 'never' && !emailAddress.trim()) {
            alert('Введите email адрес для отправки автоматических отчетов');
            return;
        }

        // Валидация формата email
        if (repeatType !== 'never' && emailAddress.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailAddress.trim())) {
                alert('Введите корректный email адрес');
                return;
            }
        }

        const templateData = {
            id: editingTemplate ? editingTemplate.id : Date.now().toString(),
            name: templateName.trim(),
            reportType: selectedReportType,
            columns: selectedColumns,
            format: selectedFormat,
            selectedMachine,
            repeatType,
            autoTime,
            selectedDays,
            weeklyDate,
            monthlyDate,
            quarterlyDate,
            selectedQuarter,
            customDate,
            emailAddress: emailAddress.trim(),
            createdAt: editingTemplate ? editingTemplate.createdAt : new Date().toISOString(),
            lastUsed: null
        };

        onCreate(templateData);
        handleClose();
    };

    const handleClose = () => {
        // Сброс формы при закрытии
        setTemplateName('');
        setSelectedReportType('');
        setSelectedColumns([]);
        setSelectedFormat('EXCEL');
        setEmailAddress('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{editingTemplate ? 'Редактировать шаблон отчета' : 'Создать шаблон отчета'}</h2>
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

                    {/* Выбор аппарата */}
                    <div className="form-section">
                        <h3>Выберите аппарат</h3>
                        <select
                            value={selectedMachine}
                            onChange={(e) => setSelectedMachine(e.target.value)}
                            className="machine-select"
                        >
                            <option value="">Выберите аппарат</option>
                            {equipment.map(machine => (
                                <option key={machine.id} value={machine.id}>
                                    {machine.name || machine.model || `Аппарат ${machine.id}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Выбор типа отчета */}
                    <div className="form-section">
                        <h3>Тип отчета</h3>
                        <select
                            value={selectedReportType}
                            onChange={(e) => setSelectedReportType(e.target.value)}
                            className="report-type-select"
                        >
                            <option value="">Выберите тип отчета</option>
                            {reportTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Выбор столбцов */}
                    <div className="form-section">
                        <div className="section-header">
                            <h3>Выберите столбцы для отчета</h3>
                            {selectedReportType && (
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
                            )}
                        </div>
                        {!selectedReportType && (
                            <div className="no-report-type-message">
                                <p>⚠️ Сначала выберите тип отчета, чтобы увидеть доступные столбцы</p>
                            </div>
                        )}
                        <div className="columns-grid">
                            {selectedReportType && reportTypeColumns[selectedReportType] ? 
                                reportTypeColumns[selectedReportType].map(column => {
                                    const isSelected = selectedColumns.includes(column);
                                    
                                    return (
                                        <label 
                                            key={column} 
                                            className="column-checkbox"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleColumnToggle(column)}
                                            />
                                            <span className="checkbox-label">
                                                {column}
                                            </span>
                                        </label>
                                    );
                                }) : null
                            }
                        </div>
                        <div className="selected-count">
                            Выбрано столбцов: {selectedColumns.length} из {selectedReportType ? reportTypeColumns[selectedReportType]?.length || 0 : 0}
                        </div>
                    </div>


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

                    {/* Настройки автоматизации */}
                    <div className="form-section">
                        <h3>Настройки автоматического создания отчета</h3>
                        
                        {/* Тип повтора */}
                        <div className="repeat-type-container">
                            <label className="form-label">Повтор</label>
                            <select
                                value={repeatType}
                                onChange={(e) => setRepeatType(e.target.value)}
                                className="repeat-type-select"
                            >
                                <option value="never">Никогда</option>
                                <option value="daily">Ежедневно</option>
                                <option value="weekly">Еженедельно</option>
                                <option value="monthly">Ежемесячно</option>
                                <option value="quarterly">Раз в квартал</option>
                                <option value="custom">Один раз</option>
                            </select>
                        </div>

                        {/* Время выполнения */}
                        {repeatType !== 'never' && (
                            <div className="auto-time-container">
                                <label className="form-label">Время выполнения</label>
                                <input
                                    type="time"
                                    value={autoTime}
                                    onChange={(e) => setAutoTime(e.target.value)}
                                    className="auto-time-input"
                                />
                            </div>
                        )}

                        {/* Настройки для ежедневного повтора */}
                        {repeatType === 'daily' && (
                            <div className="daily-settings">
                                <label className="form-label">Дни недели</label>
                                <div className="select-all-container">
                                    <label className="select-all-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedDays.length === weekDays.length}
                                            onChange={handleSelectAllDays}
                                        />
                                        <span>Выбрать все</span>
                                    </label>
                                </div>
                                <div className="weekdays-grid">
                                    {weekDays.map(day => (
                                        <label key={day.value} className="weekday-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedDays.includes(day.value)}
                                                onChange={() => handleDayToggle(day.value)}
                                            />
                                            <span>{day.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Настройки для еженедельного повтора */}
                        {repeatType === 'weekly' && (
                            <div className="weekly-settings">
                                <label className="form-label">Дата выполнения</label>
                                <input
                                    type="date"
                                    value={weeklyDate}
                                    onChange={(e) => setWeeklyDate(e.target.value)}
                                    className="weekly-date-input"
                                />
                            </div>
                        )}

                        {/* Настройки для ежемесячного повтора */}
                        {repeatType === 'monthly' && (
                            <div className="monthly-settings">
                                <label className="form-label">Дата выполнения</label>
                                <input
                                    type="date"
                                    value={monthlyDate}
                                    onChange={(e) => setMonthlyDate(e.target.value)}
                                    className="monthly-date-input"
                                />
                            </div>
                        )}

                        {/* Настройки для квартального повтора */}
                        {repeatType === 'quarterly' && (
                            <div className="quarterly-settings">
                                <label className="form-label">Дата выполнения</label>
                                <input
                                    type="date"
                                    value={quarterlyDate}
                                    onChange={(e) => setQuarterlyDate(e.target.value)}
                                    className="quarterly-date-input"
                                />
                            </div>
                        )}

                        {/* Настройки для одноразового выполнения */}
                        {repeatType === 'custom' && (
                            <div className="custom-settings">
                                <label className="form-label">Дата выполнения</label>
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    className="custom-date-input"
                                />
                            </div>
                        )}

                        {repeatType !== 'never' && (
                            <p className="auto-description">
                                Отчет будет автоматически создаваться согласно выбранным настройкам
                            </p>
                        )}

                        {/* Поле для email адреса (только для повторяющихся отчетов) */}
                        {repeatType !== 'never' && (
                            <div className="email-section">
                                <label className="form-label">
                                    Email для отправки отчета <span className="required">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={emailAddress}
                                    onChange={(e) => setEmailAddress(e.target.value)}
                                    placeholder="example@company.com"
                                    className="form-input email-input"
                                    required
                                />
                                <p className="email-description">
                                    На этот адрес будут отправляться автоматически сгенерированные отчеты
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-button" onClick={handleClose}>
                        Отмена
                    </button>
                    <button 
                        className="create-button" 
                        onClick={handleCreate}
                        disabled={!templateName.trim() || !selectedReportType || selectedColumns.length === 0 || !selectedMachine}
                    >
                        {editingTemplate ? 'Сохранить изменения' : 'Создать шаблон'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTemplateModal;
