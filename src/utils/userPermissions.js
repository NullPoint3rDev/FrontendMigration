/**
 * Права из user_account.allowedUserActions (роль «Пользователь Эллой» и др.).
 */

export const VIEW_ONLY = {
    equipment: 'view_only_equipment',
    welders: 'view_only_welders',
    users: 'view_only_users',
    organizations: 'view_only_organizations',
};

export const WORK_WITH_REPORTS = 'work_with_reports';

const EQUIPMENT_DOMAIN = new Set([
    VIEW_ONLY.equipment,
    'wifi_modules_wt2',
    'add_equipment_core_pulse',
    'move_equipment_change_info',
    'delete_equipment',
    'view_ip_history',
    'ip_management_functions',
    'fix_maintenance',
    'assign_welders_to_equipment',
]);

const EQUIPMENT_WRITE = new Set([
    'wifi_modules_wt2',
    'add_equipment_core_pulse',
    'move_equipment_change_info',
    'delete_equipment',
    'ip_management_functions',
    'fix_maintenance',
    'assign_welders_to_equipment',
]);

const WELDERS_DOMAIN = new Set([
    VIEW_ONLY.welders,
    'add_delete_edit_welders',
    'manage_welder_certification',
    'add_delete_rfid_passes',
]);

const WELDERS_WRITE = new Set([
    'add_delete_edit_welders',
    'manage_welder_certification',
    'add_delete_rfid_passes',
]);

const USERS_DOMAIN = new Set([
    VIEW_ONLY.users,
    'recovery_account',
    'create_edit_enterprise_admins',
    'create_edit_enterprise_users',
    'reset_enterprise_admin_passwords',
    'reset_enterprise_user_passwords',
    'create_edit_dealer_admins',
    'create_edit_dealer_users',
    'reset_dealer_admin_passwords',
    'reset_dealer_user_passwords',
    'create_alloy_admins',
    'create_edit_alloy_users',
    'reset_alloy_user_passwords',
]);

const USERS_WRITE = new Set([
    'recovery_account',
    'create_edit_enterprise_admins',
    'create_edit_enterprise_users',
    'reset_enterprise_admin_passwords',
    'reset_enterprise_user_passwords',
    'create_edit_dealer_admins',
    'create_edit_dealer_users',
    'reset_dealer_admin_passwords',
    'reset_dealer_user_passwords',
    'create_alloy_admins',
    'create_edit_alloy_users',
    'reset_alloy_user_passwords',
]);

const ORGANIZATIONS_DOMAIN = new Set([
    VIEW_ONLY.organizations,
    'visibility_edit_dealers',
    'create_delete_dealers',
    'visibility_edit_enterprises',
    'create_delete_enterprises',
    'visibility_edit_alloy',
]);

const ORGANIZATIONS_WRITE = new Set([
    'visibility_edit_dealers',
    'create_delete_dealers',
    'visibility_edit_enterprises',
    'create_delete_enterprises',
    'visibility_edit_alloy',
]);

export const VIEW_ONLY_BY_SECTION_TITLE = {
    'Работа с оборудованием': VIEW_ONLY.equipment,
    'Работа со сварщиками': VIEW_ONLY.welders,
    'Работа с пользователями': VIEW_ONLY.users,
    'Работа с организациями': VIEW_ONLY.organizations,
};

export function parseAllowedUserActions(user) {
    const raw = user?.allowedUserActions;
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.map((a) => String(a || '').trim().toLowerCase()).filter(Boolean));
}

export function isAdminAlloyRole(roleName) {
    const n = String(roleName || '').toUpperCase();
    return n === 'ADMIN_ALLOY';
}

export function isUserAlloyRole(roleName) {
    const n = String(roleName || '').toUpperCase();
    return n === 'USER_ALLOY';
}

function enforceGrants(roleName) {
    return isUserAlloyRole(roleName);
}

function hasInSet(actions, id) {
    return actions.has(String(id || '').toLowerCase());
}

function anyInSet(actions, domainSet) {
    for (const a of actions) {
        if (domainSet.has(a)) return true;
    }
    return false;
}

export function canReadEquipment(user, roleName) {
    if (!enforceGrants(roleName)) return true;
    const a = parseAllowedUserActions(user);
    if (hasInSet(a, VIEW_ONLY.equipment)) return true;
    return anyInSet(a, EQUIPMENT_DOMAIN);
}

export function canWriteEquipment(user, roleName) {
    if (!enforceGrants(roleName)) return true;
    const a = parseAllowedUserActions(user);
    if (hasInSet(a, VIEW_ONLY.equipment)) return false;
    return anyInSet(a, EQUIPMENT_WRITE);
}

export function canReadWelders(user, roleName) {
    if (!enforceGrants(roleName)) return true;
    const a = parseAllowedUserActions(user);
    if (hasInSet(a, VIEW_ONLY.welders)) return true;
    return anyInSet(a, WELDERS_DOMAIN);
}

export function canWriteWelders(user, roleName) {
    if (!enforceGrants(roleName)) return true;
    const a = parseAllowedUserActions(user);
    if (hasInSet(a, VIEW_ONLY.welders)) return false;
    return anyInSet(a, WELDERS_WRITE);
}

export function canReadUsers(user, roleName) {
    if (!enforceGrants(roleName)) return true;
    const a = parseAllowedUserActions(user);
    if (hasInSet(a, VIEW_ONLY.users)) return true;
    return anyInSet(a, USERS_DOMAIN);
}

export function canWriteUsers(user, roleName) {
    if (!enforceGrants(roleName)) return true;
    const a = parseAllowedUserActions(user);
    if (hasInSet(a, VIEW_ONLY.users)) return false;
    return anyInSet(a, USERS_WRITE);
}

export function canReadOrganizations(user, roleName) {
    if (!enforceGrants(roleName)) return true;
    const a = parseAllowedUserActions(user);
    if (hasInSet(a, VIEW_ONLY.organizations)) return true;
    return anyInSet(a, ORGANIZATIONS_DOMAIN);
}

export function canWriteOrganizations(user, roleName) {
    if (!enforceGrants(roleName)) return true;
    const a = parseAllowedUserActions(user);
    if (hasInSet(a, VIEW_ONLY.organizations)) return false;
    return anyInSet(a, ORGANIZATIONS_WRITE);
}

export function canWorkWithReports(user, roleName) {
    if (isAdminAlloyRole(roleName)) return true;
    if (!enforceGrants(roleName)) return true;
    return hasInSet(parseAllowedUserActions(user), WORK_WITH_REPORTS);
}

/** id пунктов write в секции (для снятия галочек при включении view_only). */
export function getSectionWriteItemIds(sectionTitle, items) {
    const viewOnlyId = VIEW_ONLY_BY_SECTION_TITLE[sectionTitle];
    if (!viewOnlyId || !items) return [];
    const writeSets = {
        [VIEW_ONLY.equipment]: EQUIPMENT_WRITE,
        [VIEW_ONLY.welders]: WELDERS_WRITE,
        [VIEW_ONLY.users]: USERS_WRITE,
        [VIEW_ONLY.organizations]: ORGANIZATIONS_WRITE,
    };
    const writeSet = writeSets[viewOnlyId];
    if (!writeSet) return [];
    return items.map((i) => i.id).filter((id) => id !== viewOnlyId && writeSet.has(id));
}

export function isViewOnlyActiveForSection(permissionChecks, sectionTitle, getChecked) {
    const viewOnlyId = VIEW_ONLY_BY_SECTION_TITLE[sectionTitle];
    if (!viewOnlyId) return false;
    return getChecked({ id: viewOnlyId, defaultChecked: false });
}

export function isPermissionItemDisabled(item, sectionTitle, permissionChecks, getChecked, formUserTypeId) {
    if (formUserTypeId !== 'USER_ALLOY') {
        return !!item.disabled;
    }
    const viewOnlyId = VIEW_ONLY_BY_SECTION_TITLE[sectionTitle];
    if (!viewOnlyId) return !!item.disabled;
    if (item.id === viewOnlyId) return false;
    if (sectionTitle === 'Работа со сварщиками' && item.disabled) {
        return true;
    }
    if (isViewOnlyActiveForSection(permissionChecks, sectionTitle, getChecked)) {
        return true;
    }
    return !!item.disabled;
}
