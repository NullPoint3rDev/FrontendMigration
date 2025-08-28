import React, { useState } from 'react';
import { Box, Container, Paper, Typography, Button, Tabs, Tab } from '@mui/material';
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
                        
                        {/* Tabs для переключения между входом и регистрацией */}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                            <Tabs 
                                value={activeTab} 
                                onChange={handleTabChange} 
                                centered
                                sx={{
                                    '& .MuiTab-root': {
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        '&.Mui-selected': {
                                            color: '#fff',
                                        },
                                    },
                                    '& .MuiTabs-indicator': {
                                        backgroundColor: '#fff',
                                    },
                                }}
                            >
                                <Tab label="Вход" />
                                <Tab label="Регистрация" />
                            </Tabs>
                        </Box>
                        
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