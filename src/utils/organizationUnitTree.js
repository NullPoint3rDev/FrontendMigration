/**
 * Строит дерево подразделений из плоского списка API (parentId / parentDepartment).
 */
export function buildOrganizationHierarchy(units) {
    if (!units || units.length === 0) return [];

    const unitMap = new Map();
    const rootUnits = [];

    const normalizeId = (id) => {
        if (id == null) return null;
        return typeof id === 'string' ? parseInt(id, 10) : id;
    };

    units.forEach((unit) => {
        const normalizedId = normalizeId(unit.id);
        unitMap.set(normalizedId, {
            ...unit,
            id: normalizedId,
            children: [],
        });
    });

    units.forEach((unit) => {
        const normalizedId = normalizeId(unit.id);
        const unitNode = unitMap.get(normalizedId);

        let parentIdValue = null;
        if (unit.parentId != null) {
            parentIdValue = unit.parentId;
        } else if (unit.parent_id != null) {
            parentIdValue = unit.parent_id;
        } else if (unit.parentDepartment != null && unit.parentDepartment.id != null) {
            parentIdValue = unit.parentDepartment.id;
        }

        if (parentIdValue != null) {
            const normalizedParentId = normalizeId(parentIdValue);
            if (unitMap.has(normalizedParentId)) {
                const parent = unitMap.get(normalizedParentId);
                parent.children.push(unitNode);
            } else {
                rootUnits.push(unitNode);
            }
        } else {
            rootUnits.push(unitNode);
        }
    });

    return rootUnits;
}
