import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    Avatar,
    Grid,
    TextField,
    Button,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { AccountCircle, Edit, Save, Cancel } from '@mui/icons-material';
import { userAccountApi } from '../api/userAccountApi';
import '../styles/userProfile.css';
import { useNavigate } from "react-router-dom";

const UserProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = React.useRef();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            console.log('Token before profile request:', token);
            if (!token) {
                console.error('No token found, redirecting to login');
                navigate('/login');
                return;
            }

            try {
                const [userData, orgsData] = await Promise.all([
                    userAccountApi.getCurrentUser(),
                    userAccountApi.getOrganizations()
                ]);
                console.log('User data received:', userData);
                console.log('Organizations data received:', orgsData);
                setUserData(userData);
                setEditedData(userData);
                setOrganizations(orgsData);
            } catch (e) {
                console.error('Error fetching data:', e);
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

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditedData(userData);
        setIsEditing(false);
    };

    const handleSave = async () => {
        try {
            let photoId = editedData.photo;
            if (selectedFile) {
                console.log('Uploading file:', selectedFile);
                photoId = await userAccountApi.uploadUserPhoto(selectedFile);
            }
            const name = [editedData.lastName, editedData.firstName, editedData.middleName].filter(Boolean).join(' ');
            const profileData = {
                name,
                position: editedData.position,
                organizationId: editedData.organizationId
            };
            const updatedUser = await userAccountApi.updateUserProfile(profileData);
            setUserData({ ...updatedUser, photo: photoId });
            setEditedData({ ...updatedUser, photo: photoId });
            setIsEditing(false);
            setSelectedFile(null);
        } catch (e) {
            console.error('Error saving data:', e);
            setError(e.message || 'Ошибка сохранения данных');
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditedData(prev => ({
                    ...prev,
                    photo: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (field) => (event) => {
        setEditedData(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const getPhotoSrc = (photo) => {
        if (!photo) return null;
        if (typeof photo === 'string' && photo.startsWith('data:image/')) {
            return photo;
        }
        const token = localStorage.getItem('token');
        return `${process.env.REACT_APP_API_URL || 'http://192.168.10.137:8084/api'}/user-accounts/photo/${photo}?token=${token}`;
    };

    if (loading) return <div className="main-content"><Typography>Загрузка...</Typography></div>;
    if (error) return <div className="main-content"><Typography color="error">{error}</Typography></div>;
    if (!userData) return null;

    return (
        <div className="main-content">
            <Container maxWidth="md">
                <Paper elevation={3} className="profile-paper">
                    <Box sx={{ p: 4 }}>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Box sx={{ position: 'relative' }}>
                                    {editedData?.photo ? (
                                        <Avatar
                                            src={getPhotoSrc(editedData.photo)}
                                            sx={{ width: 200, height: 200 }}
                                        />
                                    ) : (
                                        <AccountCircle sx={{ width: 200, height: 200, color: 'primary.main' }} />
                                    )}
                                    {isEditing && (
                                        <IconButton
                                            sx={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                backgroundColor: 'white'
                                            }}
                                            onClick={() => fileInputRef.current.click()}
                                        >
                                            <Edit />
                                        </IconButton>
                                    )}
                                    <input
                                        type="file"
                                        hidden
                                        ref={fileInputRef}
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={8}>
                                {isEditing ? (
                                    <>
                                        <TextField
                                            fullWidth
                                            label="Имя"
                                            value={editedData.firstName || ''}
                                            onChange={handleChange('firstName')}
                                            margin="normal"
                                        />
                                        <TextField
                                            fullWidth
                                            label="Фамилия"
                                            value={editedData.lastName || ''}
                                            onChange={handleChange('lastName')}
                                            margin="normal"
                                        />
                                        <TextField
                                            fullWidth
                                            label="Отчество"
                                            value={editedData.middleName || ''}
                                            onChange={handleChange('middleName')}
                                            margin="normal"
                                        />
                                        <TextField
                                            fullWidth
                                            label="Должность"
                                            value={editedData.position || ''}
                                            onChange={handleChange('position')}
                                            margin="normal"
                                        />
                                        <FormControl fullWidth margin="normal">
                                            <InputLabel>Место работы</InputLabel>
                                            <Select
                                                value={editedData.organizationId || ''}
                                                onChange={handleChange('organizationId')}
                                                label="Место работы"
                                            >
                                                {organizations.map(org => (
                                                    <MenuItem key={org.id} value={org.id}>
                                                        {org.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleSave}
                                                startIcon={<Save />}
                                            >
                                                Сохранить
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={handleCancel}
                                                startIcon={<Cancel />}
                                            >
                                                Отмена
                                            </Button>
                                        </Box>
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="h4" gutterBottom>
                                            {userData.name || ''}
                                        </Typography>
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            {userData.position || ''}
                                        </Typography>
                                        <Typography variant="body1" paragraph>
                                            Место работы: {userData.organization?.name || ''}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleEdit}
                                            startIcon={<Edit />}
                                        >
                                            Редактировать
                                        </Button>
                                    </>
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </Container>
        </div>
    );
};

export default UserProfilePage;