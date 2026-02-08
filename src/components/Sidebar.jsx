import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useReportsUnsaved } from '../contexts/ReportsUnsavedContext'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa'
import '../styles/sidebar.css'
import WTLogo from '../images/WTLogo.png'
import MainPageLogo from '../images/MainPageLogo.png'
import OrganizationLogo from '../images/OrganizationLogo.png'
import ResourcesLogo from '../images/ResourcesLogo.png'
import ReportsLogo from '../images/ReportsLogo.png'
import NotificationsLogo from '../images/NotificationsLogo.png'
import SettingsLogo from '../images/SettingsLogo.png'
import AboutLogo from '../images/AboutLogo.png'

const Sidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const reportsUnsaved = useReportsUnsaved()
    const [expandedGroups, setExpandedGroups] = useState({
        enterprise: true,  // По умолчанию раскрыто
        resources: true   // По умолчанию раскрыто
    })

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/'
        }
        return location.pathname === path || location.pathname.startsWith(path + '/')
    }

    const handleNavigate = (path) => {
        if (location.pathname === '/reports' && reportsUnsaved?.isDirtyRef?.current?.()) {
            reportsUnsaved.requestLeave(path)
        } else {
            navigate(path)
        }
    }

    // Группы всегда остаются раскрытыми, но можно вручную свернуть/развернуть
    // useEffect больше не нужен, так как по умолчанию они раскрыты

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }))
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="brand">
                    <img src={WTLogo} alt="WT Logo" className="brand-icon" />
                    <div className="brand-info">
                        <span className="brand-title">WELDtelecom</span>
                        <span className="brand-version">2.0</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-menu" aria-label="Основная навигация">
                <button
                    className={`menu-link ${isActive('/') ? 'active' : ''}`}
                    onClick={() => handleNavigate('/')}
                >
                    <img src={MainPageLogo} alt="Главная" className="menu-icon" />
                    <span className="menu-text">Главная</span>
                </button>

                <div className={`menu-group ${isActive('/enterprise-map') || isActive('/welders') || isActive('/employees') ? 'active' : ''}`}>
                    <button
                        className={`menu-link ${expandedGroups.enterprise ? 'expanded' : ''}`}
                        onClick={() => toggleGroup('enterprise')}
                    >
                        <img src={OrganizationLogo} alt="Предприятие" className="menu-icon" />
                        <div className="menu-text-group">
                            <span className="menu-text">Предприятие</span>
                        </div>
                        {expandedGroups.enterprise ? (
                            <FaChevronDown className="menu-arrow expand-icon" />
                        ) : (
                            <FaChevronRight className="menu-arrow expand-icon" />
                        )}
                    </button>

                    {expandedGroups.enterprise && (
                        <div className="submenu">
                            <button
                                className={`submenu-item ${isActive('/enterprise-map') ? 'active' : ''}`}
                                onClick={() => handleNavigate('/enterprise-map')}
                            >
                                <span className="submenu-marker" />
                                <span>Карта предприятия</span>
                            </button>
                            <button
                                className={`submenu-item ${isActive('/welders') ? 'active' : ''}`}
                                onClick={() => handleNavigate('/welders')}
                            >
                                <span className="submenu-marker" />
                                <span>Сварщики</span>
                            </button>
                            <button
                                className={`submenu-item ${isActive('/employees') ? 'active' : ''}`}
                                onClick={() => handleNavigate('/employees')}
                            >
                                <span className="submenu-marker" />
                                <span>Пользователи</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className={`menu-group ${isActive('/equipment') || isActive('/network-equipment') || isActive('/materials') || isActive('/wps') ? 'active' : ''}`}>
                    <button
                        className={`menu-link ${expandedGroups.resources ? 'expanded' : ''}`}
                        onClick={() => toggleGroup('resources')}
                    >
                        <img src={ResourcesLogo} alt="Ресурсы" className="menu-icon" />
                        <div className="menu-text-group">
                            <span className="menu-text">Ресурсы</span>
                        </div>
                        {expandedGroups.resources ? (
                            <FaChevronDown className="menu-arrow expand-icon" />
                        ) : (
                            <FaChevronRight className="menu-arrow expand-icon" />
                        )}
                    </button>

                    {expandedGroups.resources && (
                        <div className="submenu">
                            <button
                                className={`submenu-item ${isActive('/equipment') ? 'active' : ''}`}
                                onClick={() => handleNavigate('/equipment')}
                            >
                                <span className="submenu-marker" />
                                <span>Сварочное оборудование</span>
                            </button>
                            <button
                                className={`submenu-item ${isActive('/network-equipment') ? 'active' : ''}`}
                                onClick={() => handleNavigate('/network-equipment')}
                            >
                                <span className="submenu-marker" />
                                <span>Сетевое оборудование</span>
                            </button>
                            <button
                                className={`submenu-item ${isActive('/materials') ? 'active' : ''}`}
                                onClick={() => handleNavigate('/materials')}
                            >
                                <span className="submenu-marker" />
                                <span>Сварочные материалы</span>
                            </button>
                            <button
                                className={`submenu-item ${isActive('/wps') ? 'active' : ''}`}
                                onClick={() => handleNavigate('/wps')}
                            >
                                <span className="submenu-marker" />
                                <span>Технологические карты сварки (WPS)</span>
                            </button>
                        </div>
                    )}
                </div>

                <button
                    className={`menu-link ${isActive('/reports') ? 'active' : ''}`}
                    onClick={() => handleNavigate('/reports')}
                >
                    <img src={ReportsLogo} alt="Отчеты" className="menu-icon" />
                    <span className="menu-text">Отчеты</span>
                </button>

                <button
                    className={`menu-link ${isActive('/notifications') ? 'active' : ''}`}
                    onClick={() => handleNavigate('/notifications')}
                >
                    <img src={NotificationsLogo} alt="Уведомления" className="menu-icon" />
                    <span className="menu-text">Уведомления</span>
                </button>

                <button
                    className={`menu-link ${isActive('/settings') ? 'active' : ''}`}
                    onClick={() => handleNavigate('/settings')}
                >
                    <img src={SettingsLogo} alt="Настройки" className="menu-icon" />
                    <span className="menu-text">Настройки</span>
                </button>

                <button
                    className={`menu-link ${isActive('/about') ? 'active' : ''}`}
                    onClick={() => handleNavigate('/about')}
                >
                    <img src={AboutLogo} alt="О программе" className="menu-icon" />
                    <span className="menu-text">О программе</span>
                </button>
            </nav>

            <div className="sidebar-divider" />
            <footer className="sidebar-footer">
                <div className="footer-badge">ALLOY Ltd</div>
            </footer>
        </aside>
    )
}

export default Sidebar

