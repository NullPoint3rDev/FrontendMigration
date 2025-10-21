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
import InteractiveMapPage from './components/InteractiveMapPage';
import OrganizationsPage from './pages/OrganizationsPage';
import WeldersPage from './pages/WeldersPage';
import WelderProfilePage from './pages/WelderProfilePage';
import AboutPage from './components/AboutPage';
import AuthPage from './components/AuthPage';
import ReportsPage from './components/ReportsPage';
import MyReportsPage from './components/MyReportsPage';
import EquipmentReportPage from './components/EquipmentReportPage';
import WeldersReportPage from './components/WeldersReportPage';
import MaterialsReportPage from './components/MaterialsReportPage';
import WeldsReportPage from './components/WeldsReportPage';
import NotificationsPage from './components/NotificationsPage';

import ErrorsReportPage from './components/ErrorsReportPage';
import ViolationsReportPage from './components/ViolationsReportPage';
import TasksReportPage from './components/TasksReportPage';
import EmployeesPage from './components/EmployeesPage';
import DeviceMonitorPage from './components/DeviceMonitorPage';
import DeviceTestPage from './components/DeviceTestPage';
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
                                <Route path="/device-monitor" element={<DeviceMonitorPage />} />
                                <Route path="/device-test" element={<DeviceTestPage />} />
                                
                                {/* 3. Мониторинг */}
                                <Route path="/enterprise-map" element={<EnterpriseMapPage />} />
                                <Route path="/interactive-map" element={<InteractiveMapPage />} />
                                <Route path="/equipment-list" element={<div className="main-content"><h2>Перечень оборудования</h2></div>} />
                                
                                {/* 4. Отчеты */}
                                <Route path="/my-reports" element={<MyReportsPage />} />
                                <Route path="/reports/equipment" element={<EquipmentReportPage />} />
                                <Route path="/reports/welders" element={<WeldersReportPage />} />
                                <Route path="/reports/materials" element={<MaterialsReportPage />} />
                                <Route path="/reports/welds" element={<WeldsReportPage />} />
                                <Route path="/reports/errors" element={<ErrorsReportPage />} />
                                <Route path="/reports/violations" element={<ViolationsReportPage />} />
                                <Route path="/reports/tasks" element={<TasksReportPage />} />
                                
                                {/* 5. Уведомления */}
                                <Route path="/notifications" element={<NotificationsPage />} />
                                
                                {/* 6. Настройки */}
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/settings/storage" element={<SettingsPage />} />
                                <Route path="/settings/inactivity" element={<SettingsPage />} />
                                
                            </Routes>
                        </PrivateRoute>
                    } />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;