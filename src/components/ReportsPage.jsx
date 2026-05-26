import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChevronRight, FaChevronDown } from 'react-icons/fa'
import { useReportsUnsaved } from '../contexts/ReportsUnsavedContext'
import './ReportsPage.css'
import { getAllWelders, getWelderById } from '../api/welderApi'
import { getAllWeldingMachines, getWeldingMachineIdsByRfidCodes } from '../api/weldingMachineApi'
import { getAllOrganizationUnits } from '../api/organizationUnitApi'
import {
    getAllReportTemplates,
    getMyReportTemplates,
    saveReportTemplate,
    deleteReportTemplate
} from '../api/reportTemplateApi'
import { reportApi } from '../api/reportApi'

const ReportsPage = () => {
    const navigate = useNavigate()
    const reportsUnsaved = useReportsUnsaved()
    const [templates, setTemplates] = useState([])
    const [currentTemplateId, setCurrentTemplateId] = useState(null)
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [templateEmail, setTemplateEmail] = useState('')
    const [autoReportTime, setAutoReportTime] = useState('08:00')
    const [autoReportWeekDays, setAutoReportWeekDays] = useState([])
    const [autoReportMonthDays, setAutoReportMonthDays] = useState([])
    const [lastSelectedMonthDay, setLastSelectedMonthDay] = useState(null) // Для выбора диапазона с Shift
    const [templateActive, setTemplateActive] = useState(false)

    const [selectedPeriod, setSelectedPeriod] = useState('day')
    const [selectedDays, setSelectedDays] = useState([])
    const [startDate, setStartDate] = useState(null)
    const [endDate, setEndDate] = useState(null)
    const [startMonth, setStartMonth] = useState(new Date(2025, 10)) // November 2025
    const [endMonth, setEndMonth] = useState(new Date(2026, 0)) // January 2026
    const [emailDuplicate, setEmailDuplicate] = useState(false)
    const [emailAddress, setEmailAddress] = useState('')
    const [timeRange, setTimeRange] = useState({ start: '00:00', end: '23:59' })
    const [timeRangeEnabled, setTimeRangeEnabled] = useState(false)

    // Новые состояния для фильтров и типов отчетов
    const [templateSearchQuery, setTemplateSearchQuery] = useState('')
    const [selectedTemplateTypes, setSelectedTemplateTypes] = useState([
        'Все',
        'По работе сварщика (швы)',
        'По расходу проволоки',
        'По работе оборудования (швы)',
        'По неисправностям оборудования'
    ]) // По умолчанию все типы выбраны
    const [templateTypeDropdownOpen, setTemplateTypeDropdownOpen] = useState(false)
    const [reportTypeDropdownOpen, setReportTypeDropdownOpen] = useState(false)
    const [selectedReportType, setSelectedReportType] = useState('')
    const [reportTypeDropdownHighlight, setReportTypeDropdownHighlight] = useState(false)
    const [autoReportEnabled, setAutoReportEnabled] = useState(false)
    const [periodType, setPeriodType] = useState('Произвольный период')
    const [workingDaysEnabled, setWorkingDaysEnabled] = useState(false)
    const [selectedWorkingDays, setSelectedWorkingDays] = useState([])
    const [selectedReportMonths, setSelectedReportMonths] = useState([]) // Для «Месячный отчёт»: индексы месяцев 0–11
    const [openArbitraryDatePicker, setOpenArbitraryDatePicker] = useState(null) // 'start' | 'end' | null — для выпадающего календаря произвольного периода
    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [generateError, setGenerateError] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [generateProgressPercent, setGenerateProgressPercent] = useState(0)
    const [generateProgressMessage, setGenerateProgressMessage] = useState('')
    const generatePollCancelledRef = useRef(false)
    const generateProgressTargetRef = useRef(0)
    const generateProgressDisplayRef = useRef(0)
    const generateProgressMessageRef = useRef('')
    const [progressBarInstant, setProgressBarInstant] = useState(false)

    // Скорость полоски: 24 ч — 1% в секунду, 7 дней — 1% в 2 секунды.
    // Между этапами с бэка (5→20→25→80→100) полоска идёт дальше до порога следующего этапа.
    useEffect(() => {
        if (!isGenerating) {
            return undefined
        }

        const tickMs = periodType === 'За 7 дней' ? 2000 : 1000
        const stepPercent = 1
        const backendStages = [5, 20, 25, 80, 100]
        const creepCeilingFor = (target) => {
            if (target >= 100) return 100
            const nextStage = backendStages.find((p) => p > target)
            return nextStage != null ? Math.min(99, nextStage - 1) : 99
        }

        const intervalId = setInterval(() => {
            const target = generateProgressTargetRef.current
            let current = generateProgressDisplayRef.current

            if (current < target) {
                current += Math.min(stepPercent, target - current)
            } else if (target < 100) {
                const creepCeiling = creepCeilingFor(target)
                if (current < creepCeiling) {
                    current += stepPercent
                }
            }

            if (target >= 100 && current < 100) {
                current = Math.min(100, current + stepPercent)
            }

            current = Math.min(100, Math.max(0, current))
            generateProgressDisplayRef.current = current
            const rounded = Math.round(current)
            setGenerateProgressPercent((prev) => (prev !== rounded ? rounded : prev))
        }, tickMs)

        return () => clearInterval(intervalId)
    }, [isGenerating, periodType])
    const [saveButtonBlink, setSaveButtonBlink] = useState(false)
    const saveButtonBlinkTimeoutRef = useRef(null)
    const [lastSavedSnapshot, setLastSavedSnapshot] = useState(null)
    const pendingActionRef = useRef(null)
    const isFormDirtyRef = useRef(null)
    const getFormSnapshotRef = useRef(null)

    // Report parameters state - динамические параметры для подразделений
    // Для "По расходу проволоки": welder, tableNumber, department, timeOnline, arcBurningTime, wire, consumption обязательны
    // Для "По работе сварщика": обязательные колонки фиксированы (№ п/п, Дата, Время начала шва, Режим, Ток, Напряжение, Время шва); остальные опциональны
    const [parameters, setParameters] = useState({
        welder: true, // Обязательный
        all: false, // По умолчанию "Все" не выбрано
        wire: true, // Обязательный (расход проволоки)
        consumption: true, // Обязательный (расход проволоки) / опционально (сварщик)
        equipmentModel: false,
        workOutsideSetCurrent: false,
        workOutsideActualCurrent: false,
        tableNumber: true, // Обязательный
        profession: false,
        department: true, // Обязательный
        equipmentName: false,
        timeOnline: true, // Обязательный
        arcBurningTime: true, // Обязательный
        efficiency: false,
        energyConsumed: false,
        // Опциональные колонки отчёта по работе сварщика (швы)
        wireFeedSpeed: false,   // Скорость подачи проволоки, м/мин
        gasConsumption: false,  // Расход газа, л
        // Опциональные колонки отчёта по работе оборудования (сварщик по шву)
        welderFullName: false,
        welderTabNumber: false
    })

    // Настройки отчёта по работе сварщика (швы): мин. интервал между швами (с), мин. учитываемый шов (с)
    const [minSeamInterval, setMinSeamInterval] = useState(2)
    const [minSeamDuration, setMinSeamDuration] = useState(2)
    const [minSeamIntervalEnabled, setMinSeamIntervalEnabled] = useState(true)
    const [minSeamDurationEnabled, setMinSeamDurationEnabled] = useState(true)

    // Динамические параметры для подразделений и сварщиков
    const [selectedOrganizationUnits, setSelectedOrganizationUnits] = useState({})

    // Expanded states for parameters
    const [expandedEquipmentModel, setExpandedEquipmentModel] = useState(false)
    const [expandedWorkOutsideSetCurrent, setExpandedWorkOutsideSetCurrent] = useState(false)
    const [expandedWorkOutsideActualCurrent, setExpandedWorkOutsideActualCurrent] = useState(false)

    // Expanded states for welders structure - динамические на основе реальных подразделений
    const [expandedOrganizationUnits, setExpandedOrganizationUnits] = useState({})

    // Real data from API
    const [allWelders, setAllWelders] = useState([])
    const [organizationUnits, setOrganizationUnits] = useState([])
    const [weldingMachines, setWeldingMachines] = useState([])
    const [loadingWelders, setLoadingWelders] = useState(false)
    const [loadingEquipment, setLoadingEquipment] = useState(false)

    // Selected welders state
    const [selectedWelders, setSelectedWelders] = useState({})
    const [welderSearchTerm, setWelderSearchTerm] = useState('')

    // Selected equipment (welding machines) for report "По работе оборудования"
    const [selectedEquipment, setSelectedEquipment] = useState({})
    const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('')
    const [expandedEquipmentUnits, setExpandedEquipmentUnits] = useState({})

    // Equipment models selection - динамически формируется из типов оборудования
    const [selectedEquipmentModels, setSelectedEquipmentModels] = useState({})

    // Current range values
    const [workOutsideSetCurrentRange, setWorkOutsideSetCurrentRange] = useState({ min: 300, max: 450 })
    const [workOutsideActualCurrentRange, setWorkOutsideActualCurrentRange] = useState({ min: 300, max: 450 })

    // Load welders from API
    useEffect(() => {
        const loadWelders = async () => {
            try {
                setLoadingWelders(true)
                const data = await getAllWelders()
                setAllWelders(Array.isArray(data) ? data : [])
            } catch (error) {
                console.error('Ошибка загрузки сварщиков:', error)
                setAllWelders([])
            } finally {
                setLoadingWelders(false)
            }
        }
        loadWelders()
    }, [])

    // Автоматически раскрываем подразделения при поиске сварщиков (с учетом вложенных подразделений)
    useEffect(() => {
        if (welderSearchTerm) {
            const searchLower = welderSearchTerm.toLowerCase()
            const hierarchy = buildOrganizationHierarchy()
            const unitsToExpand = {}

            // Рекурсивная функция для поиска совпадений в подразделениях
            const findMatchingUnits = (units) => {
                units.forEach(unit => {
                    // Проверяем название подразделения
                    const unitNameMatch = unit.name.toLowerCase().includes(searchLower)

                    // Проверяем сварщиков в подразделении
                    const hasMatchingWelders = unit.welders.some(welder =>
                        welder.name.toLowerCase().includes(searchLower)
                    )

                    // Рекурсивно проверяем дочерние подразделения
                    let hasMatchingChildren = false
                    if (unit.children && unit.children.length > 0) {
                        findMatchingUnits(unit.children)
                        hasMatchingChildren = unit.children.some(child =>
                            unitsToExpand[child.id]
                        )
                    }

                    // Раскрываем подразделение, если найдены совпадения
                    if (unitNameMatch || hasMatchingWelders || hasMatchingChildren) {
                        unitsToExpand[unit.id] = true
                    }
                })
            }

            findMatchingUnits(hierarchy)

            if (Object.keys(unitsToExpand).length > 0) {
                setExpandedOrganizationUnits(prev => ({
                    ...prev,
                    ...unitsToExpand
                }))
            }
        }
    }, [welderSearchTerm])

    // Автоматически раскрываем подразделения при поиске оборудования
    useEffect(() => {
        if (equipmentSearchTerm) {
            const searchLower = equipmentSearchTerm.toLowerCase()
            const hierarchy = buildEquipmentHierarchy()
            const unitsToExpand = {}
            const findMatchingUnits = (units) => {
                units.forEach(unit => {
                    const unitNameMatch = (unit.name || '').toLowerCase().includes(searchLower)
                    const hasMatchingMachines = (unit.machines || []).some(m => (m.name || '').toLowerCase().includes(searchLower))
                    let hasMatchingChildren = false
                    if (unit.children && unit.children.length > 0) {
                        findMatchingUnits(unit.children)
                        hasMatchingChildren = unit.children.some(child => unitsToExpand[child.id])
                    }
                    if (unitNameMatch || hasMatchingMachines || hasMatchingChildren) unitsToExpand[unit.id] = true
                })
            }
            findMatchingUnits(hierarchy)
            if (Object.keys(unitsToExpand).length > 0) {
                setExpandedEquipmentUnits(prev => ({ ...prev, ...unitsToExpand }))
            }
        }
    }, [equipmentSearchTerm])

    // Load organization units from API
    useEffect(() => {
        const loadOrganizationUnits = async () => {
            try {
                const data = await getAllOrganizationUnits()
                setOrganizationUnits(Array.isArray(data) ? data : [])
            } catch (error) {
                console.error('Ошибка загрузки подразделений:', error)
                setOrganizationUnits([])
            }
        }
        loadOrganizationUnits()
    }, [])

    const STORAGE_KEY_SELECTED_EQUIPMENT = 'reportsPage_selectedEquipment'

    // Load welding machines from API
    useEffect(() => {
        const loadEquipment = async () => {
            try {
                setLoadingEquipment(true)
                const data = await getAllWeldingMachines()
                const machines = Array.isArray(data) ? data : []
                setWeldingMachines(machines)

                // Инициализируем состояние выбранных моделей на основе реальных аппаратов
                const initialSelection = {}
                machines.forEach(machine => {
                    // Используем deviceModel или name как ключ
                    const modelName = machine.deviceModel || machine.name || machine.model || machine.id
                    const key = modelName?.replace(/\s+/g, '').toLowerCase() || machine.id
                    initialSelection[key] = false
                })
                setSelectedEquipmentModels(prev => {
                    // Сохраняем существующие значения, добавляем новые
                    const merged = { ...prev }
                    Object.keys(initialSelection).forEach(key => {
                        if (!(key in merged)) {
                            merged[key] = false
                        }
                    })
                    return merged
                })
            } catch (error) {
                console.error('Ошибка загрузки оборудования:', error)
                setWeldingMachines([])
            } finally {
                setLoadingEquipment(false)
            }
        }
        loadEquipment()
    }, [])

    // Сохраняем выбор оборудования в localStorage для отчётов «По работе оборудования» и «По неисправностям» — не слетает при обновлении/уходе
    useEffect(() => {
        const type = selectedReportType || ''
        if (type !== 'По работе оборудования (швы)' && type !== 'По неисправностям оборудования') return
        try {
            const obj = {}
            Object.keys(selectedEquipment || {}).forEach(k => { if (selectedEquipment[k]) obj[k] = true })
            localStorage.setItem(STORAGE_KEY_SELECTED_EQUIPMENT, JSON.stringify(obj))
        } catch (e) { /* ignore */ }
    }, [selectedReportType, selectedEquipment])

    // Восстанавливаем выбор оборудования из localStorage при открытии отчёта по оборудованию/неисправностям, если выбор пустой
    useEffect(() => {
        const type = selectedReportType || ''
        if (type !== 'По работе оборудования (швы)' && type !== 'По неисправностям оборудования') return
        const hasSelection = selectedEquipment && Object.keys(selectedEquipment).some(k => selectedEquipment[k])
        if (hasSelection) return
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SELECTED_EQUIPMENT)
            if (!raw) return
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                setSelectedEquipment({ ...parsed })
            }
        } catch (e) { /* ignore */ }
    }, [selectedReportType])

    // Очистка таймера мигания кнопки «Сохранить» при размонтировании
    useEffect(() => {
        return () => {
            if (saveButtonBlinkTimeoutRef.current) clearTimeout(saveButtonBlinkTimeoutRef.current)
        }
    }, [])

    // Load report templates from API
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const data = await getMyReportTemplates()
                setTemplates(Array.isArray(data) ? data : [])
            } catch (error) {
                console.error('Ошибка загрузки шаблонов:', error)
                setTemplates([])
            }
        }
        loadTemplates()
    }, [])

    useEffect(() => {
        if (!isCreatingTemplate && !currentTemplateId) {
            setReportTypeDropdownOpen(false)
            setReportTypeDropdownHighlight(false)
        }
    }, [isCreatingTemplate, currentTemplateId])

    // Helper function to format welder name
    const formatWelderName = (welder) => {
        if (typeof welder === 'string') return welder
        if (welder.name) return welder.name
        if (welder.firstName && welder.lastName) {
            const middleName = welder.middleName ? ` ${welder.middleName.charAt(0)}.` : ''
            return `${welder.lastName} ${welder.firstName.charAt(0)}.${middleName}`
        }
        return welder.id || 'Неизвестный сварщик'
    }

    // Каноническая строка для сравнения снимков (порядок ключей не влияет)
    const canonicalJson = (val) => {
        if (val === null || typeof val !== 'object') return JSON.stringify(val)
        if (Array.isArray(val)) return '[' + val.map(canonicalJson).join(',') + ']'
        const keys = Object.keys(val).sort()
        return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson(val[k])).join(',') + '}'
    }

    // Нормализация выбора сварщиков/подразделений для сравнения (без __NONE__, ключи — строки)
    const normalizeSelection = (obj) => {
        if (!obj || typeof obj !== 'object') return {}
        const out = {}
        for (const [k, v] of Object.entries(obj)) {
            if (k === '__NONE__') continue
            if (v) out[String(k)] = true
        }
        return out
    }

    // Снимок формы для проверки несохранённых изменений (нормализованный объект для JSON-сравнения)
    const getFormSnapshot = () => {
        return {
            templateName: (templateName || '').trim(),
            templateEmail: (templateEmail || '').trim(),
            selectedReportType: selectedReportType || '',
            parameters: parameters ? { ...parameters } : {},
            selectedOrganizationUnits: normalizeSelection(selectedOrganizationUnits),
            selectedWelders: normalizeSelection(selectedWelders),
            selectedEquipment: normalizeSelection(selectedEquipment),
            selectedEquipmentModels: selectedEquipmentModels ? { ...selectedEquipmentModels } : {},
            workOutsideSetCurrentRange: workOutsideSetCurrentRange ? { ...workOutsideSetCurrentRange } : {},
            workOutsideActualCurrentRange: workOutsideActualCurrentRange ? { ...workOutsideActualCurrentRange } : {},
            selectedPeriod: selectedPeriod || 'day',
            selectedDays: [...(selectedDays || [])].sort((a, b) => a - b),
            startDate: startDate && startDate instanceof Date ? startDate.toISOString() : null,
            endDate: endDate && endDate instanceof Date ? endDate.toISOString() : null,
            timeRange: timeRange ? { ...timeRange } : {},
            timeRangeEnabled: timeRangeEnabled || false,
            periodType: periodType || '',
            workingDaysEnabled: workingDaysEnabled || false,
            selectedWorkingDays: [...(selectedWorkingDays || [])].sort((a, b) => a - b),
            selectedReportMonths: [...(selectedReportMonths || [])].sort((a, b) => a - b),
            autoReportEnabled: autoReportEnabled || false,
            autoReportTime: autoReportTime || '08:00',
            autoReportWeekDays: [...(autoReportWeekDays || [])].sort((a, b) => a - b),
            autoReportMonthDays: [...(autoReportMonthDays || [])].sort((a, b) => a - b),
            minSeamInterval: minSeamInterval ?? 2,
            minSeamDuration: minSeamDuration ?? 2,
            minSeamIntervalEnabled: minSeamIntervalEnabled ?? true,
            minSeamDurationEnabled: minSeamDurationEnabled ?? true,
            emailAddress: (emailAddress || '').trim()
        }
    }

    const getEmptySnapshot = () => {
        return {
            templateName: '',
            templateEmail: '',
            selectedReportType: '',
            parameters: {
                welder: true, all: false, wire: true, consumption: true, equipmentModel: false,
                workOutsideSetCurrent: false, workOutsideActualCurrent: false, tableNumber: true, profession: false,
                department: true, equipmentName: false, timeOnline: true, arcBurningTime: true, efficiency: false,
                energyConsumed: false, wireFeedSpeed: false, gasConsumption: false, welderFullName: false, welderTabNumber: false
            },
            selectedOrganizationUnits: {},
            selectedWelders: {},
            selectedEquipment: {},
            selectedEquipmentModels: {},
            workOutsideSetCurrentRange: { min: 300, max: 450 },
            workOutsideActualCurrentRange: { min: 300, max: 450 },
            selectedPeriod: 'day',
            selectedDays: [],
            startDate: null,
            endDate: null,
            timeRange: { start: '00:00', end: '23:59' },
            timeRangeEnabled: false,
            periodType: 'Произвольный период',
            workingDaysEnabled: false,
            selectedWorkingDays: [],
            selectedReportMonths: [],
            autoReportEnabled: false,
            autoReportTime: '08:00',
            autoReportWeekDays: [],
            autoReportMonthDays: [],
            minSeamInterval: 2,
            minSeamDuration: 2,
            minSeamIntervalEnabled: true,
            minSeamDurationEnabled: true,
            emailAddress: ''
        }
    }

    // Канонические типы отчётов и нормализация с бэкенда (нужны для buildSnapshotFromTemplate и панели параметров)
    const REPORT_TYPE_WIRE = 'По расходу проволоки'
    const REPORT_TYPE_WELDER = 'По работе сварщика (швы)'
    const REPORT_TYPE_EQUIPMENT = 'По работе оборудования (швы)'
    const REPORT_TYPE_MALFUNCTION = 'По неисправностям оборудования'
    const normalizeReportType = (raw) => {
        if (raw == null || typeof raw !== 'string') return ''
        const t = String(raw).trim()
        if (!t) return ''
        if (t === REPORT_TYPE_WIRE || t === REPORT_TYPE_WELDER || t === REPORT_TYPE_EQUIPMENT || t === REPORT_TYPE_MALFUNCTION) return t
        if (t.toLowerCase().includes('неисправност')) return REPORT_TYPE_MALFUNCTION
        if (t.toLowerCase().includes('сварщика') || t === 'WELDER_WORK' || t === 'welder') return REPORT_TYPE_WELDER
        if (t.toLowerCase().includes('оборудован') || t === 'EQUIPMENT_WORK' || t === 'equipment') return REPORT_TYPE_EQUIPMENT
        if (t.toLowerCase().includes('проволок') || t === 'WIRE_CONSUMPTION' || t === 'wire') return REPORT_TYPE_WIRE
        return t
    }
    const isWelderOrEquipmentReportType = (type) => {
        if (!type || typeof type !== 'string') return false
        const t = type.trim()
        return t === REPORT_TYPE_WELDER || t === REPORT_TYPE_EQUIPMENT || t === REPORT_TYPE_MALFUNCTION || t.includes('сварщика') || t.includes('оборудован') || t.includes('неисправност')
    }

    const buildSnapshotFromTemplate = (template) => {
        if (!template) return getEmptySnapshot()
        const ps = template.periodSettings || {}
        const ars = template.autoReportSettings || {}
        const rp = template.reportParameters || {}
        const orgUnits = {}
        ;(template.selectedOrganizationUnitIds || []).forEach(id => { orgUnits[String(id)] = true })
        const welders = {}
        ;(template.selectedWelderIds || []).forEach(id => { welders[String(id)] = true })
        const models = {}
        ;(template.selectedEquipmentModels || []).forEach(key => { models[String(key)] = true })
        const equipment = {}
        ;(rp?.selectedEquipmentIds || template.selectedEquipmentIds || []).forEach(id => { equipment[String(id)] = true })
        let hasAutoReport = false
        if (template.isActive === true && ars && typeof ars === 'object' && !Array.isArray(ars) && Object.keys(ars).length > 0) {
            const hasTime = ars.autoReportTime && typeof ars.autoReportTime === 'string' && ars.autoReportTime.trim().length > 0
            const hasWeekDays = Array.isArray(ars.autoReportWeekDays) && ars.autoReportWeekDays.length > 0
            const hasMonthDays = Array.isArray(ars.autoReportMonthDays) && ars.autoReportMonthDays.length > 0
            hasAutoReport = hasTime && (hasWeekDays || hasMonthDays)
        }
        const { reportType: _rp, ...paramsRest } = rp || {}
        const defaultParams = getEmptySnapshot().parameters
        return {
            templateName: (template.name || '').trim(),
            templateEmail: (template.email || '').trim(),
            selectedReportType: normalizeReportType(rp?.reportType || template.reportType || ''),
            parameters: rp ? { ...defaultParams, ...paramsRest } : defaultParams,
            selectedOrganizationUnits: orgUnits,
            selectedWelders: welders,
            selectedEquipment: equipment,
            selectedEquipmentModels: models,
            workOutsideSetCurrentRange: template.currentRanges?.workOutsideSetCurrent ? { ...template.currentRanges.workOutsideSetCurrent } : { min: 300, max: 450 },
            workOutsideActualCurrentRange: template.currentRanges?.workOutsideActualCurrent ? { ...template.currentRanges.workOutsideActualCurrent } : { min: 300, max: 450 },
            selectedPeriod: ps.selectedPeriod || 'day',
            selectedDays: [...(ps.selectedDays || [])].sort((a, b) => a - b),
            startDate: ps.startDate || null,
            endDate: ps.endDate || null,
            timeRange: ps.timeRange ? { ...ps.timeRange } : { start: '00:00', end: '23:59' },
            timeRangeEnabled: ps.timeRangeEnabled || false,
            periodType: ps.periodType || 'Произвольный период',
            workingDaysEnabled: ps.workingDaysEnabled || false,
            selectedWorkingDays: [...(ps.selectedWorkingDays || [])].sort((a, b) => a - b),
            selectedReportMonths: [...(ps.selectedReportMonths || [])].sort((a, b) => a - b),
            autoReportEnabled: hasAutoReport,
            autoReportTime: ars.autoReportTime || '08:00',
            autoReportWeekDays: [...(ars.autoReportWeekDays || [])].sort((a, b) => a - b),
            autoReportMonthDays: [...(ars.autoReportMonthDays || [])].sort((a, b) => a - b),
            minSeamInterval: rp.minSeamInterval ?? 2,
            minSeamDuration: rp.minSeamDuration ?? 2,
            minSeamIntervalEnabled: rp.minSeamIntervalEnabled ?? true,
            minSeamDurationEnabled: rp.minSeamDurationEnabled ?? true,
            emailAddress: (template.email || '').trim()
        }
    }

    const isFormDirty = () => {
        if (!currentTemplateId && !isCreatingTemplate) return false
        const saved = lastSavedSnapshot
        if (saved == null) return false
        const current = getFormSnapshot()
        try {
            return canonicalJson(current) !== canonicalJson(saved)
        } catch {
            return false
        }
    }
    isFormDirtyRef.current = isFormDirty
    getFormSnapshotRef.current = getFormSnapshot
    if (reportsUnsaved?.isDirtyRef) reportsUnsaved.isDirtyRef.current = isFormDirty

    const executePendingAction = () => {
        const action = pendingActionRef.current
        pendingActionRef.current = null
        if (!action) return
        if (action.type === 'load' && action.template) {
            handleLoadTemplate(action.template, true)
        } else if (action.type === 'new') {
            handleNewTemplate(true)
        } else if (action.type === 'generate') {
            handleGenerateNow(true)
        } else if (action.type === 'leave' && action.path) {
            reportsUnsaved?.setPendingLeavePath(null)
            navigate(action.path)
        }
    }

    /** Безопасная строка для сортировки: name с бэка может быть числом или объектом. */
    const toSortableName = (value) => {
        if (typeof value === 'string') return value
        if (value === null || value === undefined) return ''
        return String(value)
    }

    // Build organization hierarchy with welders - древовидная структура как на странице Карта предприятия
    const buildOrganizationHierarchy = () => {
        const hierarchy = {}

        // Сначала создаем структуру подразделений
        organizationUnits.forEach(unit => {
            const unitId = unit.id
            const unitName = unit.name || unit.id

            // Извлекаем parentId из разных возможных форматов данных
            let parentId = null
            if (unit.parentId) {
                parentId = unit.parentId
            } else if (unit.parent_id) {
                parentId = unit.parent_id
            } else if (unit.parentDepartment) {
                // Если parentDepartment - это объект, берем его id
                if (typeof unit.parentDepartment === 'object' && unit.parentDepartment !== null) {
                    parentId = unit.parentDepartment.id
                } else if (typeof unit.parentDepartment === 'number' || typeof unit.parentDepartment === 'string') {
                    parentId = unit.parentDepartment
                }
            }

            hierarchy[unitId] = {
                id: unitId,
                name: unitName,
                parentId: parentId,
                welders: [],
                children: [] // Массив для дочерних подразделений
            }
        })

        // Затем добавляем сварщиков к их подразделениям
        allWelders.forEach(welder => {
            // Пробуем разные варианты получения ID подразделения
            let targetUnitId = null

            // Вариант 1: organizationUnitId напрямую
            if (welder.organizationUnitId) {
                targetUnitId = welder.organizationUnitId
            }
            // Вариант 2: organizationUnit как объект
            else if (welder.organizationUnit) {
                if (typeof welder.organizationUnit === 'object') {
                    targetUnitId = welder.organizationUnit.id || welder.organizationUnit.organizationUnitId
                } else {
                    targetUnitId = welder.organizationUnit
                }
            }
            // Вариант 3: department (может быть ID или название)
            else if (welder.department) {
                // Если department - это ID, ищем в hierarchy
                if (hierarchy[welder.department]) {
                    targetUnitId = welder.department
                } else {
                    // Иначе ищем по названию
                    const foundUnit = organizationUnits.find(u => u.name === welder.department)
                    if (foundUnit) {
                        targetUnitId = foundUnit.id
                    }
                }
            }

            if (targetUnitId && hierarchy[targetUnitId]) {
                hierarchy[targetUnitId].welders.push({
                    id: welder.id,
                    name: formatWelderName(welder),
                    welder: welder
                })
            }
        })

        // Строим древовидную структуру: находим родительские подразделения и их дочерние
        const rootUnits = []
        const processedUnits = new Set() // Отслеживаем обработанные подразделения

        // Функция для поиска родителя с учетом разных типов ID
        const findParent = (parentId) => {
            if (parentId == null) return null
            // Пробуем найти родителя по разным вариантам ID (число, строка)
            const parent = hierarchy[parentId] || hierarchy[Number(parentId)] || hierarchy[String(parentId)] || null
            if (!parent && parentId != null) {
                // Отладочное логирование для диагностики проблем с parentId
                console.debug(`Не найден родитель с ID ${parentId} (тип: ${typeof parentId}). Доступные ID:`, Object.keys(hierarchy).map(k => `${k} (${typeof hierarchy[k].id})`))
            }
            return parent
        }

        // Сначала для каждого подразделения с parentId находим его родителя и добавляем в children
        Object.values(hierarchy).forEach(unit => {
            if (unit.parentId != null && unit.parentId !== undefined) {
                const parent = findParent(unit.parentId)
                if (parent) {
                    // Проверяем, что подразделение еще не добавлено в children
                    if (!parent.children.find(child => child.id === unit.id)) {
                        parent.children.push(unit)
                        processedUnits.add(unit.id)
                        console.debug(`Подразделение "${unit.name}" (ID: ${unit.id}) добавлено в children родителя "${parent.name}" (ID: ${parent.id})`)
                    }
                } else {
                    console.warn(`Подразделение "${unit.name}" (ID: ${unit.id}, тип ID: ${typeof unit.id}) имеет parentId ${unit.parentId} (тип: ${typeof unit.parentId}), но родитель не найден`)
                }
            }
        })

        // Затем находим все корневые подразделения (без parentId или не обработанные)
        Object.values(hierarchy).forEach(unit => {
            // Добавляем в rootUnits только те подразделения, которые:
            // 1. Не имеют parentId (корневые)
            // 2. Или имеют parentId, но их родитель не найден (сироты)
            if (!unit.parentId || unit.parentId === null || unit.parentId === undefined) {
                if (!rootUnits.find(u => u.id === unit.id)) {
                    rootUnits.push(unit)
                    console.debug(`Подразделение "${unit.name}" (ID: ${unit.id}) добавлено в rootUnits (нет parentId)`)
                }
            } else if (!processedUnits.has(unit.id)) {
                // Подразделение имеет parentId, но родитель не найден - добавляем в корень
                console.warn(`Подразделение "${unit.name}" (ID: ${unit.id}) имеет parentId ${unit.parentId}, но родитель не найден. Добавляем в корень.`)
                if (!rootUnits.find(u => u.id === unit.id)) {
                    rootUnits.push(unit)
                }
            }
        })

        // Рекурсивная функция для сортировки иерархии
        const sortHierarchy = (units) => {
            return units.sort((a, b) => {
                return toSortableName(a?.name).localeCompare(toSortableName(b?.name), 'ru', { sensitivity: 'base', numeric: true })
            }).map(unit => {
                if (unit.children.length > 0) {
                    unit.children = sortHierarchy(unit.children)
                    // Отладочное логирование для проверки иерархии
                    console.debug(`Подразделение "${unit.name}" (ID: ${unit.id}) имеет ${unit.children.length} дочерних:`, unit.children.map(c => `${c.name} (ID: ${c.id})`).join(', '))
                }
                // Сортируем сварщиков внутри подразделения
                unit.welders.sort((a, b) => {
                    return toSortableName(a?.name).localeCompare(toSortableName(b?.name), 'ru', { sensitivity: 'base', numeric: true })
                })
                return unit
            })
        }

        const sortedRootUnits = sortHierarchy(rootUnits)
        console.debug('Итоговая иерархия корневых подразделений:', sortedRootUnits.map(u => `${u.name} (ID: ${u.id}, children: ${u.children.length})`).join(', '))
        return sortedRootUnits
    }

    const organizationHierarchy = buildOrganizationHierarchy()

    // Иерархия подразделений с оборудованием (аппаратами) — та же структура, что для сварщиков, но с .machines
    const buildEquipmentHierarchy = () => {
        const hierarchy = {}
        organizationUnits.forEach(unit => {
            const unitId = unit.id
            const unitName = unit.name || unit.id
            let parentId = null
            if (unit.parentId != null) parentId = unit.parentId
            else if (unit.parent_id != null) parentId = unit.parent_id
            else if (unit.parentDepartment != null) {
                if (typeof unit.parentDepartment === 'object' && unit.parentDepartment !== null) parentId = unit.parentDepartment.id
                else if (typeof unit.parentDepartment === 'number' || typeof unit.parentDepartment === 'string') parentId = unit.parentDepartment
            }
            hierarchy[unitId] = {
                id: unitId,
                name: unitName,
                parentId,
                machines: [],
                children: []
            }
        })
        weldingMachines.forEach(machine => {
            const targetUnitId = machine.organizationUnitId != null ? machine.organizationUnitId : (machine.organizationUnit && (typeof machine.organizationUnit === 'object' ? machine.organizationUnit.id : machine.organizationUnit))
            if (targetUnitId && hierarchy[targetUnitId]) {
                hierarchy[targetUnitId].machines.push({
                    id: machine.id,
                    name: machine.name || `Аппарат ${machine.id}`,
                    machine
                })
            }
        })
        const rootUnits = []
        const processedUnits = new Set()
        const findParent = (parentId) => {
            if (parentId == null) return null
            return hierarchy[parentId] || hierarchy[Number(parentId)] || hierarchy[String(parentId)] || null
        }
        Object.values(hierarchy).forEach(unit => {
            if (unit.parentId != null && unit.parentId !== undefined) {
                const parent = findParent(unit.parentId)
                if (parent && !parent.children.find(c => c.id === unit.id)) {
                    parent.children.push(unit)
                    processedUnits.add(unit.id)
                }
            }
        })
        Object.values(hierarchy).forEach(unit => {
            if (!unit.parentId || unit.parentId === null || unit.parentId === undefined) {
                if (!rootUnits.find(u => u.id === unit.id)) rootUnits.push(unit)
            } else if (!processedUnits.has(unit.id)) {
                if (!rootUnits.find(u => u.id === unit.id)) rootUnits.push(unit)
            }
        })
        const sortHierarchy = (units) => {
            return units.sort((a, b) =>
                toSortableName(a?.name).localeCompare(toSortableName(b?.name), 'ru', { sensitivity: 'base', numeric: true })
            ).map(unit => {
                if (unit.children.length > 0) unit.children = sortHierarchy(unit.children)
                unit.machines.sort((a, b) =>
                    toSortableName(a?.name).localeCompare(toSortableName(b?.name), 'ru', { sensitivity: 'base', numeric: true })
                )
                return unit
            })
        }
        return sortHierarchy(rootUnits)
    }

    // Рекурсивная функция для получения всех сварщиков из иерархии (включая вложенные подразделения)
    const getAllWeldersFromHierarchy = (units) => {
        const welderIds = []
        const traverse = (unitList) => {
            unitList.forEach(unit => {
                unit.welders.forEach(welder => {
                    welderIds.push(welder.id)
                })
                if (unit.children && unit.children.length > 0) {
                    traverse(unit.children)
                }
            })
        }
        traverse(units)
        return welderIds
    }

    // Get unique equipment models from machines
    const getUniqueEquipmentModels = () => {
        const modelsMap = new Map()

        weldingMachines.forEach(machine => {
            // Используем только название аппарата (name), а не модель устройства
            const modelName = machine.name
            if (modelName) {
                // Используем название как ключ и значение
                if (!modelsMap.has(modelName)) {
                    modelsMap.set(modelName, {
                        key: modelName,
                        name: modelName,
                        id: machine.id
                    })
                }
            }
        })

        return Array.from(modelsMap.values())
    }

    const uniqueEquipmentModels = getUniqueEquipmentModels()

    // Функция для получения аппаратов по RFID кодам
    const getMachinesByRfidCodes = async (rfidCodes) => {
        if (!rfidCodes || rfidCodes.length === 0) return []

        try {
            // Получаем ID аппаратов по RFID кодам через API
            const machineIds = await getWeldingMachineIdsByRfidCodes(rfidCodes)
            console.log('🔍 Найдены ID аппаратов по RFID кодам:', machineIds)

            if (!machineIds || machineIds.length === 0) {
                console.log('⚠️ Не найдено аппаратов по RFID кодам')
                return []
            }

            // Получаем все аппараты и фильтруем по найденным ID
            const allMachines = weldingMachines || []
            const machines = allMachines.filter(machine => machineIds.includes(machine.id))

            console.log('🔍 Найдены аппараты:', machines)
            return machines
        } catch (error) {
            console.error('Ошибка получения аппаратов по RFID:', error)
            return []
        }
    }

    // Функция для автоматического выбора моделей оборудования при выборе сварщиков
    const autoSelectEquipmentModels = async (selectedWelderIds) => {
        if (!selectedWelderIds || selectedWelderIds.length === 0) {
            return
        }

        try {
            // Получаем RFID пропуски всех выбранных сварщиков
            const rfidCodesSet = new Set()

            for (const welderId of selectedWelderIds) {
                try {
                    const welder = await getWelderById(welderId)
                    if (welder && welder.rfidPasses && Array.isArray(welder.rfidPasses)) {
                        welder.rfidPasses.forEach(pass => {
                            if (pass.code) {
                                rfidCodesSet.add(pass.code)
                            }
                        })
                    } else if (welder && welder.rfidCode) {
                        // Обратная совместимость: если приходит один RFID код (старый формат)
                        rfidCodesSet.add(welder.rfidCode)
                    }
                } catch (error) {
                    console.error(`Ошибка получения сварщика ${welderId}:`, error)
                }
            }

            const rfidCodes = Array.from(rfidCodesSet)
            console.log('🔍 Найдены RFID коды выбранных сварщиков:', rfidCodes)

            if (rfidCodes.length === 0) {
                console.log('⚠️ У выбранных сварщиков нет RFID пропусков')
                return
            }

            // Получаем аппараты по RFID кодам
            const machines = await getMachinesByRfidCodes(rfidCodes)
            console.log('🔍 Найдены аппараты по RFID кодам:', machines)

            // Находим модели этих аппаратов и автоматически выбираем их
            const modelsToSelect = {}
            machines.forEach(machine => {
                const modelName = machine.name
                if (modelName) {
                    modelsToSelect[modelName] = true
                }
            })

            console.log('🔍 Автоматически выбираем модели:', Object.keys(modelsToSelect))

            // Обновляем выбранные модели оборудования
            setSelectedEquipmentModels(prev => {
                const updated = { ...prev }
                Object.keys(modelsToSelect).forEach(modelKey => {
                    updated[modelKey] = true
                })
                return updated
            })
        } catch (error) {
            console.error('Ошибка автоматического выбора моделей оборудования:', error)
        }
    }

    // Автоматически выбираем модели оборудования при изменении выбранных сварщиков
    useEffect(() => {
        const selectedWelderIds = Object.keys(selectedWelders).filter(
            key => selectedWelders[key] && key !== '__NONE__'
        )

        if (selectedWelderIds.length > 0) {
            autoSelectEquipmentModels(selectedWelderIds)
        }
    }, [selectedWelders])

    // Handlers for range sliders to prevent min > max
    const handleSetCurrentMinChange = (value) => {
        const numValue = parseInt(value)
        if (isNaN(numValue)) return

        setWorkOutsideSetCurrentRange(prev => {
            // Ensure min cannot exceed max
            const newMin = Math.max(5, Math.min(numValue, 500))
            // If min would exceed max, set min equal to max
            const finalMin = newMin <= prev.max ? newMin : prev.max
            return {
                ...prev,
                min: finalMin
            }
        })
    }

    const handleSetCurrentMaxChange = (value) => {
        const numValue = parseInt(value)
        if (isNaN(numValue)) return

        setWorkOutsideSetCurrentRange(prev => {
            // Ensure max cannot be less than min
            const newMax = Math.max(5, Math.min(numValue, 500))
            // If max would be less than min, set max equal to min
            const finalMax = newMax >= prev.min ? newMax : prev.min
            return {
                ...prev,
                max: finalMax
            }
        })
    }

    const handleActualCurrentMinChange = (value) => {
        const numValue = parseInt(value)
        if (isNaN(numValue)) return

        setWorkOutsideActualCurrentRange(prev => {
            // Ensure min cannot exceed max
            const newMin = Math.max(5, Math.min(numValue, 500))
            // If min would exceed max, set min equal to max
            const finalMin = newMin <= prev.max ? newMin : prev.max
            return {
                ...prev,
                min: finalMin
            }
        })
    }

    const handleActualCurrentMaxChange = (value) => {
        const numValue = parseInt(value)
        if (isNaN(numValue)) return

        setWorkOutsideActualCurrentRange(prev => {
            // Ensure max cannot be less than min
            const newMax = Math.max(5, Math.min(numValue, 500))
            // If max would be less than min, set max equal to min
            const finalMax = newMax >= prev.min ? newMax : prev.min
            return {
                ...prev,
                max: finalMax
            }
        })
    }

    const toggleParameter = (key) => {
        // Обязательные параметры зависят от типа отчёта: для "По расходу проволоки" — wire, consumption тоже обязательны
        const requiredForWire = ['welder', 'tableNumber', 'department', 'timeOnline', 'arcBurningTime', 'wire', 'consumption']
        const requiredForWelder = ['welder', 'tableNumber', 'department', 'timeOnline', 'arcBurningTime']
        const requiredParams = selectedReportType === REPORT_TYPE_WELDER ? requiredForWelder : requiredForWire
        if (requiredParams.includes(key)) {
            return
        }

        setParameters(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    // Обработчик для чекбокса "Все" - логика как в WeldersPage
    const handleToggleAll = () => {
        const hierarchy = buildOrganizationHierarchy()
        const allWelderIds = getAllWeldersFromHierarchy(hierarchy)

        // Проверяем, все ли выбрано
        const isNoneSelected = selectedWelders.__NONE__ || (Object.keys(selectedWelders).length === 0 && allWelderIds.length > 0)
        const allSelected = allWelderIds.length > 0 && allWelderIds.every(id => selectedWelders[id] && !selectedWelders.__NONE__)

        // Проверяем, выбраны ли все подразделения
        const allOrgUnitsSelected = (() => {
            if (selectedOrganizationUnits.__NONE__) return false
            const allOrgUnitIds = []
            const collectAllUnitIds = (units) => {
                units.forEach(unit => {
                    allOrgUnitIds.push(unit.id)
                    if (unit.children && unit.children.length > 0) {
                        collectAllUnitIds(unit.children)
                    }
                })
            }
            collectAllUnitIds(hierarchy)
            return allOrgUnitIds.length > 0 && allOrgUnitIds.every(id => selectedOrganizationUnits[id] === true)
        })()

        if (allSelected && allOrgUnitsSelected) {
            // Если все выбрано, снимаем все
            setSelectedWelders({ __NONE__: true })
            setSelectedOrganizationUnits({ __NONE__: true })
            setParameters(prev => ({ ...prev, all: false }))
        } else {
            // Выбираем все
            const allWeldersSelected = {}
            const allOrgUnits = {}

            // Собираем всех сварщиков
            allWelderIds.forEach(id => {
                allWeldersSelected[id] = true
            })

            // Рекурсивно собираем все ID подразделений (включая дочерние)
            const collectAllUnitIds = (units) => {
                units.forEach(unit => {
                    allOrgUnits[unit.id] = true
                    if (unit.children && unit.children.length > 0) {
                        collectAllUnitIds(unit.children)
                    }
                })
            }
            collectAllUnitIds(hierarchy)

            setSelectedWelders(allWeldersSelected)
            setSelectedOrganizationUnits(allOrgUnits)
            setParameters(prev => ({ ...prev, all: true }))
        }
    }

    const toggleEquipmentModel = (model) => {
        setSelectedEquipmentModels(prev => ({
            ...prev,
            [model]: !prev[model]
        }))
    }

    const toggleEquipment = (machineId) => {
        setSelectedEquipment(prev => {
            const key = String(machineId)
            const next = { ...prev }
            if (next[key]) {
                delete next[key]
            } else {
                next[key] = true
            }
            return next
        })
    }

    // Все аппараты из иерархии (корни)
    const getAllEquipmentFromHierarchy = (units) => {
        const ids = []
        const traverse = (unitList) => {
            unitList.forEach(unit => {
                (unit.machines || []).forEach(m => ids.push(m.id))
                if (unit.children && unit.children.length > 0) traverse(unit.children)
            })
        }
        traverse(units)
        return ids
    }

    const getMachinesFromUnit = (unit) => {
        const list = [...(unit.machines || [])]
        if (unit.children && unit.children.length > 0) {
            unit.children.forEach(child => list.push(...getMachinesFromUnit(child)))
        }
        return list
    }

    const findParentUnitsForMachine = (units, machineId, parentPath = []) => {
        for (const unit of units) {
            if (unit.machines && unit.machines.some(m => m.id === machineId)) return parentPath
            if (unit.children && unit.children.length > 0) {
                const found = findParentUnitsForMachine(unit.children, machineId, [...parentPath, unit.id])
                if (found !== null) return found
            }
        }
        return null
    }

    const toggleEquipmentOrganizationUnit = (unitId) => {
        const hierarchy = buildEquipmentHierarchy()
        const findUnit = (units, id) => {
            for (const u of units) {
                if (u.id === id) return u
                if (u.children && u.children.length > 0) {
                    const f = findUnit(u.children, id)
                    if (f) return f
                }
            }
            return null
        }
        const unit = findUnit(hierarchy, unitId)
        if (!unit) return
        const machineIds = getMachinesFromUnit(unit).map(m => m.id)
        const allSelected = machineIds.length > 0 && machineIds.every(id => selectedEquipment[String(id)])
        setSelectedEquipment(prev => {
            const next = { ...prev }
            if (allSelected) {
                machineIds.forEach(id => delete next[String(id)])
            } else {
                machineIds.forEach(id => { next[String(id)] = true })
            }
            return next
        })
    }

    const toggleEquipmentUnitExpanded = (unitId) => {
        setExpandedEquipmentUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }))
    }

    const handleToggleAllEquipment = () => {
        const hierarchy = buildEquipmentHierarchy()
        const allIds = getAllEquipmentFromHierarchy(hierarchy)
        const allSelected = allIds.length > 0 && allIds.every(id => selectedEquipment[String(id)])
        if (allSelected) {
            setSelectedEquipment({})
        } else {
            const next = {}
            allIds.forEach(id => { next[String(id)] = true })
            setSelectedEquipment(next)
        }
    }

    const toggleExpanded = (key) => {
        if (key === 'equipmentModel') {
            setExpandedEquipmentModel(prev => !prev)
        } else if (key === 'workOutsideSetCurrent') {
            setExpandedWorkOutsideSetCurrent(prev => !prev)
        } else if (key === 'workOutsideActualCurrent') {
            setExpandedWorkOutsideActualCurrent(prev => !prev)
        }
    }

    const toggleOrganizationUnitExpanded = (unitId) => {
        setExpandedOrganizationUnits(prev => ({
            ...prev,
            [unitId]: !prev[unitId]
        }))
    }

    const toggleWelder = (welderId) => {
        setSelectedWelders(prev => {
            const hierarchy = buildOrganizationHierarchy()
            const allWelderIds = getAllWeldersFromHierarchy(hierarchy)

            const isNoneSelected = prev.__NONE__ || (Object.keys(prev).length === 0 && allWelderIds.length > 0)
            // Если ничего не выбрано, то клик должен выбрать сварщика
            // Если что-то уже выбрано, то клик должен переключить состояние
            const willBeChecked = isNoneSelected ? true : !prev[welderId]

            if (isNoneSelected) {
                // Если было "__NONE__" или пусто, удаляем его и добавляем выбранный элемент
                if (willBeChecked) {
                    const updated = { [welderId]: true }
                    delete updated.__NONE__
                    // Проверяем, все ли выбрано
                    const allSelected = allWelderIds.length === 1 || allWelderIds.every(id => updated[id])
                    if (allSelected) {
                        const allWeldersSelected = {}
                        allWelderIds.forEach(id => {
                            allWeldersSelected[id] = true
                        })
                        const allOrgUnits = {}
                        hierarchy.forEach(unit => {
                            allOrgUnits[unit.id] = true
                        })
                        setSelectedOrganizationUnits(allOrgUnits)
                        setParameters(prevParams => ({ ...prevParams, all: true }))
                        return allWeldersSelected
                    }
                    // При выборе сварщика из состояния __NONE__ убеждаемся, что __NONE__ удален из selectedOrganizationUnits
                    // Родительские подразделения не нужно явно выбирать - getUnitState сам определит их состояние
                    setSelectedOrganizationUnits(prevUnits => {
                        const updatedUnits = { ...prevUnits }
                        delete updatedUnits.__NONE__
                        return updatedUnits
                    })
                    setParameters(prevParams => ({ ...prevParams, all: false }))
                    return updated
                }
                return prev
            } else {
                // Если объект не пустой
                if (willBeChecked) {
                    // Добавляем в выбор
                    const updated = { ...prev, [welderId]: true }
                    delete updated.__NONE__
                    // Проверяем, все ли выбрано
                    const allSelected = allWelderIds.every(id => updated[id])
                    if (allSelected) {
                        const allOrgUnits = {}
                        hierarchy.forEach(unit => {
                            allOrgUnits[unit.id] = true
                        })
                        setSelectedOrganizationUnits(allOrgUnits)
                        setParameters(prevParams => ({ ...prevParams, all: true }))
                    } else {
                        // При выборе сварщика не нужно явно выбирать родительские подразделения
                        // Они должны оставаться в состоянии, которое позволит getUnitState определить indeterminate
                        // Просто убеждаемся, что __NONE__ удален
                        setSelectedOrganizationUnits(prevUnits => {
                            const updatedUnits = { ...prevUnits }
                            delete updatedUnits.__NONE__
                            // Не удаляем родительские подразделения - они должны остаться для правильного определения состояния
                            // getUnitState сам определит, что они в indeterminate состоянии на основе выбранных сварщиков
                            return updatedUnits
                        })
                        setParameters(prevParams => ({ ...prevParams, all: false }))
                    }
                    return updated
                } else {
                    // Убираем из выбора
                    const updated = { ...prev }
                    delete updated[welderId]
                    delete updated.__NONE__

                    // Находим родительские подразделения и снимаем с них галочки
                    const hierarchy = buildOrganizationHierarchy()
                    const parentUnitIds = findParentUnitsForWelder(hierarchy, welderId)
                    if (parentUnitIds && parentUnitIds.length > 0) {
                        setSelectedOrganizationUnits(prevUnits => {
                            const updatedUnits = { ...prevUnits }
                            delete updatedUnits.__NONE__
                            // Снимаем галочки с родительских подразделений
                            parentUnitIds.forEach(parentId => {
                                delete updatedUnits[parentId]
                            })
                            // Если ничего не выбрано, устанавливаем "__NONE__"
                            if (Object.keys(updatedUnits).length === 0) {
                                return { __NONE__: true }
                            }
                            return updatedUnits
                        })
                    }

                    // Если ничего не выбрано, устанавливаем "__NONE__"
                    if (Object.keys(updated).length === 0) {
                        setSelectedOrganizationUnits({ __NONE__: true })
                        setParameters(prevParams => ({ ...prevParams, all: false }))
                        return { __NONE__: true }
                    }
                    setParameters(prevParams => ({ ...prevParams, all: false }))
                    return updated
                }
            }
        })
    }

    // Рекурсивная функция для поиска подразделения в иерархии
    const findUnitInHierarchy = (units, unitId) => {
        for (const unit of units) {
            if (unit.id === unitId) {
                return unit
            }
            if (unit.children && unit.children.length > 0) {
                const found = findUnitInHierarchy(unit.children, unitId)
                if (found) return found
            }
        }
        return null
    }

    // Рекурсивная функция для получения всех сварщиков из подразделения и его дочерних
    const getWeldersFromUnit = (unit) => {
        const welders = [...unit.welders]
        if (unit.children && unit.children.length > 0) {
            unit.children.forEach(child => {
                welders.push(...getWeldersFromUnit(child))
            })
        }
        return welders
    }

    // Рекурсивная функция для получения всех ID дочерних подразделений
    const getAllChildUnitIds = (unit) => {
        const ids = []
        if (unit.children && unit.children.length > 0) {
            unit.children.forEach(child => {
                ids.push(child.id)
                ids.push(...getAllChildUnitIds(child))
            })
        }
        return ids
    }

    // Рекурсивная функция для поиска родительских подразделений сварщика
    const findParentUnitsForWelder = (units, welderId, parentPath = []) => {
        for (const unit of units) {
            // Проверяем, есть ли сварщик в этом подразделении
            if (unit.welders && unit.welders.some(w => w.id === welderId)) {
                return parentPath
            }
            // Проверяем в дочерних подразделениях
            if (unit.children && unit.children.length > 0) {
                const found = findParentUnitsForWelder(unit.children, welderId, [...parentPath, unit.id])
                if (found !== null) {
                    return found
                }
            }
        }
        return null
    }

    // Рекурсивная функция для поиска родительских подразделений подразделения
    const findParentUnitsForUnit = (units, unitId, parentPath = []) => {
        for (const unit of units) {
            if (unit.id === unitId) {
                return parentPath
            }
            if (unit.children && unit.children.length > 0) {
                const found = findParentUnitsForUnit(unit.children, unitId, [...parentPath, unit.id])
                if (found !== null) {
                    return found
                }
            }
        }
        return null
    }

    const toggleOrganizationUnit = (unitId) => {
        const hierarchy = buildOrganizationHierarchy()
        const unit = findUnitInHierarchy(hierarchy, unitId)
        if (!unit) return

        // Определяем фактическое состояние подразделения через getUnitState
        // Это нужно, чтобы правильно определить, выбрано ли подразделение
        // (даже если оно выбрано только через дочерние элементы)
        const getUnitStateForToggle = (unit) => {
            if (selectedOrganizationUnits.__NONE__) return { checked: false, indeterminate: false }

            const explicitlySelected = selectedOrganizationUnits[unit.id] === true
            const unitWelders = unit.welders || []
            const selectedWeldersCount = unitWelders.filter(w => selectedWelders[w.id] && !selectedWelders.__NONE__).length
            const allWeldersSelected = unitWelders.length > 0 && selectedWeldersCount === unitWelders.length
            const someWeldersSelected = selectedWeldersCount > 0

            if (unit.children && unit.children.length > 0) {
                const childrenStates = unit.children.map(child => getUnitStateForToggle(child))
                const allChildrenChecked = childrenStates.every(state => state.checked)
                const someChildrenChecked = childrenStates.some(state => state.checked || state.indeterminate)

                if (allChildrenChecked) {
                    if (unitWelders.length > 0) {
                        if (allWeldersSelected) {
                            return { checked: true, indeterminate: false }
                        } else {
                            return { checked: false, indeterminate: true }
                        }
                    } else {
                        return { checked: true, indeterminate: false }
                    }
                }
                if (someChildrenChecked || someWeldersSelected) {
                    return { checked: false, indeterminate: true }
                }
                if (explicitlySelected) {
                    return { checked: false, indeterminate: true }
                }
                return { checked: false, indeterminate: false }
            }

            if (unitWelders.length > 0) {
                if (allWeldersSelected) {
                    return { checked: true, indeterminate: false }
                } else if (someWeldersSelected) {
                    return { checked: false, indeterminate: true }
                }
            }

            return { checked: explicitlySelected, indeterminate: false }
        }

        const currentState = getUnitStateForToggle(unit)
        const currentlyChecked = currentState.checked
        const willBeChecked = !currentlyChecked

        setSelectedOrganizationUnits(prev => {
            const isNoneSelected = prev.__NONE__ || (Object.keys(prev).length === 0)

            if (willBeChecked) {
                // Выбираем подразделение и всех его сварщиков (включая дочерние подразделения)
                const updatedUnits = isNoneSelected ? { [unitId]: true } : { ...prev, [unitId]: true }
                delete updatedUnits.__NONE__

                // Также выбираем все дочерние подразделения
                const allChildUnitIds = getAllChildUnitIds(unit)
                allChildUnitIds.forEach(childId => {
                    updatedUnits[childId] = true
                })

                const updatedWelders = { ...selectedWelders }
                // Автоматически выбираем всех сварщиков в подразделении и его дочерних
                const allWeldersInUnit = getWeldersFromUnit(unit)
                allWeldersInUnit.forEach(welder => {
                    updatedWelders[welder.id] = true
                })
                delete updatedWelders.__NONE__

                // Обновляем состояние сварщиков сразу
                setSelectedWelders(updatedWelders)

                // НЕ проверяем автоматически, все ли выбрано - это должно происходить только при клике на "Все"
                // Просто обновляем параметр all на false, так как мы выбрали только одно подразделение
                setParameters(prevParams => ({ ...prevParams, all: false }))
                return updatedUnits
            } else {
                // Снимаем выбор с подразделения и всех его дочерних подразделений
                const updatedUnits = { ...prev }
                delete updatedUnits[unitId]
                delete updatedUnits.__NONE__

                // Также снимаем выбор со всех дочерних подразделений
                const allChildUnitIds = getAllChildUnitIds(unit)
                allChildUnitIds.forEach(childId => {
                    delete updatedUnits[childId]
                })

                // НЕ удаляем родительские подразделения - их состояние будет определяться автоматически
                // на основе состояния дочерних элементов через getUnitState
                // Это позволит родительским подразделениям получить indeterminate состояние
                // если часть дочерних элементов выбрана

                // Обновляем состояние сварщиков с использованием функционального обновления
                setSelectedWelders(prevWelders => {
                    const updatedWelders = { ...prevWelders }
                    delete updatedWelders.__NONE__

                    // Автоматически снимаем выбор со всех сварщиков в подразделении и его дочерних
                    const allWeldersInUnit = getWeldersFromUnit(unit)
                    allWeldersInUnit.forEach(welder => {
                        delete updatedWelders[welder.id]
                    })

                    // Если ничего не выбрано, устанавливаем "__NONE__"
                    if (Object.keys(updatedWelders).length === 0) {
                        return { __NONE__: true }
                    }
                    return updatedWelders
                })

                // Если ничего не выбрано, устанавливаем "__NONE__"
                if (Object.keys(updatedUnits).length === 0) {
                    setParameters(prevParams => ({ ...prevParams, all: false }))
                    return { __NONE__: true }
                }
                setParameters(prevParams => ({ ...prevParams, all: false }))
                return updatedUnits
            }
        })
    }

    const toggleDay = (day) => {
        setSelectedDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        )
    }

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        // getDay() возвращает: 0=воскресенье, 1=понедельник, ..., 6=суббота
        // Но наш календарь начинается с понедельника (0=понедельник, 6=воскресенье)
        // Преобразуем: воскресенье (0) -> 6, понедельник (1) -> 0, вторник (2) -> 1, и т.д.
        const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

        const days = []
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null)
        }
        // Add all days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i)
        }
        return days
    }

    const navigateMonth = (isStart, direction) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

        if (isStart) {
            setStartMonth(prev => {
                const newDate = new Date(prev)
                newDate.setMonth(prev.getMonth() + direction)
                // Не позволяем перейти к будущим месяцам
                if (newDate >= firstDayOfNextMonth) {
                    return prev
                }
                return newDate
            })
        } else {
            setEndMonth(prev => {
                const newDate = new Date(prev)
                newDate.setMonth(prev.getMonth() + direction)
                // Не позволяем перейти к будущим месяцам
                if (newDate >= firstDayOfNextMonth) {
                    return prev
                }
                return newDate
            })
        }
    }

    // Проверяет, можно ли перейти к следующему месяцу (не будущий месяц)
    const canNavigateNext = (monthDate) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
        const nextMonth = new Date(monthDate)
        nextMonth.setMonth(monthDate.getMonth() + 1)
        return nextMonth < firstDayOfNextMonth
    }

    const formatMonthYear = (date) => {
        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
        return `${months[date.getMonth()]} ${date.getFullYear()}`
    }

    const formatDateDisplay = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) return 'Выберите дату'
        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    }

    // Проверяет, является ли дата будущей
    const isFutureDate = (date) => {
        if (!date) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const checkDate = new Date(date)
        checkDate.setHours(0, 0, 0, 0)
        return checkDate > today
    }

    // Проверяет, находится ли дата в диапазоне между startDate и endDate
    const isDateInRange = (dayDate, startDate, endDate) => {
        if (!dayDate || !startDate || !endDate) return false
        const day = new Date(dayDate)
        day.setHours(0, 0, 0, 0)
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(0, 0, 0, 0)
        return day >= start && day <= end
    }

    const todayStart = () => {
        const t = new Date()
        t.setHours(0, 0, 0, 0)
        return t
    }

    const normalizeDay = (date) => {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        return d
    }

    const addDays = (date, days) => {
        const d = normalizeDay(date)
        d.setDate(d.getDate() + days)
        return d
    }

    /** Минимальная дата окончания — следующий день после начала. */
    const getMinEndDate = (start) => (start ? addDays(start, 1) : null)

    const clampEndAfterStart = (start, preferredEnd) => {
        const today = todayStart()
        const minEnd = getMinEndDate(start)
        let end = preferredEnd ? normalizeDay(preferredEnd) : minEnd
        if (end < minEnd) end = minEnd
        if (end > today) end = today
        return end
    }

    const applyArbitraryStartDate = (newStart) => {
        const start = normalizeDay(newStart)
        const today = todayStart()
        if (start > today) return
        setStartDate(start)
        setStartMonth(new Date(start.getFullYear(), start.getMonth()))
        const end = clampEndAfterStart(start, endDate)
        setEndDate(end)
        setEndMonth(new Date(end.getFullYear(), end.getMonth()))
    }

    const applyArbitraryEndDate = (newEnd) => {
        const end = normalizeDay(newEnd)
        const today = todayStart()
        if (end > today) return
        if (startDate) {
            const minEnd = getMinEndDate(startDate)
            if (end < minEnd) return
        }
        setEndDate(end)
        setEndMonth(new Date(end.getFullYear(), end.getMonth()))
    }

    // Изменение даты начала периода на ±1 день (стрелки в компактной строке)
    const adjustArbitraryStartDay = (delta) => {
        const today = todayStart()
        if (startDate) {
            const d = addDays(startDate, delta)
            if (d > today) return
            applyArbitraryStartDate(d)
        } else {
            if (delta > 0) {
                const first = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1)
                applyArbitraryStartDate(first)
            } else {
                const lastPrev = new Date(startMonth.getFullYear(), startMonth.getMonth(), 0)
                applyArbitraryStartDate(lastPrev)
            }
        }
    }

    // Изменение даты окончания периода на ±1 день
    const adjustArbitraryEndDay = (delta) => {
        const today = todayStart()
        const minEnd = startDate ? getMinEndDate(startDate) : null
        if (endDate) {
            const d = addDays(endDate, delta)
            if (d > today) return
            if (minEnd && d < minEnd) return
            applyArbitraryEndDate(d)
        } else {
            const base = minEnd || new Date(endMonth.getFullYear(), endMonth.getMonth(), 1)
            if (delta > 0) {
                applyArbitraryEndDate(base)
            } else {
                const prev = addDays(base, -1)
                if (!minEnd || prev >= minEnd) applyArbitraryEndDate(prev)
            }
        }
    }

    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const monthDays = Array.from({ length: 31 }, (_, i) => i + 1)
    const monthLabelsShort = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

    // Редактор активен после «Новый отчёт» или выбора шаблона из списка
    const reportEditorActive = Boolean(isCreatingTemplate || currentTemplateId)
    const panelLocked = !reportEditorActive
    // Чекбоксы/период недоступны, пока у нового отчёта не выбран тип
    const configDisabled = reportEditorActive && isCreatingTemplate && !selectedReportType
    const rightPanelLocked = panelLocked || configDisabled

    const handleConfigAreaClick = () => {
        if (configDisabled && !panelLocked) {
            setReportTypeDropdownHighlight(true)
            setReportTypeDropdownOpen(true)
        }
    }

    // Типы шаблонов для фильтра
    const templateTypes = [
        'Все',
        'По работе оборудования (швы)',
        'По работе сварщика (швы)',
        'По расходу проволоки',
        'По неисправностям оборудования',
    ]

    // Типы отчетов для выбора (константы REPORT_TYPE_* и normalizeReportType объявлены выше)
    const reportTypes = [REPORT_TYPE_WIRE, REPORT_TYPE_WELDER, REPORT_TYPE_EQUIPMENT, REPORT_TYPE_MALFUNCTION]

    // Типы периода
    const periodTypes = [
        'Произвольный период',
        'За 24 часа',
        'За 7 дней',
        'Месячный отчёт'
    ]

    // Закрытие выпадающего списка типов шаблонов при клике вне его области
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (templateTypeDropdownOpen && !event.target.closest('.template-type-dropdown-container')) {
                setTemplateTypeDropdownOpen(false)
            }
        }

        if (templateTypeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [templateTypeDropdownOpen])

    // Закрытие выпадающего списка типа отчета при клике вне его области
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (reportTypeDropdownOpen && !event.target.closest('.report-type-dropdown-container')) {
                setReportTypeDropdownOpen(false)
            }
        }

        if (reportTypeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [reportTypeDropdownOpen])

    // Закрытие выпадающего календаря произвольного периода при клике вне
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openArbitraryDatePicker && !event.target.closest('.right-panel-arbitrary-date-trigger-group')) {
                setOpenArbitraryDatePicker(null)
            }
        }
        if (openArbitraryDatePicker) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openArbitraryDatePicker])

    // Показ модалки несохранённых изменений при попытке уйти со страницы через сайдбар
    useEffect(() => {
        if (reportsUnsaved?.pendingLeavePath && isFormDirty()) {
            const path = reportsUnsaved.pendingLeavePath
            reportsUnsaved.setPendingLeavePath(null)
            pendingActionRef.current = { type: 'leave', path }
            setShowUnsavedConfirm(true)
        }
    }, [reportsUnsaved?.pendingLeavePath])

    // Предупреждение при уходе со страницы или обновлении с несохранёнными изменениями (ref — всегда актуальная проверка)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isFormDirtyRef.current && isFormDirtyRef.current()) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [])

    // Сбрасываем сообщение «Выберите сварщика», когда пользователь выбрал хотя бы одного
    useEffect(() => {
        const hasWelders = Object.keys(selectedWelders).some(
            (key) => key !== '__NONE__' && selectedWelders[key]
        )
        if (hasWelders && generateError) setGenerateError('')
    }, [selectedWelders, generateError])

    // Обработка выбора типа шаблона
    const handleTemplateTypeToggle = (type) => {
        setSelectedTemplateTypes(prev => {
            const isSelected = prev.includes(type)
            const isAll = type === 'Все'
            const otherTypes = templateTypes.filter(t => t !== 'Все')

            if (isAll) {
                if (isSelected) {
                    // Снимаем "Все" - снимаем все остальные
                    return []
                } else {
                    // Выбираем "Все" - выбираем все типы
                    return templateTypes
                }
            } else {
                if (isSelected) {
                    // Снимаем конкретный тип
                    const hasAll = prev.includes('Все')
                    let newSelection = prev.filter(t => t !== type && t !== 'Все')

                    // Если было выбрано "Все" и все остальные типы, после снятия одного типа
                    // у нас останутся все типы кроме снятого, но "Все" нужно убрать
                    // Если остались все типы кроме снятого, не добавляем "Все" обратно
                    return newSelection
                } else {
                    // Выбираем конкретный тип
                    const hasAll = prev.includes('Все')
                    let newSelection = prev.filter(t => t !== 'Все')

                    // Если type еще не в списке, добавляем его
                    if (!newSelection.includes(type)) {
                        newSelection.push(type)
                    }

                    // Если выбраны все типы кроме "Все", добавляем "Все"
                    if (newSelection.length === otherTypes.length && newSelection.every(t => otherTypes.includes(t))) {
                        return ['Все', ...otherTypes]
                    }
                    return newSelection
                }
            }
        })
    }

    const handleNewTemplate = (forceNew = false) => {
        if (!forceNew && isFormDirty()) {
            pendingActionRef.current = { type: 'new' }
            setShowUnsavedConfirm(true)
            return
        }
        setIsCreatingTemplate(true)
        setCurrentTemplateId(null)
        setTemplateName('')
        setTemplateEmail('')
        setTemplateActive(false)
        setAutoReportEnabled(false)
        setPeriodType('Произвольный период')
        setWorkingDaysEnabled(false)
        setSelectedWorkingDays([])
        setSelectedReportMonths([])
        setSelectedReportType('')
        setReportTypeDropdownHighlight(false)
        setSelectedTemplateTypes([
            'Все',
            'По работе оборудования (швы)',
            'По работе сварщиков (швы)',
            'По расходу материала',
            'По сварочным швам',
            'По ошибкам оборудования',
            'По швам с нарушениями',
            'По выполнению свар. задания'
        ])
        // Reset all parameters to defaults
        setParameters({
            welder: true,
            all: false,
            wire: true,
            consumption: true,
            equipmentModel: false,
            workOutsideSetCurrent: false,
            workOutsideActualCurrent: false,
            tableNumber: true,
            profession: false,
            department: true,
            equipmentName: false,
            timeOnline: true,
            arcBurningTime: true,
            efficiency: false,
            energyConsumed: false,
            wireFeedSpeed: false,
            gasConsumption: false
        })
        setMinSeamInterval(2)
        setMinSeamDuration(2)
        setMinSeamIntervalEnabled(true)
        setMinSeamDurationEnabled(true)
        setSelectedOrganizationUnits({})
        setSelectedWelders({})
        setSelectedEquipment({})
        setEquipmentSearchTerm('')
        setExpandedEquipmentUnits({})
        setSelectedEquipmentModels({})
        setEmailDuplicate(false)
        setEmailAddress('')
        setTimeRange({ start: '00:00', end: '23:59' })
        setTimeRangeEnabled(false)
        setStartDate(null)
        setEndDate(null)
        setSelectedDays([])
        setSelectedPeriod('day')
        setWelderSearchTerm('')
        setTimeout(() => {
            if (getFormSnapshotRef.current) setLastSavedSnapshot(getFormSnapshotRef.current())
        }, 0)
    }

    const handleSaveTemplate = async () => {
        setSaveButtonBlink(false)
        if (saveButtonBlinkTimeoutRef.current) {
            clearTimeout(saveButtonBlinkTimeoutRef.current)
            saveButtonBlinkTimeoutRef.current = null
        }
        if (!templateName.trim()) {
            alert('Введите название шаблона')
            return
        }

        // Не допускаем два отчёта с одинаковым названием (без учёта регистра)
        const nameNorm = templateName.trim().toLowerCase()
        const hasDuplicateName = templates.some(
            t => t.name && t.name.trim().toLowerCase() === nameNorm && t.id !== currentTemplateId
        )
        if (hasDuplicateName) {
            alert('Отчёт с названием «' + templateName.trim() + '» уже существует. Выберите другое название.')
            return
        }

        // Для нового шаблона тип отчёта обязателен — подсвечиваем и раскрываем выпадающий список
        if (!currentTemplateId && !(selectedReportType && selectedReportType.trim())) {
            setReportTypeDropdownHighlight(true)
            setReportTypeDropdownOpen(true)
            return
        }

        // Если редактируем существующий шаблон или создаём новый — сохраняем сразу
        await confirmSaveTemplate()
    }

    const confirmSaveTemplate = async () => {
        // Для нового шаблона тип отчёта обязателен (в т.ч. при нажатии «Да» в модалке несохранённых изменений)
        if (!currentTemplateId && !(selectedReportType && selectedReportType.trim())) {
            setShowUnsavedConfirm(false)
            pendingActionRef.current = null
            reportsUnsaved?.setPendingLeavePath(null)
            setReportTypeDropdownHighlight(true)
            setReportTypeDropdownOpen(true)
            throw new Error('REPORT_TYPE_REQUIRED')
        }

        // Проверка дубликата названия (в т.ч. при нажатии «Да» в модалке — иначе можно обойти проверку)
        if (templateName.trim()) {
            const nameNorm = templateName.trim().toLowerCase()
            const hasDuplicateName = templates.some(
                t => t.name && t.name.trim().toLowerCase() === nameNorm && t.id !== currentTemplateId
            )
            if (hasDuplicateName) {
                setShowUnsavedConfirm(false)
                pendingActionRef.current = null
                reportsUnsaved?.setPendingLeavePath(null)
                alert('Отчёт с названием «' + templateName.trim() + '» уже существует. Выберите другое название.')
                return
            }
        }

        try {
            // Подготовка данных для сохранения
            // Гарантируем, что обязательные параметры всегда true
            // ВАЖНО: backend ReportTemplateDTO не имеет отдельного поля reportType,
            // поэтому сохраняем тип отчёта внутри reportParameters (как часть JSON).
            const reportParams = { ...parameters, reportType: selectedReportType || null }
            if (selectedReportType === REPORT_TYPE_EQUIPMENT || selectedReportType === REPORT_TYPE_MALFUNCTION) {
                reportParams.selectedEquipmentIds = Object.keys(selectedEquipment)
                    .filter(key => selectedEquipment[key])
                    .map(key => parseInt(key, 10))
            }
            // selectedEquipmentIds для оборудования сохраняем и в reportParameters (бэкенд читает оттуда)
            reportParams.welder = true
            reportParams.tableNumber = true
            reportParams.department = true
            reportParams.timeOnline = true
            reportParams.arcBurningTime = true
            // Для "По работе сварщика" колонки wire и consumption опциональны — сохраняем текущие галочки
            if (selectedReportType !== REPORT_TYPE_WELDER) {
                reportParams.wire = true
                reportParams.consumption = true
            }
            if (selectedReportType === REPORT_TYPE_WELDER || selectedReportType === REPORT_TYPE_EQUIPMENT) {
                reportParams.minSeamInterval = minSeamInterval
                reportParams.minSeamDuration = minSeamDuration
                reportParams.minSeamIntervalEnabled = minSeamIntervalEnabled
                reportParams.minSeamDurationEnabled = minSeamDurationEnabled
            }

            const templateData = {
                id: currentTemplateId || undefined,
                name: templateName,
                email: templateEmail,
                reportParameters: reportParams,
                selectedOrganizationUnitIds: Object.keys(selectedOrganizationUnits)
                    .filter(key => selectedOrganizationUnits[key])
                    .map(key => parseInt(key)),
                selectedWelderIds: Object.keys(selectedWelders)
                    .filter(key => selectedWelders[key])
                    .map(key => parseInt(key)),
                selectedEquipmentModels: Object.keys(selectedEquipmentModels)
                    .filter(key => selectedEquipmentModels[key])
                    .map(key => key), // Сохраняем названия аппаратов, а не ключи
                currentRanges: {
                    workOutsideSetCurrent: workOutsideSetCurrentRange,
                    workOutsideActualCurrent: workOutsideActualCurrentRange
                },
                periodSettings: {
                    selectedPeriod,
                    selectedDays: [...selectedDays],
                    startDate: startDate && startDate instanceof Date ? startDate.toISOString() : null,
                    endDate: endDate && endDate instanceof Date ? endDate.toISOString() : null,
                    timeRange: { ...timeRange },
                    timeRangeEnabled,
                    periodType,
                    workingDaysEnabled,
                    selectedWorkingDays: [...selectedWorkingDays],
                    selectedReportMonths: periodType === 'Месячный отчёт' ? [...selectedReportMonths] : []
                },
                autoReportSettings: autoReportEnabled ? {
                    autoReportTime,
                    autoReportWeekDays: [...autoReportWeekDays],
                    autoReportMonthDays: [...autoReportMonthDays]
                } : null,
                isActive: autoReportEnabled // isActive теперь зависит только от autoReportEnabled
            }

            const savedTemplate = await saveReportTemplate(templateData)

            // Перезагружаем список шаблонов с сервера, чтобы получить актуальные данные
            try {
                const data = await getMyReportTemplates()
                setTemplates(Array.isArray(data) ? data : [])
            } catch (error) {
                console.error('Ошибка перезагрузки шаблонов:', error)
                // Если перезагрузка не удалась, обновляем локально
                if (currentTemplateId) {
                    setTemplates(prev => prev.map(t => t.id === savedTemplate.id ? savedTemplate : t))
                } else {
                    setTemplates(prev => [...prev, savedTemplate])
                }
            }

            setCurrentTemplateId(savedTemplate.id)
            setIsCreatingTemplate(false)
            setLastSavedSnapshot(getFormSnapshot())
        } catch (error) {
            console.error('Ошибка сохранения шаблона:', error)
            alert('Ошибка сохранения шаблона: ' + (error.message || 'Неизвестная ошибка'))
            throw error
        }
    }

    const handleLoadTemplate = (template, forceLoad = false) => {
        if (!forceLoad && isFormDirty() && (currentTemplateId !== template.id || isCreatingTemplate)) {
            pendingActionRef.current = { type: 'load', template }
            setShowUnsavedConfirm(true)
            return
        }
        setCurrentTemplateId(template.id)
        setTemplateName(template.name || '')
        setTemplateEmail(template.email || '')
        // reportType хранится внутри reportParameters (см. confirmSaveTemplate)
        const loadedReportType =
            template?.reportParameters?.reportType ||
            template?.reportType || // на случай старых/локальных объектов
            ''
        setSelectedReportType(loadedReportType)

        // Загружаем параметры отчета
        if (template.reportParameters) {
            const loadedType = template.reportParameters.reportType || template.reportType || ''
            const { reportType, minSeamInterval: loadedMinSeamInterval, minSeamDuration: loadedMinSeamDuration, minSeamIntervalEnabled: loadedMinSeamIntervalEnabled, minSeamDurationEnabled: loadedMinSeamDurationEnabled, ...restParams } = template.reportParameters || {}
            setParameters(prev => {
                const updated = { ...prev, ...restParams }
                updated.welder = true
                updated.tableNumber = true
                updated.department = true
                updated.timeOnline = true
                updated.arcBurningTime = true
                if (loadedType !== 'По работе сварщика (швы)') {
                    updated.wire = true
                    updated.consumption = true
                }
                return updated
            })
            if (loadedMinSeamInterval != null) setMinSeamInterval(Math.max(0, Math.min(10, Number(loadedMinSeamInterval) || 0)))
            if (loadedMinSeamDuration != null) setMinSeamDuration(Math.max(0, Math.min(10, Number(loadedMinSeamDuration) || 0)))
            if (loadedMinSeamIntervalEnabled != null) setMinSeamIntervalEnabled(Boolean(loadedMinSeamIntervalEnabled))
            if (loadedMinSeamDurationEnabled != null) setMinSeamDurationEnabled(Boolean(loadedMinSeamDurationEnabled))
        }

        // Загружаем настройки периода
        if (template.periodSettings) {
            setSelectedPeriod(template.periodSettings.selectedPeriod || 'day')
            setSelectedDays(template.periodSettings.selectedDays || [])
            const loadedPeriodType = template.periodSettings.periodType || 'Произвольный период'
            setPeriodType(loadedPeriodType)
            setWorkingDaysEnabled(template.periodSettings.workingDaysEnabled || false)
            const loadedWorkingDays = template.periodSettings.selectedWorkingDays || []
            setSelectedWorkingDays(
                loadedPeriodType === 'За 7 дней' && loadedWorkingDays.length === 0
                    ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                    : loadedWorkingDays
            )
            if (template.periodSettings.startDate) {
                const startDateObj = new Date(template.periodSettings.startDate)
                if (loadedPeriodType === 'Произвольный период') {
                    const endPref = template.periodSettings.endDate
                        ? new Date(template.periodSettings.endDate)
                        : null
                    const start = normalizeDay(startDateObj)
                    const end = clampEndAfterStart(start, endPref)
                    setStartDate(start)
                    setStartMonth(new Date(start.getFullYear(), start.getMonth()))
                    setEndDate(end)
                    setEndMonth(new Date(end.getFullYear(), end.getMonth()))
                } else {
                    setStartDate(startDateObj)
                    setStartMonth(new Date(startDateObj.getFullYear(), startDateObj.getMonth()))
                    if (template.periodSettings.endDate) {
                        const endDateObj = new Date(template.periodSettings.endDate)
                        setEndDate(endDateObj)
                        setEndMonth(new Date(endDateObj.getFullYear(), endDateObj.getMonth()))
                    }
                }
            } else if (template.periodSettings.endDate) {
                const endDateObj = new Date(template.periodSettings.endDate)
                setEndDate(endDateObj)
                setEndMonth(new Date(endDateObj.getFullYear(), endDateObj.getMonth()))
            }
            setTimeRange(template.periodSettings.timeRange || { start: '00:00', end: '23:59' })
            setTimeRangeEnabled(template.periodSettings.timeRangeEnabled || false)
            setSelectedReportMonths(Array.isArray(template.periodSettings.selectedReportMonths) ? [...template.periodSettings.selectedReportMonths] : [])
        }

        // Загружаем настройки автоматического отчета
        // АВТО включается только если isActive === true И есть autoReportSettings с валидными данными
        let hasAutoReport = false
        if (template.isActive === true && template.autoReportSettings != null &&
            typeof template.autoReportSettings === 'object' &&
            !Array.isArray(template.autoReportSettings)) {
            const keys = Object.keys(template.autoReportSettings)
            if (keys.length > 0) {
                const hasTime = template.autoReportSettings.autoReportTime &&
                    typeof template.autoReportSettings.autoReportTime === 'string' &&
                    template.autoReportSettings.autoReportTime.trim().length > 0
                const hasWeekDays = template.autoReportSettings.autoReportWeekDays &&
                    Array.isArray(template.autoReportSettings.autoReportWeekDays) &&
                    template.autoReportSettings.autoReportWeekDays.length > 0
                const hasMonthDays = template.autoReportSettings.autoReportMonthDays &&
                    Array.isArray(template.autoReportSettings.autoReportMonthDays) &&
                    template.autoReportSettings.autoReportMonthDays.length > 0

                hasAutoReport = hasTime && (hasWeekDays || hasMonthDays)
            }
        }
        setAutoReportEnabled(hasAutoReport)
        setTemplateActive(template.isActive || false) // Оставляем для обратной совместимости

        if (template.autoReportSettings) {
            setAutoReportTime(template.autoReportSettings.autoReportTime || '08:00')
            setAutoReportWeekDays(template.autoReportSettings.autoReportWeekDays || [])
            const monthDays = template.autoReportSettings.autoReportMonthDays || []
            setAutoReportMonthDays(monthDays)
            // Устанавливаем последнюю выбранную дату как максимальную из загруженных
            if (monthDays.length > 0) {
                setLastSelectedMonthDay(Math.max(...monthDays))
            } else {
                setLastSelectedMonthDay(null)
            }
        } else {
            // Сбрасываем значения, если нет настроек
            setAutoReportTime('08:00')
            setAutoReportWeekDays([])
            setAutoReportMonthDays([])
            setLastSelectedMonthDay(null)
        }

        // Загружаем выбранные подразделения и сварщиков (всегда задаём состояние, чтобы снимок совпадал с формой)
        const orgUnits = {}
        ;(template.selectedOrganizationUnitIds || []).forEach(id => { orgUnits[String(id)] = true })
        setSelectedOrganizationUnits(orgUnits)

        const welders = {}
        ;(template.selectedWelderIds || []).forEach(id => { welders[String(id)] = true })
        setSelectedWelders(welders)

        const equipmentIds = template.reportParameters?.selectedEquipmentIds || template.selectedEquipmentIds || []
        const equipmentSel = {}
        equipmentIds.forEach(id => { equipmentSel[String(id)] = true })
        setSelectedEquipment(equipmentSel)

        // Загружаем выбранные модели оборудования (полная замена, не слияние)
        const models = {}
        ;(template.selectedEquipmentModels || []).forEach(key => { models[String(key)] = true })
        setSelectedEquipmentModels(models)

        // Загружаем диапазоны токов
        if (template.currentRanges) {
            if (template.currentRanges.workOutsideSetCurrent) {
                setWorkOutsideSetCurrentRange(template.currentRanges.workOutsideSetCurrent)
            }
            if (template.currentRanges.workOutsideActualCurrent) {
                setWorkOutsideActualCurrentRange(template.currentRanges.workOutsideActualCurrent)
            }
        }

        setTemplateActive(template.isActive || false)
        setIsCreatingTemplate(false)
        setTimeout(() => {
            if (getFormSnapshotRef.current) setLastSavedSnapshot(getFormSnapshotRef.current())
        }, 0)
    }

    const handleDeleteTemplate = async (templateId, skipConfirm = false) => {
        if (!skipConfirm && !window.confirm('Удалить текущий шаблон?')) {
            return
        }

        try {
            await deleteReportTemplate(templateId)
            setTemplates(prev => prev.filter(t => t.id !== templateId))
            if (currentTemplateId === templateId) {
                setCurrentTemplateId(null)
                setIsCreatingTemplate(false)
            }
        } catch (error) {
            console.error('Ошибка удаления шаблона:', error)
            alert('Ошибка удаления шаблона: ' + (error.message || 'Неизвестная ошибка'))
        }
    }

    const toggleAutoReportWeekDay = (day) => {
        setAutoReportWeekDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        )
    }

    const toggleAutoReportMonthDay = (day, event) => {
        // Если нажат Shift, выбираем диапазон
        if (event && event.shiftKey && lastSelectedMonthDay !== null) {
            const start = Math.min(lastSelectedMonthDay, day)
            const end = Math.max(lastSelectedMonthDay, day)
            const range = []
            for (let i = start; i <= end; i++) {
                range.push(i)
            }
            setAutoReportMonthDays(prev => {
                // Объединяем текущий выбор с диапазоном
                const newSelection = [...new Set([...prev, ...range])]
                return newSelection.sort((a, b) => a - b)
            })
            setLastSelectedMonthDay(day)
        } else {
            // Обычный клик - переключаем выбор
            setAutoReportMonthDays(prev => {
                const newSelection = prev.includes(day)
                    ? prev.filter(d => d !== day)
                    : [...prev, day]
                return newSelection.sort((a, b) => a - b)
            })
            setLastSelectedMonthDay(day)
        }
    }

    /** Изменение времени HH:mm на step минут по колёсику мыши (deltaY > 0 — минус, deltaY < 0 — плюс) */
    const adjustTimeByWheel = (currentValue, deltaY, stepMinutes = 1) => {
        const [h = 0, m = 0] = (currentValue || '00:00').split(':').map(Number)
        let total = h * 60 + m + (deltaY > 0 ? -stepMinutes : stepMinutes)
        total = Math.max(0, Math.min(24 * 60 - 1, total))
        const nh = Math.floor(total / 60)
        const nm = total % 60
        return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
    }

    const formatTemplateSchedule = (template) => {
        const autoSettings = template.autoReportSettings || {}
        const time = autoSettings.autoReportTime || template.autoReportTime
        const weekDays = autoSettings.autoReportWeekDays || template.autoReportWeekDays || []
        const monthDays = autoSettings.autoReportMonthDays || template.autoReportMonthDays || []

        if (time && weekDays.length > 0) {
            const days = weekDays.join(' ')
            return `${time} ${days}`
        }
        if (time && monthDays.length > 0) {
            const days = monthDays.join(' ')
            return `${time} ${days}`
        }
        return time || '8:00 Пн Вт Ср Чт Пт'
    }

    /** Тип отчёта шаблона для отображения в левой панели (вместо расписания) */
    const getTemplateReportType = (template) => {
        const raw = template?.reportParameters?.reportType || template?.reportType
        const normalized = normalizeReportType(raw)
        return normalized || '—'
    }

    const handleGenerateNow = async (forceGenerate = false) => {
        if (!forceGenerate && isFormDirty()) {
            setSaveButtonBlink(true)
            if (saveButtonBlinkTimeoutRef.current) clearTimeout(saveButtonBlinkTimeoutRef.current)
            saveButtonBlinkTimeoutRef.current = setTimeout(() => {
                setSaveButtonBlink(false)
                saveButtonBlinkTimeoutRef.current = null
            }, 2200)
            return
        }
        // Проверяем, выбран ли шаблон
        if (!currentTemplateId) {
            alert('Выберите шаблон отчета или создайте новый')
            return
        }

        // Проверяем, выбран ли тип отчета
        if (!selectedReportType) {
            setReportTypeDropdownHighlight(true)
            setReportTypeDropdownOpen(true)
            return
        }

        // Для отчётов по сварщикам нужен выбор хотя бы одного сварщика
        const welderRequiredTypes = [REPORT_TYPE_WIRE, REPORT_TYPE_WELDER]
        if (welderRequiredTypes.includes(selectedReportType)) {
            const selectedWelderIds = Object.keys(selectedWelders).filter(
                (key) => key !== '__NONE__' && selectedWelders[key]
            )
            if (selectedWelderIds.length === 0) {
                setGenerateError('Выберите хотя бы одного сварщика')
                return
            }
        }
        setGenerateError('')
        generatePollCancelledRef.current = false
        generateProgressTargetRef.current = 0
        generateProgressDisplayRef.current = 0
        generateProgressMessageRef.current = ''
        setGenerateProgressPercent(0)
        setGenerateProgressMessage('')
        setIsGenerating(true)

        const onGenerateProgress = ({ percent, message }) => {
            if (generatePollCancelledRef.current) return
            const stepPercent = Math.min(100, Math.max(0, typeof percent === 'number' ? percent : 0))
            const messageChanged = Boolean(message) && message !== generateProgressMessageRef.current
            const displayBehindStep = generateProgressDisplayRef.current < stepPercent - 0.5

            if (message) {
                generateProgressMessageRef.current = message
                setGenerateProgressMessage(message)
            }

            generateProgressTargetRef.current = Math.max(generateProgressTargetRef.current, stepPercent)

            // Новый этап раньше, чем полоска доехала — скачок на % шага; дальше тик продолжит рост до следующего порога
            if (messageChanged && displayBehindStep) {
                generateProgressDisplayRef.current = stepPercent
                generateProgressTargetRef.current = stepPercent
                setProgressBarInstant(true)
                setGenerateProgressPercent(Math.round(stepPercent))
                window.setTimeout(() => setProgressBarInstant(false), 50)
            }
        }

        try {
            // Форматируем даты для API (YYYY-MM-DD)
            const formatDate = (date) => {
                if (!date) return null
                const d = new Date(date)
                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                return `${year}-${month}-${day}`
            }

            // Вычисляем даты и время периода по текущему выбору (periodType), а не по сохранённым в шаблоне
            let periodStartDate
            let periodEndDate
            let periodStartTime
            let periodEndTime
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            if (periodType === 'За 24 часа') {
                // Последние 24 часа до текущего момента (а не «вчера 00:00 — сегодня 00:00», иначе отрезается всё,
                // что произошло сегодня после полуночи — отчёт выглядит «пустым» при сварке в последние сутки).
                const end = new Date()
                const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
                const pad2 = (n) => String(n).padStart(2, '0')
                const formatHms = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
                periodStartDate = start
                periodEndDate = end
                periodStartTime = formatHms(start)
                periodEndTime = formatHms(end)
            } else if (periodType === 'За 7 дней') {
                // 7 дней: с (сегодня − 7 дней) по сегодня
                periodStartDate = new Date(today)
                periodStartDate.setDate(periodStartDate.getDate() - 7)
                periodEndDate = new Date(today)
                periodStartTime = timeRange?.start || '00:00'
                periodEndTime = timeRange?.end || '23:59'
            } else if (periodType === 'Месячный отчёт') {
                const year = today.getFullYear()
                const months = selectedReportMonths.length > 0 ? selectedReportMonths : [today.getMonth()]
                const minMonth = Math.min(...months)
                const maxMonth = Math.max(...months)
                periodStartDate = new Date(year, minMonth, 1)
                periodEndDate = new Date(year, maxMonth + 1, 0)
                periodStartTime = timeRange?.start || '00:00'
                periodEndTime = timeRange?.end || '23:59'
            } else {
                // Произвольный период — берём выбранные даты
                periodStartDate = startDate ? new Date(startDate) : new Date(today)
                periodEndDate = endDate ? new Date(endDate) : new Date(today)
                if (!startDate) periodStartDate.setHours(0, 0, 0, 0)
                if (!endDate) periodEndDate.setHours(0, 0, 0, 0)
                periodStartTime = timeRangeEnabled ? (timeRange?.start || null) : null
                periodEndTime = timeRangeEnabled ? (timeRange?.end || null) : null
            }

            // Нормализуем тип отчёта (на случай короткой формы с бэкенда, например "По работе оборудования")
            const normalizedReportType = normalizeReportType(selectedReportType) || selectedReportType
            // Вызываем соответствующий API в зависимости от типа отчета
            if (normalizedReportType === REPORT_TYPE_WIRE) {
                await reportApi.generateReportWithProgress(
                    reportApi.REPORT_JOB_TYPE.WIRE,
                    {
                        templateId: currentTemplateId,
                        periodStartDate: formatDate(periodStartDate),
                        periodEndDate: formatDate(periodEndDate),
                        periodStartTime,
                        periodEndTime
                    },
                    onGenerateProgress
                )
            } else if (normalizedReportType === REPORT_TYPE_WELDER) {
                // Собираем выбранные опциональные колонки из текущих галочек (parameters)
                const welderWorkOptionalKeys = [
                    'equipmentModel',
                    'equipmentName',
                    'wireFeedSpeed',
                    'consumption',
                    'energyConsumed',
                    'gasConsumption'
                ]
                const selectedColumns = welderWorkOptionalKeys.filter((key) => parameters[key] === true)
                const welderBody = {
                    templateId: currentTemplateId,
                    periodStartDate: formatDate(periodStartDate),
                    periodEndDate: formatDate(periodEndDate),
                    periodStartTime,
                    periodEndTime,
                    selectedColumns,
                    minSeamIntervalEnabled: !!minSeamIntervalEnabled,
                    minSeamDurationEnabled: !!minSeamDurationEnabled
                }
                if (minSeamIntervalEnabled && minSeamInterval != null) welderBody.minSeamInterval = minSeamInterval
                if (minSeamDurationEnabled && minSeamDuration != null) welderBody.minSeamDuration = minSeamDuration
                await reportApi.generateReportWithProgress(
                    reportApi.REPORT_JOB_TYPE.WELDER,
                    welderBody,
                    onGenerateProgress
                )
            } else if (normalizedReportType === REPORT_TYPE_EQUIPMENT) {
                const equipmentWorkOptionalKeys = [
                    'welderFullName',
                    'welderTabNumber',
                    'profession',
                    'equipmentModel',
                    'equipmentName',
                    'wireFeedSpeed',
                    'consumption',
                    'energyConsumed',
                    'gasConsumption'
                ]
                const selectedColumns = equipmentWorkOptionalKeys.filter((key) => parameters[key] === true)
                const selectedEquipmentIds = Object.keys(selectedEquipment)
                    .filter(key => selectedEquipment[key])
                    .map(key => parseInt(key, 10))
                if (selectedEquipmentIds.length === 0) {
                    alert('Выберите хотя бы один аппарат')
                    return
                }
                const equipmentBody = {
                    templateId: currentTemplateId,
                    periodStartDate: formatDate(periodStartDate),
                    periodEndDate: formatDate(periodEndDate),
                    periodStartTime,
                    periodEndTime,
                    selectedColumns,
                    selectedEquipmentIds,
                    minSeamIntervalEnabled: !!minSeamIntervalEnabled,
                    minSeamDurationEnabled: !!minSeamDurationEnabled
                }
                if (minSeamIntervalEnabled && minSeamInterval != null) equipmentBody.minSeamInterval = minSeamInterval
                if (minSeamDurationEnabled && minSeamDuration != null) equipmentBody.minSeamDuration = minSeamDuration
                await reportApi.generateReportWithProgress(
                    reportApi.REPORT_JOB_TYPE.EQUIPMENT,
                    equipmentBody,
                    onGenerateProgress
                )
            } else if (normalizedReportType === REPORT_TYPE_MALFUNCTION) {
                const selectedEquipmentIds = Object.keys(selectedEquipment)
                    .filter(key => selectedEquipment[key])
                    .map(key => parseInt(key, 10))
                if (selectedEquipmentIds.length === 0) {
                    alert('Выберите хотя бы один аппарат')
                    return
                }
                await reportApi.generateReportWithProgress(
                    reportApi.REPORT_JOB_TYPE.MALFUNCTION,
                    {
                        periodStartDate: formatDate(periodStartDate),
                        periodEndDate: formatDate(periodEndDate),
                        periodStartTime,
                        periodEndTime,
                        selectedEquipmentIds,
                        periodType
                    },
                    onGenerateProgress
                )
            } else {
                alert('Неизвестный тип отчета: ' + (normalizedReportType || selectedReportType))
            }
        } catch (error) {
            console.error('Ошибка генерации отчета:', error)
            alert('Ошибка генерации отчета: ' + (error.message || 'Неизвестная ошибка'))
        } finally {
            generatePollCancelledRef.current = true
            generateProgressTargetRef.current = 100
            await new Promise((resolve) => {
                const startedAt = Date.now()
                const waitUntilFull = () => {
                    if (generateProgressDisplayRef.current >= 99.5 || Date.now() - startedAt > 1400) {
                        resolve()
                        return
                    }
                    requestAnimationFrame(waitUntilFull)
                }
                requestAnimationFrame(waitUntilFull)
            })
            setGenerateProgressPercent(100)
            setIsGenerating(false)
            setTimeout(() => {
                generateProgressTargetRef.current = 0
                generateProgressDisplayRef.current = 0
                generateProgressMessageRef.current = ''
                setGenerateProgressPercent(0)
                setGenerateProgressMessage('')
            }, 1500)
        }
    }

    return (
        <div className="reports-page">
            <header className="reports-header">
                <h1 className="reports-title">Отчёты</h1>
                <div className="reports-header-right">
                    <div className="user-avatar-notification">
                        <div className="user-avatar-circle">
                            <span>👤</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="reports-content">
                {/* Left Panel - Report Templates */}
                <div className="reports-panel reports-panel-left">
                    <div className="panel-body left-panel-body">
                        {/* Поиск */}
                        <div className="left-panel-filters">
                            <div className="template-search-container">
                                <input
                                    type="text"
                                    className="template-search-input"
                                    placeholder="Поиск"
                                    value={templateSearchQuery}
                                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Выпадающий список "Тип отчета" */}
                        <div className={`template-type-dropdown-container ${templateTypeDropdownOpen ? 'open' : ''}`}>
                            <div
                                className="template-type-dropdown-header"
                                onClick={() => setTemplateTypeDropdownOpen(!templateTypeDropdownOpen)}
                            >
                                <span className={`template-type-dropdown-title ${selectedTemplateTypes.length > 0 && !selectedTemplateTypes.includes('Все') ? 'template-type-dropdown-title--partial' : ''}`}>Тип отчета</span>
                                <button
                                    className="org-unit-expand-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTemplateTypeDropdownOpen(!templateTypeDropdownOpen);
                                    }}
                                >
                                    {templateTypeDropdownOpen ? (
                                        <FaChevronDown className="expand-icon" />
                                    ) : (
                                        <FaChevronRight className="expand-icon" />
                                    )}
                                </button>
                            </div>
                            {templateTypeDropdownOpen && (
                                <div className="template-type-dropdown-list">
                                    {templateTypes.map(type => (
                                        <label
                                            key={type}
                                            className="template-type-dropdown-item"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleTemplateTypeToggle(type)
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTemplateTypes.includes(type)}
                                                onChange={() => handleTemplateTypeToggle(type)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span>{type}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {(templates.length > 0 || isCreatingTemplate) && (
                            <div className="templates-list">
                                {[...templates]
                                    .sort((a, b) => {
                                        const idA = a.id != null ? Number(a.id) : 0
                                        const idB = b.id != null ? Number(b.id) : 0
                                        if (idA !== idB) return idA - idB
                                        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                                        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                                        return createdA - createdB
                                    })
                                    .filter(template => {
                                        // Фильтр по поисковому запросу
                                        if (templateSearchQuery && !template.name.toLowerCase().includes(templateSearchQuery.toLowerCase())) {
                                            return false
                                        }
                                        // Фильтр по типу отчета
                                        if (selectedTemplateTypes.length === 0 || selectedTemplateTypes.includes('Все')) {
                                            return true
                                        }
                                        // Здесь можно добавить логику фильтрации по типу, если в отчета есть поле типа
                                        return true
                                    })
                                    .map((template, index) => {
                                        // Проверяем, есть ли у отчета автоматическое формирование
                                        // АВТО показывается только если:
                                        // 1. isActive === true (отчет активен)
                                        // 2. есть autoReportSettings и они не пустые
                                        // 3. есть хотя бы одно значимое поле (время + дни недели/месяца)
                                        let hasAutoReport = false

                                        // Сначала проверяем isActive - если отчет не активен, бейдж не показываем
                                        if (template.isActive === true) {
                                            // Проверяем, что autoReportSettings существует и не null
                                            if (template.autoReportSettings != null) {
                                                // Если это объект (не массив и не null)
                                                if (typeof template.autoReportSettings === 'object' && !Array.isArray(template.autoReportSettings)) {
                                                    const keys = Object.keys(template.autoReportSettings)
                                                    // Проверяем, что объект не пустой
                                                    if (keys.length > 0) {
                                                        // Проверяем наличие времени
                                                        const hasTime = template.autoReportSettings.autoReportTime &&
                                                            typeof template.autoReportSettings.autoReportTime === 'string' &&
                                                            template.autoReportSettings.autoReportTime.trim().length > 0
                                                        // Проверяем наличие дней недели
                                                        const hasWeekDays = template.autoReportSettings.autoReportWeekDays &&
                                                            Array.isArray(template.autoReportSettings.autoReportWeekDays) &&
                                                            template.autoReportSettings.autoReportWeekDays.length > 0
                                                        // Проверяем наличие дней месяца
                                                        const hasMonthDays = template.autoReportSettings.autoReportMonthDays &&
                                                            Array.isArray(template.autoReportSettings.autoReportMonthDays) &&
                                                            template.autoReportSettings.autoReportMonthDays.length > 0

                                                        // Для валидной конфигурации нужны: время И (дни недели ИЛИ дни месяца)
                                                        // Если есть только время без дней - это может быть остаточные данные после снятия галочки
                                                        hasAutoReport = hasTime && (hasWeekDays || hasMonthDays)
                                                    }
                                                }
                                            }
                                        }

                                        return (
                                            <div
                                                key={template.id}
                                                className={`template-item ${currentTemplateId === template.id ? 'active' : ''}`}
                                                onClick={() => handleLoadTemplate(template)}
                                            >
                                                <div className="template-number">{String(index + 1).padStart(2, '0')}</div>
                                                <div className="template-info">
                                                    <div className="template-name">{template.name}</div>
                                                    <div className="template-schedule">{getTemplateReportType(template)}</div>
                                                </div>
                                                {hasAutoReport && (
                                                    <div className="template-auto-badge">АВТО</div>
                                                )}
                                            </div>
                                        )
                                    })}
                                {isCreatingTemplate && (
                                    <div
                                        className="template-item active"
                                        aria-label="Новый отчет"
                                    >
                                        <div className="template-number">{String(templates.length + 1).padStart(2, '0')}</div>
                                        <div className="template-info">
                                            <div className="template-name">{templateName.trim() || 'Без названия'}</div>
                                            <div className="template-schedule">{selectedReportType || '—'}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            className="new-template-btn"
                            type="button"
                            onClick={handleNewTemplate}
                        >
                            <span className="new-template-icon">+</span>
                            <span>Новый отчет</span>
                        </button>
                    </div>
                </div>

                {/* Middle Panel - Report Parameters */}
                <div className="reports-panel reports-panel-middle" style={{ position: 'relative' }}>
                    {panelLocked && (
                        <div
                            className="report-config-disabled-overlay"
                            aria-label="Создайте новый отчёт или выберите отчёт из списка"
                        />
                    )}
                    <div className={panelLocked ? 'reports-panel-middle-inner report-config-content-disabled' : 'reports-panel-middle-inner'}>
                        <div className="panel-header">
                            <div className="report-name">
                                <span className="template-report-label">Имя:*</span>
                                <input
                                    type="text"
                                    className="report-name-input"
                                    placeholder="Введите название"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    disabled={panelLocked}
                                    readOnly={panelLocked}
                                />
                            </div>
                        </div>

                        {/* Выпадающий список "Выберите тип отчета" */}
                        <div className={`report-type-dropdown-container ${reportTypeDropdownOpen && !panelLocked ? 'open' : ''} ${panelLocked ? 'report-type-dropdown-container--locked' : ''}`}>
                            <div
                                className={`report-type-dropdown-header ${reportTypeDropdownHighlight ? 'report-type-dropdown-header--highlight' : ''}`}
                                onClick={() => {
                                    if (panelLocked) return
                                    setReportTypeDropdownOpen(!reportTypeDropdownOpen)
                                    setReportTypeDropdownHighlight(false)
                                }}
                            >
                            <span className={`report-type-dropdown-title ${!selectedReportType ? 'placeholder' : ''}`}>
                                {selectedReportType || 'Выберите тип отчета*'}
                            </span>
                                <button
                                    type="button"
                                    className="org-unit-expand-btn"
                                    disabled={panelLocked}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (panelLocked) return
                                        setReportTypeDropdownOpen(!reportTypeDropdownOpen);
                                    }}
                                >
                                    {reportTypeDropdownOpen ? (
                                        <FaChevronDown className="expand-icon" />
                                    ) : (
                                        <FaChevronRight className="expand-icon" />
                                    )}
                                </button>
                            </div>
                            {reportTypeDropdownOpen && !panelLocked && (
                                <div className="report-type-dropdown-list">
                                    {reportTypes.map(type => (
                                        <div
                                            key={type}
                                            className={`report-type-dropdown-item ${selectedReportType === type ? 'selected' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedReportType(type);
                                                setReportTypeDropdownOpen(false);
                                                setReportTypeDropdownHighlight(false);
                                            }}
                                        >
                                            <span>{type}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="panel-body middle-panel-content" style={{ position: 'relative' }}>
                            {configDisabled && (
                                <div
                                    className="report-config-disabled-overlay"
                                    onClick={handleConfigAreaClick}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleConfigAreaClick(); } }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label="Сначала выберите тип отчета"
                                />
                            )}
                            <div className={`middle-panel-content-inner ${configDisabled ? 'report-config-content-disabled' : ''}`}>
                                {/* Left sub-panel - Welders or Equipment selection */}
                                <div className="middle-subpanel middle-subpanel-left">
                                    <div className="parameters-list">
                                        {(selectedReportType === REPORT_TYPE_EQUIPMENT || selectedReportType === REPORT_TYPE_MALFUNCTION) ? (
                                            (() => {
                                                const equipmentHierarchy = buildEquipmentHierarchy()
                                                const allEquipmentIds = getAllEquipmentFromHierarchy(equipmentHierarchy)
                                                const allEquipmentSelected = allEquipmentIds.length > 0 && allEquipmentIds.every(id => selectedEquipment[String(id)])

                                                const getEquipmentUnitState = (unit) => {
                                                    const unitMachines = getMachinesFromUnit(unit)
                                                    const selectedCount = unitMachines.filter(m => selectedEquipment[String(m.id)]).length
                                                    const allSelected = unitMachines.length > 0 && selectedCount === unitMachines.length
                                                    const someSelected = selectedCount > 0
                                                    if (unit.children && unit.children.length > 0) {
                                                        const childrenStates = unit.children.map(c => getEquipmentUnitState(c))
                                                        const allChildrenChecked = childrenStates.every(s => s.checked)
                                                        const someChildrenChecked = childrenStates.some(s => s.checked || s.indeterminate)
                                                        let someInChildren = false
                                                        unit.children.forEach(child => {
                                                            const childMachines = getMachinesFromUnit(child)
                                                            if (childMachines.some(m => selectedEquipment[String(m.id)])) someInChildren = true
                                                        })
                                                        if (allChildrenChecked) {
                                                            if (unitMachines.length > 0) {
                                                                return allSelected ? { checked: true, indeterminate: false } : { checked: false, indeterminate: true }
                                                            }
                                                            return { checked: true, indeterminate: false }
                                                        }
                                                        if (someChildrenChecked || someSelected || someInChildren) return { checked: false, indeterminate: true }
                                                        return { checked: false, indeterminate: false }
                                                    }
                                                    if (unitMachines.length > 0) {
                                                        if (allSelected) return { checked: true, indeterminate: false }
                                                        if (someSelected) return { checked: false, indeterminate: true }
                                                    }
                                                    return { checked: false, indeterminate: false }
                                                }

                                                const renderEquipmentUnit = (unit, level = 0) => {
                                                    const unitState = getEquipmentUnitState(unit)
                                                    const isUnitChecked = Boolean(unitState?.checked ?? false)
                                                    const isUnitIndeterminate = Boolean(unitState?.indeterminate ?? false)
                                                    const searchLower = equipmentSearchTerm ? equipmentSearchTerm.toLowerCase() : ''
                                                    const filteredMachines = (unit.machines || []).filter(m => !searchLower || m.name.toLowerCase().includes(searchLower))
                                                    const unitNameMatch = !searchLower || unit.name.toLowerCase().includes(searchLower)
                                                    const hasMatchingChildren = unit.children && unit.children.some(child => {
                                                        const childNameMatch = !searchLower || child.name.toLowerCase().includes(searchLower)
                                                        const childHasMachines = (child.machines || []).some(m => !searchLower || m.name.toLowerCase().includes(searchLower))
                                                        return childNameMatch || childHasMachines
                                                    })
                                                    if (searchLower && !unitNameMatch && filteredMachines.length === 0 && !hasMatchingChildren) return null
                                                    const hasContent = filteredMachines.length > 0 || (unit.children && unit.children.length > 0)
                                                    const indentSize = 12
                                                    const paddingLeft = level * indentSize
                                                    return (
                                                        <div key={unit.id} className="parameter-item-expandable" style={{ marginLeft: `${paddingLeft}px` }}>
                                                            <div className="parameter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isUnitChecked}
                                                                    ref={input => { if (input) input.indeterminate = isUnitIndeterminate }}
                                                                    onChange={() => toggleEquipmentOrganizationUnit(unit.id)}
                                                                />
                                                                <span
                                                                    className="parameter-label"
                                                                    style={{ flex: 1, cursor: 'pointer', color: isUnitIndeterminate ? '#F6B243' : undefined }}
                                                                    onClick={() => toggleEquipmentUnitExpanded(unit.id)}
                                                                >
                                                                {unit.name}
                                                            </span>
                                                                {hasContent && (
                                                                    <button
                                                                        type="button"
                                                                        className="org-unit-expand-btn"
                                                                        onClick={e => { e.stopPropagation(); toggleEquipmentUnitExpanded(unit.id); }}
                                                                    >
                                                                        {expandedEquipmentUnits[unit.id] ? <FaChevronDown className="expand-icon" /> : <FaChevronRight className="expand-icon" />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {expandedEquipmentUnits[unit.id] && (
                                                                <div className="parameter-expanded-content" style={{ marginLeft: '0', paddingLeft: '0' }}>
                                                                    {unit.children && unit.children.length > 0 && unit.children.map(child => renderEquipmentUnit(child, level + 1)).filter(Boolean)}
                                                                    {filteredMachines.length > 0 && filteredMachines.map(m => (
                                                                        <label key={m.id} className="parameter-sub-item" style={{ marginLeft: `${indentSize}px`, paddingLeft: '0' }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={!!selectedEquipment[String(m.id)]}
                                                                                onChange={() => toggleEquipment(m.id)}
                                                                            />
                                                                            <span>{m.name}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                }

                                                return (
                                                    <>
                                                        <div className="subpanel-title">Оборудование*</div>
                                                        <input
                                                            type="text"
                                                            className="welder-search-input"
                                                            placeholder="Поиск"
                                                            value={equipmentSearchTerm}
                                                            onChange={e => setEquipmentSearchTerm(e.target.value)}
                                                            style={{
                                                                backgroundColor: '#122536',
                                                                padding: '4px 8px',
                                                                marginBottom: '8px',
                                                                borderRadius: '3px',
                                                                fontSize: '11px',
                                                                color: '#fff',
                                                                border: 'none',
                                                                outline: 'none',
                                                                width: '100%',
                                                                boxSizing: 'border-box'
                                                            }}
                                                        />
                                                        <label className="parameter-item">
                                                            <input
                                                                type="checkbox"
                                                                checked={allEquipmentSelected}
                                                                onChange={handleToggleAllEquipment}
                                                            />
                                                            <span className="parameter-label">Все</span>
                                                        </label>
                                                        {loadingEquipment ? (
                                                            <div className="parameter-item" style={{ color: '#7B8BA6', fontSize: '12px', padding: '8px 12px' }}>
                                                                Загрузка оборудования...
                                                            </div>
                                                        ) : equipmentHierarchy.length === 0 ? (
                                                            <div className="parameter-item" style={{ color: '#7B8BA6', fontSize: '12px', padding: '8px 12px' }}>
                                                                Нет доступного оборудования
                                                            </div>
                                                        ) : (
                                                            equipmentHierarchy.map(unit => renderEquipmentUnit(unit)).filter(Boolean)
                                                        )}
                                                    </>
                                                )
                                            })()
                                        ) : (
                                            <>
                                                <div className="subpanel-title">Сварщик*</div>
                                                <input
                                                    type="text"
                                                    className="welder-search-input"
                                                    placeholder="Поиск"
                                                    value={welderSearchTerm}
                                                    onChange={(e) => setWelderSearchTerm(e.target.value)}
                                                    style={{
                                                        backgroundColor: '#122536',
                                                        padding: '4px 8px',
                                                        marginBottom: '8px',
                                                        borderRadius: '3px',
                                                        fontSize: '11px',
                                                        color: '#fff',
                                                        border: 'none',
                                                        outline: 'none',
                                                        width: '100%',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={(() => {
                                                            const hierarchy = buildOrganizationHierarchy()
                                                            const allWelderIds = getAllWeldersFromHierarchy(hierarchy)

                                                            // Проверяем, выбраны ли все сварщики
                                                            const isNoneSelected = selectedWelders.__NONE__ || (Object.keys(selectedWelders).length === 0 && allWelderIds.length > 0)
                                                            const showAllChecked = !isNoneSelected && Object.keys(selectedWelders).length === 0 && allWelderIds.length > 0
                                                            const allWeldersSelected = allWelderIds.length > 0 && allWelderIds.every(id => selectedWelders[id] && !selectedWelders.__NONE__)

                                                            // Проверяем, выбраны ли все подразделения (включая дочерние)
                                                            const allOrgUnitIds = []
                                                            const collectAllUnitIds = (units) => {
                                                                units.forEach(unit => {
                                                                    allOrgUnitIds.push(unit.id)
                                                                    if (unit.children && unit.children.length > 0) {
                                                                        collectAllUnitIds(unit.children)
                                                                    }
                                                                })
                                                            }
                                                            collectAllUnitIds(hierarchy)

                                                            const allOrgUnitsSelected = allOrgUnitIds.length > 0 &&
                                                                !selectedOrganizationUnits.__NONE__ &&
                                                                allOrgUnitIds.every(id => selectedOrganizationUnits[id] === true)

                                                            // "Все" выбрано только если выбраны И все сварщики, И все подразделения
                                                            return (showAllChecked || allWeldersSelected) && allOrgUnitsSelected
                                                        })()}
                                                        onChange={handleToggleAll}
                                                    />
                                                    <span className="parameter-label">Все</span>
                                                </label>

                                                {loadingWelders ? (
                                                    <div className="parameter-item" style={{ color: '#7B8BA6', fontSize: '12px', padding: '8px 12px' }}>
                                                        Загрузка сварщиков...
                                                    </div>
                                                ) : organizationHierarchy.length > 0 ? (() => {
                                                    const hierarchy = buildOrganizationHierarchy()
                                                    const allWelderIds = getAllWeldersFromHierarchy(hierarchy)
                                                    const isNoneSelected = selectedWelders.__NONE__ || (Object.keys(selectedWelders).length === 0 && allWelderIds.length > 0)
                                                    const showAllChecked = !isNoneSelected && Object.keys(selectedWelders).length === 0 && allWelderIds.length > 0

                                                    // Рекурсивная функция для получения всех сварщиков из подразделения и его дочерних
                                                    const getAllWeldersInUnit = (unit) => {
                                                        const welders = [...(unit.welders || [])]
                                                        if (unit.children && unit.children.length > 0) {
                                                            unit.children.forEach(child => {
                                                                welders.push(...getAllWeldersInUnit(child))
                                                            })
                                                        }
                                                        return welders
                                                    }

                                                    // Рекурсивная функция для определения состояния подразделения
                                                    // Возвращает объект: { checked: boolean, indeterminate: boolean }
                                                    const getUnitState = (unit) => {
                                                        if (showAllChecked) return { checked: true, indeterminate: false }
                                                        if (selectedOrganizationUnits.__NONE__) return { checked: false, indeterminate: false }

                                                        // Проверяем, явно ли выбрано это подразделение
                                                        const explicitlySelected = selectedOrganizationUnits[unit.id] === true

                                                        // Проверяем состояние сварщиков в этом подразделении
                                                        const unitWelders = unit.welders || []
                                                        const selectedWeldersCount = unitWelders.filter(w => selectedWelders[w.id] && !selectedWelders.__NONE__).length
                                                        const allWeldersSelected = unitWelders.length > 0 && selectedWeldersCount === unitWelders.length
                                                        const someWeldersSelected = selectedWeldersCount > 0

                                                        // Проверяем состояние дочерних подразделений
                                                        let allChildrenChecked = false
                                                        let someChildrenChecked = false

                                                        // Проверяем, есть ли выбранные сварщики в дочерних подразделениях
                                                        let someWeldersInChildrenSelected = false

                                                        if (unit.children && unit.children.length > 0) {
                                                            const childrenStates = unit.children.map(child => {
                                                                const state = getUnitState(child)
                                                                return state
                                                            })
                                                            allChildrenChecked = childrenStates.every(state => state.checked)
                                                            // Проверяем, есть ли хотя бы один выбранный или частично выбранный дочерний элемент
                                                            someChildrenChecked = childrenStates.some(state => state.checked || state.indeterminate)

                                                            // Проверяем, есть ли выбранные сварщики в дочерних подразделениях
                                                            unit.children.forEach(child => {
                                                                const childWelders = getAllWeldersInUnit(child)
                                                                const hasSelectedWelders = childWelders.some(w => selectedWelders[w.id] && !selectedWelders.__NONE__)
                                                                if (hasSelectedWelders) {
                                                                    someWeldersInChildrenSelected = true
                                                                }
                                                            })
                                                        }

                                                        // Если есть дочерние подразделения, учитываем их состояние
                                                        if (unit.children && unit.children.length > 0) {
                                                            // Если все дочерние подразделения выбраны
                                                            // Для родительских подразделений проверяем только дочерние, сварщики не обязательны
                                                            if (allChildrenChecked) {
                                                                // Если есть сварщики в этом подразделении, они тоже должны быть выбраны
                                                                if (unitWelders.length > 0) {
                                                                    if (allWeldersSelected) {
                                                                        return { checked: true, indeterminate: false }
                                                                    } else {
                                                                        return { checked: false, indeterminate: true }
                                                                    }
                                                                } else {
                                                                    // Если нет сварщиков в этом подразделении, достаточно что все дочерние выбраны
                                                                    return { checked: true, indeterminate: false }
                                                                }
                                                            }
                                                            // Если хотя бы что-то выбрано (дочерние или сварщики в этом подразделении или в дочерних)
                                                            if (someChildrenChecked || someWeldersSelected || someWeldersInChildrenSelected) {
                                                                return { checked: false, indeterminate: true }
                                                            }
                                                            // Если явно выбрано, но дочерние не все выбраны - indeterminate
                                                            if (explicitlySelected) {
                                                                return { checked: false, indeterminate: true }
                                                            }
                                                            return { checked: false, indeterminate: false }
                                                        }

                                                        // Для подразделений без дочерних элементов проверяем сварщиков и явный выбор
                                                        if (unitWelders.length > 0) {
                                                            if (allWeldersSelected) {
                                                                return { checked: true, indeterminate: false }
                                                            } else if (someWeldersSelected) {
                                                                return { checked: false, indeterminate: true }
                                                            }
                                                        }

                                                        // Если нет сварщиков и нет дочерних, проверяем только явный выбор
                                                        // Подразделение считается выбранным, если оно явно выбрано
                                                        return { checked: explicitlySelected, indeterminate: false }
                                                    }

                                                    // Для обратной совместимости
                                                    const isUnitSelected = (unit) => {
                                                        const state = getUnitState(unit)
                                                        return state.checked
                                                    }

                                                    // Рекурсивная функция для рендеринга подразделения с дочерними
                                                    const renderOrganizationUnit = (unit, level = 0) => {
                                                        const unitState = getUnitState(unit)
                                                        const isUnitChecked = Boolean(unitState?.checked ?? false)
                                                        const isUnitIndeterminate = Boolean(unitState?.indeterminate ?? false)

                                                        // Фильтрация сварщиков по поисковому запросу
                                                        const searchLower = welderSearchTerm ? welderSearchTerm.toLowerCase() : ''
                                                        const filteredWelders = unit.welders.filter(welder => {
                                                            if (!searchLower) return true
                                                            return welder.name.toLowerCase().includes(searchLower)
                                                        })

                                                        // Проверяем, нужно ли показывать это подразделение (если есть поиск)
                                                        const unitNameMatch = !searchLower || unit.name.toLowerCase().includes(searchLower)
                                                        const hasMatchingWelders = filteredWelders.length > 0
                                                        const hasMatchingChildren = unit.children && unit.children.some(child => {
                                                            const childNameMatch = !searchLower || child.name.toLowerCase().includes(searchLower)
                                                            const childHasWelders = child.welders.some(w => {
                                                                if (!searchLower) return true
                                                                return w.name.toLowerCase().includes(searchLower)
                                                            })
                                                            return childNameMatch || childHasWelders
                                                        })

                                                        // Показываем подразделение, если оно соответствует поиску или имеет соответствующих сварщиков/дочерние
                                                        if (searchLower && !unitNameMatch && !hasMatchingWelders && !hasMatchingChildren) {
                                                            return null
                                                        }

                                                        const hasContent = filteredWelders.length > 0 || (unit.children && unit.children.length > 0)

                                                        // Отступ для видимости иерархии
                                                        const indentSize = 12 // пикселей на уровень
                                                        const paddingLeft = level * indentSize

                                                        return (
                                                            <div key={unit.id} className="parameter-item-expandable" style={{ marginLeft: `${paddingLeft}px` }}>
                                                                <div className="parameter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isUnitChecked}
                                                                        ref={(input) => {
                                                                            if (input) {
                                                                                input.indeterminate = false // Убираем indeterminate с чекбокса
                                                                            }
                                                                        }}
                                                                        onChange={() => toggleOrganizationUnit(unit.id)}
                                                                    />
                                                                    <span
                                                                        className="parameter-label"
                                                                        style={{
                                                                            flex: 1,
                                                                            cursor: 'pointer',
                                                                            color: isUnitIndeterminate ? '#F6B243' : undefined // Желтый цвет для частичного выбора
                                                                        }}
                                                                        onClick={() => toggleOrganizationUnitExpanded(unit.id)}
                                                                    >
                                                    {unit.name}
                                                </span>
                                                                    {hasContent && (
                                                                        <button
                                                                            className="org-unit-expand-btn"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleOrganizationUnitExpanded(unit.id);
                                                                            }}
                                                                        >
                                                                            {expandedOrganizationUnits[unit.id] ? (
                                                                                <FaChevronDown className="expand-icon" />
                                                                            ) : (
                                                                                <FaChevronRight className="expand-icon" />
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {expandedOrganizationUnits[unit.id] && (
                                                                    <div className="parameter-expanded-content" style={{ marginLeft: '0', paddingLeft: '0' }}>
                                                                        {/* Рендерим дочерние подразделения ПЕРЕД сварщиками */}
                                                                        {/* Важно: дочерние подразделения рендерятся с level + 1, что даст им правильный отступ */}
                                                                        {/* Отступ применяется через marginLeft в renderOrganizationUnit, поэтому дочерние подразделения будут иметь отступ 24px относительно родителя */}
                                                                        {unit.children && unit.children.length > 0 && (
                                                                            <>
                                                                                {unit.children.map(child => {
                                                                                    // Рекурсивно рендерим дочернее подразделение с увеличенным уровнем
                                                                                    // level + 1 даст отступ (level + 1) * 24px = например, для ОГК внутри Alloy: 1 * 24 = 24px
                                                                                    return renderOrganizationUnit(child, level + 1)
                                                                                }).filter(Boolean)}
                                                                            </>
                                                                        )}
                                                                        {/* Рендерим сварщиков ПОСЛЕ дочерних подразделений */}
                                                                        {filteredWelders.length > 0 && filteredWelders.map(welder => {
                                                                            const isWelderChecked = Boolean(showAllChecked || (selectedWelders[welder.id] && !selectedWelders.__NONE__))
                                                                            return (
                                                                                <label key={welder.id} className="parameter-sub-item" style={{ marginLeft: `${indentSize}px`, paddingLeft: '0' }}>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isWelderChecked}
                                                                                        onChange={() => toggleWelder(welder.id)}
                                                                                    />
                                                                                    <span>{welder.name}</span>
                                                                                </label>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    }

                                                    // Фильтрация корневых подразделений по поисковому запросу
                                                    const searchLower = welderSearchTerm ? welderSearchTerm.toLowerCase() : ''
                                                    const filteredRootUnits = hierarchy.filter(unit => {
                                                        if (!searchLower) return true
                                                        const unitNameMatch = unit.name.toLowerCase().includes(searchLower)
                                                        const hasMatchingWelders = unit.welders.some(welder =>
                                                            welder.name.toLowerCase().includes(searchLower)
                                                        )
                                                        // Проверяем дочерние подразделения рекурсивно
                                                        const hasMatchingChildren = unit.children && unit.children.some(child => {
                                                            const childNameMatch = child.name.toLowerCase().includes(searchLower)
                                                            const childHasWelders = child.welders.some(w => w.name.toLowerCase().includes(searchLower))
                                                            return childNameMatch || childHasWelders
                                                        })
                                                        return unitNameMatch || hasMatchingWelders || hasMatchingChildren
                                                    })

                                                    return filteredRootUnits.map(unit => renderOrganizationUnit(unit, 0)).filter(Boolean)
                                                })() : (
                                                    <div className="parameter-item" style={{ color: '#7B8BA6', fontSize: '12px', padding: '8px 12px' }}>
                                                        Нет доступных подразделений
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Right sub-panel - Report columns selection (зависит от типа отчёта) */}
                                <div className="middle-subpanel middle-subpanel-right">
                                    <div className="parameters-list">
                                        {selectedReportType === REPORT_TYPE_MALFUNCTION ? (
                                            /* Отчёт по неисправностям оборудования: только эти колонки, все включены и не снимаются */
                                            <>
                                                <div className="subpanel-title">Колонки отчёта</div>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Модель оборудования</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Наименование оборудования</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Подразделение</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Серийный №</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Инв. №</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Неисправности</span>
                                                </label>
                                            </>
                                        ) : (selectedReportType === REPORT_TYPE_EQUIPMENT || selectedReportType === REPORT_TYPE_WELDER) ? (
                                            /* Параметры отчёта по работе сварщика / по работе оборудования: одинаковый набор */
                                            <>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">№ п/п</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Дата</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Время начала шва</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Режим работы оборудования</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Рабочий ток, А</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Рабочее напряжение, В</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input type="checkbox" checked={true} disabled={true} />
                                                    <span className="parameter-label">Время шва, с</span>
                                                </label>
                                                {selectedReportType === REPORT_TYPE_EQUIPMENT && (
                                                    <>
                                                        <label className="parameter-item">
                                                            <input type="checkbox" checked={parameters.welderFullName} onChange={() => toggleParameter('welderFullName')} />
                                                            <span className="parameter-label">ФИО сварщика</span>
                                                        </label>
                                                        <label className="parameter-item">
                                                            <input type="checkbox" checked={parameters.welderTabNumber} onChange={() => toggleParameter('welderTabNumber')} />
                                                            <span className="parameter-label">таб. № сварщика</span>
                                                        </label>
                                                        <label className="parameter-item">
                                                            <input type="checkbox" checked={parameters.profession} onChange={() => toggleParameter('profession')} />
                                                            <span className="parameter-label">Профессия</span>
                                                        </label>
                                                    </>
                                                )}
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.equipmentModel}
                                                        onChange={() => toggleParameter('equipmentModel')}
                                                    />
                                                    <span className="parameter-label">Модель оборудования</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.equipmentName}
                                                        onChange={() => toggleParameter('equipmentName')}
                                                    />
                                                    <span className="parameter-label">Наименование оборудования</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.wireFeedSpeed}
                                                        onChange={() => toggleParameter('wireFeedSpeed')}
                                                    />
                                                    <span className="parameter-label">Скорость подачи проволоки, м/мин</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.consumption}
                                                        onChange={() => toggleParameter('consumption')}
                                                    />
                                                    <span className="parameter-label">Расход проволоки, кг</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.energyConsumed}
                                                        onChange={() => toggleParameter('energyConsumed')}
                                                    />
                                                    <span className="parameter-label">Затраченная энергия на шов, кВт*ч</span>
                                                </label>
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.gasConsumption}
                                                        onChange={() => toggleParameter('gasConsumption')}
                                                    />
                                                    <span className="parameter-label">Расход газа, л</span>
                                                </label>
                                                <div className="parameter-item-expandable">
                                                    <label
                                                        className="parameter-item"
                                                        onClick={(e) => {
                                                            if (e.target.type !== 'checkbox') toggleExpanded('workOutsideActualCurrent')
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={parameters.workOutsideActualCurrent}
                                                            onChange={() => toggleParameter('workOutsideActualCurrent')}
                                                        />
                                                        <span className="parameter-label">Пределы разрешенного факт.тока, А (min — max)</span>
                                                        <button
                                                            className="org-unit-expand-btn"
                                                            onClick={(e) => { e.stopPropagation(); toggleExpanded('workOutsideActualCurrent'); }}
                                                        >
                                                            {expandedWorkOutsideActualCurrent ? <FaChevronDown className="expand-icon" /> : <FaChevronRight className="expand-icon" />}
                                                        </button>
                                                    </label>
                                                    {expandedWorkOutsideActualCurrent && (
                                                        <div className="parameter-expanded-content">
                                                            <div className="current-range-controls">
                                                                <div className="current-range-inputs">
                                                                    <input
                                                                        type="number"
                                                                        min="5"
                                                                        max={workOutsideActualCurrentRange.max}
                                                                        value={workOutsideActualCurrentRange.min}
                                                                        onChange={(e) => handleActualCurrentMinChange(e.target.value)}
                                                                        className="current-range-input"
                                                                    />
                                                                    <span className="current-range-separator">—</span>
                                                                    <input
                                                                        type="number"
                                                                        min={workOutsideActualCurrentRange.min}
                                                                        max="500"
                                                                        value={workOutsideActualCurrentRange.max}
                                                                        onChange={(e) => handleActualCurrentMaxChange(e.target.value)}
                                                                        className="current-range-input"
                                                                    />
                                                                </div>
                                                                <div className="current-range-slider-wrapper">
                                                                    <div className="current-range-slider">
                                                                        <div className="current-range-slider-track-bg"></div>
                                                                        <div
                                                                            className="current-range-slider-track"
                                                                            style={{
                                                                                left: `${((workOutsideActualCurrentRange.min - 5) / (500 - 5)) * 100}%`,
                                                                                width: `${((workOutsideActualCurrentRange.max - workOutsideActualCurrentRange.min) / (500 - 5)) * 100}%`
                                                                            }}
                                                                        />
                                                                        <input type="range" min="5" max="500" value={workOutsideActualCurrentRange.min} onInput={(e) => handleActualCurrentMinChange(e.target.value)} onChange={(e) => handleActualCurrentMinChange(e.target.value)} className="current-range-slider-input current-range-slider-input-min" />
                                                                        <input type="range" min="5" max="500" value={workOutsideActualCurrentRange.max} onInput={(e) => handleActualCurrentMaxChange(e.target.value)} onChange={(e) => handleActualCurrentMaxChange(e.target.value)} className="current-range-slider-input current-range-slider-input-max" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={minSeamIntervalEnabled}
                                                        onChange={(e) => setMinSeamIntervalEnabled(e.target.checked)}
                                                    />
                                                    <span className="parameter-label">Мин. интервал между швами, с (0–10)</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={10}
                                                        value={minSeamInterval}
                                                        onChange={(e) => setMinSeamInterval(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                                                        className="current-range-input"
                                                        style={{ width: '50px', marginLeft: '8px' }}
                                                        disabled={!minSeamIntervalEnabled}
                                                    />
                                                </label>
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={minSeamDurationEnabled}
                                                        onChange={(e) => setMinSeamDurationEnabled(e.target.checked)}
                                                    />
                                                    <span className="parameter-label">Мин. учитываемый шов, с (0–10)</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={10}
                                                        value={minSeamDuration}
                                                        onChange={(e) => setMinSeamDuration(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                                                        className="current-range-input"
                                                        style={{ width: '50px', marginLeft: '8px' }}
                                                        disabled={!minSeamDurationEnabled}
                                                    />
                                                </label>
                                            </>
                                        ) : (
                                            /* Параметры отчёта по расходу проволоки (текущий набор) */
                                            <>
                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.equipmentModel}
                                                        onChange={() => toggleParameter('equipmentModel')}
                                                    />
                                                    <span className="parameter-label">Модель оборудования</span>
                                                </label>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.wire}
                                                        onChange={() => toggleParameter('wire')}
                                                        disabled={true}
                                                    />
                                                    <span className="parameter-label">Проволока</span>
                                                </label>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.consumption}
                                                        onChange={() => toggleParameter('consumption')}
                                                        disabled={true}
                                                    />
                                                    <span className="parameter-label">Расход, кг</span>
                                                </label>

                                                <div className="parameter-item-expandable">
                                                    <label
                                                        className="parameter-item"
                                                        onClick={(e) => {
                                                            if (e.target.type !== 'checkbox') {
                                                                toggleExpanded('workOutsideSetCurrent')
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={parameters.workOutsideSetCurrent}
                                                            onChange={() => toggleParameter('workOutsideSetCurrent')}
                                                        />
                                                        <span className="parameter-label">Пределы разрешенного уст. тока</span>
                                                        <button
                                                            className="org-unit-expand-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleExpanded('workOutsideSetCurrent');
                                                            }}
                                                        >
                                                            {expandedWorkOutsideSetCurrent ? (
                                                                <FaChevronDown className="expand-icon" />
                                                            ) : (
                                                                <FaChevronRight className="expand-icon" />
                                                            )}
                                                        </button>
                                                    </label>
                                                    {expandedWorkOutsideSetCurrent && (
                                                        <div className="parameter-expanded-content">
                                                            <div className="current-range-controls">
                                                                <div className="current-range-inputs">
                                                                    <input
                                                                        type="number"
                                                                        min="5"
                                                                        max={workOutsideSetCurrentRange.max}
                                                                        value={workOutsideSetCurrentRange.min}
                                                                        onChange={(e) => handleSetCurrentMinChange(e.target.value)}
                                                                        className="current-range-input"
                                                                    />
                                                                    <span className="current-range-separator">—</span>
                                                                    <input
                                                                        type="number"
                                                                        min={workOutsideSetCurrentRange.min}
                                                                        max="500"
                                                                        value={workOutsideSetCurrentRange.max}
                                                                        onChange={(e) => handleSetCurrentMaxChange(e.target.value)}
                                                                        className="current-range-input"
                                                                    />
                                                                </div>
                                                                <div className="current-range-slider-wrapper">
                                                                    <div className="current-range-slider">
                                                                        <div className="current-range-slider-track-bg"></div>
                                                                        <div
                                                                            className="current-range-slider-track"
                                                                            style={{
                                                                                left: `${((workOutsideSetCurrentRange.min - 5) / (500 - 5)) * 100}%`,
                                                                                width: `${((workOutsideSetCurrentRange.max - workOutsideSetCurrentRange.min) / (500 - 5)) * 100}%`
                                                                            }}
                                                                        />
                                                                        <input
                                                                            type="range"
                                                                            min="5"
                                                                            max="500"
                                                                            value={workOutsideSetCurrentRange.min}
                                                                            onInput={(e) => handleSetCurrentMinChange(e.target.value)}
                                                                            onChange={(e) => handleSetCurrentMinChange(e.target.value)}
                                                                            className="current-range-slider-input current-range-slider-input-min"
                                                                        />
                                                                        <input
                                                                            type="range"
                                                                            min="5"
                                                                            max="500"
                                                                            value={workOutsideSetCurrentRange.max}
                                                                            onInput={(e) => handleSetCurrentMaxChange(e.target.value)}
                                                                            onChange={(e) => handleSetCurrentMaxChange(e.target.value)}
                                                                            className="current-range-slider-input current-range-slider-input-max"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="parameter-item-expandable">
                                                    <label
                                                        className="parameter-item"
                                                        onClick={(e) => {
                                                            if (e.target.type !== 'checkbox') {
                                                                toggleExpanded('workOutsideActualCurrent')
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={parameters.workOutsideActualCurrent}
                                                            onChange={() => toggleParameter('workOutsideActualCurrent')}
                                                        />
                                                        <span className="parameter-label">Пределы разрешенного факт.тока</span>
                                                        <button
                                                            className="org-unit-expand-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleExpanded('workOutsideActualCurrent');
                                                            }}
                                                        >
                                                            {expandedWorkOutsideActualCurrent ? (
                                                                <FaChevronDown className="expand-icon" />
                                                            ) : (
                                                                <FaChevronRight className="expand-icon" />
                                                            )}
                                                        </button>
                                                    </label>
                                                    {expandedWorkOutsideActualCurrent && (
                                                        <div className="parameter-expanded-content">
                                                            <div className="current-range-controls">
                                                                <div className="current-range-inputs">
                                                                    <input
                                                                        type="number"
                                                                        min="5"
                                                                        max={workOutsideActualCurrentRange.max}
                                                                        value={workOutsideActualCurrentRange.min}
                                                                        onChange={(e) => handleActualCurrentMinChange(e.target.value)}
                                                                        className="current-range-input"
                                                                    />
                                                                    <span className="current-range-separator">—</span>
                                                                    <input
                                                                        type="number"
                                                                        min={workOutsideActualCurrentRange.min}
                                                                        max="500"
                                                                        value={workOutsideActualCurrentRange.max}
                                                                        onChange={(e) => handleActualCurrentMaxChange(e.target.value)}
                                                                        className="current-range-input"
                                                                    />
                                                                </div>
                                                                <div className="current-range-slider-wrapper">
                                                                    <div className="current-range-slider">
                                                                        <div className="current-range-slider-track-bg"></div>
                                                                        <div
                                                                            className="current-range-slider-track"
                                                                            style={{
                                                                                left: `${((workOutsideActualCurrentRange.min - 5) / (500 - 5)) * 100}%`,
                                                                                width: `${((workOutsideActualCurrentRange.max - workOutsideActualCurrentRange.min) / (500 - 5)) * 100}%`
                                                                            }}
                                                                        />
                                                                        <input
                                                                            type="range"
                                                                            min="5"
                                                                            max="500"
                                                                            value={workOutsideActualCurrentRange.min}
                                                                            onInput={(e) => handleActualCurrentMinChange(e.target.value)}
                                                                            onChange={(e) => handleActualCurrentMinChange(e.target.value)}
                                                                            className="current-range-slider-input current-range-slider-input-min"
                                                                        />
                                                                        <input
                                                                            type="range"
                                                                            min="5"
                                                                            max="500"
                                                                            value={workOutsideActualCurrentRange.max}
                                                                            onInput={(e) => handleActualCurrentMaxChange(e.target.value)}
                                                                            onChange={(e) => handleActualCurrentMaxChange(e.target.value)}
                                                                            className="current-range-slider-input current-range-slider-input-max"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.tableNumber}
                                                        onChange={() => toggleParameter('tableNumber')}
                                                        disabled={true}
                                                    />
                                                    <span className="parameter-label">Таб. №</span>
                                                </label>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.profession}
                                                        onChange={() => toggleParameter('profession')}
                                                    />
                                                    <span className="parameter-label">Профессия</span>
                                                </label>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.department}
                                                        onChange={() => toggleParameter('department')}
                                                        disabled={true}
                                                    />
                                                    <span className="parameter-label">Подразделение</span>
                                                </label>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.equipmentName}
                                                        onChange={() => toggleParameter('equipmentName')}
                                                    />
                                                    <span className="parameter-label">Наименование оборудования</span>
                                                </label>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.timeOnline}
                                                        onChange={() => toggleParameter('timeOnline')}
                                                        disabled={true}
                                                    />
                                                    <span className="parameter-label">Время в сети</span>
                                                </label>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.arcBurningTime}
                                                        onChange={() => toggleParameter('arcBurningTime')}
                                                        disabled={true}
                                                    />
                                                    <span className="parameter-label">Время горения дуги</span>
                                                </label>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.efficiency}
                                                        onChange={() => toggleParameter('efficiency')}
                                                    />
                                                    <span className="parameter-label">Эффективность, %</span>
                                                </label>

                                                <label className="parameter-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={parameters.energyConsumed}
                                                        onChange={() => toggleParameter('energyConsumed')}
                                                    />
                                                    <span className="parameter-label">Затраченная энергия, кВт*ч</span>
                                                </label>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Report Period/Delivery */}
                <div className="reports-panel reports-panel-right">
                    <div className="panel-body right-panel-body" style={{ position: 'relative' }}>
                        {rightPanelLocked && (
                            <div
                                className="report-config-disabled-overlay"
                                onClick={configDisabled && !panelLocked ? handleConfigAreaClick : undefined}
                                onKeyDown={configDisabled && !panelLocked ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleConfigAreaClick(); } } : undefined}
                                role={configDisabled && !panelLocked ? 'button' : undefined}
                                tabIndex={configDisabled && !panelLocked ? 0 : undefined}
                                aria-label={
                                    panelLocked
                                        ? 'Создайте новый отчёт или выберите отчёт из списка'
                                        : 'Сначала выберите тип отчета'
                                }
                            />
                        )}
                        <div className={`right-panel-content ${rightPanelLocked ? 'report-config-content-disabled' : ''}`}>
                            {/* Сверху только период для формирования отчёта */}
                            <div className="right-panel-period-section">
                                <div className="right-panel-period-header">
                                    <h3 className="right-panel-period-question">Период для формирования отчёта:</h3>
                                    <select
                                        className="period-type-select"
                                        value={periodType}
                                        onChange={(e) => {
                                            const newType = e.target.value
                                            setPeriodType(newType)
                                            if (newType === 'За 7 дней') {
                                                setSelectedWorkingDays([...weekDays])
                                            }
                                            if (newType === 'Произвольный период') {
                                                setAutoReportEnabled(false)
                                            }
                                        }}
                                    >
                                        {periodTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="right-panel-time-range-row">
                                    <label className="right-panel-time-range-checkbox">

                                        <div className="right-panel-time-inputs">
                                            <input
                                                type="time"
                                                value={timeRange.start}
                                                onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
                                                onWheel={(e) => {
                                                    e.preventDefault()
                                                    const step = e.shiftKey ? 60 : 1
                                                    setTimeRange(prev => ({ ...prev, start: adjustTimeByWheel(prev.start, e.deltaY, step) }))
                                                }}
                                            />
                                            <span>—</span>
                                            <input
                                                type="time"
                                                value={timeRange.end}
                                                onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
                                                onWheel={(e) => {
                                                    e.preventDefault()
                                                    const step = e.shiftKey ? 60 : 1
                                                    setTimeRange(prev => ({ ...prev, end: adjustTimeByWheel(prev.end, e.deltaY, step) }))
                                                }}
                                            />
                                        </div>
                                    </label>
                                </div>

                                {periodType === 'За 7 дней' && (
                                    <div className="right-panel-working-days-row">
                                        <div className="right-panel-working-days-buttons">
                                            {weekDays.map(day => (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    className={`right-panel-week-day-btn ${selectedWorkingDays.includes(day) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        if (selectedWorkingDays.includes(day)) {
                                                            setSelectedWorkingDays(selectedWorkingDays.filter(d => d !== day))
                                                        } else {
                                                            setSelectedWorkingDays([...selectedWorkingDays, day])
                                                        }
                                                    }}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {periodType === 'Месячный отчёт' && (
                                    <div className="right-panel-months-row">
                                        <div className="right-panel-months-buttons">
                                            {monthLabelsShort.map((label, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    className={`right-panel-month-btn ${selectedReportMonths.includes(index) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setSelectedReportMonths(prev => (prev[0] === index ? [] : [index]))
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {periodType === 'Произвольный период' && (
                                    <div className="right-panel-date-range-section">
                                        <div className="right-panel-date-picker-group right-panel-arbitrary-date-trigger-group">
                                            <label className="right-panel-date-picker-label">Дата начала периода</label>
                                            <div
                                                className={`right-panel-arbitrary-date-trigger ${openArbitraryDatePicker === 'start' ? 'open' : ''}`}
                                                onClick={() => setOpenArbitraryDatePicker(prev => prev === 'start' ? null : 'start')}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenArbitraryDatePicker(prev => prev === 'start' ? null : 'start'); } }}
                                            >
                                                <button type="button" className="right-panel-arbitrary-date-chevron" onClick={(e) => { e.stopPropagation(); adjustArbitraryStartDay(-1); }} aria-label="Предыдущий день">&lt;</button>
                                                <span className="right-panel-arbitrary-date-text">{startDate ? formatDateDisplay(startDate) : formatMonthYear(startMonth)}</span>
                                                <span className="right-panel-arbitrary-date-calendar-icon" aria-hidden>📅</span>
                                                <button type="button" className="right-panel-arbitrary-date-chevron" onClick={(e) => { e.stopPropagation(); adjustArbitraryStartDay(1); }} disabled={!!(startDate && new Date(startDate).toDateString() === todayStart().toDateString())} aria-label="Следующий день">&gt;</button>
                                            </div>
                                            {openArbitraryDatePicker === 'start' && (
                                                <div className="right-panel-arbitrary-date-dropdown" onClick={(e) => e.stopPropagation()}>
                                                    <div className="right-panel-date-picker">
                                                        <div className="right-panel-month-navigation">
                                                            <button type="button" className="right-panel-month-nav-btn" onClick={() => navigateMonth(true, -1)}>&lt;</button>
                                                            <span className="right-panel-month-year">{formatMonthYear(startMonth)}</span>
                                                            <button type="button" className="right-panel-month-nav-btn" onClick={() => navigateMonth(true, 1)} disabled={!canNavigateNext(startMonth)}>&gt;</button>
                                                        </div>
                                                        <div className="right-panel-calendar-grid">
                                                            <div className="right-panel-calendar-weekdays">
                                                                {weekDays.map(day => (<div key={day} className="right-panel-calendar-weekday">{day}</div>))}
                                                            </div>
                                                            <div className="right-panel-calendar-days">
                                                                {getDaysInMonth(startMonth).map((day, idx) => {
                                                                    const dayDate = day ? new Date(startMonth.getFullYear(), startMonth.getMonth(), day) : null
                                                                    const isSelected = startDate && dayDate && startDate.getDate() === dayDate.getDate() && startDate.getMonth() === dayDate.getMonth() && startDate.getFullYear() === dayDate.getFullYear()
                                                                    const isFuture = dayDate && isFutureDate(dayDate)
                                                                    const isInRange = dayDate && startDate && endDate && isDateInRange(dayDate, startDate, endDate)
                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            type="button"
                                                                            className={`right-panel-calendar-day ${isSelected ? 'selected' : ''} ${!day ? 'empty' : ''} ${isInRange ? 'in-range' : ''}`}
                                                                            onClick={() => {
                                                                                if (day && !isFuture) {
                                                                                    if (isSelected) setStartDate(null)
                                                                                    else applyArbitraryStartDate(new Date(startMonth.getFullYear(), startMonth.getMonth(), day))
                                                                                    setOpenArbitraryDatePicker(null)
                                                                                }
                                                                            }}
                                                                            disabled={!day || isFuture}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="right-panel-date-picker-group right-panel-arbitrary-date-trigger-group">
                                            <label className="right-panel-date-picker-label">Дата окончания периода</label>
                                            <div
                                                className={`right-panel-arbitrary-date-trigger ${openArbitraryDatePicker === 'end' ? 'open' : ''}`}
                                                onClick={() => setOpenArbitraryDatePicker(prev => prev === 'end' ? null : 'end')}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenArbitraryDatePicker(prev => prev === 'end' ? null : 'end'); } }}
                                            >
                                                <button type="button" className="right-panel-arbitrary-date-chevron" onClick={(e) => { e.stopPropagation(); adjustArbitraryEndDay(-1); }} disabled={!!(endDate && startDate && normalizeDay(endDate).getTime() <= getMinEndDate(startDate).getTime())} aria-label="Предыдущий день">&lt;</button>
                                                <span className="right-panel-arbitrary-date-text">{endDate ? formatDateDisplay(endDate) : formatMonthYear(endMonth)}</span>
                                                <span className="right-panel-arbitrary-date-calendar-icon" aria-hidden>📅</span>
                                                <button type="button" className="right-panel-arbitrary-date-chevron" onClick={(e) => { e.stopPropagation(); adjustArbitraryEndDay(1); }} disabled={!!(endDate && new Date(endDate).toDateString() === todayStart().toDateString())} aria-label="Следующий день">&gt;</button>
                                            </div>
                                            {openArbitraryDatePicker === 'end' && (
                                                <div className="right-panel-arbitrary-date-dropdown" onClick={(e) => e.stopPropagation()}>
                                                    <div className="right-panel-date-picker">
                                                        <div className="right-panel-month-navigation">
                                                            <button type="button" className="right-panel-month-nav-btn" onClick={() => navigateMonth(false, -1)}>&lt;</button>
                                                            <span className="right-panel-month-year">{formatMonthYear(endMonth)}</span>
                                                            <button type="button" className="right-panel-month-nav-btn" onClick={() => navigateMonth(false, 1)} disabled={!canNavigateNext(endMonth)}>&gt;</button>
                                                        </div>
                                                        <div className="right-panel-calendar-grid">
                                                            <div className="right-panel-calendar-weekdays">
                                                                {weekDays.map(day => (<div key={day} className="right-panel-calendar-weekday">{day}</div>))}
                                                            </div>
                                                            <div className="right-panel-calendar-days">
                                                                {getDaysInMonth(endMonth).map((day, idx) => {
                                                                    const dayDate = day ? new Date(endMonth.getFullYear(), endMonth.getMonth(), day) : null
                                                                    const isSelected = endDate && dayDate && endDate.getDate() === dayDate.getDate() && endDate.getMonth() === dayDate.getMonth() && endDate.getFullYear() === dayDate.getFullYear()
                                                                    const isFuture = dayDate && isFutureDate(dayDate)
                                                                    const minEndDate = startDate ? getMinEndDate(startDate) : null
                                                                    const isBeforeMinEnd = dayDate && minEndDate && normalizeDay(dayDate) < minEndDate
                                                                    const isInRange = dayDate && startDate && endDate && isDateInRange(dayDate, startDate, endDate)
                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            type="button"
                                                                            className={`right-panel-calendar-day ${isSelected ? 'selected' : ''} ${!day ? 'empty' : ''} ${isInRange ? 'in-range' : ''}`}
                                                                            onClick={() => {
                                                                                if (day && !isFuture && !isBeforeMinEnd) {
                                                                                    if (isSelected) setEndDate(null)
                                                                                    else applyArbitraryEndDate(new Date(endMonth.getFullYear(), endMonth.getMonth(), day))
                                                                                    setOpenArbitraryDatePicker(null)
                                                                                }
                                                                            }}
                                                                            disabled={!day || isFuture || isBeforeMinEnd}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Под периодом: настройки автоматического отчёта (чекбокс, затем почта, затем детали) */}
                            {(isCreatingTemplate || currentTemplateId) ? (
                                <>
                                    <label className={`right-panel-auto-report-checkbox-simple ${periodType === 'Произвольный период' ? 'right-panel-auto-report-checkbox-disabled' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={autoReportEnabled}
                                            disabled={periodType === 'Произвольный период'}
                                            onChange={(e) => {
                                                setAutoReportEnabled(e.target.checked)
                                                if (e.target.checked) {
                                                    setTemplateActive(true)
                                                }
                                            }}
                                        />
                                        <span>Автоматическое формирование отчёта</span>
                                        {autoReportEnabled && <span className="auto-badge">АВТО</span>}
                                    </label>

                                    <div className="right-panel-email-tile">
                                        <span className="right-panel-email-label">Эл. почта для отправки отчёта*</span>
                                        <input
                                            type="email"
                                            className="right-panel-email-input"
                                            placeholder="email@example.com"
                                            value={templateEmail}
                                            onChange={(e) => setTemplateEmail(e.target.value)}
                                        />
                                    </div>

                                    {autoReportEnabled && (
                                        <div className="right-panel-auto-report-section">
                                            <h3 className="right-panel-auto-report-title">Когда сформировать отчёт?</h3>
                                            <div className="right-panel-auto-report-time-monthdays-row">
                                                <div className="right-panel-auto-report-time">
                                                    <label className="right-panel-auto-report-time-label">К какому времени?*</label>
                                                    <input
                                                        type="time"
                                                        className="right-panel-auto-report-time-input"
                                                        value={autoReportTime}
                                                        onChange={(e) => setAutoReportTime(e.target.value)}
                                                    />
                                                </div>
                                                {periodType !== 'За 7 дней' && (
                                                    <div className="right-panel-auto-report-monthdays">
                                                        <label className="right-panel-auto-report-monthdays-label">По каким числам месяца?</label>
                                                        <div className="right-panel-date-picker right-panel-auto-report-monthdays-calendar">
                                                            <div className="right-panel-calendar-grid">
                                                                <div className="right-panel-calendar-weekdays">
                                                                    {weekDays.map(day => (
                                                                        <div key={day} className="right-panel-calendar-weekday">{day}</div>
                                                                    ))}
                                                                </div>
                                                                <div className="right-panel-calendar-days">
                                                                    {monthDays.map(day => (
                                                                        <button
                                                                            key={day}
                                                                            type="button"
                                                                            className={`right-panel-calendar-day ${autoReportMonthDays.includes(day) ? 'selected' : ''}`}
                                                                            onClick={(e) => toggleAutoReportMonthDay(day, e)}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {periodType !== 'Месячный отчёт' && (
                                                <div className="right-panel-auto-report-weekdays">
                                                    <label className="right-panel-auto-report-weekdays-label">По каким дням недели?*</label>
                                                    <div className="right-panel-auto-report-weekdays-buttons">
                                                        {weekDays.map(day => (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                className={`right-panel-auto-report-weekday-btn ${autoReportWeekDays.includes(day) ? 'selected' : ''}`}
                                                                onClick={() => toggleAutoReportWeekDay(day)}
                                                            >
                                                                {day}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="right-panel-email-tile">
                                    <span className="right-panel-email-label">Продублировать отчёт на эл. почту:</span>
                                    <input
                                        type="email"
                                        className="right-panel-email-input"
                                        placeholder="email@example.com"
                                        value={emailAddress}
                                        onChange={(e) => setEmailAddress(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Внизу три кнопки на одной линии: Сформировать, Сохранить, Удалить */}
                            {(isCreatingTemplate || currentTemplateId) && (
                                <div className="right-panel-bottom-actions">
                                    {generateError && (
                                        <div className="right-panel-generate-error" role="alert">
                                            {generateError}
                                        </div>
                                    )}
                                    <button
                                        className={`right-panel-generate-btn${isGenerating ? ' right-panel-generate-btn-generating' : ''}`}
                                        type="button"
                                        onClick={handleGenerateNow}
                                        disabled={isGenerating || isFormDirty()}
                                    >
                                        {isGenerating ? 'Формируется' : 'Сформировать'}
                                    </button>
                                    <button
                                        className={`right-panel-save-template-btn${isFormDirty() ? ' right-panel-save-template-btn-unsaved' : ''}${saveButtonBlink ? ' right-panel-save-template-btn-blink' : ''}`}
                                        type="button"
                                        onClick={handleSaveTemplate}
                                    >
                                        Сохранить
                                    </button>
                                    <button
                                        className="right-panel-delete-template-btn"
                                        type="button"
                                        onClick={() => currentTemplateId && setShowDeleteConfirm(true)}
                                        disabled={!currentTemplateId}
                                    >
                                        <span className="delete-icon">×</span>
                                        <span>Удалить</span>
                                    </button>
                                    {isFormDirty() && (
                                        <div className="right-panel-save-before-generate-hint">
                                            Сохраните изменения перед формированием отчета
                                        </div>
                                    )}
                                    {isGenerating && (
                                        <div className="right-panel-generate-progress" role="status" aria-live="polite">
                                            <div className="right-panel-generate-progress-bar-track">
                                                <div
                                                    className={`right-panel-generate-progress-bar-fill${progressBarInstant ? ' right-panel-generate-progress-bar-fill-instant' : ''}`}
                                                    style={{ width: `${Math.min(100, Math.max(0, generateProgressPercent))}%` }}
                                                />
                                            </div>
                                            <div className="right-panel-generate-progress-meta">
                                                <span className="right-panel-generate-progress-percent">
                                                    {generateProgressPercent}%
                                                </span>
                                                {generateProgressMessage && (
                                                    <span className="right-panel-generate-progress-message">
                                                        {generateProgressMessage}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальное окно: несохранённые изменения при смене действия */}
            {showUnsavedConfirm && (
                <div className="modal-overlay modal-overlay-no-close-on-backdrop">
                    <div className="resave-confirm-modal">
                        {/* Крестик = отмена: закрыть модалку, остаться в текущем отчёте, изменения остаются (не сохраняем и не выполняем отложенное действие) */}
                        <button
                            type="button"
                            className="resave-confirm-close-btn"
                            onClick={() => {
                                pendingActionRef.current = null
                                reportsUnsaved?.setPendingLeavePath(null)
                                setShowUnsavedConfirm(false)
                            }}
                            aria-label="Отмена"
                        >
                            ×
                        </button>
                        <div className="resave-confirm-icon">⚠</div>
                        <div className="resave-confirm-question">Вы внесли изменения в отчет. Сохранить их?</div>
                        <div className="resave-confirm-buttons">
                            <button
                                className="resave-confirm-btn resave-confirm-btn-no"
                                onClick={() => { setShowUnsavedConfirm(false); executePendingAction(); }}
                            >
                                <span className="resave-confirm-icon-x">×</span>
                                <span>Нет</span>
                            </button>
                            <button
                                className="resave-confirm-btn resave-confirm-btn-yes"
                                onClick={() => {
                                    confirmSaveTemplate()
                                        .then(() => { setShowUnsavedConfirm(false); executePendingAction(); })
                                        .catch(() => {})
                                }}
                            >
                                <span className="resave-confirm-icon-check">✓</span>
                                <span>Да</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно подтверждения удаления шаблона */}
            {showDeleteConfirm && (
                <div className="modal-overlay modal-overlay-no-close-on-backdrop">
                    <div className="resave-confirm-modal delete-confirm-modal">
                        <button
                            type="button"
                            className="resave-confirm-close-btn"
                            onClick={() => setShowDeleteConfirm(false)}
                            aria-label="Закрыть"
                        >
                            ×
                        </button>
                        <div className="resave-confirm-icon">⚠</div>
                        <div className="resave-confirm-question">Удалить отчёт?</div>
                        <div className="resave-confirm-buttons">
                            <button
                                className="resave-confirm-btn resave-confirm-btn-no"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                <span className="resave-confirm-icon-x">×</span>
                                <span>Нет</span>
                            </button>
                            <button
                                className="resave-confirm-btn resave-confirm-btn-yes"
                                onClick={() => {
                                    if (currentTemplateId) {
                                        handleDeleteTemplate(currentTemplateId, true)
                                        setShowDeleteConfirm(false)
                                    }
                                }}
                            >
                                <span className="resave-confirm-icon-check">✓</span>
                                <span>Да</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReportsPage