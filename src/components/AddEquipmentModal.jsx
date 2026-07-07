import React, { useState, useRef, useEffect } from 'react'
import '../styles/addEquipmentModal.css'
import machineImage from '../images/2 копия.png'
import { getMacLiveness } from '../api/weldingMachineApi'
import { getAllUserAccounts } from '../api/userAccountApi'

const defaultFormData = () => ({
    name: '',
    department: '',
    organizationUnitId: '',
    commissioningDate: '',
    manufactureDate: '',
    macAddress: '',
    serialNumber: '',
    inventoryNumber: '',
    responsiblePerson: '',
    lastMaintenanceDate: '',
    operatingHours: '',
    operatingHoursUnit: 'HOURS',
    maintenancePerson: '',
    maintenancePass: '',
    approvedWelders: []
})

// Маппинг названий моделей в UI -> deviceModel на бэкенде происходит в родителе.
const MODELS = [
    { label: 'Core Synergy', value: 'Core Synergy' },
    { label: 'Блок мониторинга', value: 'Блок мониторинга' },
]

const MAC_POLL_INTERVAL_MS = 1500

const AddEquipmentModal = ({ isOpen, onClose, onSave, welders = [], organizationUnits = [], editMode = false, initialData = null }) => {
    const [selectedModel, setSelectedModel] = useState('Core Synergy')
    const [formData, setFormData] = useState(defaultFormData())
    const [isSaving, setIsSaving] = useState(false)

    const [selectedOptions, setSelectedOptions] = useState({
        rfid: false,
    })

    const [errors, setErrors] = useState({})
    const [apiError, setApiError] = useState('')

    // MAC / проверка соединения
    const [connectionVerified, setConnectionVerified] = useState(false)
    const [macChecking, setMacChecking] = useState(false)
    const [macCheckError, setMacCheckError] = useState('')
    const macCheckRef = useRef({ interval: null, baseline: null })

    // Пользователи для «лицо, проводившее ТО»
    const [users, setUsers] = useState([])

    const commissioningDateInputRef = useRef(null)
    const manufactureDateInputRef = useRef(null)
    const lastMaintenanceDateInputRef = useRef(null)

    const stopMacCheck = () => {
        if (macCheckRef.current.interval) clearInterval(macCheckRef.current.interval)
        macCheckRef.current = { interval: null, baseline: null }
        setMacChecking(false)
    }

    // Загрузка пользователей при открытии (для create-режима)
    useEffect(() => {
        if (isOpen && !editMode) {
            getAllUserAccounts()
                .then((data) => setUsers(Array.isArray(data) ? data : []))
                .catch(() => setUsers([]))
        }
        return () => stopMacCheck()
    }, [isOpen, editMode])

    // Режим редактирования: подставляем имя и подразделение (по id и/или по имени после загрузки списка подразделений).
    useEffect(() => {
        if (!isOpen || !editMode || !initialData) return;

        const deptTrim = (initialData.department || '').trim();
        const idRaw = initialData.organizationUnitId;

        let unit = null;
        if (idRaw != null && idRaw !== '') {
            unit = organizationUnits.find((u) => String(u.id) === String(idRaw));
        }
        if (!unit && deptTrim) {
            const lower = deptTrim.toLowerCase();
            unit = organizationUnits.find((u) => (u.name || '').trim().toLowerCase() === lower);
        }

        setFormData((prev) => ({
            ...prev,
            name: initialData.name ?? '',
            department: unit?.name ?? deptTrim,
            organizationUnitId: unit?.id != null ? String(unit.id) : '',
        }));
    }, [
        isOpen,
        editMode,
        initialData?.machineId,
        initialData?.name,
        initialData?.department,
        initialData?.organizationUnitId,
        organizationUnits,
    ]);

    if (!isOpen) return null

    const formatDateToDDMMYYYY = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return ''
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}.${month}.${year}`
    }

    const convertDateToYYYYMMDD = (dateString) => {
        if (!dateString) return ''
        const parts = dateString.split('.')
        if (parts.length !== 3) return ''
        const [day, month, year] = parts
        if (day.length === 2 && month.length === 2 && year.length === 4) {
            return `${year}-${month}-${day}`
        }
        return ''
    }

    const validateDate = (dateString) => {
        if (!dateString) return { isValid: true, error: '' }
        const dateObj = convertDateToYYYYMMDD(dateString)
        if (!dateObj) return { isValid: true, error: '' }
        const parts = dateObj.split('-')
        if (parts.length !== 3) return { isValid: true, error: '' }
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        if (isNaN(date.getTime())) return { isValid: true, error: '' }
        date.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tenYearsAgo = new Date()
        tenYearsAgo.setFullYear(today.getFullYear() - 10)
        tenYearsAgo.setHours(0, 0, 0, 0)
        if (date > today) {
            return { isValid: false, error: 'Дата не может быть в будущем' }
        }
        if (date < tenYearsAgo) {
            return { isValid: false, error: 'Дата не может быть старше 10 лет' }
        }
        return { isValid: true, error: '' }
    }

    const handleDateInputChange = (field, value) => {
        const filteredValue = value.replace(/[^\d.]/g, '')
        handleInputChange(field, filteredValue)
        if (filteredValue.length === 10) {
            const validation = validateDate(filteredValue)
            if (!validation.isValid) {
                setErrors(prev => ({ ...prev, [field]: validation.error }))
            } else {
                setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
            }
        } else if (filteredValue.length < 10) {
            setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
        }
    }

    const handleNameInputChange = (field, value) => {
        const filteredValue = value.replace(/[^а-яА-ЯёЁa-zA-Z\s.,-]/g, '')
        handleInputChange(field, filteredValue)
    }

    const handleOperatingHoursChange = (field, value) => {
        let filteredValue = value.replace(/[^\d.,]/g, '')
        filteredValue = filteredValue.replace(/,/g, '.')
        const parts = filteredValue.split('.')
        if (parts.length > 2) {
            filteredValue = parts[0] + '.' + parts.slice(1).join('')
        }
        filteredValue = filteredValue.replace(/-/g, '')
        if (filteredValue === '.') filteredValue = '0.'
        handleInputChange(field, filteredValue)
    }

    const handleDatePickerChange = (field, dateString) => {
        const formattedDate = formatDateToDDMMYYYY(dateString)
        handleInputChange(field, formattedDate)
        const validation = validateDate(formattedDate)
        if (!validation.isValid) {
            setErrors(prev => ({ ...prev, [field]: validation.error }))
        } else {
            setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
        }
    }

    const getDateLimits = () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const tenYearsAgo = new Date()
        tenYearsAgo.setFullYear(today.getFullYear() - 10)
        const minDate = `${tenYearsAgo.getFullYear()}-${String(tenYearsAgo.getMonth() + 1).padStart(2, '0')}-${String(tenYearsAgo.getDate()).padStart(2, '0')}`
        return { minDate, maxDate }
    }

    const handleCalendarIconClick = (field) => {
        const ref = field === 'commissioningDate' ? commissioningDateInputRef
            : field === 'manufactureDate' ? manufactureDateInputRef
            : lastMaintenanceDateInputRef
        if (ref.current) {
            if (ref.current.showPicker) ref.current.showPicker()
            else ref.current.click()
        }
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        const errorKey = field === 'department' ? 'organizationUnit' :
            field === 'macAddress' ? 'mac' :
                field === 'commissioningDate' ? 'commissionDate' : field;
        if (errors[field] || errors[errorKey]) {
            setErrors(prev => {
                const n = { ...prev }
                delete n[field]
                delete n[errorKey]
                return n
            })
        }
        if (apiError) setApiError('')
    }

    // Изменение MAC сбрасывает подтверждение соединения — нужна повторная проверка.
    const handleMacChange = (value) => {
        handleInputChange('macAddress', value)
        setConnectionVerified(false)
        setMacCheckError('')
        stopMacCheck()
    }

    const startMacCheck = async () => {
        const mac = (formData.macAddress || '').trim()
        if (!mac) {
            setErrors(prev => ({ ...prev, macAddress: 'Введите MAC-адрес' }))
            return
        }
        setMacCheckError('')
        setMacChecking(true)
        try {
            const first = await getMacLiveness(mac)
            macCheckRef.current.baseline = first?.serverTimeMs ?? Date.now()
            // Если аппарат уже стучался прямо сейчас — сразу успех.
            if (first?.lastSeenMs != null && first.lastSeenMs >= macCheckRef.current.baseline - MAC_POLL_INTERVAL_MS) {
                setConnectionVerified(true)
                stopMacCheck()
                return
            }
            macCheckRef.current.interval = setInterval(async () => {
                try {
                    const resp = await getMacLiveness(mac)
                    if (resp?.lastSeenMs != null && resp.lastSeenMs >= macCheckRef.current.baseline) {
                        setConnectionVerified(true)
                        stopMacCheck()
                    }
                } catch (e) {
                    setMacCheckError('Ошибка проверки соединения: ' + (e.message || ''))
                    stopMacCheck()
                }
            }, MAC_POLL_INTERVAL_MS)
        } catch (e) {
            setMacCheckError('Ошибка проверки соединения: ' + (e.message || ''))
            stopMacCheck()
        }
    }

    const toggleOption = (option) => {
        setSelectedOptions(prev => ({ ...prev, [option]: !prev[option] }))
    }

    const gated = !editMode && !connectionVerified

    const handleSave = async () => {
        if (isSaving) return
        setErrors({})
        setApiError('')

        if (editMode && initialData) {
            const name = formData.name?.trim() ?? ''
            const department = formData.department ?? ''
            const editErrors = {}
            if (!name) editErrors.name = 'Это поле обязательно'
            if (!formData.organizationUnitId && !department) editErrors.department = 'Выберите подразделение'
            if (Object.keys(editErrors).length > 0) {
                setErrors(editErrors)
                return
            }
        } else {
            // Create-режим: соединение должно быть подтверждено.
            if (!connectionVerified) {
                setApiError('Сначала проверьте соединение с устройством по MAC-адресу')
                return
            }
        }

        if (onSave) {
            setIsSaving(true)
            try {
                if (editMode && initialData) {
                    await onSave({
                        editMode: true,
                        machineId: initialData.machineId,
                        name: formData.name?.trim() ?? '',
                        department: formData.department ?? '',
                        organizationUnitId: formData.organizationUnitId || null,
                    });
                } else {
                    await onSave({
                        model: selectedModel,
                        ...formData,
                        options: selectedOptions
                    });
                }

                setSelectedModel('Core Synergy')
                setFormData(defaultFormData())
                setSelectedOptions({ rfid: false })
                setConnectionVerified(false)
                setErrors({})
                setApiError('')
                onClose()
            } catch (error) {
                if (error.errors && typeof error.errors === 'object') {
                    const mappedErrors = {};
                    Object.keys(error.errors).forEach(key => {
                        if (key === 'organizationUnit') {
                            mappedErrors.department = error.errors[key];
                        } else if (key === 'mac') {
                            mappedErrors.macAddress = error.errors[key];
                        } else if (key === 'commissionDate') {
                            mappedErrors.commissioningDate = error.errors[key];
                        } else if (key === 'api') {
                            setApiError(error.errors[key]);
                        } else {
                            mappedErrors[key] = error.errors[key];
                        }
                    });
                    setErrors(mappedErrors);
                } else if (error.message) {
                    setApiError(error.message);
                } else {
                    setApiError('Произошла ошибка при сохранении оборудования');
                }
            } finally {
                setIsSaving(false)
            }
        }
    }

    const handleClose = () => {
        setSelectedModel('Core Synergy')
        setFormData(defaultFormData())
        setSelectedOptions({ rfid: false })
        setConnectionVerified(false)
        setMacCheckError('')
        stopMacCheck()
        setErrors({})
        setApiError('')
        onClose()
    }

    const renderDateField = (field, label, ref) => (
        <div className="form-field">
            <label>{label}</label>
            <div className="date-input-wrapper">
                <input
                    type="text"
                    value={formData[field]}
                    onChange={(e) => handleDateInputChange(field, e.target.value)}
                    placeholder="DD.MM.YYYY"
                    className={errors[field] ? 'error' : ''}
                    disabled={gated}
                />
                <input
                    ref={ref}
                    type="date"
                    className="date-picker-hidden"
                    value={convertDateToYYYYMMDD(formData[field])}
                    onChange={(e) => handleDatePickerChange(field, e.target.value)}
                    max={getDateLimits().maxDate}
                    min={getDateLimits().minDate}
                    disabled={gated}
                />
                <svg
                    className="calendar-icon calendar-icon-clickable"
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    onClick={() => !gated && handleCalendarIconClick(field)}
                >
                    <rect x="3" y="4" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M3 7H13" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M6 2V5M10 2V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
            </div>
            {errors[field] && <span className="error-message">{errors[field]}</span>}
        </div>
    )

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={handleClose}>×</button>

                <h2 className="modal-title">
                    {editMode ? 'Редактирование оборудования' : 'Добавление нового оборудования'}
                </h2>

                {!editMode && (
                    <div className="mac-check-bar">
                        <div className="form-field mac-check-field">
                            <label>МАС - адрес*</label>
                            <input
                                type="text"
                                value={formData.macAddress}
                                onChange={(e) => handleMacChange(e.target.value)}
                                className={errors.macAddress ? 'error' : ''}
                                disabled={macChecking}
                                placeholder="Например, E09806083396"
                            />
                            {errors.macAddress && <span className="error-message">{errors.macAddress}</span>}
                        </div>
                        {!macChecking ? (
                            <button
                                type="button"
                                className={`mac-check-btn ${connectionVerified ? 'verified' : ''}`}
                                onClick={startMacCheck}
                                disabled={connectionVerified}
                            >
                                {connectionVerified ? '✓ Соединение установлено' : 'Проверить соединение'}
                            </button>
                        ) : (
                            <div className="mac-check-waiting">
                                <span className="mac-check-waiting-text">Ожидание подключения…</span>
                                <button type="button" className="mac-check-cancel" onClick={stopMacCheck}>
                                    Отмена
                                </button>
                            </div>
                        )}
                        {macCheckError && <span className="error-message mac-check-error">{macCheckError}</span>}
                    </div>
                )}

                <div className="modal-body">
                    <div className="modal-left">
                        <div className="equipment-image-container">
                            <img src={machineImage} alt="Welding machine" className="equipment-image" />
                        </div>
                        {!editMode && (
                            <div className={`model-selection ${gated ? 'gated' : ''}`}>
                                <label className="model-label">Модель*</label>
                                <div className="model-list">
                                    {MODELS.map(model => (
                                        <button
                                            key={model.value}
                                            className={`model-item ${selectedModel === model.value ? 'active' : ''}`}
                                            onClick={() => setSelectedModel(model.value)}
                                            disabled={gated}
                                        >
                                            {model.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
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
                                        disabled={gated}
                                    />
                                    {errors.name && <span className="error-message">{errors.name}</span>}
                                </div>
                                <div className="form-field">
                                    <label>Подразделение*</label>
                                    <select
                                        value={editMode ? (formData.organizationUnitId || '') : formData.department}
                                        onChange={(e) => {
                                            if (editMode) {
                                                const unitId = e.target.value;
                                                const unit = organizationUnits.find((u) => String(u.id) === String(unitId));
                                                handleInputChange('organizationUnitId', unitId);
                                                handleInputChange('department', unit?.name || '');
                                            } else {
                                                handleInputChange('department', e.target.value);
                                            }
                                        }}
                                        className={errors.department ? 'error' : ''}
                                        disabled={gated}
                                    >
                                        <option value="">Выберите подразделение</option>
                                        {organizationUnits.map(unit => (
                                            <option key={unit.id} value={editMode ? String(unit.id) : unit.name}>
                                                {unit.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.department && <span className="error-message">{errors.department}</span>}
                                </div>
                                {!editMode && (
                                    <>
                                        {renderDateField('manufactureDate', 'Дата изготовления', manufactureDateInputRef)}
                                        {renderDateField('commissioningDate', 'Ввод в эксплуатацию*', commissioningDateInputRef)}
                                        <div className="form-field">
                                            <label>Серийный номер</label>
                                            <input
                                                type="text"
                                                value={formData.serialNumber}
                                                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                                                disabled={gated}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Инвентарный номер</label>
                                            <input
                                                type="text"
                                                value={formData.inventoryNumber}
                                                onChange={(e) => handleInputChange('inventoryNumber', e.target.value)}
                                                disabled={gated}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {!editMode && (
                                <div className="form-column">
                                    <div className="form-field">
                                        <label>Ответственный сварщик</label>
                                        <select
                                            value={formData.responsiblePerson}
                                            onChange={(e) => handleInputChange('responsiblePerson', e.target.value)}
                                            disabled={gated}
                                        >
                                            <option value="">Выберите сварщика</option>
                                            {welders.map(welder => (
                                                <option key={welder.id} value={welder.name}>{welder.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {renderDateField('lastMaintenanceDate', 'Дата последнего ТО', lastMaintenanceDateInputRef)}
                                    <div className="form-field">
                                        <label>Наработка между ТО</label>
                                        <div className="operating-hours-row">
                                            <input
                                                type="text"
                                                value={formData.operatingHours}
                                                onChange={(e) => handleOperatingHoursChange('operatingHours', e.target.value)}
                                                disabled={gated}
                                            />
                                            <select
                                                className="operating-hours-unit"
                                                value={formData.operatingHoursUnit}
                                                onChange={(e) => handleInputChange('operatingHoursUnit', e.target.value)}
                                                disabled={gated}
                                            >
                                                <option value="HOURS">моточасы</option>
                                                <option value="DAYS">кал. дни</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label>Лицо, проводившее ТО</label>
                                        <input
                                            type="text"
                                            list="maintenance-users-list"
                                            value={formData.maintenancePerson}
                                            onChange={(e) => handleInputChange('maintenancePerson', e.target.value)}
                                            disabled={gated}
                                            autoComplete="off"
                                        />
                                        <datalist id="maintenance-users-list">
                                            {users.map((u) => {
                                                const label = u.fullName || u.name || u.login || u.email || String(u.id)
                                                return <option key={u.id} value={label} />
                                            })}
                                        </datalist>
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
                                                disabled={gated}
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
                            )}
                        </div>

                        {!editMode && (
                            <div className={`options-section ${gated ? 'gated' : ''}`}>
                                <label className="options-label">Опции:</label>
                                <div className="options-buttons">
                                    <button
                                        className={`option-btn ${selectedOptions.rfid ? 'active' : ''}`}
                                        onClick={() => toggleOption('rfid')}
                                        disabled={gated}
                                    >
                                        <svg className="option-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <rect x="4" y="6" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                            <path d="M6 10H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                            <path d="M8 4V6M12 4V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                        </svg>
                                        <span>RFID</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {apiError && <div className="api-error-message">{apiError}</div>}
                        {errors.deviceModel && <div className="api-error-message">{errors.deviceModel}</div>}

                        <button
                            type="button"
                            className="save-button"
                            disabled={isSaving}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleSave()
                            }}
                        >
                            {isSaving ? 'Сохранение...' : (editMode ? 'Сохранить изменения' : 'Добавить оборудование')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddEquipmentModal
