import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Menu, MenuItem, IconButton } from '@mui/material';
import { AccountCircle, Logout } from '@mui/icons-material';
import { api } from '../services/api';
import '../styles/userProfile.css';

const UserProfile = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [userData, setUserData] = useState(null);
    const navigate = useNavigate();
    const menuRef = useRef(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const data = await api.getCurrentUser();
                setUserData(data);
            } catch (e) {
                // Если токен невалиден, разлогиниваем
                localStorage.removeItem('token');
                // navigate('/login');
            }
        };
        fetchUser();
    }, [navigate]);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleProfileClick = () => {
        handleClose();
        navigate('/profile');
    };

    const handleLogout = () => {
        handleClose();
        try {
            localStorage.clear();
        } catch (_) {}
        try {
            sessionStorage.clear();
        } catch (_) {}
        // Принудительно перезагружаем приложение, чтобы пересчитать scope/кэш
        window.location.replace('/login');
    };

    return (
        <div className="user-profile">
            <IconButton
                onClick={handleClick}
                sx={{ color: 'white' }}
            >
                {userData?.photo ? (
                    <Avatar src={userData.photo} />
                ) : (
                    <AccountCircle sx={{ fontSize: 32 }} />
                )}
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                className="profile-menu"
            >
                <MenuItem onClick={handleProfileClick} className="menu-item">
                    <AccountCircle sx={{ mr: 1 }} />
                    Профиль
                </MenuItem>
                <MenuItem onClick={handleLogout} className="menu-item">
                    <Logout sx={{ mr: 1 }} />
                    Выйти
                </MenuItem>
            </Menu>
            {userData && (
                <span style={{ color: '#fff', marginLeft: 8, fontWeight: 500 }}>
                    {userData.lastName} {userData.firstName}
                </span>
            )}
        </div>
    );
};

export default UserProfile;