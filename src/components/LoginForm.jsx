import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { api } from '../services/api';

const LoginForm = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Отправка данных для входа:', formData);

            // Проверяем, что поля не пустые
            if (!formData.username || !formData.password) {
                throw new Error('Пожалуйста, заполните все поля');
            }

            const response = await api.login(formData);
            console.log('Успешный ответ от сервера:', response);

            // Проверяем наличие токена в ответе
            if (!response || !response.token) {
                throw new Error('Токен не получен от сервера');
            }

            // Сохраняем токен
            localStorage.setItem('token', response.token);
            if (response.sessionId) {
                localStorage.setItem('sessionId', response.sessionId);
            }
            
            // Сохраняем информацию о пользователе
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            } else if (response.userId) {
                // Если в ответе есть только userId, создаем объект пользователя
                const user = { id: response.userId, username: formData.username };
                localStorage.setItem('user', JSON.stringify(user));
            }

            console.log('Успешный вход, перенаправление на главную страницу');

            // Используем navigate вместо window.location
            navigate('/', { replace: true });
        } catch (err) {
            console.error('Ошибка при авторизации:', err);
            setError(err.message || 'Ошибка при входе. Пожалуйста, проверьте ваши учетные данные.');
            // Очищаем токены при ошибке
            localStorage.removeItem('token');
            localStorage.removeItem('sessionId');
        } finally {
            setLoading(false);
        }
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Имя пользователя"
                name="username"
                autoComplete="username"
                autoFocus
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
                error={!!error}
            />
            <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                error={!!error}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle password visibility"
                                onClick={handleClickShowPassword}
                                edge="end"
                            >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
            <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
            >
                {loading ? <CircularProgress size={24} /> : 'Войти'}
            </Button>
        </Box>
    );
};

export default LoginForm; 