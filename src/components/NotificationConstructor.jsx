import React, { useState } from 'react';
import '../styles/notificationConstructor.css';

const NotificationConstructor = ({ onTemplateCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        triggerType: '',
        triggerValue: '',
        threshold: '',
        equipmentGroupIds: [], // группы аппаратов (множественный выбор)
        equipmentIds: [], // аппараты (множественный выбор)
        timeThreshold: '', // время для превышения тока
        emailAddress: '', // email для отправки уведомлений
        isActive: true
    });

    const [errors, setErrors] = useState({});
    const [expandedNodes, setExpandedNodes] = useState({});

    const triggerTypes = [
        { value: 'current', label: 'По превышению тока' },
        { value: 'errors', label: 'По ошибкам' },
        { value: 'welding_start', label: 'По началу сварки' },
        { value: 'user_change', label: 'По смене пользователя' }
    ];

    const equipmentTree = [
        {
            id: 'group1',
            name: 'Группа 1',
            type: 'group',
            children: [
                { id: '1', name: 'Аппарат 1', type: 'equipment', groupId: 'group1' },
                { id: '2', name: 'Аппарат 2', type: 'equipment', groupId: 'group1' }
            ]
        },
        {
            id: 'group2',
            name: 'Группа 2',
            type: 'group',
            children: [
                { id: '3', name: 'Аппарат 3', type: 'equipment', groupId: 'group2' },
                { id: '4', name: 'Аппарат 4', type: 'equipment', groupId: 'group2' }
            ]
        },
        {
            id: 'group3',
            name: 'Группа 3',
            type: 'group',
            children: [
                { id: '5', name: 'Аппарат 5', type: 'equipment', groupId: 'group3' },
                { id: '6', name: 'Аппарат 6', type: 'equipment', groupId: 'group3' }
            ]
        }
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

    const handleNodeToggle = (nodeId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    const handleNodeCheck = (nodeId, nodeType, isChecked) => {
        setFormData(prev => {
            if (nodeType === 'group') {
                // Находим группу и все её дочерние элементы
                const group = equipmentTree.find(g => g.id === nodeId);
                const equipmentInGroup = group ? group.children.map(child => child.id) : [];
                
                let newGroupIds, newEquipmentIds;
                if (isChecked) {
                    newGroupIds = [...prev.equipmentGroupIds, nodeId];
                    newEquipmentIds = [...prev.equipmentIds, ...equipmentInGroup];
                } else {
                    newGroupIds = prev.equipmentGroupIds.filter(id => id !== nodeId);
                    newEquipmentIds = prev.equipmentIds.filter(id => !equipmentInGroup.includes(id));
                }
                
                return {
                    ...prev,
                    equipmentGroupIds: newGroupIds,
                    equipmentIds: newEquipmentIds
                };
            } else {
                // Обработка выбора отдельного аппарата
                let newEquipmentIds;
                if (isChecked) {
                    newEquipmentIds = [...prev.equipmentIds, nodeId];
                } else {
                    newEquipmentIds = prev.equipmentIds.filter(id => id !== nodeId);
                }
                
                // Проверяем, нужно ли автоматически выбрать/снять группу
                const equipment = equipmentTree.flatMap(group => group.children).find(eq => eq.id === nodeId);
                if (equipment) {
                    const groupId = equipment.groupId;
                    const group = equipmentTree.find(g => g.id === groupId);
                    const allEquipmentInGroup = group.children.map(child => child.id);
                    const selectedEquipmentInGroup = allEquipmentInGroup.filter(id => newEquipmentIds.includes(id));
                    
                    let newGroupIds = [...prev.equipmentGroupIds];
                    if (selectedEquipmentInGroup.length === allEquipmentInGroup.length) {
                        // Все аппараты в группе выбраны - выбираем группу
                        if (!newGroupIds.includes(groupId)) {
                            newGroupIds.push(groupId);
                        }
                    } else {
                        // Не все аппараты выбраны - снимаем группу
                        newGroupIds = newGroupIds.filter(id => id !== groupId);
                    }
                    
                    return {
                        ...prev,
                        equipmentGroupIds: newGroupIds,
                        equipmentIds: newEquipmentIds
                    };
                }
                
                return {
                    ...prev,
                    equipmentIds: newEquipmentIds
                };
            }
        });
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

        // Валидация email адреса
        if (!formData.emailAddress.trim()) {
            newErrors.emailAddress = 'Email адрес обязателен';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.emailAddress.trim())) {
                newErrors.emailAddress = 'Введите корректный email адрес';
            }
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
                equipmentGroupIds: [],
                equipmentIds: [],
                timeThreshold: '',
                emailAddress: '',
                isActive: true
            });
            setExpandedNodes({});
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

    const renderTreeNode = (node, level = 0) => {
        const isExpanded = expandedNodes[node.id];
        const isGroup = node.type === 'group';
        const isChecked = isGroup 
            ? formData.equipmentGroupIds.includes(node.id)
            : formData.equipmentIds.includes(node.id);
        
        const hasChildren = isGroup && node.children && node.children.length > 0;
        
        return (
            <div key={node.id} className="tree-node">
                <div className="tree-node-content">
                    <label className="tree-checkbox-label">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleNodeCheck(node.id, node.type, e.target.checked)}
                            className="tree-checkbox"
                        />
                        <span className={`tree-label ${isGroup ? 'group-label' : 'equipment-label'}`}>
                            {isGroup ? '📁' : '⚙️'} {node.name}
                        </span>
                    </label>
                    
                    {hasChildren && (
                        <button
                            type="button"
                            className="tree-toggle"
                            onClick={() => handleNodeToggle(node.id)}
                        >
                            <span className={`tree-arrow ${isExpanded ? 'expanded' : ''}`}>
                                ▶
                            </span>
                        </button>
                    )}
                </div>
                
                {hasChildren && isExpanded && (
                    <div className="tree-children">
                        {node.children.map(child => renderTreeNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
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

                    {/* Email для отправки уведомлений */}
                    <div className="form-group">
                        <label className="form-label">
                            Email для отправки уведомлений <span className="required">*</span>
                        </label>
                        <input
                            type="email"
                            name="emailAddress"
                            value={formData.emailAddress}
                            onChange={handleInputChange}
                            className={`form-input email-input ${errors.emailAddress ? 'error' : ''}`}
                            placeholder="example@company.com"
                            required
                        />
                        {errors.emailAddress && <span className="error-message">{errors.emailAddress}</span>}
                        <p className="email-description">
                            На этот адрес будут отправляться уведомления при срабатывании триггера
                        </p>
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

                    {/* Пороговое значение и время превышения тока */}
                    {formData.triggerType === 'current' && (
                        <div className="form-group-row">
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
                        </div>
                    )}

                    {/* Выбор оборудования */}
                    <div className="form-group">
                        <label className="form-label">
                            Оборудование
                        </label>
                        <div className="equipment-tree">
                            {equipmentTree.map(node => renderTreeNode(node))}
                        </div>
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
