import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaUser, FaEdit } from 'react-icons/fa';
import UserProfile from '../components/UserProfile';
import CreateEnterpriseModal from '../components/CreateEnterpriseModal';
import OrganizationLogo from '../images/OrganizationLogo.png';
import ResourcesLogo from '../images/ResourcesLogo.png';
import WelderIcon from '../images/WelderIcon.png';
import { api } from '../services/api';
import { getRoles } from '../api/userAccountApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';
import { getAllWelders } from '../api/welderApi';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import '../styles/enterpriseMapPage.css';
import '../styles/organizationUnitsList.css';
import '../styles/enterpriseListPage.css';

function EnterpriseListPage() {
    const navigate = useNavigate();
    const [organizations, setOrganizations] = useState([]);
    const [allUnits, setAllUnits] = useState([]);
    const [welders, setWelders] = useState([]);
    const [weldingMachines, setWeldingMachines] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createEnterpriseModalOpen, setCreateEnterpriseModalOpen] = useState(false);
    const [canAddEnterprise, setCanAddEnterprise] = useState(false);
    const [canViewEnterprises, setCanViewEnterprises] = useState(false);
    const [canViewAlloyEnterprise, setCanViewAlloyEnterprise] = useState(false);
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
                setCanViewEnterprises(isAdminAlloy || hasVisibilityEditEnterprises);
                setCanViewAlloyEnterprise(isAdminAlloy);
            } catch (_) {
                setCanAddEnterprise(false);
                setCanViewEnterprises(false);
                setCanViewAlloyEnterprise(false);
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
                const [orgs, units, w, machines] = await Promise.all([
                    api.getOrganizations(),
                    getAllOrganizationUnits(),
                    getAllWelders(),
                    getAllWeldingMachines(),
                ]);
                setOrganizations(Array.isArray(orgs) ? orgs : []);
                setAllUnits(Array.isArray(units) ? units : []);
                setWelders(Array.isArray(w) ? w : []);
                setWeldingMachines(Array.isArray(machines) ? machines : []);
            } catch (err) {
                console.error(err);
                setOrganizations([]);
                setAllUnits([]);
                setWelders([]);
                setWeldingMachines([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const getUnitIdsForOrganization = (organizationId) => {
        const norm = (id) => (id == null ? null : typeof id === 'string' ? parseInt(id, 10) : id);
        const orgId = norm(organizationId);
        const units = allUnits.filter((u) => norm(u.organizationId ?? u.organization_id) === orgId);
        const ids = new Set(units.map((u) => norm(u.id)));
        const parentMap = new Map();
        units.forEach((u) => {
            const pid = u.parentId ?? u.parent_id ?? u.parentDepartment?.id;
            if (pid != null) parentMap.set(norm(u.id), norm(pid));
        });
        units.forEach((u) => {
            let id = norm(u.id);
            while (parentMap.has(id)) {
                id = parentMap.get(id);
                ids.add(id);
            }
        });
        return Array.from(ids);
    };

    const statsByOrg = useMemo(() => {
        const result = {};
        organizations.forEach((org) => {
            const unitIds = getUnitIdsForOrganization(org.id);
            const weldersCount = welders.filter((w) => {
                const uid = w.organizationUnitId ?? w.organizationUnit?.id;
                if (uid == null) return false;
                return unitIds.includes(typeof uid === 'string' ? parseInt(uid, 10) : uid);
            }).length;
            const machinesCount = weldingMachines.filter((m) => {
                const uid = m.organizationUnitId ?? m.organizationUnit?.id;
                if (uid == null) return false;
                return unitIds.includes(typeof uid === 'string' ? parseInt(uid, 10) : uid);
            }).length;
            const unitsForOrg = allUnits.filter(
                (u) => (typeof u.organizationId !== 'undefined' ? u.organizationId : u.organization_id) === org.id
            );
            result[org.id] = {
                subdivisions: unitsForOrg.length,
                welders: weldersCount,
                weldingMachines: machinesCount,
                users: 0,
            };
        });
        return result;
    }, [organizations, allUnits, welders, weldingMachines]);

    const filteredOrganizations = useMemo(() => {
        if (!canViewEnterprises) return [];
        const term = (searchTerm || '').trim().toLowerCase();
        const withoutAlloy = canViewAlloyEnterprise
            ? organizations
            : organizations.filter((org) => {
                const name = (org?.name || '').trim().toLowerCase();
                return name !== 'alloy' && name !== 'эллой';
            });
        const scoped = isEnterpriseScopedRole && currentUserOrgId != null
            ? withoutAlloy.filter((org) => String(org.id) === String(currentUserOrgId))
            : withoutAlloy;
        if (!term) return scoped;
        return scoped.filter((org) => (org.name || '').toLowerCase().includes(term));
    }, [organizations, searchTerm, canViewEnterprises, canViewAlloyEnterprise, isEnterpriseScopedRole, currentUserOrgId]);

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
                                            <Tooltip text="Количество пользователей в подразделении и во вложенных">
                                                <div className="org-unit-stat-tile">
                                                    <FaUser className="stat-icon" />
                                                    <span className="stat-number">{stats.users}</span>
                                                </div>
                                            </Tooltip>
                                        </td>
                                        <td>
                                            <Tooltip text="Количество дочерних подразделений">
                                                <div className="org-unit-stat-tile">
                                                    <img src={OrganizationLogo} alt="" className="stat-icon-img" />
                                                    <span className="stat-number">{stats.subdivisions}</span>
                                                </div>
                                            </Tooltip>
                                        </td>
                                        <td>
                                            <Tooltip text="Количество сварочных аппаратов в подразделении и во вложенных">
                                                <div className="org-unit-stat-tile">
                                                    <img src={ResourcesLogo} alt="" className="stat-icon-img" />
                                                    <span className="stat-number">{stats.weldingMachines}</span>
                                                </div>
                                            </Tooltip>
                                        </td>
                                        <td>
                                            <Tooltip text="Количество сварщиков в подразделении и во вложенных">
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
