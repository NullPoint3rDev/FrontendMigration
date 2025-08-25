import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import WeldingEquipmentPage from './components/WeldingEquipmentPage';
import DepartmentsPage from './components/DepartmentsPage';
import NetworkEquipmentPage from './components/NetworkEquipmentPage';
import WPSPage from './components/WPSPage';
import SettingsPage from './components/SettingsPage';
import EnterpriseMapPage from './components/EnterpriseMapPage';
import OrganizationsPage from './pages/OrganizationsPage';
import WeldersPage from './pages/WeldersPage';
import WelderProfilePage from './pages/WelderProfilePage';
import AboutPage from './components/AboutPage';
import AuthPage from './components/AuthPage';
import UserProfilePage from './pages/UserProfilePage';
import ReportsPage from './components/ReportsPage';
import EmployeesPage from './components/EmployeesPage';
import './App.css';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
    },
});

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Routes>
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/*" element={
                        <PrivateRoute>
                            <Navbar />
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/about" element={<AboutPage />} />
                                
                                {/* 1. Предприятие */}
                                <Route path="/departments" element={<DepartmentsPage />} />
                                <Route path="/employees" element={<EmployeesPage />} />
                                <Route path="/welders" element={<WeldersPage />} />
                                <Route path="/welders/:id" element={<WelderProfilePage />} />
                                
                                {/* 2. Ресурсы */}
                                <Route path="/equipment" element={<WeldingEquipmentPage />} />
                                <Route path="/network-equipment" element={<NetworkEquipmentPage />} />
                                <Route path="/materials" element={<div className="main-content"><h2>Сварочные материалы</h2></div>} />
                                <Route path="/wps" element={<WPSPage />} />
                                
                                {/* 3. Мониторинг */}
                                <Route path="/enterprise-map" element={<EnterpriseMapPage />} />
                                <Route path="/equipment-list" element={<div className="main-content"><h2>Перечень оборудования</h2></div>} />
                                
                                {/* 4. Отчеты */}
                                <Route path="/reports/equipment" element={<div className="main-content"><h2>Отчеты по работе оборудования</h2></div>} />
                                <Route path="/reports/welders" element={<div className="main-content"><h2>Отчеты по работе сварщиков</h2></div>} />
                                <Route path="/reports/materials" element={<div className="main-content"><h2>Отчеты по расходу материалов</h2></div>} />
                                <Route path="/reports/welds" element={<div className="main-content"><h2>Отчеты по сварочным швам</h2></div>} />
                                <Route path="/reports/notifications" element={<div className="main-content"><h2>Отправка уведомлений и отчетов по эл. почте</h2></div>} />
                                <Route path="/reports/errors" element={<div className="main-content"><h2>Отчеты по ошибкам сварочного оборудования</h2></div>} />
                                <Route path="/reports/violations" element={<div className="main-content"><h2>Перечень швов, выполненных с нарушением</h2></div>} />
                                <Route path="/reports/tasks" element={<div className="main-content"><h2>Отчет о выполнении сварочного задания</h2></div>} />
                                
                                {/* 5. Настройки */}
                                <Route path="/settings/storage" element={<SettingsPage />} />
                                <Route path="/settings/inactivity" element={<SettingsPage />} />
                                
                                {/* Профиль пользователя */}
                                <Route path="/profile" element={<UserProfilePage />} />
                            </Routes>
                        </PrivateRoute>
                    } />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;