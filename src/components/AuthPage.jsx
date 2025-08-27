import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import LoginForm from './LoginForm';
import '../styles/auth.css';

const AuthPage = () => {
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