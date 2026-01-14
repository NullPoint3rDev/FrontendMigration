import React, { useState, useEffect } from 'react';
import { FaEdit, FaUser } from 'react-icons/fa';
import { getAllWeldingMachines } from '../api/weldingMachineApi';
import { getAllWelders } from '../api/welderApi';
import ResourcesLogo from '../images/ResourcesLogo.png';
import '../styles/unitDetailsPanel.css';

const UnitDetailsPanel = ({ selectedUnit, level = 0 }) => {
    const [machines, setMachines] = useState([]);
    const [welders, setWelders] = useState([]);
    const [selectedMachines, setSelectedMachines] = useState([]);
    const [selectedWelders, setSelectedWelders] = useState([]);
    const [expandedMachines, setExpandedMachines] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedUnit) {
            loadUnitData();
        } else {
            setMachines([]);
            setWelders([]);
        }
    }, [selectedUnit]);

    const loadUnitData = async () => {
        if (!selectedUnit) return;

        setLoading(true);
        try {
            // Загружаем все аппараты и фильтруем по подразделению
            const allMachines = await getAllWeldingMachines();
            const unitMachines = allMachines.filter(machine => {
                const machineUnitId = machine.organizationUnit?.id || machine.organizationUnitId;
                return machineUnitId === selectedUnit.id;
            });
            setMachines(unitMachines || []);

            // Загружаем всех сварщиков и фильтруем по подразделению
            const allWelders = await getAllWelders();
            const unitWelders = allWelders.filter(welder => {
                // Проверяем разные варианты структуры данных
                const welderUnitId = welder.organizationUnit?.id ||
                    welder.organizationUnitId ||
                    welder.department?.id ||
                    (typeof welder.department === 'string' ? welder.department : null);
                return welderUnitId === selectedUnit.id;
            });
            setWelders(unitWelders || []);
        } catch (error) {
            console.error('Ошибка загрузки данных подразделения:', error);
            setMachines([]);
            setWelders([]);
        } finally {
            setLoading(false);
        }
    };

    if (!selectedUnit) return null;

    const indent = level * 32; // Такой же отступ, как у подразделений (32px на уровень)

    return (
        <div className="unit-details-panel" style={{ marginLeft: `${indent}px` }}>
            <div className="unit-details-content">
                {/* Левая панель - Аппараты */}
                <div className="unit-details-section machines-section">
                    <div className="section-header">
                        <div className="section-title">
                            <img src={ResourcesLogo} alt="Аппараты" className="section-icon-img" />
                            <span>Аппараты: {machines.length}</span>
                        </div>
                        <span className="section-selected">Выбрано: {selectedMachines.length}</span>
                    </div>
                    <div className="section-list">
                        {loading ? (
                            <div className="loading-message">Загрузка...</div>
                        ) : machines.length === 0 ? (
                            <div className="empty-message">Нет аппаратов</div>
                        ) : (
                            machines.map(machine => {
                                const machineName = machine.name || machine.deviceModel || 'Без названия';
                                const assignedWelders = machine.assignedWelders || machine.welders || [];
                                const hasWelders = assignedWelders.length > 0;
                                const isExpanded = expandedMachines[machine.id] || false;

                                return (
                                    <div key={machine.id} className="section-item machine-item">
                                        <div className="machine-item-row">
                                            <input
                                                type="checkbox"
                                                className="item-checkbox"
                                                checked={selectedMachines.includes(machine.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    if (e.target.checked) {
                                                        setSelectedMachines([...selectedMachines, machine.id]);
                                                    } else {
                                                        setSelectedMachines(selectedMachines.filter(id => id !== machine.id));
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            {hasWelders && (
                                                <button
                                                    className="expand-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedMachines(prev => ({
                                                            ...prev,
                                                            [machine.id]: !prev[machine.id]
                                                        }));
                                                    }}
                                                >
                                                    {isExpanded ? '▾' : '▸'}
                                                </button>
                                            )}
                                            {!hasWelders && <span className="expand-spacer" />}
                                            <span className="item-name">{machineName}</span>
                                            {assignedWelders.length > 0 && (
                                                <span className="item-count">👤 {assignedWelders.length}</span>
                                            )}
                                            <button
                                                className="item-edit-btn"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <FaEdit className="edit-icon" />
                                            </button>
                                        </div>
                                        {hasWelders && isExpanded && (
                                            <div className="machine-welders-list">
                                                {assignedWelders.map((welder, index) => (
                                                    <div key={welder.id || welder || index} className="welder-sub-item">
                                                        <span className="welder-name">
                                                            {typeof welder === 'string' ? welder : (welder.name || welder.fullName || 'Без имени')}
                                                        </span>
                                                        <button
                                                            className="item-edit-btn"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <FaEdit className="edit-icon" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Вертикальный разделитель */}
                <div className="unit-details-divider"></div>

                {/* Правая панель - Сварщики */}
                <div className="unit-details-section welders-section">
                    <div className="section-header">
                        <div className="section-title">
                            <FaUser className="section-icon" />
                            <span>Сварщики: {welders.length}</span>
                        </div>
                        <span className="section-selected">Выбрано: {selectedWelders.length}</span>
                    </div>
                    <div className="section-list">
                        {loading ? (
                            <div className="loading-message">Загрузка...</div>
                        ) : welders.length === 0 ? (
                            <div className="empty-message">Нет сварщиков</div>
                        ) : (
                            welders.map(welder => (
                                <div
                                    key={welder.id}
                                    className={`section-item ${selectedWelders.includes(welder.id) ? 'selected' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        className="item-checkbox"
                                        checked={selectedWelders.includes(welder.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedWelders([...selectedWelders, welder.id]);
                                            } else {
                                                setSelectedWelders(selectedWelders.filter(id => id !== welder.id));
                                            }
                                        }}
                                    />
                                    <span className="item-name">{welder.name || welder.fullName || 'Без имени'}</span>
                                    <button className="item-edit-btn">
                                        <FaEdit className="edit-icon" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnitDetailsPanel;

