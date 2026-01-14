import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import WeldingEquipmentPage from './components/WeldingEquipmentPage';
import DepartmentsPage from './components/DepartmentsPage';
import NetworkEquipmentPage from './components/NetworkEquipmentPage';
import MaterialsPage from './components/MaterialsPage';
import WPSPage from './components/WPSPage';
import SettingsPage from './components/SettingsPage';
import EnterpriseMapPage from './components/EnterpriseMapPage';
import EnterpriseMapPageSimple from './components/EnterpriseMapPageSimple';
import InteractiveMapPage from './components/InteractiveMapPage';
import OrganizationsPage from './pages/OrganizationsPage';
import WeldersPage from './pages/WeldersPage';
import WelderProfilePage from './pages/WelderProfilePage';
import AddWelderPage from './pages/AddWelderPage';
import AboutPage from './components/AboutPage';
import AuthPage from './components/AuthPage';
import UserProfilePage from './pages/UserProfilePage';
import ReportsPage from './components/ReportsPage';
import NotificationsPage from './components/NotificationsPage';
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

const Layout = ({ children }) => {
    const location = useLocation();
    const useSidebar = location.pathname === '/equipment' || location.pathname === '/device-monitor' || location.pathname === '/reports' || location.pathname === '/enterprise-map' || location.pathname === '/welders' || location.pathname.startsWith('/welders/');
    const isEquipmentPage = location.pathname === '/equipment';
    const isWeldersPage = location.pathname === '/welders' || location.pathname.startsWith('/welders/');

    if (useSidebar) {
        // Для страницы оборудования и сварщиков не используем Material-UI вообще, чтобы избежать конфликтов
        if (isEquipmentPage || isWeldersPage) {
            return (
                <div className="app">
                    <Sidebar />
                    {children}
                </div>
            );
        }
        return (
            <div className="app">
                <Sidebar />
                {children}
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <ScopedCssBaseline>
                {children}
            </ScopedCssBaseline>
        </>
    );
};

function App() {
    return (
        <ThemeProvider theme={theme}>
            {/* CssBaseline убран, чтобы избежать конфликтов со стилями таблиц */}
            <Router>
                <Routes>
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/*" element={
                        <PrivateRoute>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/about" element={<AboutPage />} />

                                    {/* 1. Предприятие */}
                                    <Route path="/departments" element={<DepartmentsPage />} />
                                    <Route path="/employees" element={<EmployeesPage />} />
                                    <Route path="/welders" element={<WeldersPage />} />
                                    <Route path="/welders/add" element={<AddWelderPage />} />
                                    <Route path="/welders/:id" element={<WelderProfilePage />} />

                                    {/* 2. Ресурсы */}
                                    <Route path="/equipment" element={<WeldingEquipmentPage />} />
                                    <Route path="/network-equipment" element={<NetworkEquipmentPage />} />
                                    <Route path="/materials" element={<MaterialsPage />} />
                                    <Route path="/wps" element={<WPSPage />} />
                                    <Route path="/device-monitor" element={<DeviceMonitorPage />} />
                                    <Route path="/device-test" element={<DeviceTestPage />} />

                                    {/* 3. Мониторинг */}
                                    <Route path="/enterprise-map" element={<EnterpriseMapPageSimple />} />
                                    <Route path="/interactive-map" element={<InteractiveMapPage />} />
                                    <Route path="/equipment-list" element={<div className="main-content"><h2>Перечень оборудования</h2></div>} />

                                    {/* 4. Отчеты */}
                                    <Route path="/reports" element={<ReportsPage />} />
                                    <Route path="/my-reports" element={<Navigate to="/reports" replace />} />

                                    {/* 5. Уведомления */}
                                    <Route path="/notifications" element={<NotificationsPage />} />

                                    {/* 6. Настройки */}
                                    <Route path="/settings" element={<SettingsPage />} />
                                    <Route path="/settings/storage" element={<SettingsPage />} />
                                    <Route path="/settings/inactivity" element={<SettingsPage />} />

                                    {/* Профиль пользователя */}
                                    <Route path="/profile" element={<UserProfilePage />} />
                                </Routes>
                            </Layout>
                        </PrivateRoute>
                    } />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;