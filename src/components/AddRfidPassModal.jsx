import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { getAllWeldingMachines, getMacLiveness } from '../api/weldingMachineApi';
import { getArchivePanelState } from '../api/archiveDeviceApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';
import { getAllOrganizations } from '../api/organizationApi';
import { groupUnitsByOrganization } from '../utils/organizationUnitFilterGroups';
import '../styles/addRfidPassModal.css';

const READ_POLL_INTERVAL_MS = 1000;
const READ_TIMEOUT_MS = 60000;
const ONLINE_STALE_MS = 30000;

function extractRfidFromPanelState(state) {
    if (!state) return null;
    const props = state.properties || state;
    const candidates = [
        props?.['RFID.Hex']?.value, props?.['RFID.Hex'],
        props?.RFID?.value, props?.RFID,
        props?.Rfid?.value, props?.Rfid,
        props?.rfid?.value, props?.rfid,
    ];
    for (const c of candidates) {
        if (c == null) continue;
        const str = String(c).trim();
        if (str === '' || str === 'null' || /^0+$/.test(str.replace(/[^0-9a-fA-F]/g, ''))) continue;
        return str;
    }
    return null;
}

function unitOrgId(u) {
    return String(u?.organizationId ?? u?.organization?.id ?? u?.organization_id ?? '');
}

function isMachineOnline(machine, livenessMap) {
    const mac = machine?.mac;
    if (!mac) return false;
    const live = livenessMap[mac];
    if (live?.lastSeenMs != null && Date.now() - live.lastSeenMs < ONLINE_STALE_MS) return true;
    if (machine.lastOnlineOn) {
        const t = new Date(machine.lastOnlineOn).getTime();
        if (Number.isFinite(t) && Date.now() - t < ONLINE_STALE_MS) return true;
    }
    return false;
}

const AddRfidPassModal = ({ isOpen, onClose, onAdd }) => {
    const [rfidCode, setRfidCode] = useState('');
    const [machines, setMachines] = useState([]);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [selectedMachineId, setSelectedMachineId] = useState('');
    const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);
    const [expandedOrgs, setExpandedOrgs] = useState({});
    const [expandedUnits, setExpandedUnits] = useState({});
    const [livenessMap, setLivenessMap] = useState({});
    const [reading, setReading] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [readError, setReadError] = useState('');
    const readTimersRef = useRef({ poll: null, timeout: null, countdown: null });
    const dropdownRef = useRef(null);

    const stopReading = () => {
        if (readTimersRef.current.poll) clearInterval(readTimersRef.current.poll);
        if (readTimersRef.current.timeout) clearTimeout(readTimersRef.current.timeout);
        if (readTimersRef.current.countdown) clearInterval(readTimersRef.current.countdown);
        readTimersRef.current = { poll: null, timeout: null, countdown: null };
        setReading(false);
        setSecondsLeft(0);
    };

    useEffect(() => {
        if (isOpen) {
            setRfidCode('');
            setSelectedMachineId('');
            setReadError('');
            setMachineDropdownOpen(false);
            setExpandedOrgs({});
            setExpandedUnits({});
            Promise.all([
                getAllWeldingMachines().catch(() => []),
                getAllOrganizationUnits().catch(() => []),
                getAllOrganizations().catch(() => []),
            ]).then(([ms, units, orgs]) => {
                setMachines((Array.isArray(ms) ? ms : []).filter((m) => m.mac));
                setOrganizationUnits(Array.isArray(units) ? units : []);
                setOrganizations(Array.isArray(orgs) ? orgs : []);
            });
        } else {
            stopReading();
        }
        return () => stopReading();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || machines.length === 0) return;
        let cancelled = false;
        (async () => {
            const next = {};
            await Promise.all(machines.slice(0, 40).map(async (m) => {
                try {
                    const resp = await getMacLiveness(m.mac);
                    if (resp) next[m.mac] = resp;
                } catch { /* ignore */ }
            }));
            if (!cancelled) setLivenessMap((prev) => ({ ...prev, ...next }));
        })();
        return () => { cancelled = true; };
    }, [isOpen, machines]);

    useEffect(() => {
        if (!machineDropdownOpen) return;
        const onDoc = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setMachineDropdownOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [machineDropdownOpen]);

    const orgGroups = useMemo(
        () => groupUnitsByOrganization(organizationUnits, organizations),
        [organizationUnits, organizations]
    );

    const machinesByUnit = useMemo(() => {
        const map = new Map();
        machines.forEach((m) => {
            const uid = String(m.organizationUnit?.id ?? m.organizationUnitId ?? '');
            if (!uid) return;
            if (!map.has(uid)) map.set(uid, []);
            map.get(uid).push(m);
        });
        return map;
    }, [machines]);

    const selectedMachine = machines.find((m) => String(m.id) === String(selectedMachineId));

    const handleAdd = () => {
        if (rfidCode.trim()) {
            onAdd(rfidCode.trim());
            handleClose();
        }
    };

    const handleClose = () => {
        stopReading();
        setRfidCode('');
        setSelectedMachineId('');
        setReadError('');
        onClose();
    };

    const selectMachine = (machine) => {
        setSelectedMachineId(String(machine.id));
        setMachineDropdownOpen(false);
        setReadError('');
    };

    const startReading = async () => {
        const machine = machines.find((m) => String(m.id) === String(selectedMachineId));
        if (!machine || !machine.mac) {
            setReadError('Выберите аппарат для считывания');
            return;
        }
        try {
            const live = await getMacLiveness(machine.mac);
            setLivenessMap((prev) => ({ ...prev, [machine.mac]: live }));
            const online = live?.lastSeenMs != null && Date.now() - live.lastSeenMs < ONLINE_STALE_MS;
            if (!online && !isMachineOnline(machine, { [machine.mac]: live })) {
                setReadError('Аппарат не в сети');
                return;
            }
        } catch {
            if (!isMachineOnline(machine, livenessMap)) {
                setReadError('Аппарат не в сети');
                return;
            }
        }

        setReadError('');
        setReading(true);
        setSecondsLeft(Math.floor(READ_TIMEOUT_MS / 1000));

        const poll = async () => {
            try {
                const state = await getArchivePanelState(machine.mac);
                const code = extractRfidFromPanelState(state);
                if (code) {
                    setRfidCode(code);
                    stopReading();
                }
            } catch { /* continue */ }
        };

        poll();
        readTimersRef.current.poll = setInterval(poll, READ_POLL_INTERVAL_MS);
        readTimersRef.current.countdown = setInterval(() => {
            setSecondsLeft((s) => Math.max(0, s - 1));
        }, 1000);
        readTimersRef.current.timeout = setTimeout(() => {
            stopReading();
            setReadError('Пропуск не считан. Приложите карту к аппарату и попробуйте снова.');
        }, READ_TIMEOUT_MS);
    };

    const renderMachineLeaf = (machine, depth) => {
        const online = isMachineOnline(machine, livenessMap);
        const selected = String(selectedMachineId) === String(machine.id);
        return (
            <div
                key={`m-${machine.id}`}
                className={`add-rfid-pass-tree-leaf ${selected ? 'selected' : ''} ${online ? '' : 'offline'}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => {
                    if (!online) {
                        setReadError('Аппарат не в сети');
                        return;
                    }
                    selectMachine(machine);
                }}
            >
                <span className="add-rfid-pass-tree-leaf-name">{machine.name || `Аппарат ${machine.id}`}</span>
                {!online && <span className="add-rfid-pass-offline-tag">Не в сети</span>}
            </div>
        );
    };

    const renderUnitNode = (unit, orgKey, depth) => {
        const unitKey = `${orgKey}-${unit.id}`;
        const unitMachines = machinesByUnit.get(String(unit.id)) || [];
        const hasChildren = (unit.children || []).length > 0;
        const expanded = !!expandedUnits[unitKey];
        return (
            <React.Fragment key={unit.id}>
                <div
                    className="add-rfid-pass-tree-unit"
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                >
                    {(hasChildren || unitMachines.length > 0) ? (
                        <button
                            type="button"
                            className="add-rfid-pass-tree-chevron"
                            onClick={() => setExpandedUnits((p) => ({ ...p, [unitKey]: !p[unitKey] }))}
                        >
                            {expanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                        </button>
                    ) : (
                        <span className="add-rfid-pass-tree-chevron-spacer" />
                    )}
                    <span>{unit.name}</span>
                </div>
                {expanded && unitMachines.map((m) => renderMachineLeaf(m, depth + 1))}
                {expanded && (unit.children || []).map((ch) => renderUnitNode(ch, orgKey, depth + 1))}
            </React.Fragment>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="add-rfid-pass-modal-overlay" onClick={handleClose}>
            <div className="add-rfid-pass-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="add-rfid-pass-modal-close" onClick={handleClose}>×</button>
                <h2 className="add-rfid-pass-modal-title">Добавить пропуск RFID</h2>

                <div className="add-rfid-pass-form">
                    <div className="add-rfid-pass-form-field">
                        <label htmlFor="rfidCode">Код RFID</label>
                        <input
                            id="rfidCode"
                            type="text"
                            value={rfidCode}
                            onChange={(e) => setRfidCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAdd();
                                }
                            }}
                            placeholder="Введите код RFID"
                            autoFocus
                        />
                    </div>

                    <div className="add-rfid-pass-read-section">
                        {!reading ? (
                            <>
                                <div className="add-rfid-pass-machine-tree" ref={dropdownRef}>
                                    <div
                                        className={`add-rfid-pass-machine-trigger ${machineDropdownOpen ? 'open' : ''}`}
                                        onClick={() => setMachineDropdownOpen((o) => !o)}
                                    >
                                        <span>
                                            {selectedMachine
                                                ? (selectedMachine.name || `Аппарат ${selectedMachine.id}`)
                                                : 'Выберите аппарат…'}
                                        </span>
                                        <FaChevronDown size={10} />
                                    </div>
                                    {machineDropdownOpen && (
                                        <div className="add-rfid-pass-machine-dropdown">
                                            {orgGroups.length === 0 ? (
                                                <div className="add-rfid-pass-tree-empty">Нет аппаратов</div>
                                            ) : (
                                                orgGroups.map((group) => {
                                                    const orgExpanded = !!expandedOrgs[group.orgKey];
                                                    return (
                                                        <React.Fragment key={group.orgKey}>
                                                            <div className="add-rfid-pass-tree-org">
                                                                <button
                                                                    type="button"
                                                                    className="add-rfid-pass-tree-chevron"
                                                                    onClick={() => setExpandedOrgs((p) => ({
                                                                        ...p,
                                                                        [group.orgKey]: !p[group.orgKey],
                                                                    }))}
                                                                >
                                                                    {orgExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                                                </button>
                                                                <span>{group.orgName}</span>
                                                            </div>
                                                            {orgExpanded && group.hierarchy.map((unit) => renderUnitNode(unit, group.orgKey, 1))}
                                                        </React.Fragment>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="add-rfid-pass-btn read"
                                    onClick={startReading}
                                    disabled={!selectedMachineId}
                                >
                                    Считать пропуск
                                </button>
                            </>
                        ) : (
                            <div className="add-rfid-pass-reading-row">
                                <span className="add-rfid-pass-reading-text">
                                    Ожидание пропуска… {secondsLeft > 0 ? `(${secondsLeft} с)` : ''}
                                </span>
                                <button
                                    type="button"
                                    className="add-rfid-pass-btn cancel"
                                    onClick={() => {
                                        stopReading();
                                        setReadError('');
                                    }}
                                >
                                    Отмена
                                </button>
                            </div>
                        )}
                    </div>

                    {readError && <div className="add-rfid-pass-read-error">{readError}</div>}

                    <div className="add-rfid-pass-modal-actions">
                        <button
                            type="button"
                            className="add-rfid-pass-btn add"
                            onClick={handleAdd}
                            disabled={!rfidCode.trim()}
                        >
                            Добавить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddRfidPassModal;
