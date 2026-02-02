import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import UserProfile from '../components/UserProfile';
import { createCertification, updateCertification, getCertificationById, deleteCertification } from '../api/certificationApi';
import '../styles/certificationPage.css';

function CertificationPage() {
    const navigate = useNavigate();
    const { id, certId } = useParams(); // ID сварщика и ID аттестации из URL
    const [isEditing, setIsEditing] = useState(true); // По умолчанию режим редактирования для новой аттестации
    const [certificationId, setCertificationId] = useState(certId ? parseInt(certId) : null); // ID аттестации, если редактируем существующую
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        certificateNumber: '',
        certificationDate: '',
        expiryDate: '',
        weldingMethods: [],
        pto: [],
        ohvvp: [],
        ngdo: [],
        sk: [],
        otog: [],
        ksm: [],
        mo: [],
        ko: [],
        go: [],
        gdo: [],
        positions: [],
        connections: [],
        materials: [],
        parts: [],
        weldTypes: [],
        thicknessFrom: '',
        thicknessTo: '',
        diameterFrom: '',
        diameterTo: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Очищаем ошибку при изменении
        if (error) {
            setError('');
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCheckboxChange = (category, value) => {
        setFormData(prev => {
            const currentArray = prev[category] || [];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(item => item !== value)
                : [...currentArray, value];
            return {
                ...prev,
                [category]: newArray
            };
        });
    };

    // Отдельная функция для выбора способа сварки (только один выбор)
    const handleWeldingMethodChange = (value) => {
        setFormData(prev => ({
            ...prev,
            weldingMethods: prev.weldingMethods?.includes(value) ? [] : [value]
        }));
    };

    const weldingMethods = [
        { code: 'РД (111)', desc: 'Ручная дуговая сварка покрытыми электродами' },
        { code: 'РДН (111)', desc: 'Ручная дуговая наплавка покрытыми электродами' },
        { code: 'РАД (141)', desc: 'Ручная аргонодуговая сварка неплавящимся электродом' },
        { code: 'РАДН (141)', desc: 'Ручная аргонодуговая наплавка' },
        { code: 'МП (135)', desc: 'Механизированная сварка плавящимся электродом в среде активных газов и смесях' },
        { code: 'МПН (135)', desc: 'Механизированная наплавка плавящимся электродом в среде активных газов и смесях' },
        { code: 'МАДП (131)', desc: 'Механизированная аргонодуговая сварка плавящимся электродом' },
        { code: 'МАДПН (131)', desc: 'Механизированная аргонодуговая наплавка плавящимся электродом' },
        { code: 'МПГ (136)', desc: 'Механизированная сварка порошковой проволокой в среде активных газов и смесях' },
        { code: 'МПГН (136)', desc: 'Механизированная наплавка порошковой проволокой в среде активных газов и смесях' },
        { code: 'МПИ (137)', desc: 'Механизированная сварка порошковой проволокой в среде инертных газов и смесях' },
        { code: 'МПИН (137)', desc: 'Механизированная наплавка порошковой проволокой в среде инертных газов и смесях' },
        { code: 'МПС (114)', desc: 'Механизированная сварка самозащитной порошковой проволокой' },
        { code: 'МПСН (114)', desc: 'Механизированная наплавка самозащитной порошковой проволокой' },
        { code: 'МФ (121)', desc: 'Механизированная сварка под флюсом' },
        { code: 'АФ (12)', desc: 'Автоматическая сварка под флюсом' },
        { code: 'АФПН (12)', desc: 'Автоматическая наплавка проволочным электродом под флюсом' },
        { code: 'ААД (141)', desc: 'Автоматическая аргонодуговая сварка неплавящимся электродом' },
        { code: 'ААДН (141)', desc: 'Автоматическая аргонодуговая наплавка неплавящимся электродом' },
        { code: 'ААДП (131)', desc: 'Автоматическая аргонодуговая сварка плавящимся электродом' },
        { code: 'ААДПН (131)', desc: 'Автоматическая аргонодуговая наплавка плавящимся электродом' },
        { code: 'АПГ (135)', desc: 'Автоматическая сварка плавящимся электродом в среде активных газов и смесях' },
        { code: 'АПГН (135)', desc: 'Автоматическая наплавка плавящимся электродом в среде активных газов и смесях' },
        { code: 'АППГ (136)', desc: 'Автоматическая сварка порошковой проволокой в среде активных газов и смесях' },
        { code: 'АППГН (136)', desc: 'Автоматическая наплавка порошковой проволокой в среде активных газов и смесях' },
        { code: 'АПИ (137)', desc: 'Автоматическая сварка порошковой проволокой в среде инертных газов и смесях' },
        { code: 'АПИН (137)', desc: 'Автоматическая наплавка порошковой проволокой в среде инертных газов и смесях' },
        { code: 'АПС (114)', desc: 'Автоматическая сварка самозащитной порошковой проволкой' },
        { code: 'АПСН (114)', desc: 'Автоматическая наплавка самозащитной порошковой проволокой' },
        { code: 'ПАК (91)', desc: 'Пайка' }
    ];

    const positions = [
        { code: 'Н1', desc: 'Нижнее стыковое и в «лодочку», а также стыковые и нахлесточные соединения стержней и тавровые соединения стержней с листами, выполняемые в нижнем положении со стороны привариваемого стержня' },
        { code: 'Н2', desc: 'Нижнее тавровое, а также крестообразные соединения стержней и нахлесточные соединения стержней с листами, выполняемые в нижнем положении' },
        { code: 'Г', desc: 'Горизонтальное' },
        { code: 'П1', desc: 'Потолочное стыковое, а также нахлесточные соединения стержней, выполняемые в потолочном положении' },
        { code: 'П2', desc: 'Потолочное тавровое, а также крестообразные соединения стержней и нахлесточные соединения стержней с листами, выполняемые в потолочном положении' },
        { code: 'В1', desc: 'Вертикальное снизу вверх' },
        { code: 'В2', desc: 'Вертикальное сверху вниз' },
        { code: 'Н45', desc: 'Наклонное под углом 45°' }
    ];

    const connections = [
        { code: 'ОС', desc: 'Сварные соединения, выполняемые с одной стороны (односторонняя сварка)' },
        { code: 'ДС', desc: 'Сварные соединения, выполняемые с двух сторон (двусторонняя сварка)' },
        { code: 'СП', desc: 'Сварные соединения, выполняемые на съемной или остающейся подкладке, подкладном кольце' },
        { code: 'БП', desc: 'Сварные соединения, выполняемые без подкладки (на весу)' },
        { code: 'ЗК', desc: 'Сварные соединения, выполняемые с зачисткой корня шва' },
        { code: 'БЗ', desc: 'Сварные соединения, выполняемые без зачистки корня шва' },
        { code: 'ГЗ', desc: 'Сварные соединения, выполняемые с газовой защитой корня шва (поддувом газа)' }
    ];

    const materials = [
        { code: 'М01', desc: 'Углеродистые и низколегированные конструкционные стали перлитного класса с гарантированным минимальным пределом текучести не более 360 Мпа' },
        { code: 'М02', desc: 'Низколегированные теплоустойчивые хромомолибденовые и хромомолибденованадиевые стали перлитного класса' },
        { code: 'М03', desc: 'Низколегированные конструкционные стали перлитного класса с гарантированным минимальным пределом текучести свыше 360 до 500 Мпа, Низколегированные конструкционные стали перлитного класса с гарантированным минимальным пределом текучести свыше 500 Мпа' },
        { code: 'М04', desc: 'Высоколегированные (высокохромистые) стали мартенситного и мартенситно-ферритного классов с содержанием хрома от 10 до 18 %, Высоколегированные (высокохромистые) стали ферритного класса с содержанием хрома от 12 до 30 %' },
        { code: 'М05', desc: 'Легированные стали мартенситного класса с содержанием хрома от 4 до 10 %' },
        { code: 'М11', desc: 'Высоколегированные стали аустенитно-ферритного класса, Высоколегированные стали аустенитного класса' },
        { code: 'М21', desc: 'Чистый алюминий и алюминиево-марганцевые сплавы' },
        { code: 'М22', desc: 'Нетермоупрочняемые алюминиево-магниевые сплавы' },
        { code: 'М23', desc: 'Термоупрочняемые алюминиевые сплавы' },
        { code: 'М31', desc: 'Медь' },
        { code: 'М32', desc: 'Медно-цинковые сплавы' },
        { code: 'М33', desc: 'Медно-никелевые сплавы' },
        { code: 'М34', desc: 'Бронзы' },
        { code: 'М41', desc: 'Сплавы титана' }
    ];

    const parts = [
        { code: 'Л', desc: 'Листы' },
        { code: 'Т', desc: 'Трубы' },
        { code: 'Л+Т', desc: 'Листы с трубами' },
        { code: 'Т+О', desc: 'Труба с отводом' },
        { code: 'Т+М+Т', desc: 'Труба с трубой через муфту' }
    ];

    const weldTypes = [
        { code: 'СШ', desc: 'Стыковой шов' },
        { code: 'УШ', desc: 'Угловой шов' },
        { code: 'Тч', desc: 'Точечный шов' }
    ];

    const techGroups = {
        pto: { name: 'ПТО', desc: 'Подъемно- транспортное оборудование', items: Array.from({ length: 14 }, (_, i) => `пп. ${i + 1}`) },
        ohvvp: { name: 'ОХВВП', desc: 'Оборудование химических, нефтехимических, нефтеперерабатывающих и взрывопожароопасных производств', items: Array.from({ length: 16 }, (_, i) => `пп. ${i + 1}`) },
        ngdo: { name: 'НГДО', desc: 'Нефтегазодобывающее оборудование', items: Array.from({ length: 13 }, (_, i) => `пп. ${i + 1}`) },
        sk: { name: 'СК', desc: 'Строительные конструкции', items: Array.from({ length: 4 }, (_, i) => `пп. ${i + 1}`) },
        otog: { name: 'ОТОГ', desc: 'Оборудование для транспортировки опасных грузов', items: Array.from({ length: 3 }, (_, i) => `пп. ${i + 1}`) },
        ksm: { name: 'КСМ', desc: 'Конструкции стальных мостов', items: Array.from({ length: 2 }, (_, i) => `пп. ${i + 1}`) },
        mo: { name: 'МО', desc: 'Металлургическое оборудование', items: Array.from({ length: 6 }, (_, i) => `пп. ${i + 1}`) },
        ko: { name: 'КО', desc: 'Котельное оборудование', items: Array.from({ length: 5 }, (_, i) => `пп. ${i + 1}`) },
        go: { name: 'ГО', desc: 'Газовое оборудование', items: Array.from({ length: 7 }, (_, i) => `пп. ${i + 1}`) },
        gdo: { name: 'ГДО', desc: 'Горнодобывающее оборудование.', items: ['пп. 1'] }
    };

    // Загрузка данных существующей аттестации
    useEffect(() => {
        const loadCertificationData = async () => {
            if (certificationId) {
                try {
                    setLoading(true);
                    const cert = await getCertificationById(certificationId);

                    // Преобразуем данные из API в формат формы
                    const techGroupsData = {
                        pto: [],
                        ohvvp: [],
                        ngdo: [],
                        sk: [],
                        otog: [],
                        ksm: [],
                        mo: [],
                        ko: [],
                        go: [],
                        gdo: []
                    };

                    // Парсим группы технических устройств
                    if (cert.techGroups && Array.isArray(cert.techGroups)) {
                        cert.techGroups.forEach(groupStr => {
                            const match = groupStr.match(/^([А-Я]+):\s*(.+)$/);
                            if (match) {
                                const groupName = match[1];
                                const item = match[2].trim();
                                const groupKey = Object.keys(techGroups).find(key =>
                                    techGroups[key].name === groupName
                                );
                                if (groupKey && techGroupsData[groupKey]) {
                                    techGroupsData[groupKey].push(item);
                                }
                            }
                        });
                    }

                    setFormData({
                        certificateNumber: cert.certificateNumber || '',
                        certificationDate: cert.certificationDate || '',
                        expiryDate: cert.expiryDate || '',
                        weldingMethods: cert.weldingMethods || [],
                        pto: techGroupsData.pto,
                        ohvvp: techGroupsData.ohvvp,
                        ngdo: techGroupsData.ngdo,
                        sk: techGroupsData.sk,
                        otog: techGroupsData.otog,
                        ksm: techGroupsData.ksm,
                        mo: techGroupsData.mo,
                        ko: techGroupsData.ko,
                        go: techGroupsData.go,
                        gdo: techGroupsData.gdo,
                        positions: cert.positions || [],
                        connections: cert.connections || [],
                        materials: cert.materials || [],
                        parts: cert.parts || [],
                        weldTypes: cert.weldTypes || [],
                        thicknessFrom: cert.thicknessFrom ? cert.thicknessFrom.toString() : '',
                        thicknessTo: cert.thicknessTo ? cert.thicknessTo.toString() : '',
                        diameterFrom: cert.diameterFrom ? cert.diameterFrom.toString() : '',
                        diameterTo: cert.diameterTo ? cert.diameterTo.toString() : ''
                    });
                } catch (error) {
                    console.error('Ошибка загрузки данных аттестации:', error);
                    setError('Ошибка загрузки данных аттестации');
                } finally {
                    setLoading(false);
                }
            }
        };

        loadCertificationData();
    }, [certificationId]);

    // Получаем ID сварщика из URL или localStorage
    const getWelderId = () => {
        if (id) {
            return id; // Если есть ID в URL (редактирование существующего сварщика)
        }
        // Если это новый сварщик, получаем ID из localStorage
        const welderId = localStorage.getItem('currentWelderId');
        return welderId ? parseInt(welderId) : null;
    };

    const handleSave = async () => {
        if (!isEditing) return;

        // Валидация обязательных полей
        if (!formData.certificateNumber || !formData.certificationDate || !formData.expiryDate) {
            setError('Заполните все обязательные поля (отмечены *)');
            return;
        }

        // Валидация и исправление формата дат
        const validateAndFixDate = (dateString, fieldName) => {
            if (!dateString) return null;

            // Проверяем формат даты YYYY-MM-DD
            const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
            const match = dateString.match(dateRegex);

            if (!match) {
                throw new Error(`Неверный формат даты в поле "${fieldName}". Ожидается формат ГГГГ-ММ-ДД`);
            }

            const year = parseInt(match[1]);
            const month = parseInt(match[2]);
            const day = parseInt(match[3]);

            // Проверяем разумность года (1900-2100)
            if (year < 1900 || year > 2100) {
                // Пытаемся исправить очевидные опечатки
                if (year > 2100 && year < 100000) {
                    // Если год слишком большой, возможно опечатка (например, 20026 вместо 2026)
                    // Пробуем разные варианты исправления
                    const yearStr = year.toString();

                    // Если год имеет 5 цифр, убираем лишнюю цифру
                    if (yearStr.length === 5) {
                        // Пробуем убрать среднюю цифру (20026 -> 2026)
                        const correctedYear1 = parseInt(yearStr[0] + yearStr[1] + yearStr[3] + yearStr[4]);
                        if (correctedYear1 >= 1900 && correctedYear1 <= 2100) {
                            return `${correctedYear1}-${match[2]}-${match[3]}`;
                        }
                        // Пробуем убрать последнюю цифру (20026 -> 2002)
                        const correctedYear2 = parseInt(yearStr.substring(0, 4));
                        if (correctedYear2 >= 1900 && correctedYear2 <= 2100) {
                            return `${correctedYear2}-${match[2]}-${match[3]}`;
                        }
                    }

                    // Если год имеет 6 цифр, убираем лишние цифры
                    if (yearStr.length === 6) {
                        // Берем первые 4 цифры
                        const correctedYear = parseInt(yearStr.substring(0, 4));
                        if (correctedYear >= 1900 && correctedYear <= 2100) {
                            return `${correctedYear}-${match[2]}-${match[3]}`;
                        }
                    }
                }
                throw new Error(`Некорректный год в поле "${fieldName}". Год должен быть в диапазоне 1900-2100. Проверьте правильность ввода (например, 20026 вместо 2026)`);
            }

            // Проверяем месяц
            if (month < 1 || month > 12) {
                throw new Error(`Некорректный месяц в поле "${fieldName}". Месяц должен быть от 1 до 12`);
            }

            // Проверяем день
            if (day < 1 || day > 31) {
                throw new Error(`Некорректный день в поле "${fieldName}". День должен быть от 1 до 31`);
            }

            return dateString;
        };

        let validatedCertificationDate;
        let validatedExpiryDate;

        try {
            validatedCertificationDate = validateAndFixDate(formData.certificationDate, 'Дата аттестации');
            validatedExpiryDate = validateAndFixDate(formData.expiryDate, 'Дата окончания аттестации');

            // Проверяем, что дата аттестации не в будущем
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const certDate = new Date(validatedCertificationDate);
            if (certDate > today) {
                setError('Дата аттестации не может быть в будущем');
                return;
            }

            // Проверяем, что дата окончания не раньше даты аттестации
            if (validatedExpiryDate && validatedCertificationDate) {
                const expiryDate = new Date(validatedExpiryDate);
                if (expiryDate < certDate) {
                    setError('Дата окончания аттестации не может быть раньше даты аттестации');
                    return;
                }
            }

            // Обновляем даты, если они были исправлены
            if (validatedCertificationDate !== formData.certificationDate) {
                setFormData(prev => ({ ...prev, certificationDate: validatedCertificationDate }));
            }
            if (validatedExpiryDate !== formData.expiryDate) {
                setFormData(prev => ({ ...prev, expiryDate: validatedExpiryDate }));
            }
        } catch (dateError) {
            setError(dateError.message);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const welderId = getWelderId();
            if (!welderId) {
                setError('Не указан сварщик. Сохраните сначала данные сварщика.');
                setLoading(false);
                return;
            }

            // Подготавливаем данные для отправки
            // Собираем все группы технических устройств в один массив
            const techGroups = [];
            if (formData.pto && formData.pto.length > 0) {
                techGroups.push(...formData.pto.map(item => `ПТО: ${item}`));
            }
            if (formData.ohvvp && formData.ohvvp.length > 0) {
                techGroups.push(...formData.ohvvp.map(item => `ОХВВП: ${item}`));
            }
            if (formData.ngdo && formData.ngdo.length > 0) {
                techGroups.push(...formData.ngdo.map(item => `НГДО: ${item}`));
            }
            if (formData.sk && formData.sk.length > 0) {
                techGroups.push(...formData.sk.map(item => `СК: ${item}`));
            }
            if (formData.otog && formData.otog.length > 0) {
                techGroups.push(...formData.otog.map(item => `ОТОГ: ${item}`));
            }
            if (formData.ksm && formData.ksm.length > 0) {
                techGroups.push(...formData.ksm.map(item => `КСМ: ${item}`));
            }
            if (formData.mo && formData.mo.length > 0) {
                techGroups.push(...formData.mo.map(item => `МО: ${item}`));
            }
            if (formData.ko && formData.ko.length > 0) {
                techGroups.push(...formData.ko.map(item => `КО: ${item}`));
            }
            if (formData.go && formData.go.length > 0) {
                techGroups.push(...formData.go.map(item => `ГО: ${item}`));
            }
            if (formData.gdo && formData.gdo.length > 0) {
                techGroups.push(...formData.gdo.map(item => `ГДО: ${item}`));
            }

            const certificationData = {
                certificateNumber: formData.certificateNumber,
                certificationDate: validatedCertificationDate,
                expiryDate: validatedExpiryDate,
                weldingMethods: formData.weldingMethods || [],
                techGroups: techGroups,
                positions: formData.positions || [],
                connections: formData.connections || [],
                materials: formData.materials || [],
                parts: formData.parts || [],
                weldTypes: formData.weldTypes || [],
                thicknessFrom: formData.thicknessFrom ? parseFloat(formData.thicknessFrom) : null,
                thicknessTo: formData.thicknessTo ? parseFloat(formData.thicknessTo) : null,
                diameterFrom: formData.diameterFrom ? parseFloat(formData.diameterFrom) : null,
                diameterTo: formData.diameterTo ? parseFloat(formData.diameterTo) : null
            };

            if (certificationId) {
                // Обновляем существующую аттестацию
                await updateCertification(certificationId, certificationData);
            } else {
                // Создаем новую аттестацию
                await createCertification(welderId, certificationData);
            }

            // Возвращаемся на страницу редактирования сварщика
            if (id) {
                navigate(`/welders/add/${id}`);
            } else {
                navigate('/welders/add');
            }
        } catch (err) {
            console.error('Ошибка сохранения аттестации:', err);
            setError('Ошибка сохранения аттестации: ' + (err.message || 'Неизвестная ошибка'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!certificationId) {
            // Если это новая аттестация, просто возвращаемся назад
            if (id) {
                navigate(`/welders/add/${id}`);
            } else {
                navigate('/welders/add');
            }
            return;
        }

        if (window.confirm('Вы уверены, что хотите удалить аттестат?')) {
            setLoading(true);
            setError('');
            try {
                await deleteCertification(certificationId);
                // Возвращаемся на страницу редактирования сварщика
                if (id) {
                    navigate(`/welders/add/${id}`);
                } else {
                    navigate('/welders/add');
                }
            } catch (err) {
                console.error('Ошибка удаления аттестации:', err);
                setError('Ошибка удаления аттестации: ' + (err.message || 'Неизвестная ошибка'));
                setLoading(false);
            }
        }
    };

    const Tooltip = ({ text, children }) => {
        const tooltipRef = useRef(null);
        const wrapperRef = useRef(null);

        const handleMouseEnter = () => {
            if (tooltipRef.current && wrapperRef.current) {
                const rect = wrapperRef.current.getBoundingClientRect();
                const tooltipWidth = 300;
                const tooltipHeight = tooltipRef.current.offsetHeight || 100;
                const spacing = 8;

                let top = rect.top - tooltipHeight - spacing;
                let left = rect.left + rect.width / 2;

                // Проверка границ экрана
                if (top < 0) {
                    top = rect.bottom + spacing;
                }
                if (left - tooltipWidth / 2 < 0) {
                    left = tooltipWidth / 2;
                } else if (left + tooltipWidth / 2 > window.innerWidth) {
                    left = window.innerWidth - tooltipWidth / 2;
                }

                tooltipRef.current.style.top = `${top}px`;
                tooltipRef.current.style.left = `${left}px`;
            }
        };

        return (
            <div
                className="tooltip-wrapper"
                ref={wrapperRef}
                onMouseEnter={handleMouseEnter}
            >
                {children}
                <span className="tooltip-text" ref={tooltipRef}>{text}</span>
            </div>
        );
    };

    const CheckboxGroup = ({ category, items, label, description }) => {
        // Для способов сварки используем radio button (только один выбор)
        const isWeldingMethod = category === 'weldingMethods';

        return (
            <div className="checkbox-group">
                <Tooltip text={description}>
                    <div className="checkbox-group-header">
                        <label className="checkbox-group-label">{label}:</label>
                    </div>
                </Tooltip>
                <div className="checkbox-list">
                    {items.map((item, index) => {
                        const value = typeof item === 'string' ? item : item.code;
                        const desc = typeof item === 'object' ? item.desc : '';
                        const isChecked = isWeldingMethod
                            ? formData[category]?.includes(value) || false
                            : formData[category]?.includes(value) || false;

                        return (
                            <Tooltip key={index} text={desc}>
                                <label className="checkbox-item">
                                    <input
                                        type={isWeldingMethod ? "radio" : "checkbox"}
                                        name={isWeldingMethod ? "weldingMethod" : undefined}
                                        checked={isChecked}
                                        onChange={() => {
                                            if (isWeldingMethod) {
                                                handleWeldingMethodChange(value);
                                            } else {
                                                handleCheckboxChange(category, value);
                                            }
                                        }}
                                        disabled={!isEditing}
                                    />
                                    <span>{value}</span>
                                </label>
                            </Tooltip>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="certification-page">
            {/* Header */}
            <div className="certification-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        ←
                    </button>
                    <h1 className="page-title">Сварщики</h1>
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
            <div className="certification-content">
                <div className="certification-modal">
                    <div className="modal-header">
                        <div className="header-left-section">
                            <h2 className="modal-title">Ручная дуговая сварка покрытыми электродами</h2>
                        </div>
                        <div className="header-actions">
                            <button
                                className="naks-btn"
                                onClick={() => window.open('https://naks.ru/registry/personal/', '_blank')}
                            >
                                Открыть реестр НАКС
                            </button>
                        </div>
                    </div>

                    <div className={`certification-form ${!isEditing ? 'disabled' : ''}`}>
                        <div className="form-panels">
                            {/* Left Panel */}
                            <div className="form-panel left-panel">
                                <button
                                    className="edit-btn"
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    {isEditing ? 'Отменить редактирование' : 'Редактировать аттестат'}
                                </button>

                                <div className="form-group">
                                    <label>Номер удостоверения*</label>
                                    <input
                                        type="text"
                                        name="certificateNumber"
                                        value={formData.certificateNumber}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        placeholder="ВСР-ЗАЦ-І-02715"
                                    />
                                </div>

                                <div className="form-group">
                                    <Tooltip text="Дата проведения аттестации">
                                        <label>Дата аттестации*</label>
                                    </Tooltip>
                                    <input
                                        type="date"
                                        name="certificationDate"
                                        value={formData.certificationDate}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div className="form-group">
                                    <Tooltip text="Дата окончания действия аттестации">
                                        <label>Дата окончания аттестации*</label>
                                    </Tooltip>
                                    <input
                                        type="date"
                                        name="expiryDate"
                                        value={formData.expiryDate}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        min={formData.certificationDate || undefined}
                                    />
                                </div>

                                <CheckboxGroup
                                    category="weldingMethods"
                                    items={weldingMethods}
                                    label="Способ сварки"
                                    description="Способы сварки (наплавки), применяемые при изготовлении, монтаже, ремонте и реконструкции технических устройств для опасных производственных объектов"
                                />
                            </div>

                            {/* Middle Panel */}
                            <div className="form-panel middle-panel">
                                {Object.entries(techGroups).map(([key, group]) => (
                                    <CheckboxGroup
                                        key={key}
                                        category={key}
                                        items={group.items}
                                        label={group.name}
                                        description={group.desc}
                                    />
                                ))}
                            </div>

                            {/* Right Panel */}
                            <div className="form-panel right-panel">
                                <CheckboxGroup
                                    category="positions"
                                    items={positions}
                                    label="Положение"
                                    description="Пространственные положения швов (наплавок)"
                                />
                                <CheckboxGroup
                                    category="connections"
                                    items={connections}
                                    label="Свар. соединения"
                                    description="Виды сварных соединений"
                                />
                                <CheckboxGroup
                                    category="materials"
                                    items={materials}
                                    label="Свар. материалы"
                                    description="Группы сварочных материалов"
                                />
                                <CheckboxGroup
                                    category="parts"
                                    items={parts}
                                    label="Свар. детали"
                                    description="Виды свариваемых деталей"
                                />
                                <CheckboxGroup
                                    category="weldTypes"
                                    items={weldTypes}
                                    label="Тип свар. шва"
                                    description="Тип сварного шва"
                                />

                                <div className="form-group">
                                    <Tooltip text="Толщина свариваемых деталей в миллиметрах">
                                        <label>Толщина деталей, мм</label>
                                    </Tooltip>
                                    <div className="range-inputs">
                                        <input
                                            type="number"
                                            name="thicknessFrom"
                                            value={formData.thicknessFrom}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            placeholder="от"
                                        />
                                        <input
                                            type="number"
                                            name="thicknessTo"
                                            value={formData.thicknessTo}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            placeholder="до"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <Tooltip text="Наружный диаметр свариваемых деталей в миллиметрах">
                                        <label>Наружный диаметр от, мм</label>
                                    </Tooltip>
                                    <div className="range-inputs">
                                        <input
                                            type="number"
                                            name="diameterFrom"
                                            value={formData.diameterFrom}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            placeholder="от"
                                        />
                                        <input
                                            type="number"
                                            name="diameterTo"
                                            value={formData.diameterTo}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            placeholder="до"
                                        />
                                    </div>
                                </div>

                                <div className="form-actions">
                                    {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
                                    <button
                                        className="save-btn"
                                        onClick={handleSave}
                                        disabled={!isEditing || loading}
                                    >
                                        {loading ? 'Сохранение...' : 'Сохранить аттестат'}
                                    </button>
                                    <button
                                        className="delete-btn-cert"
                                        onClick={handleDelete}
                                        disabled={loading}
                                    >
                                        × Удалить аттестат
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CertificationPage;

