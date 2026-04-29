import { buildOrganizationHierarchy } from './organizationUnitTree';

const normId = (id) => (id == null ? null : typeof id === 'string' ? parseInt(id, 10) : id);

/**
 * Группирует подразделения по организации и строит дерево внутри каждой.
 * @param {Array} visibleUnits — отфильтрованные подразделения
 * @param {Array} organizationsList — список активных предприятий из API (id, name); без удалённых
 */
export function groupUnitsByOrganization(visibleUnits, organizationsList) {
    const orgNameById = new Map(
        (organizationsList || []).map((o) => [String(o.id), o.name || `Предприятие #${o.id}`])
    );
    const activeOrgIds = new Set((organizationsList || []).map((o) => String(o.id)));
    /** Пока список предприятий с бэка непустой — не показываем группы для id вне списка (удалённые и пр.). */
    const restrictToActiveOrgs = activeOrgIds.size > 0;

    const orgMap = new Map();

    (visibleUnits || []).forEach((u) => {
        const oid = u.organizationId ?? u.organization?.id ?? u.organization_id ?? null;
        if (oid != null && restrictToActiveOrgs && !activeOrgIds.has(String(oid))) {
            return;
        }
        const key = oid == null ? '__NO_ORG__' : String(oid);
        if (!orgMap.has(key)) {
            let orgName;
            if (oid == null) {
                orgName = 'Без предприятия';
            } else {
                orgName =
                    orgNameById.get(String(oid)) ||
                    u.organization?.name ||
                    `Предприятие #${oid}`;
            }
            orgMap.set(key, { orgKey: key, orgId: oid, orgName, units: [] });
        }
        orgMap.get(key).units.push(u);
    });

    return Array.from(orgMap.values())
        .map((entry) => ({
            orgKey: entry.orgKey,
            orgId: entry.orgId,
            orgName: entry.orgName,
            hierarchy: buildOrganizationHierarchy(entry.units),
        }))
        .sort((a, b) => String(a.orgName).localeCompare(String(b.orgName), 'ru'));
}

function findUnitInSubtree(node, targetNormId) {
    if (normId(node.id) === targetNormId) return node;
    for (const ch of node.children || []) {
        const f = findUnitInSubtree(ch, targetNormId);
        if (f) return f;
    }
    return null;
}

/** Поиск узла подразделения по id в лесу корней (несколько деревьев). */
export function findUnitInForest(forestRoots, unitId) {
    const target = normId(unitId);
    if (target == null) return null;
    for (const root of forestRoots || []) {
        const found = findUnitInSubtree(root, target);
        if (found) return found;
    }
    return null;
}

/** Все имена подразделений в лесу (для «Все» / выбора по предприятию). */
export function flattenUnitNamesFromForest(roots) {
    const names = [];
    const walk = (nodes) => {
        (nodes || []).forEach((u) => {
            if (u.name != null && String(u.name).trim() !== '') names.push(u.name);
            if (u.children?.length) walk(u.children);
        });
    };
    walk(roots);
    return names;
}
