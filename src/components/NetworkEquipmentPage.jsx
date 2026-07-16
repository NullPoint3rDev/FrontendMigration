import React from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import MacAddressesPage from './MacAddressesPage';
import '../styles/macAddressesPage.css';

const NetworkEquipmentPage = () => {
    return (
        <div className="network-equipment-shell">
            <div className="network-equipment-tabs">
                <NavLink
                    to="/network-equipment/mac-addresses"
                    className={({ isActive }) => `network-equipment-tab ${isActive ? 'active' : ''}`}
                >
                    MAC Адреса
                </NavLink>
            </div>
            <Routes>
                <Route index element={<Navigate to="mac-addresses" replace />} />
                <Route path="mac-addresses" element={<MacAddressesPage />} />
                <Route path="*" element={<Navigate to="mac-addresses" replace />} />
            </Routes>
        </div>
    );
};

export default NetworkEquipmentPage;
