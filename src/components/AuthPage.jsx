import React, { useState } from 'react';
import { Box, Container, Paper, Tabs, Tab, Typography } from '@mui/material';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import '../styles/auth.css';

const AuthPage = () => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <div className="auth-background">
            <Container component="main" maxWidth="xs">
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Paper elevation={3} className="auth-paper">
                        <Typography component="h1" variant="h4" align="center" className="auth-title">
                            WeldTelecom
                        </Typography>
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            variant="fullWidth"
                            className="auth-tabs"
                        >
                            <Tab label="Вход" className="auth-tab" />
                            <Tab label="Регистрация" className="auth-tab" />
                        </Tabs>
                        <div className="auth-form-container">
                            {activeTab === 0 ? <LoginForm /> : <RegisterForm />}
                        </div>
                    </Paper>
                </Box>
            </Container>
        </div>
    );
};

export default AuthPage; 