import React, { Suspense, lazy, useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import '../styles/weldingEquipmentPageNew.css';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const UserProfile = lazy(() => import('./UserProfile'));
const WeldingEquipmentPageContent = lazy(() => import('./WeldingEquipmentPageContent'));

/**
 * Лёгкая оболочка: заголовок и профиль в маленьком чанке — быстрее первый paint (LCP по h1).
 * Тяжёлая логика — в WeldingEquipmentPageContent (отдельный lazy-чанк).
 */
function WeldingEquipmentPage() {
    const navigate = useNavigate();
    const [currentUserData, setCurrentUserData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const u = await api.getCurrentUser();
                if (!cancelled) setCurrentUserData(u ?? null);
            } catch {
                if (!cancelled) setCurrentUserData(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="welding-equipment-page">
            <div className="equipment-page-header-row">
                <h1 className="equipment-page-title-header">Сварочное оборудование</h1>
                <div className="equipment-page-controls">
                    <button
                        type="button"
                        className="control-btn notifications-btn"
                        onClick={() => navigate('/notifications')}
                    >
                        <FaBell className="notifications-icon" />
                        <span className="notifications-badge" />
                    </button>
                    <Suspense fallback={<div className="control-btn" style={{ width: 32, height: 32 }} />}>
                        <UserProfile userData={currentUserData} />
                    </Suspense>
                </div>
            </div>
            <Suspense
                fallback={<div className="equipment-page-body-skeleton" aria-hidden />}
            >
                <WeldingEquipmentPageContent initialUser={currentUserData} />
            </Suspense>
        </div>
    );
}

export default WeldingEquipmentPage;
