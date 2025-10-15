import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import UserProfile from './UserProfile';
import '../styles/main_page.css';

const Navbar = () => {
    const [dropdown, setDropdown] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const navMenu = [
        { label: 'Главная', path: '/' },
        {
            label: 'Предприятие',
            dropdown: [
                { label: 'Подразделения', path: '/departments' },
                { label: 'Сотрудники (пользователи)', path: '/employees' },
                { label: 'Сварщики', path: '/welders' },
            ],
        },
        {
            label: 'Ресурсы',
            dropdown: [
                { label: 'Сварочное оборудование', path: '/equipment' },
                { label: 'Сетевое оборудование системы мониторинга', path: '/network-equipment' },
                { label: 'Сварочные материалы', path: '/materials' },
                { label: 'Технологические карты сварки (WPS)', path: '/wps' },
                { label: 'Тестирование плат', path: '/device-test' },
            ],
        },
        {
            label: 'Мониторинг',
            dropdown: [
                { label: 'Карта предприятия', path: '/enterprise-map' },
                { label: 'Интерактивная карта', path: '/interactive-map' },
                { label: 'Перечень оборудования', path: '/equipment-list' },
            ],
        },
        { label: 'Отчеты', path: '/my-reports' },
        { label: 'Уведомления', path: '/notifications' },
        { label: 'Настройки', path: '/settings' },
        { label: 'О программе', path: '/about' },
    ];

    const handleNavClick = (item, e) => {
        if (item.dropdown) {
            e.preventDefault();
            setDropdown(dropdown === item.label ? null : item.label);
        } else {
            navigate(item.path);
            setDropdown(null);
        }
    };

    const handleDropdownClick = (e, path) => {
        e.stopPropagation();
        navigate(path);
        setDropdown(null);
    };

    return (
        <div className="nav-container">
            <nav className="nav-menu">
                <div className="nav-items">
                    {navMenu.map((item) => (
                        <div
                            key={item.label}
                            className={`nav-item${location.pathname === item.path ? ' active' : ''}${
                                item.dropdown ? ' dropdown-parent' : ''
                            }`}
                            onClick={(e) => handleNavClick(item, e)}
                            onMouseEnter={() => item.dropdown && setDropdown(item.label)}
                            onMouseLeave={() => setDropdown(null)}
                        >
                            {item.dropdown ? (
                                <>
                                    {item.label}
                                    <div className={`dropdown-menu${dropdown === item.label ? ' active' : ''}`}>
                                        {item.dropdown.map((subitem) => (
                                            <div
                                                key={subitem.label}
                                                className="dropdown-item"
                                                onClick={(e) => handleDropdownClick(e, subitem.path)}
                                            >
                                                {subitem.label}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                item.label
                            )}
                        </div>
                    ))}
                </div>
                <UserProfile />
            </nav>
        </div>
    );
};

export default Navbar;