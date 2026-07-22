import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReportsUnsavedProvider } from './contexts/ReportsUnsavedContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import Sidebar from './components/Sidebar';
import { api } from './services/api';
import './App.css';

const HomePage = lazy(() => import('./components/HomePage'));
const WeldingEquipmentPage = lazy(() => import('./components/WeldingEquipmentPage'));
const DepartmentsPage = lazy(() => import('./components/DepartmentsPage'));
const NetworkEquipmentPage = lazy(() => import('./components/NetworkEquipmentPage'));
const MaterialsPage = lazy(() => import('./components/MaterialsPage'));
const WPSPage = lazy(() => import('./components/WPSPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const EnterpriseMapPageSimple = lazy(() => import('./components/EnterpriseMapPageSimple'));
const EnterpriseListPage = lazy(() => import('./pages/EnterpriseListPage'));
const InteractiveMapPage = lazy(() => import('./components/InteractiveMapPage'));
const WeldersPage = lazy(() => import('./pages/WeldersPage'));
const WelderProfilePage = lazy(() => import('./pages/WelderProfilePage'));
const AddWelderPage = lazy(() => import('./pages/AddWelderPage'));
const CertificationPage = lazy(() => import('./pages/CertificationPage'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));
const UserProfilePage = lazy(() => import('./components/UserProfilePage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const EmployeesPage = lazy(() => import('./components/EmployeesPage'));
const AddUserPage = lazy(() => import('./pages/AddUserPage'));
const DeviceMonitorPage = lazy(() => import('./components/DeviceMonitorPage'));
const DeviceTestPage = lazy(() => import('./components/DeviceTestPage'));
const V2ProtocolTestPage = lazy(() => import('./pages/V2ProtocolTestPage'));

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
    const isNetworkEquipmentPage = location.pathname.startsWith('/network-equipment');
    const isWeldersPage = location.pathname === '/welders' || location.pathname.startsWith('/welders/');
    const isEmployeesPage = location.pathname === '/employees' || location.pathname.startsWith('/employees/');
    const isEnterpriseMapPage = location.pathname === '/enterprise-map' || location.pathname.startsWith('/enterprise-map/');

    if (isEquipmentPage || isNetworkEquipmentPage || isWeldersPage || isEmployeesPage || isEnterpriseMapPage) {
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

    // Heartbeat активной сессии раз в 5 минут (метрика «реально онлайн» в Prometheus)
    useEffect(() => {
        const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

        const sendHeartbeat = () => {
            if (localStorage.getItem('token')) {
                api.heartbeat();
            }
        };

        sendHeartbeat();
        const intervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <ThemeProvider theme={theme}>
            {/* CssBaseline убран, чтобы избежать конфликтов со стилями таблиц */}
            <Router>
                <Suspense fallback={<div className="main-content"><h2>Загрузка...</h2></div>}>
                    <Routes>
                        <Route path="/login" element={<AuthPage />} />
                        {/* Hidden v2 protocol lab — no sidebar/nav */}
                        <Route path="/v2-protocol-test" element={
                            <PrivateRoute>
                                <V2ProtocolTestPage />
                            </PrivateRoute>
                        } />
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
                                            <Route path="/network-equipment/*" element={<NetworkEquipmentPage />} />
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
                </Suspense>
            </Router>
        </ThemeProvider>
    );
}

export default App;