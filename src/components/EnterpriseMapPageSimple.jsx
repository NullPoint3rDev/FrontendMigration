import React, { Suspense, lazy, useEffect, useState } from 'react';
import { FaArrowLeft, FaBell } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/enterpriseMapPage.css';

const UserProfile = lazy(() => import('./UserProfile'));
const HeaderClock = lazy(() => import('./HeaderClock'));
const EnterpriseMapPageSimpleContent = lazy(() => import('./EnterpriseMapPageSimpleContent'));

/**
 * Оболочка: заголовок и профиль в маленьком чанке — быстрее LCP по h1.
 * Контент карты — в EnterpriseMapPageSimpleContent (lazy).
 */
function EnterpriseMapPageSimple() {
    const { organizationId } = useParams();
    const navigate = useNavigate();
    const [enterpriseName, setEnterpriseName] = useState('');
    const [currentUserData, setCurrentUserData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        if (!organizationId) {
            setEnterpriseName('');
            return () => {
                cancelled = true;
            };
        }
        api.get(`/organizations/${organizationId}`)
            .then((org) => {
                if (!cancelled) setEnterpriseName(org?.name || '');
            })
            .catch(() => {
                if (!cancelled) setEnterpriseName('');
            });
        return () => {
            cancelled = true;
        };
    }, [organizationId]);

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
        <div className="enterprise-map-page">
            <div className="enterprise-map-header-row">
                {organizationId ? (
                    <>
                        <button
                            type="button"
                            className="enterprise-map-back-btn"
                            onClick={() => navigate('/enterprise-map')}
                            aria-label="Назад к списку предприятий"
                        >
                            <FaArrowLeft className="enterprise-map-back-icon" />
                        </button>
                        <h1 className="enterprise-map-page-title">
                            Карта предприятия «{enterpriseName || '...'}»
                        </h1>
                    </>
                ) : (
                    <h1 className="enterprise-map-page-title">Карта предприятия</h1>
                )}
                <div className="tiles-controls">
                    <Suspense fallback={null}>
                        <HeaderClock />
                    </Suspense>
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

            <Suspense fallback={<div className="enterprise-map-page-body-skeleton" aria-hidden />}>
                <EnterpriseMapPageSimpleContent initialUser={currentUserData} />
            </Suspense>
        </div>
    );
}

export default EnterpriseMapPageSimple;
