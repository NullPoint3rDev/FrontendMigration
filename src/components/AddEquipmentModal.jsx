import React, { useState, useRef, useEffect, useMemo } from 'react'
import { FaChevronRight, FaChevronDown } from 'react-icons/fa'
import '../styles/addEquipmentModal.css'
import machineImage from '../images/2 копия.png'
import { getMacLiveness, getMacExists } from '../api/weldingMachineApi'
import { getAllUserAccounts } from '../api/userAccountApi'
import { getAllOrganizations } from '../api/organizationApi'
import { groupUnitsByOrganization } from '../utils/organizationUnitFilterGroups'
import WelderDateField from './WelderDateField'

// ФИО -> «И.И. Фамилия», если полное длиннее 20 символов.
const welderDisplayName = (name) => {
    const full = String(name || '').trim()
    if (full.length <= 20) return full
    const parts = full.split(/\s+/)
    if (parts.length >= 2) {
        const last = parts[0]
        const initials = parts.slice(1).map((p) => p.charAt(0).toUpperCase() + '.').join('')
        return `${initials} ${last}`
    }
    return full
}

const welderUnitId = (w) => {
    const uid = w.organizationUnit?.id ?? w.organizationUnitId ?? null
    return uid == null ? null : String(uid)
}

const welderFio = (w) => {
    const full = String(w?.name || [w?.lastName, w?.firstName, w?.middleName].filter(Boolean).join(' ') || '').trim()
    return full || (w?.id != null ? `Сварщик #${w.id}` : '')
}

const isWelderBlockedStatus = (w) => {
    const s = w?.status
    const raw = typeof s === 'string' ? s.trim() : String(s?.name || s?.value || s || '').trim()
    return raw.toUpperCase() === 'BLOCKED'
}

const unitOrgId = (u) => String(u?.organizationId ?? u?.organization?.id ?? u?.organization_id ?? '')

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
    responsibleWelderId: '',
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

const AddEquipmentModal = ({ isOpen, onClose, onSave, welders = [], organizationUnits = [], existingMachines = [], isAlloyWideAccess = false, editMode = false, initialData = null }) => {
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

    // Дерево «ответственный сварщик»
    const [organizations, setOrganizations] = useState([])
    const [respOpen, setRespOpen] = useState(false)
    const [respExpandedOrgs, setRespExpandedOrgs] = useState({})
    const [respExpandedUnits, setRespExpandedUnits] = useState({})
    const respRef = useRef(null)

    // Дерево «подразделение»
    const [unitDropdownOpen, setUnitDropdownOpen] = useState(false)
    const [expandedOrgs, setExpandedOrgs] = useState({})
    const [expandedUnits, setExpandedUnits] = useState({})
    const [orgSelectHint, setOrgSelectHint] = useState('')
    const unitSelectRef = useRef(null)

    // Пользователь ТО — dropdown как у ответственного сварщика
    const [maintOpen, setMaintOpen] = useState(false)
    const [maintExpandedOrgs, setMaintExpandedOrgs] = useState({})
    const maintRef = useRef(null)

    const stopMacCheck = () => {
        if (macCheckRef.current.interval) clearInterval(macCheckRef.current.interval)
        macCheckRef.current = { interval: null, baseline: null }
        setMacChecking(false)
    }

    // Загрузка пользователей и предприятий при открытии
    useEffect(() => {
        if (isOpen) {
            if (!editMode) {
                getAllUserAccounts()
                    .then((data) => setUsers(Array.isArray(data) ? data : []))
                    .catch(() => setUsers([]))
            }
            getAllOrganizations()
                .then((data) => setOrganizations(Array.isArray(data) ? data : []))
                .catch(() => setOrganizations([]))
        }
        return () => stopMacCheck()
    }, [isOpen, editMode])

    // Закрытие dropdown по клику вне
    useEffect(() => {
        if (!respOpen && !unitDropdownOpen && !maintOpen) return
        const onDoc = (e) => {
            if (respOpen && respRef.current && !respRef.current.contains(e.target)) setRespOpen(false)
            if (unitDropdownOpen && unitSelectRef.current && !unitSelectRef.current.contains(e.target)) {
                setUnitDropdownOpen(false)
                setOrgSelectHint('')
            }
            if (maintOpen && maintRef.current && !maintRef.current.contains(e.target)) setMaintOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [respOpen, unitDropdownOpen, maintOpen])

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

    const organizationGroups = useMemo(
        () => groupUnitsByOrganization(organizationUnits, organizations),
        [organizationUnits, organizations]
    )

    const dateLimits = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tenYearsAgo = new Date(today)
        tenYearsAgo.setFullYear(today.getFullYear() - 10)
        return { minDate: tenYearsAgo, maxDate: today }
    }, [])

    const validateEquipmentDate = (iso) => {
        if (!iso) return ''
        const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (!m) return 'Некорректная дата'
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        d.setHours(0, 0, 0, 0)
        if (d > dateLimits.maxDate) return 'Дата не может быть в будущем'
        if (d < dateLimits.minDate) return 'Дата не может быть старше 10 лет'
        return ''
    }

    const handleDateFieldChange = (field, iso) => {
        handleInputChange(field, iso)
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

    const handleUnitSelect = (unitId) => {
        const unit = organizationUnits.find((u) => String(u.id) === String(unitId))
        const prevUnit = organizationUnits.find((u) => String(u.id) === String(formData.organizationUnitId))
        const prevOrgId = prevUnit ? unitOrgId(prevUnit) : ''
        const newOrgId = unit ? unitOrgId(unit) : ''
        const orgChanged = prevOrgId !== newOrgId

        setFormData((prev) => ({
            ...prev,
            department: unit?.name || '',
            organizationUnitId: unitId != null ? String(unitId) : '',
            ...(orgChanged
                ? { responsiblePerson: '', responsibleWelderId: '', maintenancePerson: '' }
                : {}),
        }))
        setUnitDropdownOpen(false)
        setOrgSelectHint('')
        if (errors.department || errors.organizationUnitId) {
            setErrors((prev) => {
                const n = { ...prev }
                delete n.department
                delete n.organizationUnit
                delete n.organizationUnitId
                return n
            })
        }
        if (apiError) setApiError('')
    }

    const handleOrgSelect = (group) => {
        const roots = group?.hierarchy || []
        if (roots.length !== 1) {
            setOrgSelectHint('нет корневого подразделения')
            return
        }
        setOrgSelectHint('')
        handleUnitSelect(roots[0].id)
    }

    const toggleOrgExpand = (orgKey) => {
        setOrgSelectHint('')
        setExpandedOrgs((prev) => ({ ...prev, [orgKey]: !prev[orgKey] }))
    }

    // Живая проверка уникальности имени в предприятии (~300ms)
    useEffect(() => {
        const name = (formData.name || '').trim()
        const unitId = formData.organizationUnitId
        if (!name || !unitId) {
            setErrors((prev) => {
                if (!prev.name) return prev
                const n = { ...prev }
                delete n.name
                return n
            })
            return undefined
        }
        const t = setTimeout(() => {
            const unit = organizationUnits.find((u) => String(u.id) === String(unitId))
            const orgId = unit ? unitOrgId(unit) : ''
            if (!orgId) return
            const excludeId = editMode && initialData?.machineId != null ? String(initialData.machineId) : null
            const taken = (existingMachines || []).some((m) => {
                if (excludeId && String(m.id) === excludeId) return false
                const mUnitId = m.organizationUnit?.id ?? m.organizationUnitId ?? null
                const mUnit = organizationUnits.find((u) => String(u.id) === String(mUnitId))
                const mOrg = mUnit
                    ? unitOrgId(mUnit)
                    : String(m.organizationUnit?.organizationId ?? m.organizationId ?? '')
                if (mOrg !== orgId) return false
                return String(m.name || '').trim().toLowerCase() === name.toLowerCase()
            })
            setErrors((prev) => {
                if (taken) return { ...prev, name: 'Наименование уже используется в этом предприятии' }
                if (!prev.name) return prev
                const n = { ...prev }
                delete n.name
                return n
            })
        }, 300)
        return () => clearTimeout(t)
    }, [formData.name, formData.organizationUnitId, existingMachines, organizationUnits, editMode, initialData])

    const toggleUnitExpand = (unitId) => {
        setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }))
    }

    const renderUnitOption = (unit, level = 0) => {
        const isExpanded = expandedUnits[unit.id]
        const hasChildren = unit.children && unit.children.length > 0
        const indent = level * 32
        const isSelected = String(formData.organizationUnitId) === String(unit.id)

        return (
            <React.Fragment key={unit.id}>
                <div
                    className={`unit-option ${isSelected ? 'selected' : ''} ${level > 0 ? 'unit-option-child' : ''}`}
                    style={{ marginLeft: `${indent}px`, paddingLeft: '12px' }}
                    onClick={() => handleUnitSelect(unit.id)}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            className="org-unit-expand-btn"
                            onClick={(e) => {
                                e.stopPropagation()
                                toggleUnitExpand(unit.id)
                            }}
                        >
                            {isExpanded ? <FaChevronDown className="expand-icon" /> : <FaChevronRight className="expand-icon" />}
                        </button>
                    ) : (
                        <span className="org-unit-spacer" style={{ width: '16px', display: 'inline-block' }} />
                    )}
                    <span className="unit-option-name">{unit.name}</span>
                </div>
                {hasChildren && isExpanded && (
                    <div className="unit-children">
                        {unit.children.map((child) => renderUnitOption(child, level + 1))}
                    </div>
                )}
            </React.Fragment>
        )
    }

    const selectResponsibleWelder = (welder) => {
        setFormData((prev) => ({
            ...prev,
            responsiblePerson: welderFio(welder),
            responsibleWelderId: welder.id != null ? String(welder.id) : '',
        }))
        setRespOpen(false)
    }

    const respTreeData = useMemo(() => {
        const activeWelders = welders.filter((w) => !isWelderBlockedStatus(w))
        if (!formData.organizationUnitId) {
            return { groups: [], byUnit: new Map(), byOrg: new Map() }
        }

        let unitsForTree = organizationUnits
        let orgsForTree = organizations
        const selectedUnit = organizationUnits.find((u) => String(u.id) === String(formData.organizationUnitId))
        const selectedOrgId = selectedUnit ? unitOrgId(selectedUnit) : ''

        if (!isAlloyWideAccess && selectedOrgId) {
            unitsForTree = organizationUnits.filter((u) => unitOrgId(u) === selectedOrgId)
            orgsForTree = organizations.filter((o) => String(o.id) === selectedOrgId)
        }

        const groups = groupUnitsByOrganization(unitsForTree, orgsForTree)
        const byUnit = new Map()
        const byOrg = new Map()

        activeWelders.forEach((w) => {
            const uid = welderUnitId(w)
            if (uid) {
                const unit = organizationUnits.find((u) => String(u.id) === uid)
                if (!isAlloyWideAccess && selectedOrgId && unit && unitOrgId(unit) !== selectedOrgId) return
                if (!byUnit.has(uid)) byUnit.set(uid, [])
                byUnit.get(uid).push(w)
                return
            }

            // ponytail: в API у сварщика часто только department (имя), без organizationUnitId
            if (w.department) {
                const dept = String(w.department).trim().toLowerCase()
                const unit = organizationUnits.find((ou) => String(ou.name || '').trim().toLowerCase() === dept)
                if (unit) {
                    const unitId = String(unit.id)
                    if (!isAlloyWideAccess && selectedOrgId && unitOrgId(unit) !== selectedOrgId) return
                    if (!byUnit.has(unitId)) byUnit.set(unitId, [])
                    byUnit.get(unitId).push(w)
                    return
                }
            }

            let orgKey = '__NO_ORG__'
            if (w.department) {
                const u = organizationUnits.find((ou) => ou.name === w.department)
                if (u) orgKey = unitOrgId(u) || '__NO_ORG__'
            } else if (w.organizationId != null) {
                orgKey = String(w.organizationId)
            }
            if (!isAlloyWideAccess && selectedOrgId && orgKey !== selectedOrgId && orgKey !== '__NO_ORG__') return
            if (!byOrg.has(orgKey)) byOrg.set(orgKey, [])
            byOrg.get(orgKey).push(w)
        })

        return { groups, byUnit, byOrg }
    }, [welders, organizations, organizationUnits, formData.organizationUnitId, isAlloyWideAccess])

    const toggleRespOrg = (orgKey) => {
        setRespExpandedOrgs((prev) => ({ ...prev, [orgKey]: !prev[orgKey] }))
    }

    const toggleRespUnit = (orgKey, unitId) => {
        const key = `${orgKey}-${unitId}`
        setRespExpandedUnits((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const renderRespWelderLeaf = (welder, depth) => (
        <div
            key={`w-${welder.id}`}
            className={`resp-welder-leaf ${String(formData.responsibleWelderId) === String(welder.id) ? 'selected' : ''}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => selectResponsibleWelder(welder)}
        >
            {welderDisplayName(welderFio(welder))}
        </div>
    )

    const renderRespUnitNode = (unit, orgKey, depth) => {
        const unitKey = `${orgKey}-${unit.id}`
        const unitWelders = respTreeData.byUnit.get(String(unit.id)) || []
        const hasChildren = (unit.children || []).length > 0 || unitWelders.length > 0
        const expanded = !!respExpandedUnits[unitKey]

        return (
            <React.Fragment key={unit.id}>
                <div
                    className="resp-welder-unit"
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                >
                    {hasChildren ? (
                        <span
                            className="resp-welder-chevron"
                            onClick={(e) => {
                                e.stopPropagation()
                                toggleRespUnit(orgKey, unit.id)
                            }}
                        >
                            {expanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                        </span>
                    ) : (
                        <span className="resp-welder-chevron" style={{ visibility: 'hidden' }} />
                    )}
                    <span className="resp-welder-unit-name">{unit.name}</span>
                </div>
                {expanded && unitWelders.map((w) => renderRespWelderLeaf(w, depth + 1))}
                {expanded && (unit.children || []).map((ch) => renderRespUnitNode(ch, orgKey, depth + 1))}
            </React.Fragment>
        )
    }

    const maintTreeData = useMemo(() => {
        const byOrg = new Map()
        ;(users || []).forEach((u) => {
            const orgKey = u.organizationId != null
                ? String(u.organizationId)
                : (u.organizationUnit?.organizationId != null
                    ? String(u.organizationUnit.organizationId)
                    : '__NO_ORG__')
            if (!byOrg.has(orgKey)) byOrg.set(orgKey, [])
            byOrg.get(orgKey).push(u)
        })
        const groups = (organizations || []).map((o) => ({
            orgKey: String(o.id),
            orgName: o.name || `Предприятие #${o.id}`,
        }))
        if (byOrg.has('__NO_ORG__')) {
            groups.push({ orgKey: '__NO_ORG__', orgName: 'Без предприятия' })
        }
        // предприятия, которых нет в organizations, но есть у пользователей
        byOrg.forEach((_, key) => {
            if (key === '__NO_ORG__') return
            if (!groups.some((g) => g.orgKey === key)) {
                groups.push({ orgKey: key, orgName: `Предприятие #${key}` })
            }
        })
        return { groups: groups.filter((g) => (byOrg.get(g.orgKey) || []).length > 0), byOrg }
    }, [users, organizations])

    const userLabel = (u) => u.fullName || u.name || u.login || u.userName || u.email || String(u.id)

    const selectMaintenanceUser = (u) => {
        handleInputChange('maintenancePerson', userLabel(u))
        setMaintOpen(false)
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
            const existsResp = await getMacExists(mac)
            if (existsResp?.exists) {
                setMacCheckError('Аппарат с таким MAC-адресом уже существует')
                setMacChecking(false)
                return
            }

            // Отладочный MAC (xxxxxxxxxxxx) — соединение сразу «успешно», без ожидания железа
            if (/^x{12}$/i.test(mac.replace(/[^0-9A-Fa-fxX]/g, ''))) {
                setConnectionVerified(true)
                stopMacCheck()
                return
            }

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
        setApiError('')

        // ponytail: не затираем live-ошибку имени — только докидываем обязательные поля
        const nextErrors = { ...errors }

        if (editMode && initialData) {
            const name = formData.name?.trim() ?? ''
            const department = formData.department ?? ''
            if (!name) nextErrors.name = 'Это поле обязательно'
            if (!formData.organizationUnitId && !department) nextErrors.department = 'Выберите подразделение'
            if (Object.keys(nextErrors).length > 0) {
                setErrors(nextErrors)
                return
            }
        } else {
            // Create-режим: соединение должно быть подтверждено.
            if (!connectionVerified) {
                setApiError('Сначала проверьте соединение с устройством по MAC-адресу')
                return
            }
            for (const field of ['manufactureDate', 'commissioningDate', 'lastMaintenanceDate']) {
                const err = validateEquipmentDate(formData[field])
                if (err) nextErrors[field] = err
            }
            if (Object.keys(nextErrors).length > 0) {
                setErrors(nextErrors)
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

    const renderDateField = (field, label, required = false) => (
        <div className="form-field">
            <label>{label}</label>
            <WelderDateField
                value={formData[field]}
                onChange={(iso) => handleDateFieldChange(field, iso)}
                disabled={gated}
                minDate={dateLimits.minDate}
                maxDate={dateLimits.maxDate}
                validate={validateEquipmentDate}
            />
            {errors[field] && <span className="error-message">{errors[field]}</span>}
        </div>
    )

    if (!isOpen) return null

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
                                    {MODELS.map(model => {
                                        const isMonitoringBlock = model.value === 'Блок мониторинга'
                                        return (
                                        <button
                                            key={model.value}
                                            type="button"
                                            className={`model-item ${selectedModel === model.value ? 'active' : ''} ${isMonitoringBlock ? 'disabled' : ''}`}
                                            onClick={() => {
                                                if (isMonitoringBlock) return
                                                setSelectedModel(model.value)
                                            }}
                                            disabled={gated || isMonitoringBlock}
                                        >
                                            {model.label}
                                        </button>
                                        )
                                    })}
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
                                    <div className="unit-select-container" ref={unitSelectRef}>
                                        <div
                                            className={`unit-select-dropdown ${unitDropdownOpen ? 'open' : ''} ${errors.department ? 'error' : ''}`}
                                            onClick={() => { if (!gated) setUnitDropdownOpen((o) => !o) }}
                                        >
                                            <span className="unit-select-label">
                                                {formData.organizationUnitId
                                                    ? organizationUnits.find((u) => String(u.id) === String(formData.organizationUnitId))?.name || 'Выберите подразделение'
                                                    : 'Выберите подразделение'}
                                            </span>
                                            <span className={`unit-select-arrow ${unitDropdownOpen ? 'open' : ''}`}>
                                                <FaChevronDown />
                                            </span>
                                        </div>
                                        {unitDropdownOpen && !gated && (
                                            <div className="unit-select-options">
                                                {organizationGroups.length > 0 ? (
                                                    organizationGroups.map((group) => (
                                                        <React.Fragment key={group.orgKey}>
                                                            <div className="unit-option unit-option-org">
                                                                <button
                                                                    type="button"
                                                                    className="org-unit-expand-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        toggleOrgExpand(group.orgKey)
                                                                    }}
                                                                >
                                                                    {expandedOrgs[group.orgKey] ? (
                                                                        <FaChevronDown className="expand-icon" />
                                                                    ) : (
                                                                        <FaChevronRight className="expand-icon" />
                                                                    )}
                                                                </button>
                                                                <span
                                                                    className="unit-option-name unit-option-org-name"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleOrgSelect(group)
                                                                    }}
                                                                >
                                                                    {group.orgName}
                                                                </span>
                                                            </div>
                                                            {expandedOrgs[group.orgKey] && (
                                                                group.hierarchy.length > 0 ? (
                                                                    <div className="unit-children">
                                                                        {group.hierarchy.map((unit) => renderUnitOption(unit, 1))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="unit-option" style={{ marginLeft: '32px', padding: '8px 12px', color: '#7B8BA6' }}>
                                                                        Нет подразделений
                                                                    </div>
                                                                )
                                                            )}
                                                        </React.Fragment>
                                                    ))
                                                ) : (
                                                    <div className="unit-option" style={{ padding: '8px 12px', color: '#7B8BA6' }}>
                                                        Нет доступных подразделений
                                                    </div>
                                                )}
                                                {orgSelectHint && (
                                                    <div className="unit-option-org-error">{orgSelectHint}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {errors.department && <span className="error-message">{errors.department}</span>}
                                </div>
                                {!editMode && (
                                    <>
                                        {renderDateField('manufactureDate', 'Дата изготовления')}
                                        {renderDateField('commissioningDate', 'Ввод в эксплуатацию*')}
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
                                        <div className="resp-welder-select" ref={respRef}>
                                            <div
                                                className={`resp-welder-trigger ${!formData.organizationUnitId ? 'disabled' : ''} ${respOpen ? 'open' : ''}`}
                                                onClick={() => {
                                                    if (gated || !formData.organizationUnitId) return
                                                    setRespOpen((o) => !o)
                                                }}
                                            >
                                                <span className="resp-welder-trigger-text">
                                                    {formData.responsiblePerson
                                                        ? welderDisplayName(formData.responsiblePerson)
                                                        : (!formData.organizationUnitId
                                                            ? 'Сначала выберите подразделение'
                                                            : 'Выберите сварщика')}
                                                </span>
                                                <FaChevronDown className={`resp-welder-arrow ${respOpen ? 'open' : ''}`} />
                                            </div>
                                            {respOpen && (
                                                <div className="resp-welder-dropdown">
                                                    {respTreeData.groups.length === 0 ? (
                                                        <div className="resp-welder-empty">Нет доступных сварщиков</div>
                                                    ) : (
                                                        respTreeData.groups.map((group) => {
                                                            const orgWelders = respTreeData.byOrg.get(group.orgKey) || []
                                                            const orgExpanded = !!respExpandedOrgs[group.orgKey]
                                                            return (
                                                                <React.Fragment key={group.orgKey}>
                                                                    <div className="resp-welder-org">
                                                                        <span
                                                                            className="resp-welder-chevron"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                toggleRespOrg(group.orgKey)
                                                                            }}
                                                                        >
                                                                            {orgExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                                                        </span>
                                                                        <span>{group.orgName}</span>
                                                                    </div>
                                                                    {orgExpanded && orgWelders.map((w) => renderRespWelderLeaf(w, 1))}
                                                                    {orgExpanded && group.hierarchy.map((unit) => renderRespUnitNode(unit, group.orgKey, 1))}
                                                                </React.Fragment>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {renderDateField('lastMaintenanceDate', 'Дата последнего ТО')}
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
                                        <div className="resp-welder-select" ref={maintRef}>
                                            <div
                                                className={`resp-welder-trigger ${gated ? 'disabled' : ''} ${maintOpen ? 'open' : ''}`}
                                                onClick={() => {
                                                    if (gated) return
                                                    setMaintOpen((o) => !o)
                                                }}
                                            >
                                                <span className="resp-welder-trigger-text">
                                                    {formData.maintenancePerson || 'Выберите пользователя'}
                                                </span>
                                                <FaChevronDown className={`resp-welder-arrow ${maintOpen ? 'open' : ''}`} />
                                            </div>
                                            {maintOpen && (
                                                <div className="resp-welder-dropdown">
                                                    {maintTreeData.groups.length === 0 ? (
                                                        <div className="resp-welder-empty">Нет доступных пользователей</div>
                                                    ) : (
                                                        maintTreeData.groups.map((group) => {
                                                            const orgUsers = maintTreeData.byOrg.get(group.orgKey) || []
                                                            const orgExpanded = !!maintExpandedOrgs[group.orgKey]
                                                            return (
                                                                <React.Fragment key={group.orgKey}>
                                                                    <div className="resp-welder-org">
                                                                        <span
                                                                            className="resp-welder-chevron"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                setMaintExpandedOrgs((prev) => ({
                                                                                    ...prev,
                                                                                    [group.orgKey]: !prev[group.orgKey],
                                                                                }))
                                                                            }}
                                                                        >
                                                                            {orgExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                                                        </span>
                                                                        <span>{group.orgName}</span>
                                                                    </div>
                                                                    {orgExpanded && orgUsers.map((u) => (
                                                                        <div
                                                                            key={`mu-${u.id}`}
                                                                            className={`resp-welder-leaf ${formData.maintenancePerson === userLabel(u) ? 'selected' : ''}`}
                                                                            style={{ paddingLeft: '28px' }}
                                                                            onClick={() => selectMaintenanceUser(u)}
                                                                        >
                                                                            {userLabel(u)}
                                                                        </div>
                                                                    ))}
                                                                </React.Fragment>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            )}
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
