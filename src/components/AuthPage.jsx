import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import LoginForm from './LoginForm';
import '../styles/auth.css';

const AuthPage = () => {
    return (
        <div className="auth-background">
            <h1 className="auth-title">WeldTelecom</h1>
            <Container component="main" maxWidth="xs">
                <Box className="auth-box">
                    <Paper elevation={0} className="auth-paper">
                        <p className="auth-subtitle">Вход в систему</p>
                        <div className="auth-form-container">
                            <LoginForm />
                        </div>
                    </Paper>
                </Box>
            </Container>
        </div>
    );
};

export default AuthPage; 