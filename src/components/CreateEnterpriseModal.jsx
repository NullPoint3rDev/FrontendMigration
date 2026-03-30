import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllUserAccounts, getRoles } from '../api/userAccountApi';
import '../styles/createEnterpriseModal.css';

const CreateEnterpriseModal = ({ isOpen, onClose, onNext }) => {
    const navigate = useNavigate();
    const [dealerAdmins, setDealerAdmins] = useState([]);
    const [loadingDealerAdmins, setLoadingDealerAdmins] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        fullName: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        inn: '',
        attachedDealerId: 'alloy',
    });

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        const loadDealerAdmins = async () => {
            try {
                setLoadingDealerAdmins(true);
                const [users, roles] = await Promise.all([getAllUserAccounts(), getRoles()]);
                if (cancelled) return;
                const adminDealerRole = (Array.isArray(roles) ? roles : []).find(
                    (r) => (r?.name || '').toUpperCase() === 'ADMIN_DEALER'
                );
                const adminDealerRoleId = adminDealerRole?.id;
                const list = (Array.isArray(users) ? users : [])
                    .filter((u) => {
                        const roleName = (u?.userRole?.name || '').toUpperCase();
                        if (roleName === 'ADMIN_DEALER') return true;
                        if (adminDealerRoleId == null) return false;
                        return (
                            u?.userRoleId === adminDealerRoleId ||
                            String(u?.userRoleId) === String(adminDealerRoleId)
                        );
                    })
                    .map((u) => ({
                        id: String(u.id),
                        label: u.fullName || u.username || `ID ${u.id}`,
                        organizationId: u.organizationId ?? u.organization?.id ?? null,
                    }));
                setDealerAdmins(list);
            } catch (err) {
                console.error('Ошибка загрузки админов диллера:', err);
                if (!cancelled) setDealerAdmins([]);
            } finally {
                if (!cancelled) setLoadingDealerAdmins(false);
            }
        };
        loadDealerAdmins();
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        // В любой неоднозначной ситуации закрепляем дефолт "Alloy"
        if (!formData.attachedDealerId) {
            setFormData((prev) => ({ ...prev, attachedDealerId: 'alloy' }));
        }
    }, [isOpen, formData.attachedDealerId]);

    const dealerOptions = useMemo(
        () => [{ id: 'alloy', label: 'Alloy', organizationId: null }, ...dealerAdmins],
        [dealerAdmins]
    );

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        const name = (formData.name || '').trim();
        if (!name) return;
        const selectedDealer = dealerOptions.find((d) => d.id === formData.attachedDealerId) || dealerOptions[0];
        const payload = {
            ...formData,
            name,
            attachedDealerId: selectedDealer?.id || 'alloy',
            attachedDealerName: selectedDealer?.label || 'Alloy',
            attachedDealerOrganizationId: selectedDealer?.organizationId ?? null,
        };
        if (onNext) {
            onNext(payload);
        } else {
            navigate('/employees/add', {
                state: {
                    fromCreateEnterprise: true,
                    enterpriseName: name,
                    enterpriseData: payload,
                },
            });
        }
        onClose();
    };

    const handleBack = () => {
        onClose();
    };

    return (
        <div className="create-enterprise-modal-overlay" onClick={handleBack}>
            <div className="create-enterprise-modal" onClick={(e) => e.stopPropagation()}>
                <div className="create-enterprise-modal-header">
                    <button type="button" className="create-enterprise-modal-back" onClick={handleBack}>
                        ‹
                    </button>
                    <h2 className="create-enterprise-modal-title">Создать предприятие</h2>
                </div>

                <div className="create-enterprise-modal-body">
                    <div className="create-enterprise-logo-section">
                        <div className="create-enterprise-logo-box">
                        </div>
                        <div className="create-enterprise-logo-info">
                            <div className="create-enterprise-name-preview">
                                {formData.name || 'Название предприятия'}
                            </div>
                            <button type="button" className="create-enterprise-change-photo">
                                Сменить логотип
                            </button>
                        </div>
                    </div>

                    <div className="create-enterprise-form">
                        <div className="create-enterprise-field">
                            <label>Наименование <span className="required">*</span>:</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder=""
                            />
                        </div>
                        <div className="create-enterprise-field">
                            <label>Полное наименование:</label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => handleChange('fullName', e.target.value)}
                                placeholder=""
                            />
                        </div>
                        <div className="create-enterprise-field">
                            <label>Email:</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder=""
                            />
                        </div>
                        <div className="create-enterprise-field">
                            <label>Телефон:</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder=""
                            />
                        </div>
                        <div className="create-enterprise-field">
                            <label>Сайт:</label>
                            <input
                                type="text"
                                value={formData.website}
                                onChange={(e) => handleChange('website', e.target.value)}
                                placeholder=""
                            />
                        </div>
                        <div className="create-enterprise-field">
                            <label>Адрес:</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                placeholder=""
                            />
                        </div>
                        <div className="create-enterprise-field">
                            <label>ИНН:</label>
                            <input
                                type="text"
                                value={formData.inn}
                                onChange={(e) => handleChange('inn', e.target.value)}
                                placeholder=""
                            />
                        </div>
                        <div className="create-enterprise-field">
                            <label>Прикрепленный диллер <span className="required">*</span>:</label>
                            <select
                                value={formData.attachedDealerId}
                                onChange={(e) => handleChange('attachedDealerId', e.target.value || 'alloy')}
                                required
                            >
                                {dealerOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {loadingDealerAdmins && <span className="create-enterprise-field-note">Загрузка диллеров...</span>}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="create-enterprise-next-btn"
                        onClick={handleNext}
                        disabled={!(formData.name || '').trim()}
                    >
                        Далее
                    </button>
                    <div className="create-enterprise-step-indicator">Шаг 1 из 2</div>
                </div>
            </div>
        </div>
    );
};

export default CreateEnterpriseModal;
