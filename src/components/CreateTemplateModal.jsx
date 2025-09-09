import React, { useState, useEffect } from 'react';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import '../styles/createTemplateModal.css';

const CreateTemplateModal = ({ isOpen, onClose, onCreate, editingTemplate = null }) => {
    const [templateName, setTemplateName] = useState('');
    const [selectedReportType, setSelectedReportType] = useState('');
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [selectedFormat, setSelectedFormat] = useState('xlsx');
    const [equipment, setEquipment] = useState([]);
    const [selectedEquipment, setSelectedEquipment] = useState([]);
    const [loadingEquipment, setLoadingEquipment] = useState(false);

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
                setSelectedEquipment(editingTemplate.selectedEquipment || []);
            } else {
                // Сбрасываем поля при создании нового шаблона
                setTemplateName('');
                setSelectedReportType('');
                setSelectedColumns([]);
                setSelectedFormat('xlsx');
                setSelectedEquipment([]);
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
        if (selectedReportType && reportTypeColumns[selectedReportType]) {
            setSelectedColumns(reportTypeColumns[selectedReportType]);
        }
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

        if (selectedEquipment.length === 0) {
            alert('Выберите хотя бы один аппарат для отчета');
            return;
        }

        const templateData = {
            id: editingTemplate ? editingTemplate.id : Date.now().toString(),
            name: templateName.trim(),
            reportType: selectedReportType,
            columns: selectedColumns,
            format: selectedFormat,
            selectedEquipment,
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
        setSelectedFormat('xlsx');
        setSelectedEquipment([]);
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
                            {allColumns.map(column => {
                                const isAvailable = selectedReportType && reportTypeColumns[selectedReportType]?.includes(column);
                                const isSelected = selectedColumns.includes(column);
                                
                                return (
                                    <label 
                                        key={column} 
                                        className={`column-checkbox ${!isAvailable ? 'disabled' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleColumnToggle(column)}
                                            disabled={!isAvailable}
                                        />
                                        <span className={`checkbox-label ${!isAvailable ? 'disabled' : ''}`}>
                                            {column}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="selected-count">
                            Выбрано столбцов: {selectedColumns.length} из {selectedReportType ? reportTypeColumns[selectedReportType]?.length || 0 : 0}
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
                        disabled={!templateName.trim() || !selectedReportType || selectedColumns.length === 0 || selectedEquipment.length === 0}
                    >
                        {editingTemplate ? 'Сохранить изменения' : 'Создать шаблон'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTemplateModal;
