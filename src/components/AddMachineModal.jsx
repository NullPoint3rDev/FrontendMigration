import React, { useState, useEffect, useRef } from 'react';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import '../styles/createOrganizationUnitModal.css';
import '../styles/addMachineModal.css';

const AddMachineModal = ({ isOpen, onClose, onAdd, selectedMachineIds = [] }) => {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set(selectedMachineIds));
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            loadMachines();
            setSelectedIds(new Set(selectedMachineIds));
            setDropdownOpen(false);
            setSearchTerm('');
        }
    }, [isOpen, selectedMachineIds]);

    // Закрытие dropdown при клике вне его
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen]);

    const loadMachines = async () => {
        setLoading(true);
        try {
            const data = await getAllWeldingMachines();
            setMachines(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Ошибка загрузки аппаратов:', error);
            setMachines([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleMachine = (machineId) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(machineId)) {
                newSet.delete(machineId);
            } else {
                newSet.add(machineId);
            }
            return newSet;
        });
    };

    const handleAdd = () => {
        const selectedMachines = machines.filter(m => selectedIds.has(m.id));
        onAdd(selectedMachines);
        onClose();
    };

    const getModelDisplay = (item) => {
        if (item.deviceModel === 'MONITORING_BLOCK') return 'Блок Мониторинга';
        if (item.deviceModel === 'CORE') return 'CORE PULSE';
        return item.model || item.deviceModel?.name || 'Не указана';
    };

    const getDisplayText = () => {
        if (selectedIds.size === 0) {
            return 'Выберите аппараты';
        }
        if (selectedIds.size === 1) {
            const machine = machines.find(m => selectedIds.has(m.id));
            return machine ? `${getModelDisplay(machine)} - ${machine.name}` : 'Выбрано 1 аппарат';
        }
        return `Выбрано аппаратов: ${selectedIds.size}`;
    };

    const filteredMachines = machines.filter(machine => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const name = (machine.name || '').toLowerCase();
        const model = getModelDisplay(machine).toLowerCase();
        const department = (machine.organizationUnit?.name || '').toLowerCase();
        const inventory = (machine.inventoryNumber || '').toLowerCase();
        return name.includes(searchLower) ||
            model.includes(searchLower) ||
            department.includes(searchLower) ||
            inventory.includes(searchLower);
    });

    if (!isOpen) return null;

    return (
        <div className="create-org-unit-modal-overlay" onClick={onClose}>
            <div className="create-org-unit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <button className="create-org-unit-modal-close" onClick={onClose}>
                    ×
                </button>

                <h2 className="create-org-unit-modal-title">Выбрать аппараты</h2>

                <div className="create-org-unit-form">
                    <div className="create-org-unit-form-field" ref={dropdownRef}>
                        <label>Аппараты</label>
                        <div className="machine-select-dropdown">
                            <div
                                className="machine-select-dropdown-trigger"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <span className="machine-select-display">{getDisplayText()}</span>
                                <span className="machine-select-arrow">
                                    {dropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
                                </span>
                            </div>
                            {dropdownOpen && (
                                <div className="machine-select-dropdown-content">
                                    <div style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                        <input
                                            type="text"
                                            placeholder="Поиск по названию, модели, подразделению..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '3px',
                                                color: '#f0f4ff',
                                                fontSize: '12px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        {loading ? (
                                            <div style={{ padding: '12px', textAlign: 'center', color: '#7B8BA6' }}>
                                                Загрузка аппаратов...
                                            </div>
                                        ) : filteredMachines.length === 0 ? (
                                            <div style={{ padding: '12px', textAlign: 'center', color: '#7B8BA6' }}>
                                                {searchTerm ? 'Аппараты не найдены' : 'Нет доступных аппаратов'}
                                            </div>
                                        ) : (
                                            filteredMachines.map(machine => (
                                                <label
                                                    key={machine.id}
                                                    className="machine-select-option"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(machine.id)}
                                                        onChange={() => handleToggleMachine(machine.id)}
                                                    />
                                                    <div className="machine-select-option-content">
                                                        <span className="machine-select-option-name">{machine.name || 'Не указано'}</span>
                                                        <span className="machine-select-option-details">
                                                            {getModelDisplay(machine)} • {machine.organizationUnit?.name || 'Не указано'}
                                                        </span>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="create-org-unit-modal-actions">
                        <button
                            type="button"
                            className="create-org-unit-btn cancel"
                            onClick={onClose}
                        >
                            Отмена
                        </button>
                        <button
                            type="button"
                            className="create-org-unit-btn create"
                            onClick={handleAdd}
                            disabled={selectedIds.size === 0}
                        >
                            Добавить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddMachineModal;
