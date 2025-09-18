import React, { useState } from 'react';
import '../styles/notificationConstructor.css';

const NotificationConstructor = ({ onTemplateCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        triggerType: '',
        triggerValue: '',
        threshold: '',
        equipmentGroupId: '', // группа аппаратов
        equipmentId: '',
        timeThreshold: '', // время для превышения тока
        isActive: true
    });

    const [errors, setErrors] = useState({});

    const triggerTypes = [
        { value: 'current', label: 'По превышению тока' },
        { value: 'errors', label: 'По ошибкам' },
        { value: 'welding_start', label: 'По началу сварки' },
        { value: 'user_change', label: 'По смене пользователя' }
    ];

    const equipmentGroups = [
        { id: '1', name: 'Группа 1' },
        { id: '2', name: 'Группа 2' },
        { id: '3', name: 'Группа 3' }
    ];

    const equipmentList = [
        { id: '1', name: 'Аппарат 1', groupId: '1' },
        { id: '2', name: 'Аппарат 2', groupId: '1' },
        { id: '3', name: 'Аппарат 3', groupId: '2' },
        { id: '4', name: 'Аппарат 4', groupId: '2' },
        { id: '5', name: 'Аппарат 5', groupId: '3' },
        { id: '6', name: 'Аппарат 6', groupId: '3' }
    ];

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Очищаем ошибку при изменении поля
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleTriggerTypeChange = (e) => {
        const triggerType = e.target.value;
        setFormData(prev => ({
            ...prev,
            triggerType,
            triggerValue: '', // Сбрасываем значение при смене типа
            threshold: '',
            timeThreshold: '' // Сбрасываем время при смене типа
        }));
    };

    const handleEquipmentGroupChange = (e) => {
        const groupId = e.target.value;
        setFormData(prev => ({
            ...prev,
            equipmentGroupId: groupId,
            equipmentId: '' // Сбрасываем выбор аппарата при смене группы
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Название обязательно';
        }

        // Убрано: валидация типа уведомления

        if (!formData.triggerType) {
            newErrors.triggerType = 'Тип триггера обязателен';
        }

        // Валидация для превышения тока
        if (formData.triggerType === 'current') {
            if (!formData.threshold) {
                newErrors.threshold = 'Пороговое значение тока обязательно';
            } else if (isNaN(parseFloat(formData.threshold))) {
                newErrors.threshold = 'Пороговое значение должно быть числом';
            }
            if (!formData.timeThreshold) {
                newErrors.timeThreshold = 'Время превышения обязательно';
            }
        }

        // Валидация для других типов триггеров
        if (formData.triggerType && formData.triggerType !== 'current' && !formData.triggerValue) {
            newErrors.triggerValue = 'Значение триггера обязательно';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            // Сохраняем шаблон уведомления в localStorage (демо-версия)
            const notificationTemplates = JSON.parse(localStorage.getItem('notificationTemplates') || '[]');
            const newTemplate = {
                id: `template_${Date.now()}`,
                ...formData,
                createdAt: new Date().toISOString()
            };
            
            notificationTemplates.push(newTemplate);
            localStorage.setItem('notificationTemplates', JSON.stringify(notificationTemplates));
            
            console.log('Notification template created (demo):', newTemplate);
            alert(`Шаблон уведомления "${formData.name}" создан успешно!\n\nВ демо-версии данные сохраняются только в браузере.`);
            
            // Уведомляем родительский компонент о создании шаблона
            if (onTemplateCreated) {
                onTemplateCreated();
            }
            
            // Сброс формы
            setFormData({
                name: '',
                description: '',
                triggerType: '',
                triggerValue: '',
                threshold: '',
                equipmentGroupId: '',
                equipmentId: '',
                timeThreshold: '',
                isActive: true
            });
        } catch (error) {
            console.error('Ошибка при создании уведомления:', error);
            alert('Ошибка при создании уведомления');
        }
    };

    const getTriggerValueOptions = () => {
        switch (formData.triggerType) {
            case 'errors':
                return [
                    { value: 'any', label: 'Любая ошибка' },
                    { value: 'critical', label: 'Критическая ошибка' },
                    { value: 'warning', label: 'Предупреждение' }
                ];
            case 'welding_start':
                return [
                    { value: 'started', label: 'Начало сварки' },
                    { value: 'stopped', label: 'Остановка сварки' }
                ];
            case 'user_change':
                return [
                    { value: 'login', label: 'Вход пользователя' },
                    { value: 'logout', label: 'Выход пользователя' },
                    { value: 'switch', label: 'Смена пользователя' }
                ];
            default:
                return [];
        }
    };

    const getFilteredEquipment = () => {
        if (!formData.equipmentGroupId) {
            return [];
        }
        return equipmentList.filter(equipment => equipment.groupId === formData.equipmentGroupId);
    };

    return (
        <div className="notification-constructor">
            <div className="constructor-header">
                <h2 className="constructor-title">
                    <i className="fas fa-cog"></i>
                    Конструктор уведомлений
                </h2>
                <p className="constructor-description">
                    Создайте шаблон уведомления с настраиваемыми триггерами
                </p>
            </div>

            <form onSubmit={handleSubmit} className="constructor-form">
                <div className="form-grid">
                    {/* Название */}
                    <div className="form-group">
                        <label className="form-label">
                            Название уведомления *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`form-input ${errors.name ? 'error' : ''}`}
                            placeholder="Введите название уведомления"
                        />
                        {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    {/* Описание */}
                    <div className="form-group">
                        <label className="form-label">
                            Описание
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="Описание уведомления (необязательно)"
                            rows="3"
                        />
                    </div>

                    {/* Убрано: Тип уведомления */}

                    {/* Тип триггера */}
                    <div className="form-group">
                        <label className="form-label">
                            Тип триггера *
                        </label>
                        <select
                            name="triggerType"
                            value={formData.triggerType}
                            onChange={handleTriggerTypeChange}
                            className={`form-input ${errors.triggerType ? 'error' : ''}`}
                        >
                            <option value="">Выберите тип</option>
                            {triggerTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        {errors.triggerType && <span className="error-message">{errors.triggerType}</span>}
                    </div>

                    {/* Значение триггера */}
                    {formData.triggerType && formData.triggerType !== 'current' && (
                        <div className="form-group">
                            <label className="form-label">
                                Значение триггера *
                            </label>
                            <select
                                name="triggerValue"
                                value={formData.triggerValue}
                                onChange={handleInputChange}
                                className={`form-input ${errors.triggerValue ? 'error' : ''}`}
                            >
                                <option value="">Выберите значение</option>
                                {getTriggerValueOptions().map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.triggerValue && <span className="error-message">{errors.triggerValue}</span>}
                        </div>
                    )}

                    {/* Пороговое значение для превышения тока */}
                    {formData.triggerType === 'current' && (
                        <div className="form-group">
                            <label className="form-label">
                                Пороговое значение тока (А) *
                            </label>
                            <input
                                type="number"
                                name="threshold"
                                value={formData.threshold}
                                onChange={handleInputChange}
                                className={`form-input ${errors.threshold ? 'error' : ''}`}
                                placeholder="Амперы"
                                step="0.1"
                            />
                            {errors.threshold && <span className="error-message">{errors.threshold}</span>}
                        </div>
                    )}

                    {/* Время превышения тока */}
                    {formData.triggerType === 'current' && (
                        <div className="form-group">
                            <label className="form-label">
                                Время превышения (сек) *
                            </label>
                            <input
                                type="number"
                                name="timeThreshold"
                                value={formData.timeThreshold}
                                onChange={handleInputChange}
                                className={`form-input ${errors.timeThreshold ? 'error' : ''}`}
                                placeholder="Секунды"
                                min="1"
                            />
                            {errors.timeThreshold && <span className="error-message">{errors.timeThreshold}</span>}
                        </div>
                    )}

                    {/* Выбор группы аппаратов */}
                    <div className="form-group">
                        <label className="form-label">
                            Группа аппаратов
                        </label>
                        <select
                            name="equipmentGroupId"
                            value={formData.equipmentGroupId}
                            onChange={handleEquipmentGroupChange}
                            className="form-input"
                        >
                            <option value="">Выберите группу аппаратов</option>
                            {equipmentGroups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Выбор аппарата */}
                    <div className="form-group">
                        <label className="form-label">
                            Аппарат
                        </label>
                        <select
                            name="equipmentId"
                            value={formData.equipmentId}
                            onChange={handleInputChange}
                            className="form-input"
                            disabled={!formData.equipmentGroupId}
                        >
                            <option value="">Выберите аппарат</option>
                            {getFilteredEquipment().map(equipment => (
                                <option key={equipment.id} value={equipment.id}>
                                    {equipment.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Активность */}
                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleInputChange}
                                className="checkbox-input"
                            />
                            <span className="checkbox-text">Активно</span>
                        </label>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn btn-secondary">
                        <i className="fas fa-times"></i>
                        Отмена
                    </button>
                    <button type="submit" className="btn btn-primary">
                        <i className="fas fa-save"></i>
                        Создать уведомление
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NotificationConstructor;
