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
            label: '1. Предприятие',
            dropdown: [
                { label: 'Подразделения', path: '/departments' },
                { label: 'Сотрудники (пользователи)', path: '/employees' },
                { label: 'Сварщики', path: '/welders' },
            ],
        },
        {
            label: '2. Ресурсы',
            dropdown: [
                { label: 'Сварочное оборудование', path: '/equipment' },
                { label: 'Сетевое оборудование системы мониторинга', path: '/network-equipment' },
                { label: 'Сварочные материалы', path: '/materials' },
                { label: 'Технологические карты сварки (WPS)', path: '/wps' },
            ],
        },
        {
            label: '3. Мониторинг',
            dropdown: [
                { label: 'Карта предприятия', path: '/enterprise-map' },
                { label: 'Перечень оборудования', path: '/equipment-list' },
            ],
        },
        {
            label: '4. Отчеты',
            dropdown: [
                { label: 'По работе оборудования', path: '/reports/equipment' },
                { label: 'По работе сварщиков', path: '/reports/welders' },
                { label: 'По расходу материалов', path: '/reports/materials' },
                { label: 'По сварочным швам', path: '/reports/welds' },
                { label: 'Отправка уведомлений и отчетов по эл. почте', path: '/reports/notifications' },
                { label: 'По ошибкам сварочного оборудования', path: '/reports/errors' },
                { label: 'Перечень швов, выполненных с нарушением', path: '/reports/violations' },
                { label: 'Отчет о выполнении сварочного задания', path: '/reports/tasks' },
            ],
        },
        {
            label: '5. Настройки',
            dropdown: [
                { label: 'Время хранения информации в БД', path: '/settings/storage' },
                { label: 'Время отсутствия активности пользователя', path: '/settings/inactivity' },
            ],
        },
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