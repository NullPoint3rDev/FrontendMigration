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
            label: 'Предприятия',
            dropdown: [
                { label: 'Организации', path: '/organizations' },
                { label: 'Сотрудники', path: '/employees' },
                { label: 'Сварщики', path: '/welders' },
            ],
        },
        {
            label: 'Ресурсы',
            dropdown: [
                { label: 'Сварочные материалы', path: '/materials' },
                { label: 'Сварочное оборудование', path: '/equipment' },
            ],
        },
        {
            label: 'Инструкции',
            dropdown: [
                { label: 'Безопасность сварочных работ', path: '/safety' },
                { label: 'Прошивки', path: '/firmware' },
                { label: 'Документы', path: '/docs' },
                { label: 'Руководства', path: '/manuals' },
            ],
        },
        {
            label: 'Мониторинг',
            dropdown: [
                { label: 'Архив', path: '/archive' },
                { label: 'Отчеты', path: '/reports' },
            ],
        },
        {
            label: 'Обучение',
            dropdown: [
                { label: 'Библиотека', path: '/library' },
            ],
        },
        {
            label: 'Общение',
            dropdown: [
                { label: 'Сообщения', path: '/messages' },
                { label: 'Поддержка', path: '/support' },
            ],
        },
        {
            label: 'ДСЕ',
            dropdown: [
                { label: 'Типы проволоки', path: '/wire-types' },
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
                                <Link to={item.path} className="nav-link">
                                    {item.label}
                                </Link>
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