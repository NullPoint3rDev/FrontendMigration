import React, { useState, useEffect } from 'react'
import { FaChevronRight, FaChevronDown } from 'react-icons/fa'
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
        'По работе сварщиков',
        'По расходу проволоки',
        'По работе оборудования'
    ]) // По умолчанию все типы выбраны
    const [templateTypeDropdownOpen, setTemplateTypeDropdownOpen] = useState(false)
    const [reportTypeDropdownOpen, setReportTypeDropdownOpen] = useState(false)
    const [selectedReportType, setSelectedReportType] = useState('')
    const [reportTypeDropdownHighlight, setReportTypeDropdownHighlight] = useState(false)
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
    const [welderSearchTerm, setWelderSearchTerm] = useState('')

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
                return (a.name || '').localeCompare(b.name || '')
            }).map(unit => {
                if (unit.children.length > 0) {
                    unit.children = sortHierarchy(unit.children)
                    // Отладочное логирование для проверки иерархии
                    console.debug(`Подразделение "${unit.name}" (ID: ${unit.id}) имеет ${unit.children.length} дочерних:`, unit.children.map(c => `${c.name} (ID: ${c.id})`).join(', '))
                }
                // Сортируем сварщиков внутри подразделения
                unit.welders.sort((a, b) => {
                    return (a.name || '').localeCompare(b.name || '')
                })
                return unit
            })
        }

        const sortedRootUnits = sortHierarchy(rootUnits)
        console.debug('Итоговая иерархия корневых подразделений:', sortedRootUnits.map(u => `${u.name} (ID: ${u.id}, children: ${u.children.length})`).join(', '))
        return sortedRootUnits
    }

    const organizationHierarchy = buildOrganizationHierarchy()

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

    // При создании нового шаблона настройки (чекбоксы, даты) недоступны, пока не выбран тип шаблона
    const configDisabled = isCreatingTemplate && !selectedReportType

    const handleConfigAreaClick = () => {
        if (configDisabled) {
            setReportTypeDropdownHighlight(true)
            setReportTypeDropdownOpen(true)
        }
    }

    // Типы шаблонов для фильтра
    const templateTypes = [
        'Все',
        'По работе оборудования',
        'По работе сварщиков',
        'По расходу проволоки',
    ]

    // Типы отчетов для выбора
    const reportTypes = [
        'По расходу проволоки',
        'По работе сварщика',
        'По работе оборудования'
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
        setReportTypeDropdownHighlight(false)
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
            energyConsumed: false
        })
        setSelectedOrganizationUnits({})
        setSelectedWelders({})
        setSelectedEquipmentModels({})
        setEmailDuplicate(false)
        setEmailAddress('')
        setTimeRange({ start: '08:00', end: '17:00' })
        setTimeRangeEnabled(false)
        setStartDate(null)
        setEndDate(null)
        setSelectedDays([])
        setSelectedPeriod('day')
        setWelderSearchTerm('')
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
            // ВАЖНО: backend ReportTemplateDTO не имеет отдельного поля reportType,
            // поэтому сохраняем тип отчёта внутри reportParameters (как часть JSON).
            const reportParams = { ...parameters, reportType: selectedReportType || null }
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
        // reportType хранится внутри reportParameters (см. confirmSaveTemplate)
        const loadedReportType =
            template?.reportParameters?.reportType ||
            template?.reportType || // на случай старых/локальных объектов
            ''
        setSelectedReportType(loadedReportType)

        // Загружаем параметры отчета
        if (template.reportParameters) {
            setParameters(prev => {
                // Не мержим служебное поле reportType в параметры колонок
                // (оно нужно только для отображения выбора типа отчёта).
                // eslint-disable-next-line no-unused-vars
                const { reportType, ...restParams } = template.reportParameters || {}
                const updated = { ...prev, ...restParams }
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

        // Проверяем, выбран ли тип отчета
        if (!selectedReportType) {
            alert('Выберите тип шаблона отчета')
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

            // Вызываем соответствующий API в зависимости от типа отчета
            if (selectedReportType === 'По расходу проволоки') {
                await reportApi.generateWireConsumptionReport(
                    currentTemplateId,
                    formatDate(periodStartDate),
                    formatDate(periodEndDate),
                    periodStartTime,
                    periodEndTime
                )
            } else if (selectedReportType === 'По работе сварщика') {
                await reportApi.generateWelderWorkReport(
                    currentTemplateId,
                    formatDate(periodStartDate),
                    formatDate(periodEndDate),
                    periodStartTime,
                    periodEndTime
                )
            } else if (selectedReportType === 'По работе оборудования') {
                // TODO: Реализовать когда будет готово
                alert('Отчет по работе оборудования пока не реализован')
            } else {
                alert('Неизвестный тип отчета: ' + selectedReportType)
            }
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
                                <span className={`template-type-dropdown-title ${selectedTemplateTypes.length > 0 && !selectedTemplateTypes.includes('Все') ? 'template-type-dropdown-title--partial' : ''}`}>Тип шаблона</span>
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
                    <div className={`report-type-dropdown-container ${reportTypeDropdownOpen ? 'open' : ''}`}>
                        <div
                            className={`report-type-dropdown-header ${reportTypeDropdownHighlight ? 'report-type-dropdown-header--highlight' : ''}`}
                            onClick={() => {
                                setReportTypeDropdownOpen(!reportTypeDropdownOpen)
                                setReportTypeDropdownHighlight(false)
                            }}
                        >
                            <span className={`report-type-dropdown-title ${!selectedReportType ? 'placeholder' : ''}`}>
                                {selectedReportType || 'Выберите тип шаблона*'}
                            </span>
                            <button
                                className="org-unit-expand-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
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
                        {reportTypeDropdownOpen && (
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
                                aria-label="Сначала выберите тип шаблона"
                            />
                        )}
                        <div className={`middle-panel-content-inner ${configDisabled ? 'report-config-content-disabled' : ''}`}>
                            {/* Left sub-panel - Welders selection */}
                            <div className="middle-subpanel middle-subpanel-left">
                                <div className="parameters-list">
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
                                </div>
                            </div>

                            {/* Right sub-panel - Report columns selection */}
                            <div className="middle-subpanel middle-subpanel-right">
                                <div className="parameters-list">
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
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Report Period/Delivery */}
                <div className="reports-panel reports-panel-right">
                    <div className="panel-body right-panel-body" style={{ position: 'relative' }}>
                        {configDisabled && (
                            <div
                                className="report-config-disabled-overlay"
                                onClick={handleConfigAreaClick}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleConfigAreaClick(); } }}
                                role="button"
                                tabIndex={0}
                                aria-label="Сначала выберите тип шаблона"
                            />
                        )}
                        <div className={`right-panel-content ${configDisabled ? 'report-config-content-disabled' : ''}`}>
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