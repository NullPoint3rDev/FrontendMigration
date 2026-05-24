import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllUserAccounts, getRoles } from '../api/userAccountApi';
import '../styles/createEnterpriseModal.css';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const LOGO_MAX_DIMENSION = 256;

/** Сжимает логотип до разумного размера для хранения в БД (data URL). */
const compressLogoFile = (file) =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            const maxSide = Math.max(width, height);
            if (maxSide > LOGO_MAX_DIMENSION) {
                const scale = LOGO_MAX_DIMENSION / maxSide;
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Не удалось обработать изображение'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Не удалось загрузить изображение'));
        };
        img.src = url;
    });

const INITIAL_FORM_DATA = {
    name: '',
    fullName: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    inn: '',
    attachedDealerId: 'alloy',
};

const CreateEnterpriseModal = ({ isOpen, onClose, onNext }) => {
    const navigate = useNavigate();
    const logoInputRef = useRef(null);
    const [dealerAdmins, setDealerAdmins] = useState([]);
    const [loadingDealerAdmins, setLoadingDealerAdmins] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [logoData, setLogoData] = useState(null);
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

    useEffect(() => {
        if (isOpen) return;
        setFormData({ ...INITIAL_FORM_DATA });
        setLogoPreview(null);
        setLogoData(null);
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    }, [isOpen]);

    const dealerOptions = useMemo(
        () => [{ id: 'alloy', label: 'Alloy', organizationId: null }, ...dealerAdmins],
        [dealerAdmins]
    );

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            window.alert('Выберите файл изображения (PNG, JPG и т.д.)');
            e.target.value = '';
            return;
        }
        if (file.size > MAX_LOGO_SIZE_BYTES) {
            window.alert('Размер файла не должен превышать 2 МБ');
            e.target.value = '';
            return;
        }
        try {
            const dataUrl = await compressLogoFile(file);
            setLogoPreview(dataUrl);
            setLogoData(dataUrl);
        } catch {
            window.alert('Не удалось обработать изображение');
            e.target.value = '';
        }
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
            logo: logoData || null,
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
                            {logoPreview ? (
                                <img
                                    src={logoPreview}
                                    alt="Логотип предприятия"
                                    className="create-enterprise-logo-image"
                                />
                            ) : (
                                <span className="create-enterprise-logo-letter">
                                    {(formData.name || 'Н').trim().charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="create-enterprise-logo-info">
                            <div className="create-enterprise-name-preview">
                                {formData.name || 'Название предприятия'}
                            </div>
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                className="create-enterprise-logo-input"
                                onChange={handleLogoChange}
                            />
                            <button
                                type="button"
                                className="create-enterprise-change-photo"
                                onClick={() => logoInputRef.current?.click()}
                            >
                                {logoPreview ? 'Сменить логотип' : 'Загрузить логотип'}
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
