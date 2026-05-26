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

    // Предприятия без подразделений тоже показываем в фильтре (как на «Картах предприятий»)
    (organizationsList || []).forEach((o) => {
        if (o?.id == null) return;
        const key = String(o.id);
        if (restrictToActiveOrgs && !activeOrgIds.has(key)) return;
        if (!orgMap.has(key)) {
            orgMap.set(key, {
                orgKey: key,
                orgId: o.id,
                orgName: o.name || `Предприятие #${o.id}`,
                units: [],
            });
        }
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

const ORG_FILTER_PREFIX = '__ORG__:';

/** Токен выбранного предприятия без подразделений (или целиком по orgKey). */
export function orgFilterToken(orgKey) {
    return `${ORG_FILTER_PREFIX}${orgKey}`;
}

export function isOrgFilterToken(value) {
    return typeof value === 'string' && value.startsWith(ORG_FILTER_PREFIX);
}

export function orgKeyFromFilterToken(token) {
    if (!isOrgFilterToken(token)) return null;
    return token.slice(ORG_FILTER_PREFIX.length);
}

/**
 * Ключи для полного выбора фильтра: имена подразделений + токены предприятий без подразделений.
 */
export function flattenOrganizationFilterKeys(organizationsForFilter) {
    const keys = [];
    (organizationsForFilter || []).forEach(({ orgKey, hierarchy }) => {
        const names = flattenUnitNamesFromForest(hierarchy);
        if (names.length === 0) {
            keys.push(orgFilterToken(orgKey));
        } else {
            keys.push(...names);
        }
    });
    return keys;
}

export function isOrganizationFilterFullySelected(filter, organizationsForFilter) {
    const allKeys = flattenOrganizationFilterKeys(organizationsForFilter);
    if (allKeys.length === 0) return filter.length === 0;
    return allKeys.every((k) => filter.includes(k));
}
