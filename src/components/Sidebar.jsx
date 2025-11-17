import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/sidebar.css'

const Sidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()

    const isActive = (path) => location.pathname === path

    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="brand">
                    <div className="brand-icon">WT</div>
                    <div className="brand-info">
                        <span className="brand-title">WELDtelecom</span>
                        <span className="brand-version">2.0</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-menu" aria-label="Основная навигация">
                <button className="menu-link" onClick={() => navigate('/')}>
                    <span className="menu-icon home" />
                    <span className="menu-text">Главная</span>
                </button>

                <button className="menu-link" onClick={() => navigate('/departments')}>
                    <span className="menu-icon factory" />
                    <span className="menu-text">Предприятие</span>
                </button>

                <div className="menu-group active">
                    <button className="menu-link expanded">
                        <span className="menu-icon resources" />
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
                            <span>Сетевое оборудование системы мониторинга</span>
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

                <button className="menu-link" onClick={() => navigate('/my-reports')}>
                    <span className="menu-icon reports" />
                    <span className="menu-text">Отчеты</span>
                </button>

                <button className="menu-link" onClick={() => navigate('/notifications')}>
                    <span className="menu-icon alerts" />
                    <span className="menu-text">Уведомления</span>
                    <span className="menu-pill">12</span>
                </button>

                <button className="menu-link" onClick={() => navigate('/settings')}>
                    <span className="menu-icon settings" />
                    <span className="menu-text">Настройки</span>
                </button>

                <button className="menu-link" onClick={() => navigate('/about')}>
                    <span className="menu-icon info" />
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

