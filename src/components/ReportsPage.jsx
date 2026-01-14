import React, { useState, useEffect } from 'react'
import './ReportsPage.css'
import { getAllWelders } from '../api/welderApi'
import { getAllWeldingMachines } from '../api/weldingMachineApi'
import { getAllOrganizationUnits } from '../api/organizationUnitApi'
import {
    getAllReportTemplates,
    getMyReportTemplates,
    saveReportTemplate,
    deleteReportTemplate
} from '../api/reportTemplateApi'
import { reportApi } from '../api/reportApi'

const ReportsPage = () => {
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
    const [timeRange, setTimeRange] = useState({ start: '08:00', end: '17:00' })
    const [timeRangeEnabled, setTimeRangeEnabled] = useState(false)

    // Новые состояния для фильтров и типов отчетов
    const [templateSearchQuery, setTemplateSearchQuery] = useState('')
    const [selectedTemplateTypes, setSelectedTemplateTypes] = useState([
        'Все',
        'По работе оборудования',
        'По работе сварщиков',
        'По расходу материала',
        'По сварочным швам',
        'По ошибкам оборудования',
        'По швам с нарушениями',
        'По выполнению свар. задания'
    ]) // По умолчанию все типы выбраны
    const [templateTypeDropdownOpen, setTemplateTypeDropdownOpen] = useState(false)
    const [selectedReportType, setSelectedReportType] = useState('')
    const [autoReportEnabled, setAutoReportEnabled] = useState(false)
    const [periodType, setPeriodType] = useState('Произвольный период')
    const [workingDaysEnabled, setWorkingDaysEnabled] = useState(false)
    const [selectedWorkingDays, setSelectedWorkingDays] = useState([])
    const [showResaveConfirm, setShowResaveConfirm] = useState(false)

    // Report parameters state - динамические параметры для подразделений
    // Параметры welder, tableNumber, department, timeOnline, arcBurningTime, wire, consumption всегда обязательны
    const [parameters, setParameters] = useState({
        welder: true, // Обязательный
        all: false, // По умолчанию "Все" не выбрано
        wire: true, // Обязательный
        consumption: true, // Обязательный
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
        energyConsumed: false
    })

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

    // Build organization hierarchy with welders
    const buildOrganizationHierarchy = () => {
        const hierarchy = {}

        // Сначала создаем структуру подразделений
        organizationUnits.forEach(unit => {
            const unitId = unit.id
            const unitName = unit.name || unit.id
            hierarchy[unitId] = {
                id: unitId,
                name: unitName,
                parentId: unit.parentId || unit.parent_id,
                welders: []
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

        // Сортируем подразделения по имени
        const sortedUnits = Object.values(hierarchy).sort((a, b) => {
            return (a.name || '').localeCompare(b.name || '')
        })

        return sortedUnits
    }

    const organizationHierarchy = buildOrganizationHierarchy()

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
        // Запрещаем изменение обязательных параметров
        const requiredParams = ['welder', 'tableNumber', 'department', 'timeOnline', 'arcBurningTime', 'wire', 'consumption']
        if (requiredParams.includes(key)) {
            return // Не позволяем изменять обязательные параметры
        }

        setParameters(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    // Обработчик для чекбокса "Все" - автоматически выбирает/снимает выбор со всех подразделений и сварщиков
    const handleToggleAll = () => {
        const newAllValue = !parameters.all

        // Обновляем параметр "all"
        setParameters(prev => ({
            ...prev,
            all: newAllValue
        }))

        // Если выбираем "Все", то выбираем все подразделения и всех сварщиков
        if (newAllValue) {
            const allOrgUnits = {}
            const allWeldersSelected = {}

            // Выбираем все подразделения
            organizationHierarchy.forEach(unit => {
                allOrgUnits[unit.id] = true
                // Выбираем всех сварщиков в каждом подразделении
                unit.welders.forEach(welder => {
                    allWeldersSelected[welder.id] = true
                })
            })

            setSelectedOrganizationUnits(allOrgUnits)
            setSelectedWelders(allWeldersSelected)
        } else {
            // Если снимаем выбор "Все", то снимаем выбор со всех подразделений и сварщиков
            setSelectedOrganizationUnits({})
            setSelectedWelders({})
        }
    }

    const toggleEquipmentModel = (model) => {
        setSelectedEquipmentModels(prev => ({
            ...prev,
            [model]: !prev[model]
        }))
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
            const newValue = !prev[welderId]
            const updated = {
                ...prev,
                [welderId]: newValue
            }

            // Если снимаем выбор со сварщика и "Все" было выбрано, снимаем "Все"
            if (!newValue && parameters.all) {
                setParameters(prevParams => ({
                    ...prevParams,
                    all: false
                }))
            }

            return updated
        })
    }

    const toggleOrganizationUnit = (unitId) => {
        setSelectedOrganizationUnits(prev => {
            const newValue = !prev[unitId]
            const updated = {
                ...prev,
                [unitId]: newValue
            }

            // Если снимаем выбор с подразделения и "Все" было выбрано, снимаем "Все"
            if (!newValue && parameters.all) {
                setParameters(prevParams => ({
                    ...prevParams,
                    all: false
                }))
            }

            return updated
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

    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const monthDays = Array.from({ length: 31 }, (_, i) => i + 1)

    // Типы шаблонов для фильтра
    const templateTypes = [
        'Все',
        'По работе оборудования',
        'По работе сварщиков',
        'По расходу материала',
        'По сварочным швам',
        'По ошибкам оборудования',
        'По швам с нарушениями',
        'По выполнению свар. задания'
    ]

    // Типы отчетов для выбора
    const reportTypes = [
        'По работе оборудования',
        'По работе сварщиков',
        'По расходу материала',
        'По сварочным швам',
        'По ошибкам оборудования',
        'По швам с нарушениями',
        'По выполнению свар. задания'
    ]

    // Типы периода
    const periodTypes = [
        'Произвольный период',
        'За 24 часа',
        'За 7 дней'
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

    const handleNewTemplate = () => {
        setIsCreatingTemplate(true)
        setCurrentTemplateId(null)
        setTemplateName('')
        setTemplateEmail('')
        setTemplateActive(false)
        setAutoReportEnabled(false)
        setPeriodType('Произвольный период')
        setWorkingDaysEnabled(false)
        setSelectedWorkingDays([])
        setSelectedReportType('')
        setSelectedTemplateTypes([
            'Все',
            'По работе оборудования',
            'По работе сварщиков',
            'По расходу материала',
            'По сварочным швам',
            'По ошибкам оборудования',
            'По швам с нарушениями',
            'По выполнению свар. задания'
        ])
        // Reset all parameters to defaults
    }

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            alert('Введите название шаблона')
            return
        }

        // Если редактируем существующий шаблон, показываем модальное окно подтверждения
        if (currentTemplateId) {
            setShowResaveConfirm(true)
            return
        }

        // Если создаем новый шаблон, сохраняем сразу
        await confirmSaveTemplate()
    }

    const confirmSaveTemplate = async () => {
        setShowResaveConfirm(false)

        try {
            // Подготовка данных для сохранения
            // Гарантируем, что обязательные параметры всегда true
            const reportParams = { ...parameters }
            reportParams.welder = true
            reportParams.tableNumber = true
            reportParams.department = true
            reportParams.timeOnline = true
            reportParams.arcBurningTime = true
            reportParams.wire = true
            reportParams.consumption = true

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
                    selectedWorkingDays: [...selectedWorkingDays]
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
        } catch (error) {
            console.error('Ошибка сохранения шаблона:', error)
            alert('Ошибка сохранения шаблона: ' + (error.message || 'Неизвестная ошибка'))
        }
    }

    const handleLoadTemplate = (template) => {
        setCurrentTemplateId(template.id)
        setTemplateName(template.name || '')
        setTemplateEmail(template.email || '')

        // Загружаем параметры отчета
        if (template.reportParameters) {
            setParameters(prev => {
                const updated = { ...prev, ...template.reportParameters }
                // Гарантируем, что обязательные параметры всегда true
                updated.welder = true
                updated.tableNumber = true
                updated.department = true
                updated.timeOnline = true
                updated.arcBurningTime = true
                updated.wire = true
                updated.consumption = true
                return updated
            })
        }

        // Загружаем настройки периода
        if (template.periodSettings) {
            setSelectedPeriod(template.periodSettings.selectedPeriod || 'day')
            setSelectedDays(template.periodSettings.selectedDays || [])
            setPeriodType(template.periodSettings.periodType || 'Произвольный период')
            setWorkingDaysEnabled(template.periodSettings.workingDaysEnabled || false)
            setSelectedWorkingDays(template.periodSettings.selectedWorkingDays || [])
            if (template.periodSettings.startDate) {
                const startDateObj = new Date(template.periodSettings.startDate)
                setStartDate(startDateObj)
                // Устанавливаем месяц календаря на месяц выбранной даты начала
                setStartMonth(new Date(startDateObj.getFullYear(), startDateObj.getMonth()))
            }
            if (template.periodSettings.endDate) {
                const endDateObj = new Date(template.periodSettings.endDate)
                setEndDate(endDateObj)
                // Устанавливаем месяц календаря на месяц выбранной даты окончания
                setEndMonth(new Date(endDateObj.getFullYear(), endDateObj.getMonth()))
            }
            setTimeRange(template.periodSettings.timeRange || { start: '08:00', end: '17:00' })
            setTimeRangeEnabled(template.periodSettings.timeRangeEnabled || false)
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

        // Загружаем выбранные подразделения и сварщиков
        if (template.selectedOrganizationUnitIds) {
            const orgUnits = {}
            template.selectedOrganizationUnitIds.forEach(id => {
                orgUnits[id] = true
            })
            setSelectedOrganizationUnits(orgUnits)
        }

        if (template.selectedWelderIds) {
            const welders = {}
            template.selectedWelderIds.forEach(id => {
                welders[id] = true
            })
            setSelectedWelders(welders)
        }

        // Загружаем выбранные модели оборудования
        if (template.selectedEquipmentModels) {
            const models = {}
            template.selectedEquipmentModels.forEach(key => {
                models[key] = true
            })
            setSelectedEquipmentModels(prev => ({ ...prev, ...models }))
        }

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
    }

    const handleDeleteTemplate = async (templateId) => {
        if (!window.confirm('Удалить текущий шаблон?')) {
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

    const handleGenerateNow = async () => {
        // Проверяем, выбран ли шаблон
        if (!currentTemplateId) {
            alert('Выберите шаблон отчета или создайте новый')
            return
        }

        try {
            // Получаем даты периода
            let periodStartDate = startDate
            let periodEndDate = endDate

            // Если даты не выбраны, используем текущую дату
            if (!periodStartDate) {
                periodStartDate = new Date()
            }
            if (!periodEndDate) {
                periodEndDate = new Date()
            }

            // Форматируем даты для API (YYYY-MM-DD)
            const formatDate = (date) => {
                if (!date) return null
                const d = new Date(date)
                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                return `${year}-${month}-${day}`
            }

            // Получаем время из timeRange или используем значения по умолчанию
            let periodStartTime = timeRangeEnabled ? timeRange.start : null
            let periodEndTime = timeRangeEnabled ? timeRange.end : null

            // Вызываем API для генерации отчета
            await reportApi.generateReportFromTemplate(
                currentTemplateId,
                formatDate(periodStartDate),
                formatDate(periodEndDate),
                periodStartTime,
                periodEndTime
            )
        } catch (error) {
            console.error('Ошибка генерации отчета:', error)
            alert('Ошибка генерации отчета: ' + (error.message || 'Неизвестная ошибка'))
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

                        {/* Выпадающий список "Тип шаблона" */}
                        <div className={`template-type-dropdown-container ${templateTypeDropdownOpen ? 'open' : ''}`}>
                            <div
                                className="template-type-dropdown-header"
                                onClick={() => setTemplateTypeDropdownOpen(!templateTypeDropdownOpen)}
                            >
                                <span className="template-type-dropdown-title">Тип шаблона</span>
                                <span className={`template-type-dropdown-arrow ${templateTypeDropdownOpen ? 'open' : ''}`}>▾</span>
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

                        {templates.length > 0 && (
                            <div className="templates-list">
                                {templates
                                    .filter(template => {
                                        // Фильтр по поисковому запросу
                                        if (templateSearchQuery && !template.name.toLowerCase().includes(templateSearchQuery.toLowerCase())) {
                                            return false
                                        }
                                        // Фильтр по типу шаблона
                                        if (selectedTemplateTypes.length === 0 || selectedTemplateTypes.includes('Все')) {
                                            return true
                                        }
                                        // Здесь можно добавить логику фильтрации по типу, если в шаблоне есть поле типа
                                        return true
                                    })
                                    .map((template, index) => {
                                        // Проверяем, есть ли у шаблона автоматическое формирование
                                        // АВТО показывается только если:
                                        // 1. isActive === true (шаблон активен)
                                        // 2. есть autoReportSettings и они не пустые
                                        // 3. есть хотя бы одно значимое поле (время + дни недели/месяца)
                                        let hasAutoReport = false

                                        // Сначала проверяем isActive - если шаблон не активен, бейдж не показываем
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
                                                    <div className="template-schedule">{formatTemplateSchedule(template)}</div>
                                                </div>
                                                {hasAutoReport && (
                                                    <div className="template-auto-badge">АВТО</div>
                                                )}
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                        <button
                            className="new-template-btn"
                            type="button"
                            onClick={handleNewTemplate}
                        >
                            <span className="new-template-icon">+</span>
                            <span>Новый шаблон</span>
                        </button>
                    </div>
                </div>

                {/* Middle Panel - Report Parameters */}
                <div className="reports-panel reports-panel-middle">
                    <div className="panel-header">
                        <span className="template-report-label">Шаблон отчёта:</span>
                        <button
                            className={`generate-now-btn ${(isCreatingTemplate || currentTemplateId) ? 'active' : ''}`}
                            type="button"
                            onClick={handleGenerateNow}
                        >
                            <span>Сформировать сейчас</span>
                        </button>
                    </div>

                    {/* Выпадающий список "Выберите тип отчета" */}
                    <div className="report-type-selector">
                        <div className="report-type-select-wrapper">
                            <select
                                className="report-type-select"
                                value={selectedReportType}
                                onChange={(e) => setSelectedReportType(e.target.value)}
                            >
                                <option value="">Выберите тип шаблона*</option>
                                {reportTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="panel-body middle-panel-content">
                        {/* Left sub-panel - Welders selection */}
                        <div className="middle-subpanel middle-subpanel-left">
                            <div className="parameters-list">
                                <div className="subpanel-title">Сварщик*</div>
                                <label className="parameter-item">
                                    <input
                                        type="checkbox"
                                        checked={parameters.all}
                                        onChange={handleToggleAll}
                                    />
                                    <span className="parameter-label">Все</span>
                                </label>

                                {loadingWelders ? (
                                    <div className="parameter-item" style={{ color: '#7B8BA6', fontSize: '12px', padding: '8px 12px' }}>
                                        Загрузка сварщиков...
                                    </div>
                                ) : organizationHierarchy.length > 0 ? (
                                    organizationHierarchy.map(unit => (
                                        <div key={unit.id} className="parameter-item-expandable">
                                            <label
                                                className="parameter-item"
                                                onClick={(e) => {
                                                    if (e.target.type !== 'checkbox') {
                                                        toggleOrganizationUnitExpanded(unit.id)
                                                    }
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrganizationUnits[unit.id] || false}
                                                    onChange={() => toggleOrganizationUnit(unit.id)}
                                                />
                                                <span className="parameter-label">{unit.name}</span>
                                                {unit.welders.length > 0 && (
                                                    <span className={`parameter-arrow ${expandedOrganizationUnits[unit.id] ? 'expanded' : ''}`}>▾</span>
                                                )}
                                            </label>
                                            {expandedOrganizationUnits[unit.id] && unit.welders.length > 0 && (
                                                <div className="parameter-expanded-content">
                                                    {unit.welders.map(welder => (
                                                        <label key={welder.id} className="parameter-sub-item">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedWelders[welder.id] || false}
                                                                onChange={() => toggleWelder(welder.id)}
                                                            />
                                                            <span>{welder.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="parameter-item" style={{ color: '#7B8BA6', fontSize: '12px', padding: '8px 12px' }}>
                                        Нет доступных подразделений
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right sub-panel - Report columns selection */}
                        <div className="middle-subpanel middle-subpanel-right">
                            <div className="parameters-list">
                                <div className="parameter-item-expandable">
                                    <label
                                        className="parameter-item"
                                        onClick={(e) => {
                                            if (e.target.type !== 'checkbox') {
                                                toggleExpanded('equipmentModel')
                                            }
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={parameters.equipmentModel}
                                            onChange={() => toggleParameter('equipmentModel')}
                                        />
                                        <span className="parameter-label">Модель оборудования</span>
                                        <span className={`parameter-arrow ${expandedEquipmentModel ? 'expanded' : ''}`}>▾</span>
                                    </label>
                                    {expandedEquipmentModel && (
                                        <div className="parameter-expanded-content">
                                            {loadingEquipment ? (
                                                <div className="parameter-sub-item" style={{ color: '#7B8BA6', fontSize: '11px' }}>
                                                    Загрузка...
                                                </div>
                                            ) : uniqueEquipmentModels.length > 0 ? (
                                                uniqueEquipmentModels.map(model => {
                                                    return (
                                                        <label key={model.id || model.key} className="parameter-sub-item">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedEquipmentModels[model.key] || false}
                                                                onChange={() => toggleEquipmentModel(model.key)}
                                                            />
                                                            <span>{model.name}</span>
                                                        </label>
                                                    )
                                                })
                                            ) : (
                                                <div className="parameter-sub-item" style={{ color: '#7B8BA6', fontSize: '11px' }}>
                                                    Нет доступных моделей
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

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
                                        <span className={`parameter-arrow ${expandedWorkOutsideSetCurrent ? 'expanded' : ''}`}>▾</span>
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
                                        <span className={`parameter-arrow ${expandedWorkOutsideActualCurrent ? 'expanded' : ''}`}>▾</span>
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
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Report Period/Delivery */}
                <div className="reports-panel reports-panel-right">
                    <div className="panel-body right-panel-body">
                        <div className="right-panel-content">
                            {(isCreatingTemplate || currentTemplateId) ? (
                                <>
                                    {/* Кнопка "Сохранить шаблон" и поле "Имя" на одной линии */}
                                    <div className="right-panel-save-name-row">
                                        <button
                                            className="right-panel-save-template-btn"
                                            type="button"
                                            onClick={handleSaveTemplate}
                                        >
                                            Сохранить шаблон
                                        </button>
                                        <div className="right-panel-template-name-tile">
                                            <span className="right-panel-template-name-label">Имя:*</span>
                                            <input
                                                type="text"
                                                className="right-panel-template-name-input"
                                                placeholder="Введите название"
                                                value={templateName}
                                                onChange={(e) => setTemplateName(e.target.value)}
                                            />
                                        </div>
                                    </div>

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

                                    {/* Чекбокс "Автоматическое формирование отчета" */}
                                    <label className="right-panel-auto-report-checkbox-simple">
                                        <input
                                            type="checkbox"
                                            checked={autoReportEnabled}
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

                                    {/* Поля автоматического формирования (показываются только если чекбокс активен) */}
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
                                            </div>

                                            <div className="right-panel-auto-report-weekdays">
                                                <label className="right-panel-auto-report-weekdays-label">По каким дням недели?</label>
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
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Форма когда шаблон не выбран */}
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
                                </>
                            )}

                            <div className="right-panel-period-section">
                                <div className="right-panel-period-header">
                                    <h3 className="right-panel-period-question">Период для формирования отчёта:</h3>
                                    <select
                                        className="period-type-select"
                                        value={periodType}
                                        onChange={(e) => setPeriodType(e.target.value)}
                                    >
                                        {periodTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="right-panel-time-range-row">
                                    <label className="right-panel-time-range-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={timeRangeEnabled}
                                            onChange={(e) => setTimeRangeEnabled(e.target.checked)}
                                        />
                                        <div className="right-panel-time-inputs">
                                            <input
                                                type="time"
                                                value={timeRange.start}
                                                onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
                                                disabled={!timeRangeEnabled}
                                            />
                                            <span>—</span>
                                            <input
                                                type="time"
                                                value={timeRange.end}
                                                onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
                                                disabled={!timeRangeEnabled}
                                            />
                                        </div>
                                    </label>
                                </div>

                                <div className="right-panel-working-days-row">
                                    <label className="right-panel-working-days-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={workingDaysEnabled}
                                            onChange={(e) => setWorkingDaysEnabled(e.target.checked)}
                                        />
                                        <span>по рабочим дням</span>
                                    </label>

                                    {workingDaysEnabled && (
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
                                    )}
                                </div>

                                {periodType === 'Произвольный период' && (
                                    <div className="right-panel-date-range-section">
                                        <div className="right-panel-date-picker-group">
                                            <label className="right-panel-date-picker-label">Дата начала периода</label>
                                            <div className="right-panel-date-picker">
                                                <div className="right-panel-month-navigation">
                                                    <button
                                                        type="button"
                                                        className="right-panel-month-nav-btn"
                                                        onClick={() => navigateMonth(true, -1)}
                                                    >
                                                        &lt;
                                                    </button>
                                                    <span className="right-panel-month-year">{formatMonthYear(startMonth)}</span>
                                                    <button
                                                        type="button"
                                                        className="right-panel-month-nav-btn"
                                                        onClick={() => navigateMonth(true, 1)}
                                                        disabled={!canNavigateNext(startMonth)}
                                                    >
                                                        &gt;
                                                    </button>
                                                </div>
                                                <div className="right-panel-calendar-grid">
                                                    <div className="right-panel-calendar-weekdays">
                                                        {weekDays.map(day => (
                                                            <div key={day} className="right-panel-calendar-weekday">{day}</div>
                                                        ))}
                                                    </div>
                                                    <div className="right-panel-calendar-days">
                                                        {getDaysInMonth(startMonth).map((day, idx) => {
                                                            const dayDate = day ? new Date(startMonth.getFullYear(), startMonth.getMonth(), day) : null
                                                            const isSelected = startDate && dayDate &&
                                                                startDate.getDate() === dayDate.getDate() &&
                                                                startDate.getMonth() === dayDate.getMonth() &&
                                                                startDate.getFullYear() === dayDate.getFullYear()
                                                            const isFuture = dayDate && isFutureDate(dayDate)
                                                            const isInRange = dayDate && startDate && endDate && isDateInRange(dayDate, startDate, endDate)
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    className={`right-panel-calendar-day ${isSelected ? 'selected' : ''} ${!day ? 'empty' : ''} ${isInRange ? 'in-range' : ''}`}
                                                                    onClick={() => {
                                                                        if (day && !isFuture) {
                                                                            // Если дата уже выбрана, снимаем выбор, иначе устанавливаем
                                                                            if (isSelected) {
                                                                                setStartDate(null)
                                                                            } else {
                                                                                setStartDate(new Date(startMonth.getFullYear(), startMonth.getMonth(), day))
                                                                            }
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

                                        <div className="right-panel-date-picker-group">
                                            <label className="right-panel-date-picker-label">Дата окончания периода</label>
                                            <div className="right-panel-date-picker">
                                                <div className="right-panel-month-navigation">
                                                    <button
                                                        type="button"
                                                        className="right-panel-month-nav-btn"
                                                        onClick={() => navigateMonth(false, -1)}
                                                    >
                                                        &lt;
                                                    </button>
                                                    <span className="right-panel-month-year">{formatMonthYear(endMonth)}</span>
                                                    <button
                                                        type="button"
                                                        className="right-panel-month-nav-btn"
                                                        onClick={() => navigateMonth(false, 1)}
                                                        disabled={!canNavigateNext(endMonth)}
                                                    >
                                                        &gt;
                                                    </button>
                                                </div>
                                                <div className="right-panel-calendar-grid">
                                                    <div className="right-panel-calendar-weekdays">
                                                        {weekDays.map(day => (
                                                            <div key={day} className="right-panel-calendar-weekday">{day}</div>
                                                        ))}
                                                    </div>
                                                    <div className="right-panel-calendar-days">
                                                        {getDaysInMonth(endMonth).map((day, idx) => {
                                                            const dayDate = day ? new Date(endMonth.getFullYear(), endMonth.getMonth(), day) : null
                                                            const isSelected = endDate && dayDate &&
                                                                endDate.getDate() === dayDate.getDate() &&
                                                                endDate.getMonth() === dayDate.getMonth() &&
                                                                endDate.getFullYear() === dayDate.getFullYear()
                                                            const isFuture = dayDate && isFutureDate(dayDate)
                                                            const isInRange = dayDate && startDate && endDate && isDateInRange(dayDate, startDate, endDate)
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    className={`right-panel-calendar-day ${isSelected ? 'selected' : ''} ${!day ? 'empty' : ''} ${isInRange ? 'in-range' : ''}`}
                                                                    onClick={() => {
                                                                        if (day && !isFuture) {
                                                                            // Если дата уже выбрана, снимаем выбор, иначе устанавливаем
                                                                            if (isSelected) {
                                                                                setEndDate(null)
                                                                            } else {
                                                                                setEndDate(new Date(endMonth.getFullYear(), endMonth.getMonth(), day))
                                                                            }
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
                                    </div>
                                )}
                            </div>


                            {(isCreatingTemplate || currentTemplateId) && currentTemplateId && (
                                <div className="right-panel-template-actions">
                                    <div className="right-panel-delete-template">
                                        <span className="right-panel-delete-template-label">Удалить текущий шаблон?</span>
                                        <button
                                            className="right-panel-delete-template-btn"
                                            type="button"
                                            onClick={() => handleDeleteTemplate(currentTemplateId)}
                                        >
                                            <span className="delete-icon">×</span>
                                            <span>Удалить</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальное окно подтверждения пересохранения */}
            {showResaveConfirm && (
                <div className="modal-overlay" onClick={() => setShowResaveConfirm(false)}>
                    <div className="resave-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="resave-confirm-icon">⚠</div>
                        <div className="resave-confirm-question">Пересохранить шаблон?</div>
                        <div className="resave-confirm-buttons">
                            <button
                                className="resave-confirm-btn resave-confirm-btn-no"
                                onClick={() => setShowResaveConfirm(false)}
                            >
                                <span className="resave-confirm-icon-x">×</span>
                                <span>Нет</span>
                            </button>
                            <button
                                className="resave-confirm-btn resave-confirm-btn-yes"
                                onClick={confirmSaveTemplate}
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