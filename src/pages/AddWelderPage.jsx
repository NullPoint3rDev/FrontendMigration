import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaBell, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { RiRfidFill } from 'react-icons/ri';
import { FaTrash } from 'react-icons/fa';
import UserProfile from '../components/UserProfile';
import AddRfidPassModal from '../components/AddRfidPassModal';
import AddMachineModal from '../components/AddMachineModal';
import { createWelder, getWelderById, updateWelder, uploadWelderPhoto, getWelderPhoto, getWelderPhotoUrl } from '../api/welderApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';
import { getCertificationsByWelderId } from '../api/certificationApi';
import machineImage from '../images/Untitled 3 копия.png';
import '../styles/addWelderPage.css';

function AddWelderPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const [formData, setFormData] = useState({
        lastName: '',
        firstName: '',
        middleName: '',
        employeeId: '',
        birthDate: '',
        phone: '',
        hireDate: '',
        position: '',
        organizationUnitId: ''
    });
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [organizationUnitHierarchy, setOrganizationUnitHierarchy] = useState([]);
    const [expandedUnits, setExpandedUnits] = useState({});
    const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
    const [errors, setErrors] = useState({});
    const [profileImage, setProfileImage] = useState(null);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [rfidPasses, setRfidPasses] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [relatedMachines, setRelatedMachines] = useState([]);
    const [currentWelderStatus, setCurrentWelderStatus] = useState('ACTIVE');
    const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
    const [deviceStatusesByMac, setDeviceStatusesByMac] = useState({});
    const [deviceStatesByMac, setDeviceStatesByMac] = useState({});

    useEffect(() => {
        const initialize = async () => {
            await loadOrganizationUnits();
            if (isEditMode && id) {
                // Загружаем данные сварщика после загрузки подразделений
                await loadWelderData(id);
            }
        };
        initialize();

        // Очистка blob URL при размонтировании компонента
        return () => {
            if (profileImage && profileImage.startsWith('blob:')) {
                URL.revokeObjectURL(profileImage);
            }
        };
    }, [id, isEditMode]);

    // Закрытие dropdown при клике вне его
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (unitDropdownOpen && !event.target.closest('.unit-select-container')) {
                setUnitDropdownOpen(false);
            }
        };

        if (unitDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [unitDropdownOpen]);

    // Перезагружаем аттестации при возврате на страницу (например, после добавления новой)
    useEffect(() => {
        const handleFocus = () => {
            if (id) {
                loadCertifications(id);
            } else {
                // Если это новый сварщик, проверяем localStorage
                const welderId = localStorage.getItem('currentWelderId');
                if (welderId) {
                    loadCertifications(parseInt(welderId));
                }
            }
        };
        window.addEventListener('focus', handleFocus);
        // Также загружаем при монтировании, если есть ID
        if (id) {
            loadCertifications(id);
        }
        return () => window.removeEventListener('focus', handleFocus);
    }, [id]);

    const loadOrganizationUnits = async () => {
        try {
            const units = await getAllOrganizationUnits();
            console.log('Загруженные подразделения:', units);
            setOrganizationUnits(Array.isArray(units) ? units : []);

            // Построение иерархии подразделений
            const hierarchy = buildOrganizationHierarchy(units);
            setOrganizationUnitHierarchy(hierarchy);
        } catch (error) {
            console.error('Ошибка загрузки подразделений:', error);
            setOrganizationUnits([]);
            setOrganizationUnitHierarchy([]);
        }
    };

    // Построение иерархии подразделений
    const buildOrganizationHierarchy = (units) => {
        if (!units || units.length === 0) return [];

        const unitMap = new Map();
        const rootUnits = [];

        // Нормализуем ID для единообразия
        const normalizeId = (id) => {
            if (id == null) return null;
            return typeof id === 'string' ? parseInt(id) : id;
        };

        // Создаем карту всех подразделений с пустыми массивами children
        units.forEach(unit => {
            const normalizedId = normalizeId(unit.id);
            unitMap.set(normalizedId, {
                ...unit,
                id: normalizedId,
                children: []
            });
        });

        // Строим дерево
        units.forEach(unit => {
            const normalizedId = normalizeId(unit.id);
            const unitNode = unitMap.get(normalizedId);

            // Проверяем все возможные варианты: parentId, parent_id, parentDepartment (объект)
            let parentIdValue = null;
            if (unit.parentId != null) {
                parentIdValue = unit.parentId;
            } else if (unit.parent_id != null) {
                parentIdValue = unit.parent_id;
            } else if (unit.parentDepartment != null && unit.parentDepartment.id != null) {
                parentIdValue = unit.parentDepartment.id;
            }

            // Если есть parentId и родитель существует в карте, добавляем к родителю
            if (parentIdValue != null) {
                const normalizedParentId = normalizeId(parentIdValue);
                if (unitMap.has(normalizedParentId)) {
                    const parent = unitMap.get(normalizedParentId);
                    parent.children.push(unitNode);
                } else {
                    // Родитель не найден - считаем корневым
                    rootUnits.push(unitNode);
                }
            } else {
                // Если нет parentId - это корневой элемент
                rootUnits.push(unitNode);
            }
        });

        return rootUnits;
    };

    const toggleUnitExpand = (unitId) => {
        setExpandedUnits(prev => ({
            ...prev,
            [unitId]: !prev[unitId]
        }));
    };

    const handleUnitSelect = (unitId) => {
        setFormData(prev => ({
            ...prev,
            organizationUnitId: unitId.toString()
        }));
        setUnitDropdownOpen(false);
        // Очищаем ошибку при выборе
        if (errors.organizationUnitId) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.organizationUnitId;
                return newErrors;
            });
        }
    };

    const renderUnitOption = (unit, level = 0) => {
        const isExpanded = expandedUnits[unit.id];
        const hasChildren = unit.children && unit.children.length > 0;
        // Увеличиваем отступ для каждого уровня вложенности (как на странице Карта предприятия)
        const indent = level * 32;
        const isSelected = formData.organizationUnitId === unit.id.toString();
        const isChild = level > 0;

        return (
            <React.Fragment key={unit.id}>
                <div
                    className={`unit-option ${isSelected ? 'selected' : ''} ${isChild ? 'unit-option-child' : ''}`}
                    style={{
                        marginLeft: `${indent}px`,
                        paddingLeft: '12px'
                    }}
                    onClick={() => handleUnitSelect(unit.id)}
                >
                    {hasChildren ? (
                        <button
                            className="org-unit-expand-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleUnitExpand(unit.id);
                            }}
                        >
                            {isExpanded ? (
                                <FaChevronDown className="expand-icon" />
                            ) : (
                                <FaChevronRight className="expand-icon" />
                            )}
                        </button>
                    ) : (
                        <span className="org-unit-spacer" style={{ width: '16px', display: 'inline-block' }} />
                    )}
                    <span className="unit-option-name">{unit.name}</span>
                </div>
                {hasChildren && isExpanded && (
                    <div className="unit-children">
                        {unit.children.map(child => renderUnitOption(child, level + 1))}
                    </div>
                )}
            </React.Fragment>
        );
    };

    const loadWelderData = async (welderId) => {
        try {
            const welder = await getWelderById(welderId);
            console.log('Загруженные данные сварщика:', welder);

            // Разбиваем полное имя на фамилию, имя, отчество
            const nameParts = (welder.name || '').trim().split(/\s+/);
            const lastName = nameParts[0] || '';
            const firstName = nameParts[1] || '';
            const middleName = nameParts.slice(2).join(' ') || '';

            // Находим подразделение по названию (используем текущее состояние organizationUnits)
            const departmentName = welder.department || '';
            // Ждем, пока подразделения загрузятся
            let matchingUnit = null;
            if (organizationUnits.length > 0) {
                matchingUnit = organizationUnits.find(unit => unit.name === departmentName);
            } else {
                // Если подразделения еще не загружены, загружаем их снова
                const units = await getAllOrganizationUnits();
                setOrganizationUnits(Array.isArray(units) ? units : []);
                matchingUnit = (Array.isArray(units) ? units : []).find(unit => unit.name === departmentName);
            }
            const organizationUnitId = matchingUnit ? (matchingUnit.id.toString()) : '';

            setFormData({
                lastName: lastName,
                firstName: firstName,
                middleName: middleName,
                employeeId: welder.employeeId || '',
                birthDate: welder.birthDate || '',
                phone: welder.phone || '',
                hireDate: welder.hireDate || '',
                position: welder.position || '',
                organizationUnitId: organizationUnitId
            });

            // Сохраняем текущий статус
            if (welder.status) {
                setCurrentWelderStatus(welder.status);
            }

            // Загружаем фото, если есть
            // Проверяем наличие фото - либо в поле photo, либо просто пытаемся загрузить
            try {
                // Освобождаем предыдущий blob URL, если он был
                if (profileImage && profileImage.startsWith('blob:')) {
                    URL.revokeObjectURL(profileImage);
                }

                const photoBlobUrl = await getWelderPhoto(welderId);
                if (photoBlobUrl) {
                    setProfileImage(photoBlobUrl);
                    setSelectedImageFile(null); // Сбрасываем выбранный файл, так как используем существующее фото
                    console.log('Фото загружено успешно');
                } else {
                    setProfileImage(null);
                    setSelectedImageFile(null);
                }
            } catch (error) {
                console.error('Ошибка загрузки фото:', error);
                setProfileImage(null);
                setSelectedImageFile(null);
            }

            // Загружаем RFID пропуска, если есть
            if (welder.rfidPasses && Array.isArray(welder.rfidPasses) && welder.rfidPasses.length > 0) {
                // Если приходит массив RFID пропусков
                setRfidPasses(welder.rfidPasses.map((pass, index) => ({
                    id: pass.id || Date.now() + index,
                    code: pass.code
                })));
            } else if (welder.rfidCode) {
                // Обратная совместимость: если приходит один RFID код (старый формат)
                setRfidPasses([{
                    id: Date.now(),
                    code: welder.rfidCode
                }]);
            } else {
                setRfidPasses([]);
            }

            // Загружаем связанные аппараты, если есть
            if (welder.weldingMachines && Array.isArray(welder.weldingMachines) && welder.weldingMachines.length > 0) {
                setRelatedMachines(welder.weldingMachines);
            } else {
                setRelatedMachines([]);
            }

            // Загружаем аттестации
            await loadCertifications(welderId);
        } catch (error) {
            console.error('Ошибка загрузки данных сварщика:', error);
            alert('Ошибка загрузки данных сварщика');
            navigate('/welders');
        }
    };

    const loadCertifications = async (welderId) => {
        if (!welderId) return;
        try {
            const certs = await getCertificationsByWelderId(welderId);
            // Преобразуем данные аттестаций для отображения в таблице
            const formattedCerts = certs.map(cert => {
                // Форматируем метод сварки: разделяем на название и число в скобках
                let methodDisplay = '-';
                let methodName = '';
                let methodCode = '';

                if (cert.weldingMethods && cert.weldingMethods.length > 0) {
                    const method = cert.weldingMethods[0];
                    // Ищем паттерн: название метода (число)
                    const match = method.match(/^(.+?)\s*\((\d+)\)$/);
                    if (match) {
                        methodName = match[1].trim();
                        methodCode = `(${match[2]})`;
                    } else {
                        methodDisplay = method;
                    }
                }

                return {
                    id: cert.id,
                    method: methodDisplay,
                    methodName: methodName,
                    methodCode: methodCode,
                    group: cert.techGroups && cert.techGroups.length > 0 ? cert.techGroups.join(', ') : '-',
                    parts: cert.parts && cert.parts.length > 0 ? cert.parts.join(', ') : '-',
                    seams: cert.weldTypes && cert.weldTypes.length > 0 ? cert.weldTypes.join(', ') : '-',
                    material: cert.materials && cert.materials.length > 0 ? cert.materials.join(', ') : '-',
                    connection: cert.connections && cert.connections.length > 0 ? cert.connections.join(', ') : '-',
                    position: cert.positions && cert.positions.length > 0 ? cert.positions.join(', ') : '-',
                    thickness: cert.thicknessFrom && cert.thicknessTo
                        ? `${cert.thicknessFrom}-${cert.thicknessTo}`
                        : cert.thicknessFrom ? `от ${cert.thicknessFrom}` : cert.thicknessTo ? `до ${cert.thicknessTo}` : '-',
                    diameter: cert.diameterFrom && cert.diameterTo
                        ? `${cert.diameterFrom}-${cert.diameterTo}`
                        : cert.diameterFrom ? `от ${cert.diameterFrom}` : cert.diameterTo ? `до ${cert.diameterTo}` : '-',
                    validUntil: cert.expiryDate || '-',
                    status: cert.status === 'ACTIVE' ? 'Действует' : cert.status === 'EXPIRED' ? 'Истекла' : 'Аннулирована'
                };
            });
            setCertifications(formattedCerts);
        } catch (error) {
            console.error('Ошибка загрузки аттестаций:', error);
            setCertifications([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Очищаем ошибку для этого поля
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Освобождаем предыдущий blob URL, если он был
            if (profileImage && profileImage.startsWith('blob:')) {
                URL.revokeObjectURL(profileImage);
            }

            setSelectedImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddRfidPass = () => {
        setIsRfidModalOpen(true);
    };

    const handleRfidPassAdded = async (rfidCode) => {
        // Проверяем, не добавлен ли уже этот код для текущего сварщика
        if (rfidPasses.some(pass => pass.code === rfidCode)) {
            alert('Этот RFID код уже добавлен');
            return;
        }

        // Проверяем уникальность RFID кода в подразделении
        const unitId = formData.organizationUnitId ? (typeof formData.organizationUnitId === 'string' ? parseInt(formData.organizationUnitId) : formData.organizationUnitId) : null;
        const selectedUnit = organizationUnits.find(unit => {
            const unitIdNum = typeof unit.id === 'string' ? parseInt(unit.id) : unit.id;
            return unitIdNum === unitId;
        });
        const departmentName = selectedUnit ? selectedUnit.name : '';

        if (!departmentName) {
            alert('Сначала выберите подразделение');
            return;
        }

        // Проверяем, не используется ли этот RFID код другим сварщиком в том же подразделении
        try {
            const { checkRfidCodeAvailability } = await import('../api/welderApi');
            const isAvailable = await checkRfidCodeAvailability(rfidCode, departmentName, id || null);

            if (!isAvailable) {
                alert(`RFID код "${rfidCode}" уже используется другим сварщиком в подразделении "${departmentName}"`);
                return;
            }

            const newPass = {
                id: Date.now(),
                code: rfidCode
            };
            setRfidPasses([...rfidPasses, newPass]);
        } catch (error) {
            console.error('Ошибка при проверке RFID кода:', error);
            alert('Ошибка при проверке RFID кода. Попробуйте еще раз.');
        }
    };

    const handleDeleteRfidPass = (id) => {
        setRfidPasses(rfidPasses.filter(pass => pass.id !== id));
    };

    const handleAddCertification = () => {
        // Сохраняем ID сварщика в localStorage для использования на странице аттестации
        if (id) {
            localStorage.setItem('currentWelderId', id);
            navigate(`/welders/${id}/certification`);
        } else {
            // Если это новый сварщик, сохраняем временный ID или используем null
            // В этом случае нужно сначала сохранить сварщика
            const tempId = localStorage.getItem('currentWelderId');
            if (tempId) {
                navigate('/welders/add/certification');
            } else {
                alert('Сначала сохраните данные сварщика');
            }
        }
    };

    const handleAddMachine = () => {
        setIsMachineModalOpen(true);
    };

    const handleMachineAdded = (machines) => {
        // Добавляем только те аппараты, которых еще нет в списке
        setRelatedMachines(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMachines = machines.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMachines];
        });
    };

    const handleDeleteMachine = () => {
        // Удаляем выбранные аппараты (те, у которых чекбокс отмечен)
        const selectedCheckboxes = document.querySelectorAll('.machines-table input[type="checkbox"]:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Выберите аппараты для удаления');
            return;
        }

        const selectedIds = Array.from(selectedCheckboxes).map(cb => {
            const row = cb.closest('tr');
            return row ? row.dataset.machineId : null;
        }).filter(Boolean);

        setRelatedMachines(prev => prev.filter(m => !selectedIds.includes(m.id.toString())));
    };

    // Функции для отображения аппаратов (как на WeldingEquipmentPage)
    const getModelDisplay = (item) => {
        if (item.deviceModel === 'MONITORING_BLOCK') return 'Блок Мониторинга';
        if (item.deviceModel === 'CORE') return 'CORE PULSE';
        return item.model || item.deviceModel?.name || 'Не указана';
    };

    const formatModel = (modelName) => {
        if (modelName && modelName.startsWith('CORE ')) {
            const parts = modelName.split(' ', 2);
            return {
                first: parts[0], // "CORE"
                second: parts[1] ? parts.slice(1).join(' ') : '' // "PRO 500", "Synergy 500", etc.
            };
        }
        return { first: modelName || '', second: '' };
    };

    const getWelderDisplay = (item) => {
        if (item.assignedWelders && Array.isArray(item.assignedWelders) && item.assignedWelders.length > 0) {
            return item.assignedWelders[0];
        }
        return 'Не назначен';
    };

    const getLastActivation = (item) => {
        return '';
    };

    const getFormattedStatus = (status, rawState) => {
        if (rawState !== null && rawState !== undefined) {
            const stateLower = String(rawState).toLowerCase().trim();

            if (stateLower.includes('дежурн') || stateLower.includes('standby')) {
                return { text: 'Деж.Режим', className: 'on', color: '#0cff00' };
            }

            if (stateLower.includes('ожидан') || stateLower.includes('waiting')) {
                return { text: 'Ожидание', className: 'on', color: '#0cff00' };
            }

            if (stateLower.includes('заблок') || stateLower.includes('block')) {
                return { text: 'Блок', className: 'off', color: '#7B8BA6' };
            }

            if (stateLower.includes('свар') || stateLower.includes('weld')) {
                return { text: 'Сварка', className: 'welding', color: '#FEB63E' };
            }
        }

        switch (status) {
            case 'welding':
                return { text: 'Сварка', className: 'welding', color: '#FEB63E' };
            case 'on':
                return { text: 'Включен', className: 'on', color: '#39956C' };
            case 'off':
                return { text: 'Выкл', className: 'off', color: '#7B8BA6' };
            default:
                return { text: 'Выкл', className: 'off', color: '#7B8BA6' };
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Фамилия обязательна';
        }
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Имя обязательно';
        }
        if (!formData.position) {
            newErrors.position = 'Должность обязательна';
        }
        if (!formData.organizationUnitId) {
            newErrors.organizationUnitId = 'Подразделение обязательно';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            // Находим название подразделения по ID
            const unitId = formData.organizationUnitId ? (typeof formData.organizationUnitId === 'string' ? parseInt(formData.organizationUnitId) : formData.organizationUnitId) : null;
            const selectedUnit = organizationUnits.find(unit => {
                const unitIdNum = typeof unit.id === 'string' ? parseInt(unit.id) : unit.id;
                return unitIdNum === unitId;
            });
            const departmentName = selectedUnit ? selectedUnit.name : '';

            // Формируем полное имя
            const fullName = `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim();

            if (!fullName) {
                alert('Пожалуйста, заполните хотя бы фамилию и имя');
                return;
            }

            // Получаем все RFID коды из списка пропусков
            const rfidCodes = rfidPasses.length > 0
                ? rfidPasses.map(pass => pass.code)
                : null;

            // Получаем ID связанных аппаратов
            const machineIds = relatedMachines.length > 0
                ? relatedMachines.map(machine => machine.id)
                : null;

            // Подготавливаем данные для отправки
            const welderData = {
                name: fullName,
                status: isEditMode ? currentWelderStatus : 'ACTIVE', // При редактировании сохраняем текущий статус
                department: departmentName || null, // Название подразделения вместо ID
                position: formData.position || null,
                employeeId: formData.employeeId || null,
                birthDate: formData.birthDate || null,
                hireDate: formData.hireDate || null,
                phone: formData.phone || null,
                rfidCodes: rfidCodes || null, // Отправляем массив всех RFID кодов
                machineIds: machineIds || null // Отправляем массив ID связанных аппаратов
            };

            // Удаляем пустые поля
            Object.keys(welderData).forEach(key => {
                if (welderData[key] === null || welderData[key] === '') {
                    delete welderData[key];
                }
            });

            console.log('Отправка данных сварщика:', welderData);

            let welderId;
            if (isEditMode && id) {
                // Режим редактирования - обновляем существующего сварщика
                const response = await updateWelder(id, welderData);
                console.log('Ответ от сервера при обновлении:', response);
                welderId = id;
                alert('Сварщик успешно обновлен');
            } else {
                // Режим создания - создаем нового сварщика
                const response = await createWelder(welderData);
                console.log('Ответ от сервера при создании:', response);
                welderId = response.id;
                // Сохраняем ID в localStorage для возможности добавления аттестаций
                localStorage.setItem('currentWelderId', welderId.toString());
                alert('Сварщик успешно создан');
            }

            // Загружаем фото, если оно было выбрано
            if (selectedImageFile && welderId) {
                try {
                    console.log('Загрузка фото для сварщика:', welderId);
                    await uploadWelderPhoto(welderId, selectedImageFile);
                    console.log('Фото успешно загружено');
                } catch (error) {
                    console.error('Ошибка загрузки фото:', error);
                    alert('Сварщик сохранен, но произошла ошибка при загрузке фото');
                }
            }

            // Загружаем аттестации после сохранения
            if (welderId) {
                await loadCertifications(welderId);
            }

            // Не переходим на страницу списка, остаемся на странице редактирования
            if (!isEditMode) {
                // Если это был новый сварщик, переходим в режим редактирования
                // Используем replace вместо push, чтобы не создавать лишнюю запись в истории
                // И добавляем небольшую задержку, чтобы данные успели сохраниться в БД
                setTimeout(() => {
                    navigate(`/welders/add/${welderId}`, { replace: true });
                }, 100);
            }
        } catch (error) {
            console.error('Ошибка создания сварщика:', error);
            console.error('Детали ошибки:', {
                message: error.message,
                response: error.response,
                data: error.response?.data
            });

            let errorMessage = 'Ошибка при создании сварщика';

            // Пытаемся извлечь сообщение об ошибке из разных источников
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            alert(`Ошибка при создании сварщика: ${errorMessage}`);
        }
    };

    const positions = [
        'Электросварщик',
        'Главный сварщик',
        'Сварщик',
        'Монтажник'
    ];

    return (
        <div className="add-welder-page">
            {/* Header */}
            <div className="add-welder-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/welders')}>
                        ←
                    </button>
                    <h1 className="page-title">{isEditMode ? 'Редактирование сварщика' : 'Сварщик'}</h1>
                </div>
                <div className="header-right">
                    <button
                        className="control-btn notifications-btn"
                        onClick={() => navigate('/notifications')}
                    >
                        <FaBell className="notifications-icon" />
                        <span className="notifications-badge"></span>
                    </button>
                    <UserProfile />
                </div>
            </div>

            {/* Main Content */}
            <div className="add-welder-content">
                {/* Profile and RFID Section - Same Row */}
                <div className="profile-rfid-row">
                    {/* Profile Section */}
                    <div className="profile-section">
                        <div className="profile-image-container">
                            <div className="profile-image">
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" />
                                ) : (
                                    <div className="profile-placeholder">
                                        <span>Фото</span>
                                    </div>
                                )}
                            </div>
                            <label className="change-photo-btn">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                />
                                Сменить фото
                            </label>
                        </div>

                        <div className="profile-form-columns">
                            {/* First Column */}
                            <div className="form-column">
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        placeholder="Фамилия*"
                                        className={errors.lastName ? 'error' : ''}
                                    />
                                    {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        placeholder="Имя*"
                                        className={errors.firstName ? 'error' : ''}
                                    />
                                    {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="middleName"
                                        value={formData.middleName}
                                        onChange={handleInputChange}
                                        placeholder="Отчество"
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleInputChange}
                                        placeholder="Год рождения:"
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="date"
                                        name="hireDate"
                                        value={formData.hireDate}
                                        onChange={handleInputChange}
                                        placeholder="Дата приёма:"
                                    />
                                </div>
                            </div>

                            {/* Second Column */}
                            <div className="form-column">
                                <div className="form-group">
                                    <select
                                        name="position"
                                        value={formData.position}
                                        onChange={handleInputChange}
                                        className={`select-with-label ${errors.position ? 'error' : ''}`}
                                        data-label="Должность*"
                                    >
                                        <option value="" disabled>Должность*</option>
                                        {positions.map(pos => (
                                            <option key={pos} value={pos}>{pos}</option>
                                        ))}
                                    </select>
                                    {errors.position && <span className="error-text">{errors.position}</span>}
                                </div>
                                <div className="form-group">
                                    <div className="unit-select-container">
                                        <div
                                            className={`unit-select-dropdown ${unitDropdownOpen ? 'open' : ''} ${errors.organizationUnitId ? 'error' : ''}`}
                                            onClick={() => setUnitDropdownOpen(!unitDropdownOpen)}
                                        >
                                            <span className="unit-select-label">
                                                {formData.organizationUnitId
                                                    ? organizationUnits.find(u => u.id.toString() === formData.organizationUnitId)?.name || 'Подразделение*'
                                                    : 'Подразделение*'
                                                }
                                            </span>
                                            <span className={`unit-select-arrow ${unitDropdownOpen ? 'open' : ''}`}>
                                                <FaChevronDown />
                                            </span>
                                        </div>
                                        {unitDropdownOpen && (
                                            <div className="unit-select-options">
                                                {organizationUnitHierarchy.length > 0 ? (
                                                    organizationUnitHierarchy.map(unit => renderUnitOption(unit))
                                                ) : (
                                                    <div className="unit-option" style={{ padding: '8px 12px', color: '#7B8BA6' }}>
                                                        Нет доступных подразделений
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {errors.organizationUnitId && <span className="error-text">{errors.organizationUnitId}</span>}
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="employeeId"
                                        value={formData.employeeId}
                                        onChange={handleInputChange}
                                        placeholder="Табельный номер"
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="Номер телефона"
                                    />
                                </div>
                                <div className="form-group">
                                    <button type="button" className="save-btn" onClick={handleSave}>
                                        Сохранить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RFID Passes Section */}
                    <div className="rfid-section">
                        <div className="rfid-header">
                            <h2>Пропуска RFID</h2>
                            <button className="add-btn" onClick={handleAddRfidPass}>
                                + Добавить пропуск
                            </button>
                        </div>
                        <div className="rfid-list scrollable-section">
                            {rfidPasses.map(pass => (
                                <div key={pass.id} className="rfid-item">
                                    <input type="checkbox" className="rfid-checkbox" />
                                    <RiRfidFill className="rfid-icon" />
                                    <span className="rfid-code">{pass.code}</span>
                                    <button
                                        className="delete-btn-small"
                                        onClick={() => handleDeleteRfidPass(pass.id)}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            ))}
                            {rfidPasses.length === 0 && (
                                <div className="empty-state">Нет пропусков</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Certifications Section */}
                <div className="section certifications-section">
                    <div className="section-actions-only">
                        <button className="add-btn" onClick={handleAddCertification}>
                            + Добавить аттестацию
                        </button>
                        <button
                            className="naks-btn"
                            onClick={() => window.open('https://naks.ru/registry/personal/', '_blank')}
                        >
                            Открыть реестр НАКС
                        </button>
                    </div>
                    <div className="certifications-table scrollable-section">
                        <table>
                            <thead>
                            <tr>
                                <th>Способ свар.</th>
                                <th>Гр. тех. устройств</th>
                                <th>Вид деталей</th>
                                <th>Типы швов</th>
                                <th>Свар. мат.</th>
                                <th>Свар. соединение</th>
                                <th>Свар. полож.</th>
                                <th>Толщ. дет.</th>
                                <th>Нар. дмиам.</th>
                                <th>Действ. до</th>
                                <th>Статус</th>
                            </tr>
                            </thead>
                            <tbody>
                            {certifications.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="empty-state">Нет аттестаций</td>
                                </tr>
                            ) : (
                                certifications.map(cert => (
                                    <tr
                                        key={cert.id}
                                        onClick={() => {
                                            // Переходим на страницу редактирования аттестации
                                            if (id) {
                                                navigate(`/welders/${id}/certification/${cert.id}`);
                                            } else {
                                                const welderId = localStorage.getItem('currentWelderId');
                                                if (welderId) {
                                                    navigate(`/welders/${welderId}/certification/${cert.id}`);
                                                }
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            {cert.methodName ? (
                                                <>
                                                    {cert.methodName} <span style={{ color: '#ff8c00' }}>{cert.methodCode}</span>
                                                </>
                                            ) : (
                                                cert.method
                                            )}
                                        </td>
                                        <td>{cert.group}</td>
                                        <td>{cert.parts}</td>
                                        <td>{cert.seams}</td>
                                        <td>{cert.material}</td>
                                        <td>{cert.connection}</td>
                                        <td>{cert.position}</td>
                                        <td>{cert.thickness}</td>
                                        <td>{cert.diameter}</td>
                                        <td>{cert.validUntil}</td>
                                        <td>{cert.status}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Related Machines Section */}
                <div className="section machines-section">
                    <div className="section-actions-only">
                        <button className="add-btn" onClick={handleAddMachine}>
                            + Добавить аппарат
                        </button>
                        <button className="delete-btn" onClick={handleDeleteMachine}>
                            Удалить
                        </button>
                    </div>
                    <div className="machines-table scrollable-section">
                        <table>
                            <thead>
                            <tr>
                                <th></th>
                                <th>Модель</th>
                                <th>Название</th>
                                <th>Подразделение</th>
                                <th>Инвентарный номер</th>
                                <th>Сварщик</th>
                                <th>Последнее включение</th>
                                <th>Статус</th>
                            </tr>
                            </thead>
                            <tbody>
                            {relatedMachines.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="empty-state">Нет связанных аппаратов</td>
                                </tr>
                            ) : (
                                relatedMachines.map((machine, index) => {
                                    const status = deviceStatusesByMac[machine.mac] || 'off';
                                    const rawState = deviceStatesByMac[machine.mac] || null;
                                    const formattedStatus = getFormattedStatus(status, rawState);
                                    const modelDisplay = getModelDisplay(machine);
                                    const modelParts = formatModel(modelDisplay);
                                    return (
                                        <tr
                                            key={machine.id}
                                            data-machine-id={machine.id}
                                            className={`machine-table-row ${index % 2 === 0 ? 'machine-table-row-even' : 'machine-table-row-odd'}`}
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="machine-table-checkbox"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className={`equipment-status-dot ${status}`} style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            display: 'inline-block',
                                                            backgroundColor: status === 'welding' ? '#FEB63E' : status === 'on' ? '#39956C' : '#7B8BA6'
                                                        }}></span>
                                                    <img
                                                        src={machineImage}
                                                        alt={modelDisplay}
                                                        style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                                    />
                                                    <span>
                                                            <span style={{ color: '#fff' }}>{modelParts.first}</span>
                                                        {modelParts.second && (
                                                            <span className="model-part-second" style={{ color: '#DC6F1C' }}> {modelParts.second}</span>
                                                        )}
                                                        </span>
                                                </div>
                                            </td>
                                            <td>{machine.name || 'Не указано'}</td>
                                            <td>{machine.organizationUnit?.name || 'Не указано'}</td>
                                            <td>{machine.inventoryNumber || 'Не указан'}</td>
                                            <td>{getWelderDisplay(machine)}</td>
                                            <td>{getLastActivation(machine) || 'Нет данных'}</td>
                                            <td>
                                                    <span
                                                        className={`status-badge ${formattedStatus.className}`}
                                                        style={formattedStatus.color ? { color: formattedStatus.color } : {}}
                                                    >
                                                        {formattedStatus.text}
                                                    </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add RFID Pass Modal */}
            <AddRfidPassModal
                isOpen={isRfidModalOpen}
                onClose={() => setIsRfidModalOpen(false)}
                onAdd={handleRfidPassAdded}
            />

            {/* Add Machine Modal */}
            <AddMachineModal
                isOpen={isMachineModalOpen}
                onClose={() => setIsMachineModalOpen(false)}
                onAdd={handleMachineAdded}
                selectedMachineIds={relatedMachines.map(m => m.id)}
            />
        </div>
    );
}

export default AddWelderPage;

