import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaArrowRight, FaTimes } from 'react-icons/fa';
import UserProfile from './UserProfile';
import CreateOrganizationUnitModal from './CreateOrganizationUnitModal';
import OrganizationLogo from '../images/OrganizationLogo.png';
import OrganizationUnitsList from './OrganizationUnitsList';
import UnitDetailsPanel from './UnitDetailsPanel';
import { getAllOrganizationUnits, deleteOrganizationUnit } from '../api/organizationUnitApi';
import '../styles/enterpriseMapPage.css';

const EnterpriseMapPageSimple = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedUnitLevel, setSelectedUnitLevel] = useState(0);
    const [expandedUnits, setExpandedUnits] = useState({});
    const navigate = useNavigate();

    // Загружаем подразделения из API при монтировании компонента
    useEffect(() => {
        loadOrganizationUnits();
    }, []);

    const loadOrganizationUnits = async () => {
        try {
            setLoading(true);
            setError('');
            const units = await getAllOrganizationUnits();
            console.log('Загружены подразделения из API:', units);
            setOrganizationUnits(units || []);
        } catch (err) {
            console.error('Ошибка загрузки подразделений:', err);
            setError('Не удалось загрузить подразделения');
            setOrganizationUnits([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (selectedUnits.length === 0) {
            alert('Выберите подразделения для удаления');
            return;
        }

        const confirmMessage = `Вы уверены, что хотите удалить ${selectedUnits.length} подразделение(й)? Это действие нельзя отменить.`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setIsDeleting(true);
            setError('');

            // Удаляем все выбранные подразделения
            const deletePromises = selectedUnits.map(unitId => deleteOrganizationUnit(unitId));
            await Promise.all(deletePromises);

            console.log('Подразделения успешно удалены');

            // Очищаем выбор и перезагружаем список
            setSelectedUnits([]);
            await loadOrganizationUnits();
        } catch (err) {
            console.error('Ошибка удаления подразделений:', err);
            setError('Не удалось удалить подразделения');
            alert('Ошибка при удалении подразделений. Попробуйте еще раз.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="enterprise-map-page">
            {/* Page Title and Controls - Same line */}
            <div className="enterprise-map-header-row">
                <h1 className="enterprise-map-page-title">Карта предприятия</h1>
                <div className="tiles-controls">
                    <button
                        className="control-btn notifications-btn"
                        onClick={() => navigate('/notifications')}
                    >
                        <FaBell className="notifications-icon" />
                        <span className="notifications-badge"></span>
                    </button>
                    <UserProfile />
                </div>
            </div>

            {/* Tiles Section */}
            <div className="enterprise-map-tiles">
                {/* Left side tiles */}
                <div className="tiles-left">
                    <div className="action-tile search-tile">
                        <div className="search-container">
                            <input
                                type="text"
                                className="tile-search-input"
                                placeholder="Поиск"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <FaSearch className="search-icon" />
                        </div>
                    </div>
                    <div className="action-tile add-tile">
                        <button
                            className="tile-btn add-btn"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <img src={OrganizationLogo} alt="Organization" className="add-btn-icon" />
                            Добавить подразделение +
                        </button>
                    </div>
                </div>

                {/* Right side tiles */}
                <div className="tiles-right">
                    <div className="action-tile">
                        <button className="tile-btn move-btn">
                            <FaArrowRight className="btn-icon" />
                            Переместить
                        </button>
                    </div>
                    <div className="action-tile">
                        <button
                            className="tile-btn delete-btn"
                            onClick={handleDelete}
                            disabled={isDeleting || selectedUnits.length === 0}
                        >
                            <FaTimes className="btn-icon" />
                            Удалить
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Organization Units List */}
            <div className="enterprise-map-content">
                {loading ? (
                    <div style={{ padding: '20px', color: '#F9F3FD' }}>Загрузка подразделений...</div>
                ) : error ? (
                    <div style={{ padding: '20px', color: '#ff6b6b' }}>{error}</div>
                ) : (
                    <>
                        <OrganizationUnitsList
                            units={organizationUnits}
                            selectedUnits={selectedUnits}
                            onSelectionChange={setSelectedUnits}
                            selectedUnitId={selectedUnit?.id}
                            onUnitClick={(unit, level) => {
                                setSelectedUnit(unit);
                                setSelectedUnitLevel(level || 0);
                            }}
                            onExpandedUnitsChange={(expanded) => {
                                setExpandedUnits(expanded);
                            }}
                            onEdit={(unit) => {
                                console.log('Edit unit:', unit);
                                // TODO: Implement edit functionality
                            }}
                        />
                        {selectedUnit && (
                            <UnitDetailsPanel selectedUnit={selectedUnit} level={selectedUnitLevel} />
                        )}
                        {/* Секция "Неорганизованные" отображается после панелей */}
                        <div className="org-units-list-container">
                            <table className="org-units-table">
                                <tbody>
                                <tr className="org-units-divider">
                                    <td colSpan="5"></td>
                                </tr>
                                <tr className="org-units-section-header">
                                    <td colSpan="5">Неорганизованные</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Create Organization Unit Modal */}
            <CreateOrganizationUnitModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                existingUnits={organizationUnits}
                onSuccess={async () => {
                    // После успешного создания перезагружаем список из API
                    await loadOrganizationUnits();
                }}
            />
        </div>
    );
};

export default EnterpriseMapPageSimple;

