import React, { useState, useEffect, useCallback } from 'react';
import { sendEmailVerificationCode, confirmEmailVerificationCode } from '../api/userAccountApi';
import '../styles/emailVerifyModal.css';

/**
 * Модальное окно: отправка 6-значного кода на email и ввод кода (срок действия на стороне сервера — 10 мин).
 */
const EmailVerifyModal = ({ isOpen, onClose, userId, email, onVerified }) => {
    const [sendStatus, setSendStatus] = useState('idle'); // idle | sending | sent | sendError
    const [sendError, setSendError] = useState('');
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmError, setConfirmError] = useState('');

    const reset = useCallback(() => {
        setSendStatus('idle');
        setSendError('');
        setCode('');
        setSubmitting(false);
        setConfirmError('');
    }, []);

    useEffect(() => {
        if (!isOpen) {
            reset();
            return;
        }
        if (!userId || !email?.trim()) {
            setSendStatus('sendError');
            setSendError('У пользователя не указан email. Сохраните карточку с email и попробуйте снова.');
            return;
        }
        let cancelled = false;
        (async () => {
            setSendStatus('sending');
            setSendError('');
            try {
                await sendEmailVerificationCode(userId);
                if (!cancelled) setSendStatus('sent');
            } catch (e) {
                if (!cancelled) {
                    setSendStatus('sendError');
                    setSendError(
                        e?.message ||
                        (typeof e === 'string' ? e : 'Не удалось отправить код. Проверьте настройки почты на сервере.')
                    );
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, userId, email, reset]);

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleConfirm = async () => {
        const digits = code.replace(/\D/g, '').slice(0, 6);
        if (digits.length !== 6) {
            setConfirmError('Введите 6 цифр кода из письма');
            return;
        }
        setConfirmError('');
        setSubmitting(true);
        try {
            const updated = await confirmEmailVerificationCode(userId, digits);
            if (onVerified) onVerified(updated);
            handleClose();
        } catch (e) {
            const msg =
                e?.message ||
                (e?.response?.data?.message ? String(e.response.data.message) : null) ||
                'Неверный код или срок действия истёк';
            setConfirmError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="email-verify-modal-overlay" onClick={handleClose}>
            <div className="email-verify-modal-content" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="email-verify-modal-close" onClick={handleClose} aria-label="Закрыть">
                    ×
                </button>
                <h2 className="email-verify-modal-title">Подтверждение email</h2>
                <p className="email-verify-modal-hint">
                    На адрес <strong>{email || '—'}</strong> отправлено письмо с 6-значным кодом. Введите код в течение 10 минут.
                </p>
                {sendStatus === 'sending' && <p className="email-verify-modal-status">Отправка кода…</p>}
                {sendStatus === 'sent' && <p className="email-verify-modal-status ok">Код отправлен. Проверьте почту.</p>}
                {sendStatus === 'sendError' && (
                    <p className="email-verify-modal-status err">{sendError || 'Ошибка отправки'}</p>
                )}
                {sendStatus === 'sent' && (
                    <>
                        <div className="email-verify-modal-field">
                            <label htmlFor="emailVerifyCode">Код из письма</label>
                            <input
                                id="emailVerifyCode"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                            />
                        </div>
                        {confirmError && <p className="email-verify-modal-status err">{confirmError}</p>}
                        <div className="email-verify-modal-actions">
                            <button
                                type="button"
                                className="email-verify-btn primary"
                                onClick={handleConfirm}
                                disabled={submitting || code.replace(/\D/g, '').length !== 6}
                            >
                                {submitting ? 'Проверка…' : 'Подтвердить'}
                            </button>
                            <button type="button" className="email-verify-btn ghost" onClick={handleClose}>
                                Отмена
                            </button>
                        </div>
                    </>
                )}
                {sendStatus === 'sendError' && (
                    <div className="email-verify-modal-actions">
                        <button type="button" className="email-verify-btn ghost" onClick={handleClose}>
                            Закрыть
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailVerifyModal;
