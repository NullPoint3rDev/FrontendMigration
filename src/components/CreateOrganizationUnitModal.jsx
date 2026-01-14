import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import { createOrganizationUnit } from '../api/organizationUnitApi';
import '../styles/createOrganizationUnitModal.css';

const CreateOrganizationUnitModal = ({ isOpen, onClose, onSuccess, existingUnits = [] }) => {
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [nameError, setNameError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Сброс формы при открытии
            setName('');
            setParentId('');
            setError('');
            setNameError('');
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Валидация
        if (!name.trim()) {
            setNameError('Поле обязательно для заполнения');
            return;
        }

        setNameError('');
        setError('');
        setLoading(true);

        try {
            // Преобразуем parentId в число, если он есть
            const parsedParentId = parentId && parentId !== '' ? parseInt(parentId) : null;

            // Отправляем данные в формате, который ожидает API
            // API ожидает parentDepartment как объект с id, а не просто parent_id
            const unitData = {
                name: name.trim(),
                parentDepartment: parsedParentId ? { id: parsedParentId } : null
            };

            const createdUnit = await createOrganizationUnit(unitData);

            if (onSuccess) {
                onSuccess(createdUnit);
            }

            onClose();
        } catch (error) {
            console.error('Ошибка создания подразделения:', error);
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Не удалось создать подразделение';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setName('');
        setParentId('');
        setError('');
        setNameError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="create-org-unit-modal-overlay" onClick={handleClose}>
            <div className="create-org-unit-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="create-org-unit-modal-close" onClick={handleClose}>
                    ×
                </button>

                <h2 className="create-org-unit-modal-title">Создать новое подразделение</h2>

                <form onSubmit={handleSubmit} className="create-org-unit-form">
                    <div className="create-org-unit-form-field">
                        <label htmlFor="name">
                            Название<span className="required">*</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (nameError) setNameError('');
                            }}
                            placeholder="Введите название подразделения"
                            className={nameError ? 'error' : ''}
                        />
                        {nameError && <span className="error-message">{nameError}</span>}
                    </div>

                    <div className="create-org-unit-form-field">
                        <label htmlFor="parentId">Принадлежность</label>
                        <select
                            id="parentId"
                            value={parentId}
                            onChange={(e) => setParentId(e.target.value)}
                        >
                            <option value="">Выберите родительское подразделение</option>
                            {existingUnits.map(unit => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="create-org-unit-info-message">
                        <FaExclamationTriangle className="info-icon" />
                        <span>
                            После создания нового подразделения вы сможете добавлять в него сварщиков и аппараты.
                        </span>
                    </div>

                    {error && (
                        <div className="create-org-unit-error-message">
                            {error}
                        </div>
                    )}

                    <div className="create-org-unit-modal-actions">
                        <button
                            type="submit"
                            className="create-org-unit-btn create"
                            disabled={loading}
                        >
                            <FaCheck className="btn-icon" />
                            Создать
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateOrganizationUnitModal;

