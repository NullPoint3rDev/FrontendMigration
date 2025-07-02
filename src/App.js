import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import WeldingEquipmentPage from './components/WeldingEquipmentPage';
import WeldingMachineControlPage from './pages/WeldingMachineControlPage';
import OrganizationsPage from './pages/OrganizationsPage';
import WeldersPage from './pages/WeldersPage';
import WelderProfilePage from './pages/WelderProfilePage';
import AboutPage from './components/AboutPage';
import FirmwarePage from './components/FirmwarePage';
import ManualsPage from './pages/ManualsPage';
import ManualsByEquipmentPage from './pages/ManualsByEquipmentPage';
import AuthPage from './components/AuthPage';
import UserProfilePage from './pages/UserProfilePage';
import ReportsPage from './components/ReportsPage';
import EmployeesPage from './components/EmployeesPage';
import LibraryPage from './pages/LibraryPage';
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
                                <Route path="/equipment" element={<WeldingEquipmentPage />} />
                                <Route path="/organizations" element={<OrganizationsPage />} />
                                <Route path="/welders" element={<WeldersPage />} />
                                <Route path="/welders/:id" element={<WelderProfilePage />} />
                                <Route path="/profile" element={<UserProfilePage />} />
                                <Route path="/employees" element={<EmployeesPage />} />
                                <Route path="/materials" element={<div className="main-content"><h2>Сварочные материалы</h2></div>} />
                                <Route path="/safety" element={<div className="main-content"><h2>Безопасность сварочных работ</h2></div>} />
                                <Route path="/firmware" element={<FirmwarePage />} />
                                <Route path="/docs" element={<div className="main-content"><h2>Документы</h2></div>} />
                                <Route path="/archive" element={<div className="main-content"><h2>Архив</h2></div>} />
                                <Route path="/reports" element={<ReportsPage />} />
                                <Route path="/library" element={<LibraryPage />} />
                                <Route path="/wire-types" element={<div className="main-content"><h2>Типы проволоки</h2></div>} />
                                <Route path="/control" element={<WeldingMachineControlPage />} />
                                <Route path="/manuals" element={<ManualsPage />} />
                                <Route path="/manuals/:id" element={<ManualsByEquipmentPage />} />
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