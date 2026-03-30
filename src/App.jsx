import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReportsUnsavedProvider } from './contexts/ReportsUnsavedContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
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
import EnterpriseListPage from './pages/EnterpriseListPage';
import InteractiveMapPage from './components/InteractiveMapPage';
import OrganizationsPage from './pages/OrganizationsPage';
import WeldersPage from './pages/WeldersPage';
import WelderProfilePage from './pages/WelderProfilePage';
import AddWelderPage from './pages/AddWelderPage';
import CertificationPage from './pages/CertificationPage';
import AboutPage from './components/AboutPage';
import AuthPage from './components/AuthPage';
import UserProfilePage from './components/UserProfilePage';
import ReportsPage from './components/ReportsPage';
import NotificationsPage from './components/NotificationsPage';
import EmployeesPage from './components/EmployeesPage';
import AddUserPage from './pages/AddUserPage';
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
    const isEquipmentPage = location.pathname === '/equipment';
    const isWeldersPage = location.pathname === '/welders' || location.pathname.startsWith('/welders/');
    const isEmployeesPage = location.pathname === '/employees' || location.pathname.startsWith('/employees/');
    const isEnterpriseMapPage = location.pathname === '/enterprise-map' || location.pathname.startsWith('/enterprise-map/');

    // Для страниц без Material-UI обёртки (избегаем конфликтов стилей и пустого контента)
    if (isEquipmentPage || isWeldersPage || isEmployeesPage || isEnterpriseMapPage) {
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
            <ScopedCssBaseline>
                {children}
            </ScopedCssBaseline>
        </div>
    );
};

function App() {
    // Глобальный перехватчик для всех fetch запросов
    useEffect(() => {
        // Сохраняем оригинальный fetch
        const originalFetch = window.fetch;

        // Переопределяем fetch для перехвата 401 ошибок
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);

                // Если получили 401, перенаправляем на логин
                if (response.status === 401) {
                    // Проверяем, что это не запрос на логин
                    const url = args[0]?.toString() || '';
                    if (!url.includes('/auth/login') && !url.includes('/login')) {
                        console.log('Session expired, redirecting to login');
                        try {
                            localStorage.clear();
                        } catch (_) {}
                        try {
                            sessionStorage.clear();
                        } catch (_) {}
                        window.location.href = '/login';
                        // Возвращаем response, чтобы не ломать существующую обработку
                        return response;
                    }
                }

                return response;
            } catch (error) {
                // Если ошибка сети или другая, пробрасываем дальше
                throw error;
            }
        };

        // Очистка при размонтировании
        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return (
        <ThemeProvider theme={theme}>
            {/* CssBaseline убран, чтобы избежать конфликтов со стилями таблиц */}
            <Router>
                <Routes>
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/*" element={
                        <PrivateRoute>
                            <ReportsUnsavedProvider>
                                <Layout>
                                    <Routes>
                                        <Route path="/" element={<HomePage />} />
                                        <Route path="/about" element={<AboutPage />} />

                                        {/* 1. Предприятие */}
                                        <Route path="/departments" element={<DepartmentsPage />} />
                                        <Route path="/employees" element={<EmployeesPage />} />
                                        <Route path="/employees/add" element={<AddUserPage />} />
                                        <Route path="/employees/add/:id" element={<AddUserPage />} />
                                        <Route path="/welders" element={<WeldersPage />} />
                                        <Route path="/welders/add" element={<AddWelderPage />} />
                                        <Route path="/welders/add/:id" element={<AddWelderPage />} />
                                        <Route path="/welders/:id" element={<WelderProfilePage />} />
                                        <Route path="/welders/:id/certification/:certId" element={<CertificationPage />} />
                                        <Route path="/welders/:id/certification" element={<CertificationPage />} />
                                        <Route path="/welders/add/certification" element={<CertificationPage />} />

                                        {/* 2. Ресурсы */}
                                        <Route path="/equipment" element={<WeldingEquipmentPage />} />
                                        <Route path="/network-equipment" element={<NetworkEquipmentPage />} />
                                        <Route path="/materials" element={<MaterialsPage />} />
                                        <Route path="/wps" element={<WPSPage />} />
                                        <Route path="/device-monitor" element={<DeviceMonitorPage />} />
                                        <Route path="/device-test" element={<DeviceTestPage />} />

                                        {/* 3. Мониторинг */}
                                        <Route path="/enterprise-map" element={<EnterpriseListPage />} />
                                        <Route path="/enterprise-map/:organizationId" element={<EnterpriseMapPageSimple />} />
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
                            </ReportsUnsavedProvider>
                        </PrivateRoute>
                    } />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;