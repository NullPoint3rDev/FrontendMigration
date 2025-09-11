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
    const [triggerType, setTriggerType] = useState('');
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
            // Загружаем пользовательские шаблоны из localStorage
            const savedTemplates = localStorage.getItem('reportTemplates');
            if (savedTemplates) {
                const userTemplates = JSON.parse(savedTemplates);
                console.log('Loaded user templates from localStorage:', userTemplates);
                
                // Преобразуем шаблоны в формат, ожидаемый компонентом
                const formattedTemplates = userTemplates.map(template => ({
                    id: parseInt(template.id), // Преобразуем в число
                    name: template.name,
                    type: template.reportType
                }));
                setTemplates(formattedTemplates);
            } else {
                console.log('No user templates found in localStorage');
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
        setTriggerType('');
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
        const templateIdNum = parseInt(templateId);
        const template = templates.find(t => t.id === templateIdNum);
        console.log('Debug template change:', {
            templateId,
            templateIdNum,
            templates: templates,
            template,
            templateName: template ? template.name : 'NOT_FOUND'
        });
        setFormData(prev => ({
            ...prev,
            templateId: templateIdNum, // Преобразуем в число
            templateName: template ? template.name : ''
        }));
    };

    const addTrigger = () => {
        if (!triggerType) {
            setError('Выберите тип триггера');
            return;
        }
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

    const calculateNextRun = (trigger) => {
        if (!trigger || !trigger.type) {
            console.log('Debug calculateNextRun: trigger is undefined or missing type', trigger);
            return null;
        }
        
        if (trigger.type === 'TIME' && trigger.time) {
            const now = new Date();
            const [hours, minutes] = trigger.time.split(':').map(Number);
            
            // Создаем дату на сегодня с указанным временем
            const todayAtTime = new Date(now);
            todayAtTime.setHours(hours, minutes, 0, 0);
            
            switch (trigger.value) {
                case 'daily':
                    // Если время уже прошло сегодня, планируем на завтра
                    if (todayAtTime <= now) {
                        todayAtTime.setDate(todayAtTime.getDate() + 1);
                    }
                    return todayAtTime;
                    
                case 'weekly':
                    if (trigger.daysOfWeek) {
                        const days = trigger.daysOfWeek.split(',');
                        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                        
                        // Находим ближайший день недели
                        let nextRun = new Date(todayAtTime);
                        let found = false;
                        
                        // Проверяем оставшиеся дни этой недели
                        for (let i = 0; i < 7 && !found; i++) {
                            const checkDate = new Date(todayAtTime);
                            checkDate.setDate(todayAtTime.getDate() + i);
                            const dayName = dayNames[checkDate.getDay()];
                            
                            if (days.includes(dayName)) {
                                if (i === 0 && todayAtTime > now) {
                                    // Сегодня и время еще не прошло
                                    nextRun = todayAtTime;
                                    found = true;
                                } else if (i > 0) {
                                    // Ближайший день в будущем
                                    nextRun = checkDate;
                                    found = true;
                                }
                            }
                        }
                        
                        return nextRun;
                    }
                    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    
                case 'monthly':
                    if (trigger.dayOfMonth) {
                        const dayOfMonth = parseInt(trigger.dayOfMonth);
                        const nextRun = new Date(now);
                        nextRun.setDate(dayOfMonth);
                        nextRun.setHours(hours, minutes, 0, 0);
                        
                        // Если день уже прошел в этом месяце, планируем на следующий месяц
                        if (nextRun <= now) {
                            nextRun.setMonth(nextRun.getMonth() + 1);
                        }
                        
                        return nextRun;
                    }
                    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    
                default:
                    return null;
            }
        }
        return null;
    };

    const handleSave = (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.templateId || formData.triggers.length === 0) {
            setError('Заполните все обязательные поля');
            return;
        }

        // Рассчитываем следующий запуск на основе первого триггера
        const nextRun = formData.isActive && formData.triggers.length > 0 
            ? calculateNextRun(formData.triggers[0]) 
            : null;
        
        console.log('Debug nextRun calculation:', {
            trigger: formData.triggers[0],
            nextRun: nextRun,
            nextRunFormatted: nextRun ? nextRun.toISOString().replace('Z', '').replace(/\.\d{3}$/, '') : null,
            currentTime: new Date(),
            templateId: formData.templateId,
            templateIdType: typeof formData.templateId
        });

        const newReport = {
            name: formData.name,
            templateId: parseInt(formData.templateId), // Убеждаемся, что это число
            templateName: formData.templateName,
            triggersConfig: JSON.stringify(formData.triggers), // Преобразуем триггеры в JSON строку
            isActive: formData.isActive,
            lastRun: null,
            nextRun: nextRun ? nextRun.toISOString().replace('Z', '').replace(/\.\d{3}$/, '') : null, // Убираем Z и миллисекунды для Java LocalDateTime
            createdAt: new Date().toISOString().replace('Z', '').replace(/\.\d{3}$/, ''), // Убираем Z и миллисекунды для Java LocalDateTime
            createdBy: 1 // Временное значение, должно быть ID текущего пользователя
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
                            disabled={templates.length === 0}
                        >
                            <option value="">
                                {templates.length === 0 ? 'Нет доступных шаблонов' : 'Выберите шаблон'}
                            </option>
                            {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </select>
                        {templates.length === 0 && (
                            <div className="info-message">
                                <i className="fas fa-info-circle"></i>
                                Сначала создайте шаблон отчета на странице "Мои отчеты"
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Тип триггера</label>
                        <select
                            value={triggerType}
                            onChange={(e) => {
                                setTriggerType(e.target.value);
                                setTriggerValue(''); // Сбрасываем значение при изменении типа
                            }}
                            className="form-input"
                        >
                            <option value="">Выберите тип</option>
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
                            disabled={!triggerType}
                        >
                            <option value="">Выберите значение</option>
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
                                !triggerType || !triggerValue || 
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
            templateName: formData.templateName,
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
