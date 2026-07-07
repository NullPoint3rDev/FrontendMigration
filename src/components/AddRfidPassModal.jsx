import React, { useState, useEffect, useRef } from 'react';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import { getArchivePanelState } from '../api/archiveDeviceApi';
import '../styles/addRfidPassModal.css';

const READ_POLL_INTERVAL_MS = 1000;
const READ_TIMEOUT_MS = 30000;

// Достаёт код RFID из состояния устройства (то же представление, что и на странице мониторинга).
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

const AddRfidPassModal = ({ isOpen, onClose, onAdd }) => {
    const [rfidCode, setRfidCode] = useState('');
    const [machines, setMachines] = useState([]);
    const [selectedMachineId, setSelectedMachineId] = useState('');
    const [reading, setReading] = useState(false);
    const [readError, setReadError] = useState('');
    const readTimersRef = useRef({ poll: null, timeout: null });

    const stopReading = () => {
        if (readTimersRef.current.poll) clearInterval(readTimersRef.current.poll);
        if (readTimersRef.current.timeout) clearTimeout(readTimersRef.current.timeout);
        readTimersRef.current = { poll: null, timeout: null };
        setReading(false);
    };

    useEffect(() => {
        if (isOpen) {
            setRfidCode('');
            setSelectedMachineId('');
            setReadError('');
            getAllWeldingMachines()
                .then((data) => setMachines((Array.isArray(data) ? data : []).filter((m) => m.mac)))
                .catch(() => setMachines([]));
        } else {
            stopReading();
        }
        return () => stopReading();
    }, [isOpen]);

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

    const startReading = () => {
        const machine = machines.find((m) => String(m.id) === String(selectedMachineId));
        if (!machine || !machine.mac) {
            setReadError('Выберите аппарат для считывания');
            return;
        }
        setReadError('');
        setReading(true);

        const poll = async () => {
            try {
                const state = await getArchivePanelState(machine.mac);
                const code = extractRfidFromPanelState(state);
                if (code) {
                    setRfidCode(code);
                    stopReading();
                }
            } catch {
                // ignore, продолжаем опрос
            }
        };

        poll();
        readTimersRef.current.poll = setInterval(poll, READ_POLL_INTERVAL_MS);
        readTimersRef.current.timeout = setTimeout(() => {
            stopReading();
            setReadError('Пропуск не считан. Приложите карту к аппарату и попробуйте снова.');
        }, READ_TIMEOUT_MS);
    };

    if (!isOpen) return null;

    return (
        <div className="add-rfid-pass-modal-overlay" onClick={handleClose}>
            <div className="add-rfid-pass-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="add-rfid-pass-modal-close" onClick={handleClose}>
                    ×
                </button>

                <h2 className="add-rfid-pass-modal-title">Добавить пропуск RFID</h2>

                <div className="add-rfid-pass-form">
                    <div className="add-rfid-pass-form-field">
                        <label htmlFor="rfidCode">
                            Код RFID
                        </label>
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
                                <select
                                    className="add-rfid-pass-machine-select"
                                    value={selectedMachineId}
                                    onChange={(e) => setSelectedMachineId(e.target.value)}
                                >
                                    <option value="">Выберите аппарат…</option>
                                    {machines.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name || `Аппарат ${m.id}`} ({m.mac})
                                        </option>
                                    ))}
                                </select>
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
                                <span className="add-rfid-pass-reading-text">Ожидание пропуска…</span>
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
