import React, { useState } from 'react';
import '../styles/notificationConstructor.css';

const NotificationConstructor = () => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: '',
        triggerType: '',
        triggerValue: '',
        threshold: '',
        equipmentId: '',
        isActive: true
    });

    const [errors, setErrors] = useState({});

    const triggerTypes = [
        { value: 'current', label: 'По току' },
        { value: 'voltage', label: 'По напряжению' },
        { value: 'errors', label: 'По ошибкам' },
        { value: 'temperature', label: 'По температуре' }
    ];

    const notificationTypes = [
        { value: 'warning', label: 'Предупреждение' },
        { value: 'error', label: 'Ошибка' },
        { value: 'info', label: 'Информация' },
        { value: 'critical', label: 'Критическое' }
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
            equipmentId: ''
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Название обязательно';
        }

        if (!formData.type) {
            newErrors.type = 'Тип уведомления обязателен';
        }

        if (!formData.triggerType) {
            newErrors.triggerType = 'Тип триггера обязателен';
        }

        if (formData.triggerType && !formData.triggerValue) {
            newErrors.triggerValue = 'Значение триггера обязательно';
        }

        if (formData.triggerType === 'current' || formData.triggerType === 'voltage') {
            if (!formData.threshold || isNaN(formData.threshold)) {
                newErrors.threshold = 'Пороговое значение должно быть числом';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            // Здесь будет API вызов для создания уведомления
            console.log('Creating notification:', formData);
            
            // Имитация успешного создания
            alert('Уведомление создано успешно!');
            
            // Сброс формы
            setFormData({
                name: '',
                description: '',
                type: '',
                triggerType: '',
                triggerValue: '',
                threshold: '',
                equipmentId: '',
                isActive: true
            });
        } catch (error) {
            console.error('Ошибка при создании уведомления:', error);
            alert('Ошибка при создании уведомления');
        }
    };

    const getTriggerValueOptions = () => {
        switch (formData.triggerType) {
            case 'current':
                return [
                    { value: 'exceeds', label: 'Превышает' },
                    { value: 'below', label: 'Ниже' },
                    { value: 'equals', label: 'Равно' }
                ];
            case 'voltage':
                return [
                    { value: 'exceeds', label: 'Превышает' },
                    { value: 'below', label: 'Ниже' },
                    { value: 'equals', label: 'Равно' }
                ];
            case 'errors':
                return [
                    { value: 'any', label: 'Любая ошибка' },
                    { value: 'critical', label: 'Критическая ошибка' },
                    { value: 'warning', label: 'Предупреждение' }
                ];
            case 'temperature':
                return [
                    { value: 'exceeds', label: 'Превышает' },
                    { value: 'below', label: 'Ниже' }
                ];
            default:
                return [];
        }
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

                    {/* Тип уведомления */}
                    <div className="form-group">
                        <label className="form-label">
                            Тип уведомления *
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            className={`form-input ${errors.type ? 'error' : ''}`}
                        >
                            <option value="">Выберите тип</option>
                            {notificationTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        {errors.type && <span className="error-message">{errors.type}</span>}
                    </div>

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
                    {formData.triggerType && (
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

                    {/* Пороговое значение */}
                    {(formData.triggerType === 'current' || formData.triggerType === 'voltage' || formData.triggerType === 'temperature') && (
                        <div className="form-group">
                            <label className="form-label">
                                Пороговое значение *
                            </label>
                            <input
                                type="number"
                                name="threshold"
                                value={formData.threshold}
                                onChange={handleInputChange}
                                className={`form-input ${errors.threshold ? 'error' : ''}`}
                                placeholder={formData.triggerType === 'current' ? 'Амперы' : 
                                           formData.triggerType === 'voltage' ? 'Вольты' : 'Градусы'}
                                step="0.1"
                            />
                            {errors.threshold && <span className="error-message">{errors.threshold}</span>}
                        </div>
                    )}

                    {/* ID оборудования */}
                    <div className="form-group">
                        <label className="form-label">
                            ID оборудования
                        </label>
                        <input
                            type="text"
                            name="equipmentId"
                            value={formData.equipmentId}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="ID оборудования (необязательно)"
                        />
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
