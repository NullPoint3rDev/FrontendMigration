import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MacAddressesPage from './MacAddressesPage';

const NetworkEquipmentPage = () => (
    <Routes>
        <Route index element={<Navigate to="mac-addresses" replace />} />
        <Route path="mac-addresses" element={<MacAddressesPage />} />
        <Route path="*" element={<Navigate to="mac-addresses" replace />} />
    </Routes>
);

export default NetworkEquipmentPage;
