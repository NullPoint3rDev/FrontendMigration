import React, { useState } from 'react'
import '../styles/addEquipmentModal.css'
import machineImage from '../images/2 копия.png'

const AddEquipmentModal = ({ isOpen, onClose, onSave, welders = [], organizationUnits = [] }) => {
    const [selectedModel, setSelectedModel] = useState('Core')
    const [formData, setFormData] = useState({
        name: '',
        department: '',
        commissioningDate: '',
        macAddress: '',
        serialNumber: '',
        inventoryNumber: '',
        responsiblePerson: '',
        lastMaintenanceDate: '',
        operatingHours: '',
        maintenancePerson: '',
        maintenancePass: '',
        approvedWelders: []
    })

    const [selectedOptions, setSelectedOptions] = useState({
        rfid: false,
        bvo: false,
        gasControl: false
    })

    const [errors, setErrors] = useState({})
    const [apiError, setApiError] = useState('')

    const models = [
        'Core',
        'Блок мониторинга'
    ]

    if (!isOpen) return null

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
        // Очищаем ошибку для этого поля при изменении
        // Маппим поля: department -> organizationUnit, macAddress -> mac, commissioningDate -> commissionDate
        const errorKey = field === 'department' ? 'organizationUnit' : 
                        field === 'macAddress' ? 'mac' : 
                        field === 'commissioningDate' ? 'commissionDate' : field;
        
        if (errors[field] || errors[errorKey]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                delete newErrors[errorKey]
                return newErrors
            })
        }
        // Очищаем общую ошибку API
        if (apiError) {
            setApiError('')
        }
    }

    const toggleOption = (option) => {
        setSelectedOptions(prev => ({
            ...prev,
            [option]: !prev[option]
        }))
    }

    const handleSave = async () => {
        // Очищаем предыдущие ошибки
        setErrors({})
        setApiError('')

        if (onSave) {
            try {
                console.log('🔵 AddEquipmentModal: Вызываем onSave с данными:', {
                    model: selectedModel,
                    ...formData,
                    options: selectedOptions
                });
                await onSave({
                model: selectedModel,
                ...formData,
                options: selectedOptions
                });
                console.log('✅ AddEquipmentModal: onSave завершен успешно');
                
                // Сбрасываем форму после успешного сохранения
                setSelectedModel('Core')
                setFormData({
                    name: '',
                    department: '',
                    commissioningDate: '',
                    macAddress: '',
                    serialNumber: '',
                    inventoryNumber: '',
                    responsiblePerson: '',
                    lastMaintenanceDate: '',
                    operatingHours: '',
                    maintenancePerson: '',
                    maintenancePass: '',
                    approvedWelders: []
                })
                setSelectedOptions({
                    rfid: false,
                    bvo: false,
                    gasControl: false
                })
                setErrors({})
                setApiError('')
                onClose()
            } catch (error) {
                console.error('❌ AddEquipmentModal: Ошибка в onSave:', error);
                console.error('❌ AddEquipmentModal: error.errors:', error.errors);
                console.error('❌ AddEquipmentModal: typeof error.errors:', typeof error.errors);
                
                // Если ошибка содержит объект с полями ошибок
                if (error.errors && typeof error.errors === 'object') {
                    console.log('✅ AddEquipmentModal: Обрабатываем ошибки валидации:', error.errors);
                    // Маппим ошибки: organizationUnit -> department, mac -> macAddress, commissionDate -> commissioningDate
                    const mappedErrors = {};
                    Object.keys(error.errors).forEach(key => {
                        if (key === 'organizationUnit') {
                            mappedErrors.department = error.errors[key];
                        } else if (key === 'mac') {
                            mappedErrors.macAddress = error.errors[key];
                        } else if (key === 'commissionDate') {
                            mappedErrors.commissioningDate = error.errors[key];
                        } else if (key === 'api') {
                            // Общая ошибка API
                            setApiError(error.errors[key]);
                        } else {
                            mappedErrors[key] = error.errors[key];
                        }
                    });
                    console.log('✅ AddEquipmentModal: Маппированные ошибки:', mappedErrors);
                    setErrors(mappedErrors);
                } else if (error.message) {
                    // Если это общая ошибка API
                    console.log('⚠️ AddEquipmentModal: Устанавливаем общую ошибку API:', error.message);
                    setApiError(error.message);
                } else {
                    console.log('⚠️ AddEquipmentModal: Устанавливаем общую ошибку по умолчанию');
                    setApiError('Произошла ошибка при сохранении оборудования');
                }
                // Не закрываем модальное окно при ошибке
            }
        }
    }

    const handleClose = () => {
        // Сбрасываем форму при закрытии
        setSelectedModel('Core')
        setFormData({
            name: '',
            department: '',
            commissioningDate: '',
            macAddress: '',
            serialNumber: '',
            inventoryNumber: '',
            responsiblePerson: '',
            lastMaintenanceDate: '',
            operatingHours: '',
            maintenancePerson: '',
            maintenancePass: '',
            approvedWelders: []
        })
        setSelectedOptions({
            rfid: false,
            bvo: false,
            gasControl: false
        })
        setErrors({})
        setApiError('')
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={handleClose}>×</button>
                
                <div className="modal-body">
                    <div className="modal-left">
                        <div className="equipment-image-container">
                            <img 
                                src={machineImage} 
                                alt="Welding machine"
                                className="equipment-image"
                            />
                        </div>
                        <div className="model-selection">
                            <label className="model-label">Модель*</label>
                            <div className="model-list">
                                {models.map(model => (
                                    <button
                                        key={model}
                                        className={`model-item ${selectedModel === model ? 'active' : ''}`}
                                        onClick={() => setSelectedModel(model)}
                                    >
                                        {model}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="modal-right">
                        <div className="form-columns">
                            <div className="form-column">
                                <div className="form-field">
                                    <label>Наименование*</label>
                                    <input 
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className={errors.name ? 'error' : ''}
                                    />
                                    {errors.name && <span className="error-message">{errors.name}</span>}
                                </div>
                                <div className="form-field">
                                    <label>Подразделение*</label>
                                    <select 
                                        value={formData.department}
                                        onChange={(e) => handleInputChange('department', e.target.value)}
                                        className={errors.department ? 'error' : ''}
                                    >
                                        <option value="">Выберите подразделение</option>
                                        {organizationUnits.map(unit => (
                                            <option key={unit.id} value={unit.name}>
                                                {unit.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.department && <span className="error-message">{errors.department}</span>}
                                </div>
                                <div className="form-field">
                                    <label>Ввод в эксплуатацию*</label>
                                    <div className="date-input-wrapper">
                                        <input 
                                            type="text"
                                            value={formData.commissioningDate}
                                            onChange={(e) => handleInputChange('commissioningDate', e.target.value)}
                                            placeholder="DD.MM.YYYY"
                                            className={errors.commissioningDate ? 'error' : ''}
                                        />
                                        <svg className="calendar-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <rect x="3" y="4" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                                            <path d="M3 7H13" stroke="currentColor" strokeWidth="1.2"/>
                                            <path d="M6 2V5M10 2V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    {errors.commissioningDate && <span className="error-message">{errors.commissioningDate}</span>}
                                </div>
                                <div className="form-field">
                                    <label>МАС - адрес*</label>
                                    <input 
                                        type="text"
                                        value={formData.macAddress}
                                        onChange={(e) => handleInputChange('macAddress', e.target.value)}
                                        className={errors.macAddress ? 'error' : ''}
                                    />
                                    {errors.macAddress && <span className="error-message">{errors.macAddress}</span>}
                                </div>
                                <div className="form-field">
                                    <label>Серийный номер</label>
                                    <input 
                                        type="text"
                                        value={formData.serialNumber}
                                        onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Инвентарный номер</label>
                                    <input 
                                        type="text"
                                        value={formData.inventoryNumber}
                                        onChange={(e) => handleInputChange('inventoryNumber', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-column">
                                <div className="form-field">
                                    <label>ФИО ответственного</label>
                                    <input 
                                        type="text"
                                        value={formData.responsiblePerson}
                                        onChange={(e) => handleInputChange('responsiblePerson', e.target.value)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Дата последнего ТО</label>
                                    <div className="date-input-wrapper">
                                        <input 
                                            type="text"
                                            value={formData.lastMaintenanceDate}
                                            onChange={(e) => handleInputChange('lastMaintenanceDate', e.target.value)}
                                        />
                                        <svg className="calendar-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <rect x="3" y="4" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                                            <path d="M3 7H13" stroke="currentColor" strokeWidth="1.2"/>
                                            <path d="M6 2V5M10 2V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>Наработка между ТО</label>
                                    <input 
                                        type="text"
                                        value={formData.operatingHours}
                                        onChange={(e) => handleInputChange('operatingHours', e.target.value)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>ФИО проводившего ТО</label>
                                    <input 
                                        type="text"
                                        value={formData.maintenancePerson}
                                        onChange={(e) => handleInputChange('maintenancePerson', e.target.value)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Пропуск проводившего ТО</label>
                                    <input 
                                        type="text"
                                        value={formData.maintenancePass}
                                        onChange={(e) => handleInputChange('maintenancePass', e.target.value)}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Допущенные сварщики:</label>
                                    <div className="welders-tags">
                                        {formData.approvedWelders.map((welder, index) => (
                                            <span 
                                                key={index} 
                                                className="welder-tag"
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        approvedWelders: prev.approvedWelders.filter((_, i) => i !== index)
                                                    }))
                                                }}
                                            >
                                                {welder}
                                            </span>
                                        ))}
                                        <select 
                                            className="welder-select"
                                            onChange={(e) => {
                                                if (e.target.value && !formData.approvedWelders.includes(e.target.value)) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        approvedWelders: [...prev.approvedWelders, e.target.value]
                                                    }))
                                                }
                                                e.target.value = ''
                                            }}
                                        >
                                            <option value="">+</option>
                                            {welders.map(welder => (
                                                <option key={welder.id} value={welder.name}>
                                                    {welder.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="options-section">
                            <label className="options-label">Опции:</label>
                            <div className="options-buttons">
                                <button 
                                    className={`option-btn ${selectedOptions.rfid ? 'active' : ''}`}
                                    onClick={() => toggleOption('rfid')}
                                >
                                    <svg className="option-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <rect x="4" y="6" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                        <path d="M6 10H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M8 4V6M12 4V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                    <span>RFID</span>
                                </button>
                                <button 
                                    className={`option-btn ${selectedOptions.bvo ? 'active' : ''}`}
                                    onClick={() => toggleOption('bvo')}
                                >
                                    <svg className="option-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <ellipse cx="10" cy="12" rx="6" ry="6" stroke="currentColor" strokeWidth="1.5"/>
                                        <path d="M10 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M6 6L8 8M14 6L12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                    <span>БВО</span>
                                </button>
                                <button 
                                    className={`option-btn ${selectedOptions.gasControl ? 'active' : ''}`}
                                    onClick={() => toggleOption('gasControl')}
                                >
                                    <svg className="option-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M10 4C10 4 6 8 6 12C6 14.5 7.5 16.5 10 16.5C12.5 16.5 14 14.5 14 12C14 8 10 4 10 4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                        <path d="M10 8V12M8 10H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                    <span>СИСТЕМА контроля газа</span>
                                </button>
                            </div>
                        </div>

                        {apiError && (
                            <div className="api-error-message">
                                {apiError}
                            </div>
                        )}

                        {errors.deviceModel && (
                            <div className="api-error-message">
                                {errors.deviceModel}
                            </div>
                        )}

                        <button className="save-button" onClick={handleSave}>
                            Добавить оборудование
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddEquipmentModal

