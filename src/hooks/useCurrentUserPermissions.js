import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getRoles } from '../api/userAccountApi';
import {
    canReadEquipment,
    canWriteEquipment,
    canReadWelders,
    canWriteWelders,
    canReadUsers,
    canWriteUsers,
    canReadOrganizations,
    canWriteOrganizations,
    canWorkWithReports,
    canReadMacRegistry,
    canAddMacRegistry,
} from '../utils/userPermissions';

export function useCurrentUserPermissions() {
    const [user, setUser] = useState(null);
    const [roleName, setRoleName] = useState('');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const currentUser = await api.getCurrentUser();
                const rolesData = await getRoles();
                const roleId = currentUser?.userRoleId ?? currentUser?.userRole?.id;
                const role = (Array.isArray(rolesData) ? rolesData : []).find(
                    (r) => r.id === roleId || r.id === parseInt(roleId, 10)
                );
                if (!cancelled) {
                    setUser(currentUser);
                    setRoleName(String(role?.name || '').toUpperCase());
                }
            } catch (_) {
                if (!cancelled) {
                    setUser(null);
                    setRoleName('');
                }
            } finally {
                if (!cancelled) setReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return {
        ready,
        user,
        roleName,
        canReadEquipment: canReadEquipment(user, roleName),
        canWriteEquipment: canWriteEquipment(user, roleName),
        canReadWelders: canReadWelders(user, roleName),
        canWriteWelders: canWriteWelders(user, roleName),
        canReadUsers: canReadUsers(user, roleName),
        canWriteUsers: canWriteUsers(user, roleName),
        canReadOrganizations: canReadOrganizations(user, roleName),
        canWriteOrganizations: canWriteOrganizations(user, roleName),
        canWorkWithReports: canWorkWithReports(user, roleName),
        canReadMacRegistry: canReadMacRegistry(user, roleName),
        canAddMacRegistry: canAddMacRegistry(user, roleName),
        isAdminAlloy: roleName === 'ADMIN_ALLOY',
    };
}
