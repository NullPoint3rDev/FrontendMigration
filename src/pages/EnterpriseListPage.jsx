import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaUser, FaEdit } from 'react-icons/fa';
import UserProfile from '../components/UserProfile';
import CreateEnterpriseModal from '../components/CreateEnterpriseModal';
import OrganizationLogo from '../images/OrganizationLogo.png';
import ResourcesLogo from '../images/ResourcesLogo.png';
import WelderIcon from '../images/WelderIcon.png';
import { api } from '../services/api';
import { canReadOrganizations } from '../utils/userPermissions';
import { getRoles, getAllUserAccounts } from '../api/userAccountApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';
import { getAllWelders } from '../api/welderApi';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import '../styles/enterpriseMapPage.css';
import '../styles/organizationUnitsList.css';
import '../styles/enterpriseListPage.css';

const normId = (id) => {
    if (id == null) return null;
    return typeof id === 'string' ? parseInt(id, 10) : id;
};

const getUnitOrganizationId = (unit) =>
    normId(unit.organizationId ?? unit.organization_id ?? unit.organization?.id);

const isUserExcludedFromStats = (user) => {
    const s = String(user.status || '').toLowerCase();
    return s === 'deleted' || s === 'blocked' || s === 'заблокирован';
};

const isWelderDismissed = (welder) => {
    const s = String(welder.status || '').toUpperCase();
    return s === 'DISMISSED' || s === 'BLOCKED';
};

function EnterpriseListPage() {
    const navigate = useNavigate();
    const [organizations, setOrganizations] = useState([]);
    const [allUnits, setAllUnits] = useState([]);
    const [welders, setWelders] = useState([]);
    const [weldingMachines, setWeldingMachines] = useState([]);
    const [userAccounts, setUserAccounts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createEnterpriseModalOpen, setCreateEnterpriseModalOpen] = useState(false);
    const [canAddEnterprise, setCanAddEnterprise] = useState(false);
    const [canViewEnterprises, setCanViewEnterprises] = useState(false);
    const [canViewAlloyEnterprise, setCanViewAlloyEnterprise] = useState(false);
    const [currentUserIsUserAlloy, setCurrentUserIsUserAlloy] = useState(false);
    const [isCreatingEnterprise, setIsCreatingEnterprise] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentUserOrgId, setCurrentUserOrgId] = useState(null);
    const [isEnterpriseScopedRole, setIsEnterpriseScopedRole] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const [currentUser, rolesData] = await Promise.all([
                    api.getCurrentUser(),
                    getRoles(),
                ]);
                if (!currentUser) return;
                const roleId = currentUser.userRoleId ?? currentUser.userRole?.id;
                const role = (Array.isArray(rolesData) ? rolesData : []).find(
                    (r) => r.id === roleId || r.id === parseInt(roleId, 10)
                );
                const name = (role?.name || '').toLowerCase();
                const isAdminAlloy = name === 'admin_alloy' || ((name.includes('admin') && name.includes('alloy')) || (name.includes('админ') && name.includes('эллой')));
                const isUserAlloy = name === 'user_alloy' || ((name.includes('user') && name.includes('alloy')) || (name.includes('пользователь') && name.includes('эллой')));
                const isAdminDealer = name === 'admin_dealer' || (name.includes('admin') && name.includes('dealer')) || (name.includes('админ') && name.includes('дил'));
                const isAdminEnterprise = name === 'admin_enterprise' || (name.includes('admin') && name.includes('enterprise'));
                const isUserEnterprise = name === 'user_enterprise' || (name.includes('user') && name.includes('enterprise'));
                setIsEnterpriseScopedRole(isAdminEnterprise || isUserEnterprise);
                setCurrentUserOrgId(currentUser.organizationId ?? currentUser.organization?.id ?? null);

                const allowed = Array.isArray(currentUser.allowedUserActions) ? currentUser.allowedUserActions : [];
                const allowedLower = allowed.map((a) => String(a || '').toLowerCase());
                const hasCreateEnterprises =
                    allowedLower.includes('create_delete_enterprises') ||
                    allowedLower.includes('create_delete_enterprise') ||
                    allowedLower.some((a) => a.includes('create_delete_enterprises'));
                const hasManageEnterpriseAdmins =
                    allowedLower.includes('create_edit_enterprise_admins') ||
                    allowedLower.some((a) => a.includes('create_edit_enterprise_admins'));
                const hasVisibilityEditEnterprises =
                    allowedLower.includes('visibility_edit_enterprises') ||
                    allowedLower.includes('visibility_edit_enterprise') ||
                    allowedLower.some((a) => a.includes('visibility_edit_enterprises'));

                setCanAddEnterprise(
                    isAdminAlloy || (isUserAlloy && hasCreateEnterprises && hasManageEnterpriseAdmins)
                );
                const roleNameUpper = String(role?.name || '').toUpperCase();
                setCanViewEnterprises(
                    isAdminAlloy || hasVisibilityEditEnterprises || canReadOrganizations(currentUser, roleNameUpper)
                );
                const hasVisibilityEditAlloy =
                    allowedLower.includes('visibility_edit_alloy') ||
                    allowedLower.some((a) => a.includes('visibility_edit_alloy'));
                setCurrentUserIsUserAlloy(isUserAlloy);
                setCanViewAlloyEnterprise(isAdminAlloy || hasVisibilityEditAlloy);
            } catch (_) {
                setCanAddEnterprise(false);
                setCanViewEnterprises(false);
                setCanViewAlloyEnterprise(false);
                setCurrentUserIsUserAlloy(false);
                setIsEnterpriseScopedRole(false);
                setCurrentUserOrgId(null);
            }
        };
        check();
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [orgs, units, w, machines, users] = await Promise.all([
                    api.getOrganizations(),
                    getAllOrganizationUnits(),
                    getAllWelders(),
                    getAllWeldingMachines(),
                    getAllUserAccounts(),
                ]);
                setOrganizations(Array.isArray(orgs) ? orgs : []);
                setAllUnits(Array.isArray(units) ? units : []);
                setWelders(Array.isArray(w) ? w : []);
                setWeldingMachines(Array.isArray(machines) ? machines : []);
                setUserAccounts(Array.isArray(users) ? users : []);
            } catch (err) {
                console.error(err);
                setOrganizations([]);
                setAllUnits([]);
                setWelders([]);
                setWeldingMachines([]);
                setUserAccounts([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const statsByOrg = useMemo(() => {
        const result = {};
        organizations.forEach((org) => {
            const orgId = normId(org.id);
            const orgIdKey = String(orgId);
            const unitsForOrg = allUnits.filter((u) => String(getUnitOrganizationId(u)) === orgIdKey);
            const unitIdSet = new Set(unitsForOrg.map((u) => normId(u.id)));
            const unitNames = unitsForOrg.map((u) => u.name).filter(Boolean);

            const usersCount = userAccounts.filter((user) => {
                if (isUserExcludedFromStats(user)) return false;

                const userUnitId = user.organizationUnitId ?? user.organizationUnit?.id;
                if (userUnitId != null) {
                    return unitIdSet.has(normId(userUnitId));
                }

                const userOrgId = user.organizationId ?? user.organization?.id;
                if (userOrgId != null && String(normId(userOrgId)) === orgIdKey) {
                    return true;
                }

                const userUnitName = user.organizationUnit?.name;
                return Boolean(userUnitName && unitNames.includes(userUnitName));
            }).length;

            const weldersCount = welders.filter((w) => {
                if (isWelderDismissed(w)) return false;

                const welderUnitId = w.organizationUnitId ?? w.organizationUnit?.id;
                if (welderUnitId != null) {
                    return unitIdSet.has(normId(welderUnitId));
                }

                const department = w.organizationUnit?.name || w.department;
                return Boolean(department && unitNames.includes(department));
            }).length;

            const machinesCount = weldingMachines.filter((m) => {
                const machineUnitId = m.organizationUnitId ?? m.organizationUnit?.id;
                if (machineUnitId == null) return false;
                return unitIdSet.has(normId(machineUnitId));
            }).length;

            result[org.id] = {
                subdivisions: unitsForOrg.length,
                welders: weldersCount,
                weldingMachines: machinesCount,
                users: usersCount,
            };
        });
        return result;
    }, [organizations, allUnits, welders, weldingMachines, userAccounts]);

    const filteredOrganizations = useMemo(() => {
        if (!canViewEnterprises) return [];
        const term = (searchTerm || '').trim().toLowerCase();
        const visibleOrgs = organizations.filter((org) => {
            const name = (org?.name || '').trim().toLowerCase();
            const isAlloyName = name === 'alloy' || name === 'эллой';
            if (!isAlloyName) return true;
            if (canViewAlloyEnterprise) return true;
            if (
                currentUserIsUserAlloy &&
                currentUserOrgId != null &&
                String(org.id) === String(currentUserOrgId)
            ) {
                return true;
            }
            return false;
        });
        const scoped = isEnterpriseScopedRole && currentUserOrgId != null
            ? visibleOrgs.filter((org) => String(org.id) === String(currentUserOrgId))
            : visibleOrgs;
        if (!term) return scoped;
        return scoped.filter((org) => (org.name || '').toLowerCase().includes(term));
    }, [
        organizations,
        searchTerm,
        canViewEnterprises,
        canViewAlloyEnterprise,
        currentUserIsUserAlloy,
        isEnterpriseScopedRole,
        currentUserOrgId,
    ]);

    const toggleSelect = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const handleDeleteSelected = async () => {
        if (isDeleting) return;
        const ids = selectedIds.slice();
        if (ids.length === 0) return;
        const ok = window.confirm(`Удалить выбранные предприятия (${ids.length})?`);
        if (!ok) return;

        setIsDeleting(true);
        try {
            // Soft-delete organizations (backend: DELETE /organizations/{id})
            for (const id of ids) {
                // eslint-disable-next-line no-await-in-loop
                await api.delete(`/organizations/${id}`);
            }
            setOrganizations((prev) => prev.filter((o) => !ids.includes(o.id)));
            setSelectedIds([]);
        } catch (err) {
            console.error('Ошибка удаления предприятия:', err);
            alert(err?.message || 'Не удалось удалить предприятие');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRowClick = (org) => {
        navigate(`/enterprise-map/${org.id}`);
    };

    const handleEdit = (e, org) => {
        e.stopPropagation();
        // TODO: редактирование предприятия
    };

    const Tooltip = ({ text, children }) => {
        const tooltipRef = useRef(null);
        const wrapperRef = useRef(null);
        const handleMouseEnter = () => {
            if (tooltipRef.current && wrapperRef.current) {
                const rect = wrapperRef.current.getBoundingClientRect();
                const tooltipWidth = 300;
                const spacing = 8;
                let top = rect.top - (tooltipRef.current.offsetHeight || 100) - spacing;
                let left = rect.left + rect.width / 2;
                if (top < 0) top = rect.bottom + spacing;
                if (left - tooltipWidth / 2 < 0) left = tooltipWidth / 2;
                else if (left + tooltipWidth / 2 > window.innerWidth) left = window.innerWidth - tooltipWidth / 2;
                tooltipRef.current.style.top = `${top}px`;
                tooltipRef.current.style.left = `${left}px`;
            }
        };
        return (
            <div className="tooltip-wrapper" ref={wrapperRef} onMouseEnter={handleMouseEnter}>
                {children}
                <span className="tooltip-text" ref={tooltipRef}>{text}</span>
            </div>
        );
    };

    return (
        <div className="enterprise-map-page enterprise-list-page">
            <div className="enterprise-map-header-row">
                <h1 className="enterprise-map-page-title">Карты предприятий</h1>
                <div className="tiles-controls">
                    <button
                        className="control-btn notifications-btn"
                        onClick={() => navigate('/notifications')}
                    >
                        <FaBell className="notifications-icon" />
                        <span className="notifications-badge" />
                    </button>
                    <UserProfile />
                </div>
            </div>

            <div className="enterprise-map-tiles">
                <div className="tiles-left">
                    <div className="action-tile search-tile">
                        <div className="search-container">
                            <input
                                type="text"
                                className="tile-search-input"
                                placeholder="Поиск"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <FaSearch className="search-icon" />
                        </div>
                    </div>
                    <div className="action-tile add-tile">
                        <button
                            type="button"
                            className="tile-btn add-btn"
                            onClick={() => canAddEnterprise && setCreateEnterpriseModalOpen(true)}
                            disabled={!canAddEnterprise || isCreatingEnterprise}
                        >
                            <span className="add-btn-plus">+</span>
                            {isCreatingEnterprise ? 'Создание...' : 'Добавить предприятие'}
                        </button>
                    </div>
                </div>
                <div className="tiles-right">
                    <div className="action-tile">
                        <button
                            type="button"
                            className="tile-btn delete-btn"
                            disabled={selectedIds.length === 0 || isDeleting}
                            onClick={handleDeleteSelected}
                        >
                            <span className="delete-btn-text">{isDeleting ? 'Удаление...' : '× Удалить'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="enterprise-map-content enterprise-list-content">
                {loading ? (
                    <div className="enterprise-list-loading">Загрузка...</div>
                ) : !canViewEnterprises ? (
                    <div className="enterprise-list-loading">Нет прав на просмотр предприятий.</div>
                ) : (
                    <div className="org-units-list-container">
                        <table className="org-units-table">
                            <tbody>
                            {filteredOrganizations.map((org) => {
                                const stats = statsByOrg[org.id] || {
                                    users: 0,
                                    subdivisions: 0,
                                    weldingMachines: 0,
                                    welders: 0,
                                };
                                const isSelected = selectedIds.includes(org.id);
                                return (
                                    <tr
                                        key={org.id}
                                        className={`org-unit-row ${isSelected ? 'enterprise-list-row-selected' : ''}`}
                                        onClick={() => handleRowClick(org)}
                                    >
                                        <td>
                                            <div className="org-unit-cell">
                                                <input
                                                    type="checkbox"
                                                    className="org-unit-checkbox"
                                                    checked={isSelected}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelect(org.id);
                                                    }}
                                                />
                                                <span className="org-unit-spacer" />
                                                <span className="org-unit-name org-unit-name-inactive">
                                                        {org.name || '—'}
                                                    </span>
                                            </div>
                                        </td>
                                        <td>
                                            <Tooltip text="Количество пользователей предприятия (во всех подразделениях)">
                                                <div className="org-unit-stat-tile">
                                                    <FaUser className="stat-icon" />
                                                    <span className="stat-number">{stats.users}</span>
                                                </div>
                                            </Tooltip>
                                        </td>
                                        <td>
                                            <Tooltip text="Количество подразделений предприятия">
                                                <div className="org-unit-stat-tile">
                                                    <img src={OrganizationLogo} alt="" className="stat-icon-img" />
                                                    <span className="stat-number">{stats.subdivisions}</span>
                                                </div>
                                            </Tooltip>
                                        </td>
                                        <td>
                                            <Tooltip text="Количество сварочных аппаратов предприятия (с указанным подразделением)">
                                                <div className="org-unit-stat-tile">
                                                    <img src={ResourcesLogo} alt="" className="stat-icon-img" />
                                                    <span className="stat-number">{stats.weldingMachines}</span>
                                                </div>
                                            </Tooltip>
                                        </td>
                                        <td>
                                            <Tooltip text="Количество сварщиков предприятия (кроме уволенных)">
                                                <div className="org-unit-stat-tile">
                                                    <img src={WelderIcon} alt="" className="stat-icon-img" />
                                                    <span className="stat-number">{stats.welders}</span>
                                                </div>
                                            </Tooltip>
                                        </td>
                                        <td className="org-unit-edit-cell">
                                            <button
                                                type="button"
                                                className="org-unit-edit-btn"
                                                onClick={(e) => handleEdit(e, org)}
                                            >
                                                <FaEdit className="edit-icon" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CreateEnterpriseModal
                isOpen={createEnterpriseModalOpen}
                onClose={() => setCreateEnterpriseModalOpen(false)}
                onNext={async (enterpriseData) => {
                    const name = (enterpriseData?.name || '').trim();
                    if (!name) return;
                    setCreateEnterpriseModalOpen(false);
                    navigate('/employees/add', {
                        state: {
                            fromCreateEnterprise: true,
                            enterpriseName: name,
                            enterpriseData,
                        },
                    });
                }}
            />
        </div>
    );
}

export default EnterpriseListPage;
