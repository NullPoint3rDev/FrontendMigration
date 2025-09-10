import React, { useState, useEffect } from 'react';
import '../styles/createAutomatedReportModal.css';

const CreateAutomatedReportModal = ({ open, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        templateId: '',
        templateName: '',
        triggers: [],
        isActive: true
    });
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [triggerType, setTriggerType] = useState('TIME');
    const [triggerValue, setTriggerValue] = useState('');
    const [triggerDescription, setTriggerDescription] = useState('');
    const [triggerTime, setTriggerTime] = useState('09:00');
    const [triggerDays, setTriggerDays] = useState([]);
    const [triggerDayOfMonth, setTriggerDayOfMonth] = useState(1);


    useEffect(() => {
        if (open) {
            loadTemplates();
            resetForm();
        }
    }, [open]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            // Загружаем шаблоны пользователя из localStorage
            const savedTemplates = localStorage.getItem('reportTemplates');
            if (savedTemplates) {
                const userTemplates = JSON.parse(savedTemplates);
                // Преобразуем шаблоны в формат, ожидаемый компонентом
                const formattedTemplates = userTemplates.map(template => ({
                    id: template.id,
                    name: template.name,
                    type: template.reportType
                }));
                setTemplates(formattedTemplates);
            } else {
                setTemplates([]);
            }
        } catch (err) {
            setError('Ошибка при загрузке шаблонов отчетов');
            console.error('Error loading templates:', err);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            templateId: '',
            templateName: '',
            triggers: [],
            isActive: true
        });
        setTriggerType('TIME');
        setTriggerValue('');
        setTriggerDescription('');
        setTriggerTime('09:00');
        setTriggerDays([]);
        setTriggerDayOfMonth(1);
        setError(null);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleTemplateChange = (templateId) => {
        const template = templates.find(t => t.id === templateId);
        setFormData(prev => ({
            ...prev,
            templateId: templateId,
            templateName: template ? template.name : ''
        }));
    };

    const addTrigger = () => {
        if (!triggerValue) {
            setError('Выберите значение триггера');
            return;
        }

        // Для временных триггеров проверяем дополнительные поля
        if (triggerType === 'TIME') {
            if (!triggerTime) {
                setError('Укажите время выполнения');
                return;
            }
            if (triggerValue === 'weekly' && triggerDays.length === 0) {
                setError('Выберите дни недели для еженедельного выполнения');
                return;
            }
            if (triggerValue === 'monthly' && !triggerDayOfMonth) {
                setError('Укажите день месяца для ежемесячного выполнения');
                return;
            }
        }

        // Для временных триггеров используем автоматически сгенерированное описание
        const finalDescription = triggerType === 'TIME' 
            ? generateTimeTriggerDescription() 
            : triggerDescription;

        if (!finalDescription) {
            setError('Заполните описание триггера');
            return;
        }

        const newTrigger = {
            type: triggerType,
            value: triggerValue,
            description: finalDescription,
            time: triggerType === 'TIME' ? triggerTime : undefined,
            daysOfWeek: triggerType === 'TIME' && triggerValue === 'weekly' ? triggerDays.join(',') : undefined,
            dayOfMonth: triggerType === 'TIME' && triggerValue === 'monthly' ? triggerDayOfMonth : undefined
        };

        setFormData(prev => ({
            ...prev,
            triggers: [...prev.triggers, newTrigger]
        }));

        setTriggerValue('');
        setTriggerDescription('');
        setTriggerTime('09:00');
        setTriggerDays([]);
        setTriggerDayOfMonth(1);
    };

    const removeTrigger = (index) => {
        setFormData(prev => ({
            ...prev,
            triggers: prev.triggers.filter((_, i) => i !== index)
        }));
    };

    const getTriggerIconClass = (type) => {
        switch (type) {
            case 'TIME':
                return 'fa-clock';
            case 'EQUIPMENT_ERROR':
                return 'fa-exclamation-triangle';
            case 'VALUE_THRESHOLD':
                return 'fa-check-circle';
            default:
                return 'fa-cog';
        }
    };

    const getTriggerTypeOptions = () => {
        return [
            { value: 'TIME', label: 'По времени' },
            { value: 'EQUIPMENT_ERROR', label: 'По ошибкам оборудования' },
            { value: 'VALUE_THRESHOLD', label: 'По значениям параметров' }
        ];
    };

    const getTimeOptions = () => {
        return [
            { value: 'daily', label: 'Ежедневно' },
            { value: 'weekly', label: 'Еженедельно' },
            { value: 'monthly', label: 'Ежемесячно' }
        ];
    };

    const getDaysOfWeekOptions = () => {
        return [
            { value: 'MONDAY', label: 'Понедельник' },
            { value: 'TUESDAY', label: 'Вторник' },
            { value: 'WEDNESDAY', label: 'Среда' },
            { value: 'THURSDAY', label: 'Четверг' },
            { value: 'FRIDAY', label: 'Пятница' },
            { value: 'SATURDAY', label: 'Суббота' },
            { value: 'SUNDAY', label: 'Воскресенье' }
        ];
    };

    const handleDayToggle = (day) => {
        setTriggerDays(prev => {
            if (prev.includes(day)) {
                return prev.filter(d => d !== day);
            } else {
                return [...prev, day];
            }
        });
    };

    const generateTimeTriggerDescription = () => {
        if (triggerType !== 'TIME' || !triggerValue || !triggerTime) {
            return '';
        }

        const timeStr = triggerTime;
        
        switch (triggerValue) {
            case 'daily':
                return `Каждый день в ${timeStr}`;
            case 'weekly':
                if (triggerDays.length === 0) {
                    return `Еженедельно в ${timeStr}`;
                }
                const dayNames = triggerDays.map(day => {
                    const option = getDaysOfWeekOptions().find(opt => opt.value === day);
                    return option ? option.label : day;
                });
                return `Каждую неделю в ${dayNames.join(', ')} в ${timeStr}`;
            case 'monthly':
                return `Каждый месяц ${triggerDayOfMonth} числа в ${timeStr}`;
            default:
                return `В ${timeStr}`;
        }
    };

    const getEquipmentErrorOptions = () => {
        return [
            { value: 'threshold', label: 'При превышении порога ошибок' },
            { value: 'critical', label: 'При критических ошибках' },
            { value: 'any', label: 'При любой ошибке' }
        ];
    };

    const getValueThresholdOptions = () => {
        return [
            { value: 'temperature', label: 'Температура' },
            { value: 'current', label: 'Сила тока' },
            { value: 'voltage', label: 'Напряжение' },
            { value: 'power', label: 'Мощность' }
        ];
    };

    const getTriggerValueOptions = () => {
        switch (triggerType) {
            case 'TIME':
                return getTimeOptions();
            case 'EQUIPMENT_ERROR':
                return getEquipmentErrorOptions();
            case 'VALUE_THRESHOLD':
                return getValueThresholdOptions();
            default:
                return [];
        }
    };

    const handleSave = () => {
        if (!formData.name || !formData.templateId || formData.triggers.length === 0) {
            setError('Заполните все обязательные поля');
            return;
        }

        const newReport = {
            id: Date.now(), // Временный ID для mock данных
            name: formData.name,
            templateId: formData.templateId,
            templateName: formData.templateName,
            triggers: formData.triggers,
            status: formData.isActive ? 'ACTIVE' : 'INACTIVE',
            lastRun: null,
            nextRun: formData.isActive ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
            createdAt: new Date(),
            createdBy: 'Текущий пользователь'
        };

        onSave(newReport);
        onClose();
    };

    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="create-automated-report-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Создать автоматизированный отчет</h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="modal-content">
                    {error && (
                        <div className="error-message">
                            <i className="fas fa-exclamation-triangle"></i>
                            {error}
                        </div>
                    )}

                    {/* Основная информация */}
                    <div className="form-section">
                        <h3>Основная информация</h3>
                        <div className="form-group">
                            <label>Название автоматизированного отчета *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Например: Еженедельный отчет по оборудованию"
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Шаблон отчета *</label>
                            <select
                                value={formData.templateId}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                required
                            >
                                <option value="">Выберите шаблон</option>
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                Активировать автоматический отчет сразу после создания
                            </label>
                        </div>
                    </div>

                    {/* Триггеры */}
                    <div className="form-section">
                        <h3>Триггеры запуска</h3>
                        <p className="section-description">
                            Настройте условия, при которых будет автоматически создаваться отчет
                        </p>

                        {/* Добавление нового триггера */}
                        <div className="trigger-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Тип триггера</label>
                                    <select
                                        value={triggerType}
                                        onChange={(e) => setTriggerType(e.target.value)}
                                    >
                                        {getTriggerTypeOptions().map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Значение</label>
                                    <select
                                        value={triggerValue}
                                        onChange={(e) => setTriggerValue(e.target.value)}
                                    >
                                        {getTriggerValueOptions().map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Дополнительные поля для временных триггеров */}
                            {triggerType === 'TIME' && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Время выполнения</label>
                                            <input
                                                type="time"
                                                value={triggerTime}
                                                onChange={(e) => setTriggerTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    
                                    {triggerValue === 'weekly' && (
                                        <div className="form-group">
                                            <label>Дни недели:</label>
                                            <div className="days-selector">
                                                {getDaysOfWeekOptions().map((day) => (
                                                    <button
                                                        key={day.value}
                                                        type="button"
                                                        className={`day-chip ${triggerDays.includes(day.value) ? 'selected' : ''}`}
                                                        onClick={() => handleDayToggle(day.value)}
                                                    >
                                                        {day.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {triggerValue === 'monthly' && (
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>День месяца</label>
                                                <input
                                                    type="number"
                                                    value={triggerDayOfMonth}
                                                    onChange={(e) => setTriggerDayOfMonth(parseInt(e.target.value) || 1)}
                                                    min="1"
                                                    max="31"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            <div className="form-group">
                                <label>Описание</label>
                                <input
                                    type="text"
                                    value={triggerType === 'TIME' ? generateTimeTriggerDescription() : triggerDescription}
                                    onChange={(e) => setTriggerDescription(e.target.value)}
                                    placeholder="Например: Каждую неделю в понедельник в 09:00"
                                    disabled={triggerType === 'TIME' && !!generateTimeTriggerDescription()}
                                />
                            </div>
                            
                            <button
                                type="button"
                                className="add-trigger-btn"
                                onClick={addTrigger}
                                disabled={
                                    !triggerValue || 
                                    (triggerType === 'TIME' && !triggerTime) ||
                                    (triggerType === 'TIME' && triggerValue === 'weekly' && triggerDays.length === 0) ||
                                    (triggerType === 'TIME' && triggerValue === 'monthly' && !triggerDayOfMonth) ||
                                    (triggerType !== 'TIME' && !triggerDescription)
                                }
                            >
                                <i className="fas fa-plus"></i>
                                Добавить триггер
                            </button>
                        </div>

                        {/* Список добавленных триггеров */}
                        {formData.triggers.length > 0 && (
                            <div className="triggers-list">
                                <h4>Добавленные триггеры:</h4>
                                <div className="triggers-chips">
                                    {formData.triggers.map((trigger, index) => (
                                        <div key={index} className="trigger-chip">
                                            <i className={`fas ${getTriggerIconClass(trigger.type)}`}></i>
                                            <span>{trigger.description}</span>
                                            <button 
                                                type="button"
                                                className="remove-trigger-btn"
                                                onClick={() => removeTrigger(index)}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        type="button"
                        className="create-btn"
                        onClick={handleSave}
                        disabled={!formData.name || !formData.templateId || formData.triggers.length === 0}
                    >
                        Создать отчет
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateAutomatedReportModal;
