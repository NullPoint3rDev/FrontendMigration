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

        // Генерируем описание автоматически
        const finalDescription = triggerType === 'TIME' 
            ? generateTimeTriggerDescription() 
            : `${triggerType}: ${triggerValue}`;

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

    const handleSave = (e) => {
        e.preventDefault();
        
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
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Создать автоматизированный отчет</h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <form onSubmit={handleSave}>
                    {error && (
                        <div className="error-message">
                            <i className="fas fa-exclamation-triangle"></i>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Название автоматизированного отчета</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="form-input"
                            placeholder="Например: Еженедельный отчет по оборудованию"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Шаблон отчета</label>
                        <select
                            name="templateId"
                            value={formData.templateId}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className="form-input"
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
                        <label className="form-label">Тип триггера</label>
                        <select
                            value={triggerType}
                            onChange={(e) => setTriggerType(e.target.value)}
                            className="form-input"
                        >
                            {getTriggerTypeOptions().map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Значение триггера</label>
                        <select
                            value={triggerValue}
                            onChange={(e) => setTriggerValue(e.target.value)}
                            className="form-input"
                        >
                            {getTriggerValueOptions().map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Дополнительные поля для временных триггеров */}
                    {triggerType === 'TIME' && (
                        <div className="form-group">
                            <label className="form-label">Время выполнения</label>
                            <input
                                type="time"
                                value={triggerTime}
                                onChange={(e) => setTriggerTime(e.target.value)}
                                className="form-input"
                            />
                        </div>
                    )}

                    {triggerType === 'TIME' && triggerValue === 'weekly' && (
                        <div className="form-group">
                            <label className="form-label">Дни недели</label>
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

                    {triggerType === 'TIME' && triggerValue === 'monthly' && (
                        <div className="form-group">
                            <label className="form-label">День месяца</label>
                            <input
                                type="number"
                                value={triggerDayOfMonth}
                                onChange={(e) => setTriggerDayOfMonth(parseInt(e.target.value) || 1)}
                                className="form-input"
                                min="1"
                                max="31"
                            />
                        </div>
                    )}


                    <div className="form-group">
                        <button
                            type="button"
                            className="add-trigger-btn"
                            onClick={() => {
                                console.log('Debug add trigger:', {
                                    triggerValue,
                                    triggerType,
                                    triggerTime,
                                    triggerDays,
                                    triggerDayOfMonth
                                });
                                addTrigger();
                            }}
                            disabled={
                                !triggerValue || 
                                (triggerType === 'TIME' && !triggerTime) ||
                                (triggerType === 'TIME' && triggerValue === 'weekly' && triggerDays.length === 0) ||
                                (triggerType === 'TIME' && triggerValue === 'monthly' && !triggerDayOfMonth)
                            }
                        >
                            <i className="fas fa-plus"></i>
                            Добавить триггер
                        </button>
                    </div>

                    {/* Список добавленных триггеров */}
                    {formData.triggers.length > 0 && (
                        <div className="form-group">
                            <label className="form-label">Добавленные триггеры:</label>
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

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Отмена
                        </button>
                        <button 
                            type="submit" 
                            className="save-btn"
                            onClick={() => {
                                console.log('Debug create report:', {
                                    name: formData.name,
                                    templateId: formData.templateId,
                                    triggersLength: formData.triggers.length,
                                    triggers: formData.triggers
                                });
                            }}
                            disabled={!formData.name || !formData.templateId || formData.triggers.length === 0}
                        >
                            Создать отчет
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAutomatedReportModal;
