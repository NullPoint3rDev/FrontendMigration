import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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

    const isActive = (path) => location.pathname === path

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
                <button className="menu-link" onClick={() => navigate('/')}>
                    <img src={MainPageLogo} alt="Главная" className="menu-icon" />
                    <span className="menu-text">Главная</span>
                </button>

                <div className={`menu-group ${isActive('/enterprise-map') || isActive('/welders') || isActive('/employees') ? 'active' : ''}`}>
                    <button className="menu-link expanded">
                        <img src={OrganizationLogo} alt="Предприятие" className="menu-icon" />
                        <div className="menu-text-group">
                            <span className="menu-text">Предприятие</span>
                        </div>
                        <span className="menu-arrow">▾</span>
                    </button>

                    <div className="submenu">
                        <button
                            className={`submenu-item ${isActive('/enterprise-map') ? 'active' : ''}`}
                            onClick={() => navigate('/enterprise-map')}
                        >
                            <span className="submenu-marker" />
                            <span>Карта предприятия</span>
                        </button>
                        <button
                            className={`submenu-item ${isActive('/welders') ? 'active' : ''}`}
                            onClick={() => navigate('/welders')}
                        >
                            <span className="submenu-marker" />
                            <span>Сварщики</span>
                        </button>
                        <button
                            className={`submenu-item ${isActive('/employees') ? 'active' : ''}`}
                            onClick={() => navigate('/employees')}
                        >
                            <span className="submenu-marker" />
                            <span>Пользователи</span>
                        </button>
                    </div>
                </div>

                <div className="menu-group active">
                    <button className="menu-link expanded">
                        <img src={ResourcesLogo} alt="Ресурсы" className="menu-icon" />
                        <div className="menu-text-group">
                            <span className="menu-text">Ресурсы</span>
                        </div>
                        <span className="menu-arrow">▾</span>
                    </button>

                    <div className="submenu">
                        <button
                            className={`submenu-item ${isActive('/equipment') ? 'active' : ''}`}
                            onClick={() => navigate('/equipment')}
                        >
                            <span className="submenu-marker" />
                            <span>Сварочное оборудование</span>
                        </button>
                        <button
                            className={`submenu-item ${isActive('/network-equipment') ? 'active' : ''}`}
                            onClick={() => navigate('/network-equipment')}
                        >
                            <span className="submenu-marker" />
                            <span>Сетевое оборудование</span>
                        </button>
                        <button
                            className={`submenu-item ${isActive('/materials') ? 'active' : ''}`}
                            onClick={() => navigate('/materials')}
                        >
                            <span className="submenu-marker" />
                            <span>Сварочные материалы</span>
                        </button>
                        <button
                            className={`submenu-item ${isActive('/wps') ? 'active' : ''}`}
                            onClick={() => navigate('/wps')}
                        >
                            <span className="submenu-marker" />
                            <span>Технологические карты сварки (WPS)</span>
                        </button>
                    </div>
                </div>

                <button
                    className={`menu-link ${isActive('/reports') ? 'active' : ''}`}
                    onClick={() => navigate('/reports')}
                >
                    <img src={ReportsLogo} alt="Отчеты" className="menu-icon" />
                    <span className="menu-text">Отчеты</span>
                </button>

                <button className="menu-link" onClick={() => navigate('/notifications')}>
                    <img src={NotificationsLogo} alt="Уведомления" className="menu-icon" />
                    <span className="menu-text">Уведомления</span>
                </button>

                <button className="menu-link" onClick={() => navigate('/settings')}>
                    <img src={SettingsLogo} alt="Настройки" className="menu-icon" />
                    <span className="menu-text">Настройки</span>
                </button>

                <button className="menu-link" onClick={() => navigate('/about')}>
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

