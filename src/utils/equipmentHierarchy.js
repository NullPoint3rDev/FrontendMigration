const toSortableName = (value) => String(value ?? '').trim();

/**
 * Иерархия подразделений с аппаратами (как на странице Отчёты / Карта предприятия).
 */
export function buildEquipmentHierarchy(organizationUnits, weldingMachines) {
    const units = Array.isArray(organizationUnits) ? organizationUnits : [];
    const machines = Array.isArray(weldingMachines) ? weldingMachines : [];

    if (units.length === 0) {
        return machines.map((machine) => ({
            id: `orphan-${machine.id}`,
            name: 'Без подразделения',
            parentId: null,
            machines: [{
                id: machine.id,
                name: machine.name || `Аппарат ${machine.id}`,
                machine,
            }],
            children: [],
        }));
    }

    const hierarchy = {};
    units.forEach((unit) => {
        const unitId = unit.id;
        const unitName = unit.name || unit.id;
        let parentId = null;
        if (unit.parentId != null) parentId = unit.parentId;
        else if (unit.parent_id != null) parentId = unit.parent_id;
        else if (unit.parentDepartment != null) {
            if (typeof unit.parentDepartment === 'object' && unit.parentDepartment !== null) {
                parentId = unit.parentDepartment.id;
            } else if (typeof unit.parentDepartment === 'number' || typeof unit.parentDepartment === 'string') {
                parentId = unit.parentDepartment;
            }
        }
        hierarchy[unitId] = {
            id: unitId,
            name: unitName,
            parentId,
            machines: [],
            children: [],
        };
    });

    machines.forEach((machine) => {
        const targetUnitId = machine.organizationUnitId != null
            ? machine.organizationUnitId
            : (machine.organizationUnit && (typeof machine.organizationUnit === 'object'
                ? machine.organizationUnit.id
                : machine.organizationUnit));
        if (targetUnitId && hierarchy[targetUnitId]) {
            hierarchy[targetUnitId].machines.push({
                id: machine.id,
                name: machine.name || `Аппарат ${machine.id}`,
                machine,
            });
        }
    });

    const rootUnits = [];
    const processedUnits = new Set();
    const findParent = (parentId) => {
        if (parentId == null) return null;
        return hierarchy[parentId] || hierarchy[Number(parentId)] || hierarchy[String(parentId)] || null;
    };

    Object.values(hierarchy).forEach((unit) => {
        if (unit.parentId != null && unit.parentId !== undefined) {
            const parent = findParent(unit.parentId);
            if (parent && !parent.children.find((c) => c.id === unit.id)) {
                parent.children.push(unit);
                processedUnits.add(unit.id);
            }
        }
    });

    Object.values(hierarchy).forEach((unit) => {
        if (!unit.parentId || unit.parentId === null || unit.parentId === undefined) {
            if (!rootUnits.find((u) => u.id === unit.id)) rootUnits.push(unit);
        } else if (!processedUnits.has(unit.id)) {
            if (!rootUnits.find((u) => u.id === unit.id)) rootUnits.push(unit);
        }
    });

    const sortHierarchy = (unitList) => unitList
        .sort((a, b) => toSortableName(a?.name).localeCompare(toSortableName(b?.name), 'ru', { sensitivity: 'base', numeric: true }))
        .map((unit) => {
            if (unit.children.length > 0) unit.children = sortHierarchy(unit.children);
            unit.machines.sort((a, b) =>
                toSortableName(a?.name).localeCompare(toSortableName(b?.name), 'ru', { sensitivity: 'base', numeric: true })
            );
            return unit;
        });

    return sortHierarchy(rootUnits);
}

export function getMachinesFromUnit(unit) {
    const list = [...(unit.machines || [])];
    if (unit.children && unit.children.length > 0) {
        unit.children.forEach((child) => list.push(...getMachinesFromUnit(child)));
    }
    return list;
}

export function getAllEquipmentFromHierarchy(units) {
    const ids = [];
    const traverse = (unitList) => {
        unitList.forEach((unit) => {
            (unit.machines || []).forEach((m) => ids.push(m.id));
            if (unit.children && unit.children.length > 0) traverse(unit.children);
        });
    };
    traverse(units);
    return ids;
}
