import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FaBell, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { RiRfidFill } from 'react-icons/ri';
import { FaTrash } from 'react-icons/fa';
import UserProfile from '../components/UserProfile';
import AddRfidPassModal from '../components/AddRfidPassModal';
import EmailVerifyModal from '../components/EmailVerifyModal';
import { getRoles, createUserAccount, getUserAccountById, updateUserAccount } from '../api/userAccountApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';
import { api } from '../services/api';
import { buildOrganizationHierarchy } from '../utils/organizationUnitTree';
import '../styles/addUserPage.css';

function AddUserPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEditMode = !!id;
    const fromCreateEnterprise = location.state?.fromCreateEnterprise === true;
    const enterpriseName = location.state?.enterpriseName || '';
    const enterpriseData = location.state?.enterpriseData || null;
    const [roles, setRoles] = useState([]);
    const [accessAllowed, setAccessAllowed] = useState(null);
    const [currentUserIsAdminAlloy, setCurrentUserIsAdminAlloy] = useState(false);
    const [currentUserIsAdminDealer, setCurrentUserIsAdminDealer] = useState(false);
    const [currentUserIsUserAlloy, setCurrentUserIsUserAlloy] = useState(false);
    const [currentUserCanCreateEnterprises, setCurrentUserCanCreateEnterprises] = useState(false);
    const [currentUserCanManageEnterpriseAdmins, setCurrentUserCanManageEnterpriseAdmins] = useState(false);
    const [currentUserOrgId, setCurrentUserOrgId] = useState(null);
    const [isEnterpriseScopedRole, setIsEnterpriseScopedRole] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [permissionChecks, setPermissionChecks] = useState({});
    const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
    const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
    const [expandedUnits, setExpandedUnits] = useState({});
    const typeRef = useRef(null);
    const departmentRef = useRef(null);
    const [rfidPasses, setRfidPasses] = useState([]);
    const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
    const [emailVerifyModalOpen, setEmailVerifyModalOpen] = useState(false);
    const [verifyEmailSnapshot, setVerifyEmailSnapshot] = useState('');
    const [savedEmailFromServer, setSavedEmailFromServer] = useState('');
    const [submitError, setSubmitError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        userTypeId: null,
        login: '',
        password: '',
        fullName: '',
        organizationId: null,
        departmentId: null,
        position: '',
        phone: '',
        email: '',
        emailVerified: false,
        personnelNumber: '',
        blocked: false,
    });

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const [currentUser, rolesData] = await Promise.all([
                    api.getCurrentUser(),
                    getRoles(),
                ]);
                if (!currentUser) {
                    setAccessAllowed(false);
                    return;
                }
                const roleId = currentUser.userRoleId ?? currentUser.userRole?.id;
                const role = (Array.isArray(rolesData) ? rolesData : []).find(
                    (r) => r.id === roleId || r.id === parseInt(roleId, 10)
                );
                const name = (role?.name || '').toLowerCase();
                const isAdmin = name.includes('admin') || name.includes('админ');
                const isAdminAlloy =
                    name === 'admin_alloy' ||
                    ((name.includes('admin') && name.includes('alloy')) || (name.includes('админ') && name.includes('эллой')));
                const isUserAlloy =
                    name === 'user_alloy' ||
                    ((name.includes('user') && name.includes('alloy')) || (name.includes('пользователь') && name.includes('эллой')));
                const isAdminDealer =
                    name === 'admin_dealer' ||
                    (name.includes('admin') && name.includes('dealer')) ||
                    (name.includes('админ') && name.includes('дил'));
                const isAdminEnterprise = name === 'admin_enterprise' || (name.includes('admin') && name.includes('enterprise'));
                const isUserEnterprise = name === 'user_enterprise' || (name.includes('user') && name.includes('enterprise'));
                const allowed = Array.isArray(currentUser.allowedUserActions) ? currentUser.allowedUserActions : [];
                const allowedLower = allowed.map((a) => String(a || '').toLowerCase());
                const hasCreateEnterprises =
                    allowedLower.includes('create_delete_enterprises') ||
                    allowedLower.some((a) => a.includes('create_delete_enterprises'));
                const hasManageEnterpriseAdmins =
                    allowedLower.includes('create_edit_enterprise_admins') ||
                    allowedLower.some((a) => a.includes('create_edit_enterprise_admins'));
                const fromCreateEnterprise = location.state?.fromCreateEnterprise === true;
                const allowFromEnterpriseFlow =
                    fromCreateEnterprise &&
                    (isAdminAlloy || (isUserAlloy && hasCreateEnterprises && hasManageEnterpriseAdmins));
                const allowUserAlloyEnterpriseAdmin = isUserAlloy && hasManageEnterpriseAdmins;
                setAccessAllowed(isAdmin || allowFromEnterpriseFlow || allowUserAlloyEnterpriseAdmin);
                setCurrentUserIsAdminAlloy(!!isAdminAlloy);
                setCurrentUserIsAdminDealer(!!isAdminDealer);
                setCurrentUserIsUserAlloy(!!isUserAlloy);
                setCurrentUserCanCreateEnterprises(!!hasCreateEnterprises);
                setCurrentUserCanManageEnterpriseAdmins(!!hasManageEnterpriseAdmins);
                setIsEnterpriseScopedRole(!!(isAdminEnterprise || isUserEnterprise));
                setCurrentUserOrgId(currentUser.organizationId ?? currentUser.organization?.id ?? null);
                if (!isAdmin && !allowFromEnterpriseFlow && !allowUserAlloyEnterpriseAdmin) {
                    navigate('/employees', { replace: true });
                    return;
                }
            } catch (_) {
                setAccessAllowed(false);
                setIsEnterpriseScopedRole(false);
                setCurrentUserOrgId(null);
                navigate('/employees', { replace: true });
                return;
            }
        };
        checkAccess();
    }, [navigate, location.state]);

    useEffect(() => {
        if (!accessAllowed) return;
        const load = async () => {
            try {
                const [rolesData, unitsData, organizationsData] = await Promise.all([
                    getRoles(),
                    getAllOrganizationUnits(),
                    api.getOrganizations(),
                ]);
                const loadedRoles = Array.isArray(rolesData) ? rolesData : [];
                let loadedUnits = Array.isArray(unitsData) ? unitsData : [];
                let loadedOrganizations = Array.isArray(organizationsData) ? organizationsData : [];
                if (isEnterpriseScopedRole && currentUserOrgId != null) {
                    loadedUnits = loadedUnits.filter(
                        (u) => String(u.organizationId ?? u.organization?.id ?? u.organization_id ?? '') === String(currentUserOrgId)
                    );
                    loadedOrganizations = loadedOrganizations.filter((o) => String(o.id) === String(currentUserOrgId));
                }
                setRoles(loadedRoles);
                setOrganizationUnits(loadedUnits);
                setOrganizations(loadedOrganizations);

                if (isEditMode && id) {
                    try {
                        const userData = await getUserAccountById(id);
                        if (userData) {
                            const roleObj = loadedRoles.find((r) => r.id === userData.userRoleId);
                            const targetRoleName = String(roleObj?.name || '').toUpperCase();
                            if (
                                currentUserIsAdminDealer &&
                                (targetRoleName === 'ADMIN_ENTERPRISE' || targetRoleName === 'USER_ENTERPRISE')
                            ) {
                                setSubmitError('Администратор дилера не может редактировать пользователей предприятия.');
                                navigate('/employees', { replace: true });
                                return;
                            }
                            setFormData({
                                userTypeId: roleObj?.name || null,
                                login: userData.username || '',
                                password: '',
                                fullName: userData.fullName || '',
                                organizationId: userData.organizationId ?? userData.organization?.id ?? null,
                                departmentId: userData.organizationUnit?.id || null,
                                position: userData.position || '',
                                phone: userData.phone || '',
                                email: userData.email || '',
                                emailVerified: !!userData.emailVerified,
                                personnelNumber: userData.personnelNumber || '',
                                blocked: (userData.status || '').toLowerCase() === 'blocked',
                            });
                            setSavedEmailFromServer((userData.email || '').trim());
                            if (userData.rfid) {
                                const codes = userData.rfid.split(',').map((c) => c.trim()).filter(Boolean);
                                setRfidPasses(codes.map((code, i) => ({ id: Date.now() + i, code })));
                            }
                            if (userData.allowedUserActions && Array.isArray(userData.allowedUserActions)) {
                                const checks = {};
                                userData.allowedUserActions.forEach((actionId) => {
                                    checks[actionId] = true;
                                });
                                setPermissionChecks(checks);
                            }
                        }
                    } catch (err) {
                        console.error('Ошибка загрузки данных пользователя:', err);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        load();
    }, [accessAllowed, isEditMode, id, isEnterpriseScopedRole, currentUserOrgId, currentUserIsAdminDealer, navigate]);

    useEffect(() => {
        if (accessAllowed && fromCreateEnterprise) {
            setFormData((prev) => ({ ...prev, userTypeId: 'ADMIN_ENTERPRISE' }));
        }
    }, [accessAllowed, fromCreateEnterprise]);

    useEffect(() => {
        if (!currentUserIsAdminAlloy && (formData.userTypeId === 'ADMIN_ALLOY' || formData.userTypeId === 'USER_ALLOY')) {
            setFormData((prev) => ({ ...prev, userTypeId: null }));
        }
    }, [currentUserIsAdminAlloy, formData.userTypeId]);

    useEffect(() => {
        const handleClick = (e) => {
            if (typeRef.current && !typeRef.current.contains(e.target)) setTypeDropdownOpen(false);
            if (departmentRef.current && !departmentRef.current.contains(e.target)) setDepartmentDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        setExpandedUnits({});
    }, [formData.organizationId]);

    const userTypeOptions = useMemo(() => {
        let all = [
            { id: 'ADMIN_ALLOY', label: 'Админ Эллой' },
            { id: 'USER_ALLOY', label: 'Пользователь Эллой' },
            { id: 'ADMIN_DEALER', label: 'Админ диллера' },
            { id: 'USER_DEALER', label: 'Пользователь диллера' },
            { id: 'ADMIN_ENTERPRISE', label: 'Админ предприятия' },
            { id: 'USER_ENTERPRISE', label: 'Пользователь предприятия' },
        ];
        // Роли Alloy может создавать/редактировать только Admin Alloy
        if (!currentUserIsAdminAlloy) {
            all = all.filter((o) => o.id !== 'ADMIN_ALLOY' && o.id !== 'USER_ALLOY');
        }
        if (currentUserIsUserAlloy && !currentUserIsAdminAlloy) {
            all = all.filter((o) => o.id === 'ADMIN_ENTERPRISE');
        }
        if (currentUserIsAdminDealer) {
            all = all.filter((o) => o.id !== 'ADMIN_ENTERPRISE' && o.id !== 'USER_ENTERPRISE');
        }
        const canManageEnterpriseAdminRole =
            currentUserIsAdminAlloy || (currentUserIsUserAlloy && currentUserCanManageEnterpriseAdmins);
        if (!canManageEnterpriseAdminRole) {
            all = all.filter((o) => o.id !== 'ADMIN_ENTERPRISE');
        }
        // Админ предприятия по умолчанию доступен в потоке создания предприятия,
        // а также при редактировании уже существующего админа предприятия.
        const showAdminEnterprise =
            fromCreateEnterprise ||
            canManageEnterpriseAdminRole ||
            (isEditMode && formData.userTypeId === 'ADMIN_ENTERPRISE');
        if (!showAdminEnterprise) {
            // Если редактируем существующего пользователя с ролью ADMIN_ENTERPRISE, оставляем роль в списке
            const filtered = all.filter((o) => o.id !== 'ADMIN_ENTERPRISE');
            if (isEditMode && formData.userTypeId === 'ADMIN_ENTERPRISE') {
                filtered.push({ id: 'ADMIN_ENTERPRISE', label: 'Админ предприятия' });
            }
            return filtered;
        }
        return all;
    }, [
        fromCreateEnterprise,
        isEditMode,
        formData.userTypeId,
        currentUserIsAdminAlloy,
        currentUserIsAdminDealer,
        currentUserIsUserAlloy,
        currentUserCanManageEnterpriseAdmins,
    ]);

    const permissionsUserAlloy = useMemo(
        () => [
            {
                title: 'Работа с пользователями',
                items: [
                    { id: 'recovery_account', label: 'Восстановление аккаунта по номеру тел., эл. почте', defaultChecked: true },
                    { id: 'create_edit_enterprise_admins', label: 'Создание/редактирование админов предприятий', defaultChecked: true },
                    { id: 'create_edit_enterprise_users', label: 'Создание/редактирование пользователей предприятий', defaultChecked: false },
                    { id: 'reset_enterprise_admin_passwords', label: 'Сброс паролей админов предприятий', defaultChecked: false },
                    { id: 'reset_enterprise_user_passwords', label: 'Сброс паролей пользователей предприятий', defaultChecked: false },
                    { id: 'create_edit_dealer_admins', label: 'Создание/редактирование админов диллеров', defaultChecked: true },
                    { id: 'create_edit_dealer_users', label: 'Создание/редактирование пользователей диллеров', defaultChecked: false },
                    { id: 'reset_dealer_admin_passwords', label: 'Сброс паролей админов диллера', defaultChecked: false },
                    { id: 'reset_dealer_user_passwords', label: 'Сброс паролей пользователей диллера', defaultChecked: false },
                    { id: 'create_alloy_admins', label: 'Создание администраторов Эллой', disabled: true },
                    { id: 'create_edit_alloy_users', label: 'Создание/редактирование пользователей Эллой', disabled: true },
                    { id: 'reset_alloy_user_passwords', label: 'Сброс паролей пользователей Эллой', disabled: true },
                ],
            },
            {
                title: 'Работа с оборудованием',
                items: [
                    { id: 'wifi_modules_wt2', label: 'Внесения/удаления модулей Wi-Fi в базу WT2', defaultChecked: false },
                    { id: 'add_equipment_core_pulse', label: 'Добавление оборудования (ИП Core Pulse)', defaultChecked: true },
                    { id: 'move_equipment_change_info', label: 'Перемещение между подразд., изм. инфор. об оборуд.', defaultChecked: true },
                    { id: 'delete_equipment', label: 'Удаление оборудования', defaultChecked: false },
                    { id: 'view_ip_history', label: 'Доступность просмотра истории работы ИП (графики)', defaultChecked: false },
                    { id: 'ip_management_functions', label: 'Доступность функций управления ИП', defaultChecked: false },
                    { id: 'fix_maintenance', label: 'Фиксация проведения ТО', disabled: true },
                    { id: 'assign_welders_to_equipment', label: 'Привязка сварщиков к оборудованию', disabled: true },
                ],
            },
            {
                title: 'Работа с организациями',
                items: [
                    { id: 'visibility_edit_dealers', label: 'Видимость/редактирование диллеров', defaultChecked: false },
                    { id: 'create_delete_dealers', label: 'Создание/удаление диллеров', defaultChecked: false },
                    { id: 'visibility_edit_enterprises', label: 'Видимость/редактирование предприятий', defaultChecked: false },
                    { id: 'create_delete_enterprises', label: 'Создание/удаление предприятий', defaultChecked: false },
                    { id: 'visibility_edit_alloy', label: 'Видимость/редактирование Эллой', disabled: true },
                ],
            },
            {
                title: 'Работа со сварщиками',
                items: [
                    { id: 'add_delete_edit_welders', label: 'Добавление/удаление/изменение сварщиков', disabled: true },
                    { id: 'manage_welder_certification', label: 'Управление данными об аттестации сварщика', disabled: true },
                    { id: 'add_delete_rfid_passes', label: 'Добавление/удаление RFID пропусков', disabled: true },
                ],
            },
            {
                title: 'Прочие функции',
                items: [
                    { id: 'work_with_reports', label: 'Работа с отчетами', defaultChecked: false },
                    { id: 'work_with_notifications', label: 'Работа с уведомлениями', defaultChecked: true },
                    { id: 'welding_materials', label: 'Добавление/удаление/изменения свар. материалов', defaultChecked: false },
                    { id: 'wps_cards', label: 'Добавление/удаление/изменения WPS карт', defaultChecked: false },
                ],
            },
        ],
        []
    );

    // Права для типа "Пользователь дилера"
    const permissionsUserDealer = useMemo(
        () => [
            {
                title: 'Работа с пользователями',
                items: [
                    { id: 'recovery_account', label: 'Восстановление аккаунта по номеру тел., эл. почте', defaultChecked: true },
                    { id: 'create_edit_enterprise_admins', label: 'Создание/редактирование админов предприятий', defaultChecked: false },
                    { id: 'create_edit_enterprise_users', label: 'Создание/редактирование пользователей предприятий', defaultChecked: false },
                    { id: 'reset_enterprise_admin_passwords', label: 'Сброс паролей админов предприятий', defaultChecked: false },
                    { id: 'reset_enterprise_user_passwords', label: 'Сброс паролей пользователей предприятий', defaultChecked: false },
                    { id: 'create_edit_dealer_admins', label: 'Создание/редактирование админов диллеров', defaultChecked: true },
                    { id: 'create_edit_dealer_users', label: 'Создание/редактирование пользователей диллеров', defaultChecked: true },
                    { id: 'reset_dealer_admin_passwords', label: 'Сброс паролей админов диллера', defaultChecked: true },
                    { id: 'reset_dealer_user_passwords', label: 'Сброс паролей пользователей диллера', defaultChecked: true },
                    { id: 'create_alloy_admins', label: 'Создание администраторов Эллой', disabled: true },
                    { id: 'create_edit_alloy_users', label: 'Создание/редактирование пользователей Эллой', disabled: true },
                    { id: 'reset_alloy_user_passwords', label: 'Сброс паролей пользователей Эллой', disabled: true },
                ],
            },
            {
                title: 'Работа с оборудованием',
                items: [
                    { id: 'wifi_modules_wt2', label: 'Внесения/удаления модулей Wi-Fi в базу WT2', defaultChecked: false },
                    { id: 'add_equipment_core_pulse', label: 'Добавление оборудования (ИП Core Pulse)', defaultChecked: true },
                    { id: 'move_equipment_change_info', label: 'Перемещение между подразд., изм. инфор. об оборуд.', defaultChecked: true },
                    { id: 'delete_equipment', label: 'Удаление оборудования', defaultChecked: true },
                    { id: 'view_ip_history', label: 'Доступность просмотра истории работы ИП (графики)', defaultChecked: true },
                    { id: 'ip_management_functions', label: 'Доступность функций управления ИП', defaultChecked: false },
                    { id: 'fix_maintenance', label: 'Фиксация проведения ТО', disabled: true },
                    { id: 'assign_welders_to_equipment', label: 'Привязка сварщиков к оборудованию', disabled: true },
                ],
            },
            {
                title: 'Работа с организациями',
                items: [
                    { id: 'visibility_edit_dealers', label: 'Видимость/редактирование диллеров', defaultChecked: true },
                    { id: 'create_delete_dealers', label: 'Создание/удаление диллеров', defaultChecked: false },
                    { id: 'visibility_edit_enterprises', label: 'Видимость/редактирование предприятий', defaultChecked: false },
                    { id: 'create_delete_enterprises', label: 'Создание/удаление предприятий', defaultChecked: false },
                    { id: 'visibility_edit_alloy', label: 'Видимость/редактирование Эллой', disabled: true },
                ],
            },
            {
                title: 'Работа со сварщиками',
                items: [
                    { id: 'add_delete_edit_welders', label: 'Добавление/удаление/изменение сварщиков', defaultChecked: true },
                    { id: 'manage_welder_certification', label: 'Управление данными об аттестации сварщика', defaultChecked: true },
                    { id: 'add_delete_rfid_passes', label: 'Добавление/удаление RFID пропусков', defaultChecked: true },
                ],
            },
            {
                title: 'Прочие функции',
                items: [
                    { id: 'work_with_reports', label: 'Работа с отчетами', defaultChecked: true },
                    { id: 'work_with_notifications', label: 'Работа с уведомлениями', defaultChecked: true },
                    { id: 'welding_materials', label: 'Добавление/удаление/изменения свар. материалов', defaultChecked: false },
                    { id: 'wps_cards', label: 'Добавление/удаление/изменения WPS карт', defaultChecked: false },
                ],
            },
        ],
        []
    );

    // Права для типа "Пользователь предприятия"
    const permissionsUserEnterprise = useMemo(
        () => [
            {
                title: 'Работа с пользователями',
                items: [
                    { id: 'recovery_account', label: 'Восстановление аккаунта по номеру тел., эл. почте', defaultChecked: true },
                    { id: 'create_edit_enterprise_admins', label: 'Создание/редактирование админов предприятий', defaultChecked: false },
                    { id: 'create_edit_enterprise_users', label: 'Создание/редактирование пользователей предприятий', defaultChecked: true },
                    { id: 'reset_enterprise_admin_passwords', label: 'Сброс паролей админов предприятий', defaultChecked: false },
                    { id: 'reset_enterprise_user_passwords', label: 'Сброс паролей пользователей предприятий', defaultChecked: true },
                    { id: 'create_edit_dealer_admins', label: 'Создание/редактирование админов диллеров', defaultChecked: false },
                    { id: 'create_edit_dealer_users', label: 'Создание/редактирование пользователей диллеров', defaultChecked: false },
                    { id: 'reset_dealer_admin_passwords', label: 'Сброс паролей админов диллера', defaultChecked: false },
                    { id: 'reset_dealer_user_passwords', label: 'Сброс паролей пользователей диллера', defaultChecked: false },
                    { id: 'create_alloy_admins', label: 'Создание администраторов Эллой', disabled: true },
                    { id: 'create_edit_alloy_users', label: 'Создание/редактирование пользователей Эллой', disabled: true },
                    { id: 'reset_alloy_user_passwords', label: 'Сброс паролей пользователей Эллой', disabled: true },
                ],
            },
            {
                title: 'Работа с оборудованием',
                items: [
                    { id: 'wifi_modules_wt2', label: 'Внесения/удаления модулей Wi-Fi в базу WT2', defaultChecked: false },
                    { id: 'add_equipment_core_pulse', label: 'Добавление оборудования (ИП Core Pulse)', defaultChecked: true },
                    { id: 'move_equipment_change_info', label: 'Перемещение между подразд., изм. инфор. об оборуд.', defaultChecked: false },
                    { id: 'delete_equipment', label: 'Удаление оборудования', defaultChecked: false },
                    { id: 'view_ip_history', label: 'Доступность просмотра истории работы ИП (графики)', defaultChecked: true },
                    { id: 'ip_management_functions', label: 'Доступность функций управления ИП', defaultChecked: false },
                    { id: 'fix_maintenance', label: 'Фиксация проведения ТО', defaultChecked: false },
                    { id: 'assign_welders_to_equipment', label: 'Привязка сварщиков к оборудованию', defaultChecked: false },
                ],
            },
            {
                title: 'Работа с организациями',
                items: [
                    { id: 'visibility_edit_dealers', label: 'Видимость/редактирование диллеров', defaultChecked: false },
                    { id: 'create_delete_dealers', label: 'Создание/удаление диллеров', defaultChecked: false },
                    { id: 'visibility_edit_enterprises', label: 'Видимость/редактирование предприятий', defaultChecked: true },
                    { id: 'create_delete_enterprises', label: 'Создание/удаление предприятий', defaultChecked: false },
                    { id: 'visibility_edit_alloy', label: 'Видимость/редактирование Эллой', disabled: true },
                ],
            },
            {
                title: 'Работа со сварщиками',
                items: [
                    { id: 'add_delete_edit_welders', label: 'Добавление/удаление/изменение сварщиков', defaultChecked: true },
                    { id: 'manage_welder_certification', label: 'Управление данными об аттестации сварщика', defaultChecked: false },
                    { id: 'add_delete_rfid_passes', label: 'Добавление/удаление RFID пропусков', defaultChecked: false },
                ],
            },
            {
                title: 'Прочие функции',
                items: [
                    { id: 'work_with_reports', label: 'Работа с отчетами', defaultChecked: true },
                    { id: 'work_with_notifications', label: 'Работа с уведомлениями', defaultChecked: true },
                    { id: 'welding_materials', label: 'Добавление/удаление/изменения свар. материалов', defaultChecked: false },
                    { id: 'wps_cards', label: 'Добавление/удаление/изменения WPS карт', defaultChecked: false },
                ],
            },
        ],
        []
    );

    // Права для типа "Админ предприятия"
    const permissionsAdminEnterprise = useMemo(
        () => [
            {
                title: 'Работа с пользователями',
                items: [
                    { id: 'recovery_account', label: 'Восстановление аккаунта по номеру тел., эл. почте', defaultChecked: true },
                    { id: 'create_edit_enterprise_users', label: 'Создание/редактирование пользователей предприятий', defaultChecked: true },
                    { id: 'reset_enterprise_user_passwords', label: 'Сброс паролей пользователей предприятий', defaultChecked: true },
                ],
            },
            {
                title: 'Работа с оборудованием',
                items: [
                    { id: 'add_equipment_core_pulse', label: 'Добавление оборудования (ИП Core Pulse)', defaultChecked: true },
                    { id: 'move_equipment_change_info', label: 'Перемещение между подразд., изм. инфор. об оборуд.', defaultChecked: true },
                    { id: 'delete_equipment', label: 'Удаление оборудования', defaultChecked: true },
                    { id: 'view_ip_history', label: 'Доступность просмотра истории работы ИП (графики)', defaultChecked: true },
                    { id: 'ip_management_functions', label: 'Доступность функций управления ИП', defaultChecked: true },
                    { id: 'fix_maintenance', label: 'Фиксация проведения ТО', defaultChecked: true },
                    { id: 'assign_welders_to_equipment', label: 'Привязка сварщиков к оборудованию', defaultChecked: true },
                ],
            },
            {
                title: 'Работа с организациями',
                items: [
                    { id: 'visibility_edit_enterprises', label: 'Видимость/редактирование предприятий', defaultChecked: true },
                ],
            },
            {
                title: 'Работа со сварщиками',
                items: [
                    { id: 'add_delete_edit_welders', label: 'Добавление/удаление/изменение сварщиков', defaultChecked: true },
                    { id: 'manage_welder_certification', label: 'Управление данными об аттестации сварщика', defaultChecked: true },
                    { id: 'add_delete_rfid_passes', label: 'Добавление/удаление RFID пропусков', defaultChecked: true },
                ],
            },
            {
                title: 'Прочие функции',
                items: [
                    { id: 'work_with_reports', label: 'Работа с отчетами', defaultChecked: true },
                    { id: 'work_with_notifications', label: 'Работа с уведомлениями', defaultChecked: true },
                    { id: 'welding_materials', label: 'Добавление/удаление/изменения свар. материалов', defaultChecked: true },
                    { id: 'wps_cards', label: 'Добавление/удаление/изменения WPS карт', defaultChecked: true },
                ],
            },
        ],
        []
    );

    const permissionsAdminDealer = useMemo(
        () => [
            {
                title: 'Работа с пользователями',
                items: [
                    { id: 'recovery_account', label: 'Восстановление аккаунта по номеру тел., эл. почте', defaultChecked: true },
                    { id: 'create_edit_enterprise_admins', label: 'Создание/редактирование админов предприятий', defaultChecked: true },
                    { id: 'create_edit_enterprise_users', label: 'Создание/редактирование пользователей предприятий', defaultChecked: true },
                    { id: 'reset_enterprise_admin_passwords', label: 'Сброс паролей админов предприятий', defaultChecked: false },
                    { id: 'reset_enterprise_user_passwords', label: 'Сброс паролей пользователей предприятий', defaultChecked: false },
                    { id: 'create_edit_dealer_admins', label: 'Создание/редактирование админов диллеров', defaultChecked: true },
                    { id: 'create_edit_dealer_users', label: 'Создание/редактирование пользователей диллеров', defaultChecked: false },
                    { id: 'reset_dealer_admin_passwords', label: 'Сброс паролей админов диллера', defaultChecked: false },
                    { id: 'reset_dealer_user_passwords', label: 'Сброс паролей пользователей диллера', defaultChecked: false },
                    { id: 'create_alloy_admins', label: 'Создание администраторов Эллой', disabled: true },
                    { id: 'create_edit_alloy_users', label: 'Создание/редактирование пользователей Эллой', disabled: true },
                    { id: 'reset_alloy_user_passwords', label: 'Сброс паролей пользователей Эллой', disabled: true },
                ],
            },
            {
                title: 'Работа с оборудованием',
                items: [
                    { id: 'wifi_modules_wt2', label: 'Внесение/удаления модулей Wi-Fi в базу WT2', defaultChecked: true },
                    { id: 'add_equipment_core_pulse', label: 'Добавление оборудования (ИП Core Pulse)', defaultChecked: true },
                    { id: 'move_equipment_change_info', label: 'Перемещение между подразд., изм. инфор. об оборуд', defaultChecked: true },
                    { id: 'delete_equipment', label: 'Удаление оборудования', defaultChecked: true },
                    { id: 'view_ip_history', label: 'Доступность просмотра истории работы ИП (графики)', defaultChecked: true },
                    { id: 'ip_management_functions', label: 'Доступность функций управления ИП', defaultChecked: true },
                    { id: 'fix_maintenance', label: 'Фиксация проведения ТО', defaultChecked: true },
                    { id: 'assign_welders_to_equipment', label: 'Привязка сварщиков к оборудованию', defaultChecked: false },
                ],
            },
            {
                title: 'Работа с организациями',
                items: [
                    { id: 'visibility_edit_dealers', label: 'Видимость/редактирование', defaultChecked: true },
                    { id: 'create_delete_dealers', label: 'Создание/удаление диллеров', defaultChecked: true },
                    { id: 'visibility_edit_enterprises', label: 'Видимость/редактирование предприятий', defaultChecked: true },
                    { id: 'create_delete_enterprises', label: 'Создание/удаление предприятий', defaultChecked: true },
                    { id: 'visibility_edit_alloy', label: 'Видимость/редактирование', defaultChecked: false },
                ],
            },
            {
                title: 'Работа со сварщиками',
                items: [
                    { id: 'add_delete_edit_welders', label: 'Добавление/удаление/изменение сварщиков', defaultChecked: true },
                    { id: 'manage_welder_certification', label: 'Управление данными об аттестации сварщика', defaultChecked: true },
                    { id: 'add_delete_rfid_passes', label: 'Добавление/удаление RFID пропусков', defaultChecked: true },
                ],
            },
            {
                title: 'Прочие функции',
                items: [
                    { id: 'work_with_reports', label: 'Работа с отчетами', defaultChecked: true },
                    { id: 'work_with_notifications', label: 'Работа с уведомлениями', defaultChecked: true },
                    { id: 'welding_materials', label: 'Добавление/удаление/изменения свар материалов', defaultChecked: true },
                    { id: 'wps_cards', label: 'Добавление/удаление/изменения WPS карт', defaultChecked: true },
                ],
            },
        ],
        []
    );

    const permissionsAdminAlloy = useMemo(
        () => [
            {
                title: 'Работа с пользователями',
                items: [
                    { id: 'recovery_account', label: 'Восстановление аккаунта по номеру тел., эл. почте', defaultChecked: true },
                    { id: 'create_edit_enterprise_admins', label: 'Создание/редактирование админов предприятий', defaultChecked: true },
                    { id: 'create_edit_enterprise_users', label: 'Создание/редактирование пользователей предприятий', defaultChecked: true },
                    { id: 'reset_enterprise_admin_passwords', label: 'Сброс паролей админов предприятий', defaultChecked: true },
                    { id: 'reset_enterprise_user_passwords', label: 'Сброс паролей пользователей предприятий', defaultChecked: true },
                    { id: 'create_edit_dealer_admins', label: 'Создание/редактирование админов диллеров', defaultChecked: true },
                    { id: 'create_edit_dealer_users', label: 'Создание/редактирование пользователей диллеров', defaultChecked: true },
                    { id: 'reset_dealer_admin_passwords', label: 'Сброс паролей админов диллера', defaultChecked: true },
                    { id: 'reset_dealer_user_passwords', label: 'Сброс паролей пользователей диллера', defaultChecked: true },
                    { id: 'create_alloy_admins', label: 'Создание администраторов Эллой', defaultChecked: true },
                    { id: 'create_edit_alloy_users', label: 'Создание/редактирование пользователей Эллой', defaultChecked: true },
                    { id: 'reset_alloy_user_passwords', label: 'Сброс паролей пользователей Эллой', defaultChecked: true },
                ],
            },
            {
                title: 'Работа с оборудованием',
                items: [
                    { id: 'wifi_modules_wt2', label: 'Внесения/удаления модулей Wi-Fi в базу WT2', defaultChecked: true },
                    { id: 'add_equipment_core_pulse', label: 'Добавление оборудования (ИП Core Pulse)', defaultChecked: true },
                    { id: 'move_equipment_change_info', label: 'Перемещение между подразд., изм. инфор. об оборуд.', defaultChecked: true },
                    { id: 'delete_equipment', label: 'Удаление оборудования', defaultChecked: true },
                    { id: 'view_ip_history', label: 'Доступность просмотра истории работы ИП (графики)', defaultChecked: true },
                    { id: 'ip_management_functions', label: 'Доступность функций управления ИП', defaultChecked: true },
                    { id: 'fix_maintenance', label: 'Фиксация проведения ТО', defaultChecked: true },
                    { id: 'assign_welders_to_equipment', label: 'Привязка сварщиков к оборудованию', defaultChecked: true },
                ],
            },
            {
                title: 'Работа с организациями',
                items: [
                    { id: 'visibility_edit_dealers', label: 'Видимость/редактирование диллеров', defaultChecked: true },
                    { id: 'create_delete_dealers', label: 'Создание/удаление диллеров', defaultChecked: true },
                    { id: 'visibility_edit_enterprises', label: 'Видимость/редактирование предприятий', defaultChecked: true },
                    { id: 'create_delete_enterprises', label: 'Создание/удаление предприятий', defaultChecked: true },
                    { id: 'visibility_edit_alloy', label: 'Видимость/редактирование Эллой', defaultChecked: true },
                ],
            },
            {
                title: 'Работа со сварщиками',
                items: [
                    { id: 'add_delete_edit_welders', label: 'Добавление/удаление/изменение сварщиков', defaultChecked: true },
                    { id: 'manage_welder_certification', label: 'Управление данными об аттестации сварщика', defaultChecked: true },
                    { id: 'add_delete_rfid_passes', label: 'Добавление/удаление RFID пропусков', defaultChecked: true },
                ],
            },
            {
                title: 'Прочие функции',
                items: [
                    { id: 'work_with_reports', label: 'Работа с отчетами', defaultChecked: true },
                    { id: 'work_with_notifications', label: 'Работа с уведомлениями', defaultChecked: true },
                    { id: 'welding_materials', label: 'Добавление/удаление/изменения свар. материалов', defaultChecked: true },
                    { id: 'wps_cards', label: 'Добавление/удаление/изменения WPS карт', defaultChecked: true },
                ],
            },
        ],
        []
    );

    const selectedRole = userTypeOptions.find((t) => t.id === formData.userTypeId);
    const selectedOrganization = organizations.find((org) => String(org.id) === String(formData.organizationId));
    const filteredOrganizationUnits = useMemo(() => {
        if (!formData.organizationId) return [];
        return organizationUnits.filter(
            (u) =>
                String(u.organizationId ?? u.organization?.id ?? u.organization_id ?? '') ===
                String(formData.organizationId)
        );
    }, [organizationUnits, formData.organizationId]);

    const organizationUnitHierarchy = useMemo(
        () => buildOrganizationHierarchy(filteredOrganizationUnits),
        [filteredOrganizationUnits]
    );

    const toggleUnitExpand = (unitId) => {
        setExpandedUnits((prev) => ({
            ...prev,
            [unitId]: !prev[unitId],
        }));
    };

    const renderDepartmentUnitOption = (unit, level = 0) => {
        const isExpanded = expandedUnits[unit.id];
        const hasChildren = unit.children && unit.children.length > 0;
        const indent = level * 32;
        const isSelected = String(formData.departmentId) === String(unit.id);
        const isChild = level > 0;
        const displayName = (unit.name != null && String(unit.name).trim() !== '') ? unit.name : '—';

        return (
            <React.Fragment key={unit.id}>
                <div
                    className={`unit-option ${isSelected ? 'selected' : ''} ${isChild ? 'unit-option-child' : ''}`}
                    style={{
                        marginLeft: `${indent}px`,
                        paddingLeft: '12px',
                    }}
                    onClick={() => {
                        handleInput('departmentId', unit.id);
                        setDepartmentDropdownOpen(false);
                    }}
                >
                    {hasChildren ? (
                        <button
                            type="button"
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
                    <span className="unit-option-name">{displayName}</span>
                </div>
                {hasChildren && isExpanded && (
                    <div className="unit-children">
                        {unit.children.map((child) => renderDepartmentUnitOption(child, level + 1))}
                    </div>
                )}
            </React.Fragment>
        );
    };
    const isEnterpriseRoleTarget = formData.userTypeId === 'ADMIN_ENTERPRISE' || formData.userTypeId === 'USER_ENTERPRISE';
    const canConfigureAllowedActions =
        currentUserIsAdminAlloy === true ||
        (
            currentUserIsAdminDealer === true &&
            !isEnterpriseRoleTarget
        ) ||
        (
            currentUserIsUserAlloy === true &&
            currentUserCanManageEnterpriseAdmins === true &&
            formData.userTypeId === 'ADMIN_ENTERPRISE'
        );
    const showPermissionsPanel =
        canConfigureAllowedActions &&
        (formData.userTypeId === 'USER_ALLOY' ||
            formData.userTypeId === 'ADMIN_ALLOY' ||
            formData.userTypeId === 'ADMIN_DEALER' ||
            formData.userTypeId === 'USER_DEALER' ||
            formData.userTypeId === 'ADMIN_ENTERPRISE' ||
            formData.userTypeId === 'USER_ENTERPRISE');
    const currentPermissionsList =
        formData.userTypeId === 'ADMIN_ALLOY'
            ? permissionsAdminAlloy
            : formData.userTypeId === 'ADMIN_DEALER'
                ? permissionsAdminDealer
                : formData.userTypeId === 'USER_DEALER'
                    ? permissionsUserDealer
                    : formData.userTypeId === 'ADMIN_ENTERPRISE'
                        ? permissionsAdminEnterprise
                        : formData.userTypeId === 'USER_ENTERPRISE'
                            ? permissionsUserEnterprise
                            : permissionsUserAlloy;
    const selectedUnit = filteredOrganizationUnits.find((u) => String(u.id) === String(formData.departmentId));
    const showSelectTypeMessage = formData.userTypeId == null;

    const emailTrim = (formData.email || '').trim();
    const savedEmailTrim = (savedEmailFromServer || '').trim();
    const emailUnsavedForVerify = isEditMode && emailTrim !== savedEmailTrim;
    const canOpenEmailVerify =
        isEditMode &&
        id &&
        emailTrim.length > 0 &&
        !formData.emailVerified &&
        !emailUnsavedForVerify;

    const handleOpenEmailVerify = () => {
        if (!emailTrim) {
            alert('Укажите email');
            return;
        }
        if (emailUnsavedForVerify) {
            alert('Сначала сохраните изменения email (кнопка «Сохранить»).');
            return;
        }
        setVerifyEmailSnapshot(emailTrim);
        setEmailVerifyModalOpen(true);
    };

    const handleEmailVerified = (updated) => {
        setFormData((prev) => ({ ...prev, emailVerified: !!updated?.emailVerified }));
        if (updated?.email != null) setSavedEmailFromServer(String(updated.email).trim());
    };

    const handleInput = (field, value) => {
        if (field === 'organizationId') {
            const normalizedOrgId = value == null || value === '' ? null : parseInt(value, 10);
            setDepartmentDropdownOpen(false);
            setFormData((prev) => ({ ...prev, organizationId: Number.isNaN(normalizedOrgId) ? null : normalizedOrgId, departmentId: null }));
            return;
        }
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleRfidPassAdded = (rfidCode) => {
        const code = (rfidCode || '').trim();
        if (!code) return;
        if (rfidPasses.some((p) => (p.code || '').toLowerCase() === code.toLowerCase())) {
            alert('Этот RFID код уже добавлен');
            return;
        }
        setRfidPasses((prev) => [...prev, { id: Date.now(), code }]);
    };

    const handleDeleteRfidPass = (id) => {
        setRfidPasses((prev) => prev.filter((p) => p.id !== id));
    };

    const getPermissionChecked = (item) => permissionChecks[item.id] ?? item.defaultChecked ?? false;
    const setPermissionChecked = (id, checked) => setPermissionChecks((prev) => ({ ...prev, [id]: checked }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);
        if (!formData.login?.trim()) {
            setSubmitError('Введите логин');
            return;
        }
        if (!isEditMode && !formData.password?.trim()) {
            setSubmitError('Введите пароль');
            return;
        }
        if (!formData.fullName?.trim()) {
            setSubmitError('Введите Ф.И.О.');
            return;
        }
        if (!fromCreateEnterprise && !formData.organizationId) {
            setSubmitError('Выберите предприятие');
            return;
        }
        if (fromCreateEnterprise && !isEditMode && !enterpriseData) {
            setSubmitError('Не удалось получить данные предприятия. Вернитесь на шаг 1 и попробуйте снова.');
            return;
        }
        if (formData.userTypeId == null) {
            setSubmitError('Выберите тип пользователя');
            return;
        }
        const role = roles.find((r) => r.name === formData.userTypeId);
        if (!role || role.id == null) {
            setSubmitError('Не удалось определить роль пользователя. Обновите страницу.');
            return;
        }
        if (!currentUserIsAdminAlloy && (formData.userTypeId === 'ADMIN_ALLOY' || formData.userTypeId === 'USER_ALLOY')) {
            setSubmitError('Создание/редактирование пользователей Эллой доступно только Админу Эллой.');
            return;
        }
        if (currentUserIsUserAlloy && !currentUserIsAdminAlloy && formData.userTypeId !== 'ADMIN_ENTERPRISE') {
            setSubmitError('Пользователь Эллой может создавать или редактировать только администратора предприятия.');
            return;
        }
        if (currentUserIsAdminDealer && (formData.userTypeId === 'ADMIN_ENTERPRISE' || formData.userTypeId === 'USER_ENTERPRISE')) {
            setSubmitError('Администратор дилера не может создавать или редактировать пользователей предприятия.');
            return;
        }
        if (
            fromCreateEnterprise &&
            !currentUserIsAdminAlloy &&
            !(currentUserIsUserAlloy && currentUserCanCreateEnterprises && currentUserCanManageEnterpriseAdmins)
        ) {
            setSubmitError('Недостаточно прав для создания предприятия и его администратора.');
            return;
        }
        try {
            setIsSubmitting(true);
            const allPermissionItems = currentPermissionsList.flatMap((section) => section.items);
            let allowedUserActions = null;
            if (showPermissionsPanel && formData.userTypeId !== 'ADMIN_ALLOY') {
                allowedUserActions = allPermissionItems
                    .filter((item) => {
                        if (item.disabled) return false;
                        return getPermissionChecked(item);
                    })
                    .map((item) => item.id);
            }
            const rfidString = rfidPasses.length ? rfidPasses.map((p) => (p.code || '').trim()).filter(Boolean).join(',') : null;

            // In enterprise creation flow, we create Organization and Enterprise Admin together (step 2 submit).
            let createdOrgId = null;
            if (fromCreateEnterprise && enterpriseData && !isEditMode) {
                const settings = {
                    inn: (enterpriseData?.inn || '').trim() || null,
                    fullName: (enterpriseData?.fullName || '').trim() || null,
                    attachedDealerId: enterpriseData?.attachedDealerId || 'alloy',
                    attachedDealerName: enterpriseData?.attachedDealerName || 'Alloy',
                    attachedDealerOrganizationId: enterpriseData?.attachedDealerOrganizationId ?? null,
                };
                const orgPayload = {
                    name: (enterpriseData?.name || enterpriseName || '').trim(),
                    description: settings.fullName || null,
                    address: (enterpriseData?.address || '').trim() || null,
                    phone: (enterpriseData?.phone || '').trim() || null,
                    email: (enterpriseData?.email || '').trim() || null,
                    website: (enterpriseData?.website || '').trim() || null,
                    logo: enterpriseData?.logo || null,
                    settings: JSON.stringify(settings),
                };
                const createdOrg = await api.post('/organizations', orgPayload);
                createdOrgId = createdOrg?.id ?? null;
                if (!createdOrgId) {
                    throw new Error('Организация не создалась (нет id в ответе)');
                }
            }

            const payload = {
                username: formData.login.trim(),
                fullName: formData.fullName.trim(),
                organizationId: createdOrgId ?? (formData.organizationId != null ? Number(formData.organizationId) : undefined),
                organizationUnit: !fromCreateEnterprise ? (formData.departmentId ? { id: formData.departmentId } : null) : null,
                userRoleId: role.id,
                position: formData.position?.trim() || null,
                phone: formData.phone?.trim() || null,
                email: isEditMode ? formData.email?.trim() || null : null,
                personnelNumber: formData.personnelNumber?.trim() || null,
                status: formData.blocked ? 'Blocked' : 'Active',
                rfid: rfidString || null,
                allowedUserActions: allowedUserActions ?? undefined,
            };
            if (formData.password?.trim()) {
                payload.password = formData.password;
            }
            if (isEditMode) {
                await updateUserAccount(id, payload);
                navigate('/employees', { replace: true });
            } else {
                try {
                    await createUserAccount(payload);
                } catch (createUserErr) {
                    // Compensation: if organization was created but user creation failed, delete organization
                    if (createdOrgId) {
                        try {
                            await api.delete(`/organizations/${createdOrgId}/hard`);
                        } catch (rollbackErr) {
                            console.error('Rollback organization failed:', rollbackErr);
                        }
                    }
                    throw createUserErr;
                }
                if (fromCreateEnterprise) {
                    navigate('/enterprise-map', {
                        replace: true,
                        state: { message: `Предприятие «${enterpriseName}» и его администратор успешно созданы.` },
                    });
                } else {
                    navigate('/employees', { replace: true });
                }
            }
        } catch (err) {
            console.error('Ошибка сохранения пользователя:', err);
            const message = err?.message || (isEditMode ? 'Не удалось обновить пользователя.' : 'Не удалось создать пользователя. Попробуйте снова.');
            setSubmitError(typeof message === 'string' ? message : 'Ошибка сохранения.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (accessAllowed !== true) {
        return (
            <div className="add-user-page">
                <div className="add-user-header">
                    <div className="header-left">
                        <button type="button" className="back-btn" onClick={() => navigate('/employees')}>
                            &lt;
                        </button>
                        <h1 className="page-title">{isEditMode ? 'Редактировать пользователя' : 'Создать пользователя'}</h1>
                    </div>
                    <div className="header-right">
                        <UserProfile />
                    </div>
                </div>
                <div className="add-user-content-wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <div className="message-box">Загрузка...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="add-user-page">
            <div className="add-user-header">
                <div className="header-left">
                    <button
                        type="button"
                        className="back-btn"
                        onClick={() => navigate(fromCreateEnterprise ? '/enterprise-map' : '/employees')}
                    >
                        &lt;
                    </button>
                    <div>
                        <h1 className="page-title">{isEditMode ? 'Редактировать пользователя' : 'Создать пользователя'}</h1>
                        {fromCreateEnterprise && enterpriseName && (
                            <p className="add-user-subtitle">Администратор предприятия {enterpriseName}</p>
                        )}
                    </div>
                </div>
                <div className="header-right">
                    <button
                        type="button"
                        className="control-btn notifications-btn"
                        onClick={() => navigate('/notifications')}
                    >
                        <FaBell className="notifications-icon" />
                        <span className="notifications-badge" />
                    </button>
                    <UserProfile />
                </div>
            </div>

            <div className="add-user-content-wrap">
                <div className="add-user-form-section">
                    <div className="add-user-form-card">
                        <form onSubmit={handleSubmit}>
                            {!fromCreateEnterprise && (
                                <div className="form-group">
                                    <label>Тип пользователя<span className="required">*</span>:</label>
                                    <div ref={typeRef} style={{ position: 'relative' }}>
                                        <button
                                            type="button"
                                            className={`add-user-type-select ${selectedRole ? 'has-value' : ''} ${typeDropdownOpen ? 'open' : ''}`}
                                            onClick={() => setTypeDropdownOpen((v) => !v)}
                                        >
                                            <span>{selectedRole ? selectedRole.label : 'Выбрать'}</span>
                                            <FaChevronRight className="chevron" />
                                        </button>
                                        {typeDropdownOpen && (
                                            <div className="add-user-type-dropdown">
                                                {userTypeOptions.map((option) => (
                                                    <div
                                                        key={option.id}
                                                        className={`add-user-type-dropdown-option ${formData.userTypeId === option.id ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            handleInput('userTypeId', option.id);
                                                            setTypeDropdownOpen(false);
                                                        }}
                                                    >
                                                        {option.label}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Логин<span className="required">*</span>:</label>
                                <input
                                    type="text"
                                    value={formData.login}
                                    onChange={(e) => handleInput('login', e.target.value)}
                                    placeholder=""
                                />
                            </div>

                            <div className="form-group">
                                <label>Пароль{!isEditMode && <span className="required">*</span>}:</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => handleInput('password', e.target.value)}
                                    placeholder={isEditMode ? 'Сменить пароль' : ''}
                                />
                            </div>

                            <div className="form-group">
                                <label>Ф.И.О<span className="required">*</span>:</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => handleInput('fullName', e.target.value)}
                                    placeholder=""
                                />
                            </div>

                            {!fromCreateEnterprise && (
                                <div className="form-group">
                                    <label>Предприятие<span className="required">*</span>:</label>
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            type="button"
                                            className={`add-user-department-select ${selectedOrganization ? 'has-value' : ''}`}
                                            onClick={() => setDepartmentDropdownOpen(false)}
                                        >
                                            <span>{selectedOrganization ? selectedOrganization.name : 'Выбрать'}</span>
                                            <FaChevronRight className="chevron" />
                                        </button>
                                        <select
                                            value={formData.organizationId ?? ''}
                                            onChange={(e) => handleInput('organizationId', e.target.value || null)}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer',
                                            }}
                                            required
                                        >
                                            <option value="">Выбрать</option>
                                            {organizations.map((org) => (
                                                <option key={org.id} value={org.id}>
                                                    {org.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {!fromCreateEnterprise && (
                                <div className="form-group">
                                    <label>Подразделение:</label>
                                    <div ref={departmentRef} className="unit-select-container">
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            className={`unit-select-dropdown ${departmentDropdownOpen ? 'open' : ''} ${!formData.organizationId ? 'disabled' : ''} ${selectedUnit ? 'has-value' : ''}`}
                                            onClick={() => {
                                                if (!formData.organizationId) return;
                                                setDepartmentDropdownOpen((v) => !v);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    if (!formData.organizationId) return;
                                                    setDepartmentDropdownOpen((v) => !v);
                                                }
                                            }}
                                        >
                                            <span className="unit-select-label">
                                                {!formData.organizationId
                                                    ? 'Сначала выберите предприятие'
                                                    : selectedUnit
                                                        ? (String(selectedUnit.name || '').trim() || '—')
                                                        : filteredOrganizationUnits.length
                                                            ? 'Выбрать'
                                                            : 'Нет подразделений'}
                                            </span>
                                            <span className={`unit-select-arrow ${departmentDropdownOpen ? 'open' : ''}`}>
                                                <FaChevronDown />
                                            </span>
                                        </div>
                                        {departmentDropdownOpen && formData.organizationId && (
                                            <div className="unit-select-options">
                                                {organizationUnitHierarchy.length > 0 ? (
                                                    organizationUnitHierarchy.map((unit) => renderDepartmentUnitOption(unit))
                                                ) : (
                                                    <div
                                                        className="unit-option"
                                                        style={{ padding: '8px 12px', color: '#7B8BA6', cursor: 'default' }}
                                                    >
                                                        Нет подразделений
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Должность:</label>
                                <input
                                    type="text"
                                    value={formData.position}
                                    onChange={(e) => handleInput('position', e.target.value)}
                                    placeholder=""
                                />
                            </div>

                            <div className="form-group">
                                <label>Телефон:</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => handleInput('phone', e.target.value)}
                                    placeholder=""
                                />
                            </div>

                            {isEditMode && (
                                <div className="form-group">
                                    <label>Email:</label>
                                    <div className="add-user-email-row">
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInput('email', e.target.value)}
                                            placeholder=""
                                        />
                                        <div className="add-user-email-actions">
                                            {formData.emailVerified ? (
                                                <span className="add-user-email-badge">Подтверждён</span>
                                            ) : null}
                                            <button
                                                type="button"
                                                className="add-user-verify-email-btn"
                                                onClick={handleOpenEmailVerify}
                                                disabled={!canOpenEmailVerify}
                                                title={
                                                    emailUnsavedForVerify && emailTrim
                                                        ? 'Сохраните email перед подтверждением'
                                                        : formData.emailVerified
                                                            ? 'Email уже подтверждён'
                                                            : !emailTrim
                                                                ? 'Укажите email'
                                                                : ''
                                                }
                                            >
                                                Подтвердить
                                            </button>
                                        </div>
                                    </div>
                                    {emailUnsavedForVerify && emailTrim ? (
                                        <p className="add-user-email-hint">Сохраните карточку, чтобы подтвердить этот адрес.</p>
                                    ) : null}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Табельный №:</label>
                                <input
                                    type="text"
                                    value={formData.personnelNumber}
                                    onChange={(e) => handleInput('personnelNumber', e.target.value)}
                                    placeholder=""
                                />
                            </div>

                            <div className="add-user-rfid-block">
                                <div className="add-user-rfid-block-header">
                                    <span className="rfid-label">Пропуска RFID</span>
                                    <div className="rfid-toolbar">
                                        <button
                                            type="button"
                                            className="add-pass-btn"
                                            onClick={() => setIsRfidModalOpen(true)}
                                        >
                                            Добавить пропуск +
                                        </button>
                                    </div>
                                </div>
                                <div className="rfid-area">
                                    <div className="rfid-list scrollable-section">
                                        {rfidPasses.map((pass) => (
                                            <div key={pass.id} className="rfid-item">
                                                <input type="checkbox" className="rfid-checkbox" />
                                                <RiRfidFill className="rfid-icon" />
                                                <span className="rfid-code">{pass.code}</span>
                                                <button
                                                    type="button"
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

                            <div className="add-user-block-row">
                                <input
                                    type="checkbox"
                                    id="block-checkbox"
                                    className="block-checkbox"
                                    checked={formData.blocked}
                                    onChange={(e) => handleInput('blocked', e.target.checked)}
                                />
                                <label htmlFor="block-checkbox" className="block-checkbox-label">
                                    Блокировка
                                </label>
                                <span className="add-user-active-label">
                                    {formData.blocked ? 'Пользователь заблокирован' : 'Пользователь активен'}
                                </span>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="add-user-message-panel">
                    <div className="add-user-message-center">
                        {showPermissionsPanel && (
                            <div className="add-user-permissions-panel">
                                {currentPermissionsList.map((section) => {
                                    const isLockedAdminAlloy = formData.userTypeId === 'ADMIN_ALLOY';
                                    return (
                                        <div key={section.title} className="add-user-permissions-section">
                                            <h3 className="add-user-permissions-section-title">{section.title}</h3>
                                            <div className="add-user-permissions-list">
                                                {section.items.map((item) => {
                                                    const isDisabledStatic = item.disabled;
                                                    if (isDisabledStatic && !isLockedAdminAlloy) {
                                                        return (
                                                            <div key={item.id} className="add-user-permission-item disabled">
                                                                {item.label}
                                                            </div>
                                                        );
                                                    }
                                                    const checked = getPermissionChecked(item);
                                                    const isLocked = isLockedAdminAlloy && !isDisabledStatic;
                                                    return (
                                                        <label
                                                            key={item.id}
                                                            className={`add-user-permission-item add-user-permission-checkbox${
                                                                isLocked ? ' locked' : ''
                                                            }${isDisabledStatic ? ' disabled' : ''}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                disabled={isLocked}
                                                                onChange={
                                                                    isLocked
                                                                        ? undefined
                                                                        : (e) => setPermissionChecked(item.id, e.target.checked)
                                                                }
                                                            />
                                                            <span>{item.label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );})}
                            </div>
                        )}
                        {!showPermissionsPanel && showSelectTypeMessage && (
                            <div className="message-box">Выберите тип пользователя!</div>
                        )}
                        {submitError && (
                            <div className="add-user-submit-error" role="alert">
                                {submitError}
                            </div>
                        )}
                    </div>
                    <div className="add-user-submit-row">
                        <button
                            type="button"
                            className="add-user-submit-btn"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            <span>{isSubmitting ? (isEditMode ? 'Сохранение...' : 'Создание...') : isEditMode ? 'Сохранить' : fromCreateEnterprise ? 'Добавить Администратора' : 'Добавить'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <AddRfidPassModal
                isOpen={isRfidModalOpen}
                onClose={() => setIsRfidModalOpen(false)}
                onAdd={handleRfidPassAdded}
            />
            <EmailVerifyModal
                isOpen={emailVerifyModalOpen}
                onClose={() => setEmailVerifyModalOpen(false)}
                userId={id ? parseInt(id, 10) : null}
                email={verifyEmailSnapshot}
                onVerified={handleEmailVerified}
            />
        </div>
    );
}

export default AddUserPage;
