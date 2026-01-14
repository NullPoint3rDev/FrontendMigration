import React, { useState, useEffect, useRef } from 'react';
import { userAccountApi } from '../api/userAccountApi';
import '../styles/userProfile.css';
import { FaEdit, FaSave, FaTimes, FaInstagram, FaTelegram, FaVk } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";

const socialIcons = {
    instagram: <FaInstagram />,
    telegram: <FaTelegram />,
    vk: <FaVk />,
};

const UserProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const [userData, orgsData] = await Promise.all([
                    userAccountApi.getCurrentUser(),
                    userAccountApi.getOrganizations()
                ]);
                setUserData(userData);
                setEditedData({ ...userData, about: userData.about || '', socials: userData.socials || [] });
                setOrganizations(orgsData);
            } catch (e) {
                if (e.message.includes('401') || e.message.includes('Unauthorized')) {
                    navigate('/login');
                } else {
                    setError('Ошибка загрузки данных');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    const handleEdit = () => setIsEditing(true);
    const handleCancel = () => { setEditedData(userData); setIsEditing(false); setSelectedFile(null); };
    const handleSave = async () => {
        try {
            let photoId = editedData.photo;
            if (selectedFile) {
                photoId = await userAccountApi.uploadUserPhoto(selectedFile);
            }
            const profileData = {
                name: editedData.name,
                position: editedData.position,
                organizationId: editedData.organizationId,
                about: editedData.about,
                socials: editedData.socials
            };
            const updatedUser = await userAccountApi.updateUserProfile(profileData);
            setUserData({ ...updatedUser, photo: photoId });
            setEditedData({ ...updatedUser, photo: photoId });
            setIsEditing(false);
            setSelectedFile(null);
        } catch (e) {
            setError(e.message || 'Ошибка сохранения данных');
        }
    };
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditedData(prev => ({ ...prev, photo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };
    const handleChange = (field) => (event) => {
        setEditedData(prev => ({ ...prev, [field]: event.target.value }));
    };
    const handleAboutChange = (e) => {
        setEditedData(prev => ({ ...prev, about: e.target.value }));
    };
    const getPhotoSrc = (photo) => {
        if (!photo) return null;
        if (typeof photo === 'string' && photo.startsWith('data:image/')) return photo;
        const token = localStorage.getItem('token');
        return `${process.env.REACT_APP_API_URL || 'http://89.109.8.59:8085/api'}/user-accounts/photo/${photo}?token=${token}`;
    };
    if (loading) return <div className="profile-modern-loading">Загрузка...</div>;
    if (error) return <div className="profile-modern-error">{error}</div>;
    if (!userData) return null;

    return (
        <div className="profile-modern-root">
            <div className="profile-modern-cover" />
            <div className="profile-modern-card">
                <div className="profile-modern-avatar-wrap">
                    <img
                        src={getPhotoSrc(editedData?.photo) || '/images/default-avatar.png'}
                        alt="avatar"
                        className="profile-modern-avatar"
                    />
                    {isEditing && (
                        <button className="profile-modern-avatar-edit" onClick={() => fileInputRef.current.click()}>
                            <FaEdit />
                        </button>
                    )}
                    <input
                        type="file"
                        hidden
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>
                <div className="profile-modern-info">
                    {isEditing ? (
                        <>
                            <input
                                className="profile-modern-input profile-modern-name"
                                value={editedData.name || editedData.fullName || editedData.username || ''}
                                onChange={handleChange('name')}
                                placeholder="Имя пользователя"
                            />
                            <input
                                className="profile-modern-input profile-modern-position"
                                value={editedData.position || ''}
                                onChange={handleChange('position')}
                                placeholder="Должность"
                            />
                            <select
                                className="profile-modern-input profile-modern-org"
                                value={editedData.organizationId || ''}
                                onChange={handleChange('organizationId')}
                            >
                                <option value="">Место работы</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                            <textarea
                                className="profile-modern-input profile-modern-about"
                                value={editedData.about || editedData.description || ''}
                                onChange={handleAboutChange}
                                placeholder="О себе"
                                rows={3}
                            />
                            <div className="profile-modern-actions">
                                <button className="profile-modern-btn save" onClick={handleSave}><FaSave /> Сохранить</button>
                                <button className="profile-modern-btn cancel" onClick={handleCancel}><FaTimes /> Отмена</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="profile-modern-name">{userData.name || userData.fullName || userData.username || ''}</div>
                            <div className="profile-modern-position">{userData.position || ''}</div>
                            {userData.description && (
                                <div className="profile-modern-about">{userData.description}</div>
                            )}
                            <div className="profile-modern-actions">
                                <button className="profile-modern-btn edit" onClick={handleEdit}><FaEdit /> Редактировать</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;