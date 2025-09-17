import React from 'react';
import '../styles/notificationTemplatesList.css';

const NotificationTemplatesList = ({ templates, onTemplateDeleted }) => {
    const getTypeLabel = (type) => {
        const typeLabels = {
            'warning': 'Предупреждение',
            'error': 'Ошибка',
            'info': 'Информация',
            'critical': 'Критическое'
        };
        return typeLabels[type] || type;
    };

    const getTriggerTypeLabel = (triggerType) => {
        const triggerLabels = {
            'current': 'По току',
            'voltage': 'По напряжению',
            'errors': 'По ошибкам',
            'temperature': 'По температуре'
        };
        return triggerLabels[triggerType] || triggerType;
    };

    const getTriggerValueLabel = (triggerValue) => {
        const valueLabels = {
            'exceeds': 'Превышает',
            'below': 'Ниже',
            'equals': 'Равно',
            'any': 'Любая ошибка',
            'critical': 'Критическая ошибка',
            'warning': 'Предупреждение'
        };
        return valueLabels[triggerValue] || triggerValue;
    };

    const handleDeleteTemplate = (templateId, templateName) => {
        if (window.confirm(`Вы уверены, что хотите удалить шаблон "${templateName}"?`)) {
            try {
                // Удаляем из localStorage
                const updatedTemplates = templates.filter(t => t.id !== templateId);
                localStorage.setItem('notificationTemplates', JSON.stringify(updatedTemplates));
                
                // Уведомляем родительский компонент
                if (onTemplateDeleted) {
                    onTemplateDeleted(templateId);
                }
                
                alert('Шаблон уведомления удален успешно!');
            } catch (error) {
                console.error('Ошибка при удалении шаблона:', error);
                alert('Ошибка при удалении шаблона');
            }
        }
    };

    const handleToggleStatus = (templateId, templateName, currentStatus) => {
        try {
            const updatedTemplates = templates.map(t => 
                t.id === templateId 
                    ? { ...t, isActive: !currentStatus }
                    : t
            );
            localStorage.setItem('notificationTemplates', JSON.stringify(updatedTemplates));
            
            const newStatus = !currentStatus ? 'активирован' : 'деактивирован';
            alert(`Шаблон "${templateName}" ${newStatus}!`);
            
            // Обновляем список в родительском компоненте
            if (onTemplateDeleted) {
                onTemplateDeleted(templateId); // Это вызовет обновление списка
            }
        } catch (error) {
            console.error('Ошибка при изменении статуса шаблона:', error);
            alert('Ошибка при изменении статуса шаблона');
        }
    };

    if (templates.length === 0) {
        return (
            <div className="notification-templates-list">
                <div className="templates-header">
                    <h2 className="templates-title">
                        <i className="fas fa-list"></i>
                        Шаблоны уведомлений
                    </h2>
                    <span className="templates-count">0 шаблонов</span>
                </div>
                
                <div className="empty-templates">
                    <div className="empty-icon">📋</div>
                    <h3>Шаблоны не найдены</h3>
                    <p>Создайте первый шаблон уведомления с помощью конструктора выше</p>
                </div>
            </div>
        );
    }

    return (
        <div className="notification-templates-list">
            <div className="templates-header">
                <h2 className="templates-title">
                    <i className="fas fa-list"></i>
                    Шаблоны уведомлений
                </h2>
                <span className="templates-count">{templates.length} шаблонов</span>
            </div>
            
            <div className="templates-table-container">
                <table className="templates-table">
                    <thead>
                        <tr>
                            <th>Название</th>
                            <th>Тип</th>
                            <th>Триггер</th>
                            <th>Пороговое значение</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.map((template) => (
                            <tr key={template.id} className="template-row">
                                <td className="template-name-cell">
                                    <div className="template-name">
                                        {template.name}
                                    </div>
                                    {template.description && (
                                        <div className="template-description">
                                            {template.description}
                                        </div>
                                    )}
                                </td>
                                <td className="template-type-cell">
                                    <span className={`type-badge type-${template.type}`}>
                                        {getTypeLabel(template.type)}
                                    </span>
                                </td>
                                <td className="template-trigger-cell">
                                    <div className="trigger-info">
                                        <span className="trigger-type">
                                            {getTriggerTypeLabel(template.triggerType)}
                                        </span>
                                        <span className="trigger-value">
                                            {getTriggerValueLabel(template.triggerValue)}
                                        </span>
                                    </div>
                                </td>
                                <td className="template-threshold-cell">
                                    {template.threshold ? (
                                        <span className="threshold-value">
                                            {template.threshold}
                                            {template.triggerType === 'current' ? ' А' : 
                                             template.triggerType === 'voltage' ? ' В' : 
                                             template.triggerType === 'temperature' ? '°C' : ''}
                                        </span>
                                    ) : (
                                        <span className="no-threshold">—</span>
                                    )}
                                </td>
                                <td className="template-status-cell">
                                    <span className={`status-badge ${template.isActive ? 'active' : 'inactive'}`}>
                                        {template.isActive ? 'Активен' : 'Неактивен'}
                                    </span>
                                </td>
                                <td className="template-actions-cell">
                                    <div className="template-actions">
                                        <button 
                                            className={`toggle-button ${template.isActive ? 'deactivate' : 'activate'}`}
                                            onClick={() => handleToggleStatus(template.id, template.name, template.isActive)}
                                            title={template.isActive ? 'Деактивировать' : 'Активировать'}
                                        >
                                            <i className={`fas ${template.isActive ? 'fa-pause' : 'fa-play'}`}></i>
                                        </button>
                                        <button 
                                            className="delete-button"
                                            onClick={() => handleDeleteTemplate(template.id, template.name)}
                                            title="Удалить шаблон"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default NotificationTemplatesList;
