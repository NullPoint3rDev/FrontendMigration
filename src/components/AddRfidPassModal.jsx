import React, { useState, useEffect } from 'react';
import '../styles/addRfidPassModal.css';

const AddRfidPassModal = ({ isOpen, onClose, onAdd }) => {
    const [rfidCode, setRfidCode] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Сброс формы при открытии
            setRfidCode('');
        }
    }, [isOpen]);

    const handleAdd = () => {
        if (rfidCode.trim()) {
            onAdd(rfidCode.trim());
            handleClose();
        }
    };

    const handleClose = () => {
        setRfidCode('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="add-rfid-pass-modal-overlay" onClick={handleClose}>
            <div className="add-rfid-pass-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="add-rfid-pass-modal-close" onClick={handleClose}>
                    ×
                </button>

                <h2 className="add-rfid-pass-modal-title">Добавить пропуск RFID</h2>

                <div className="add-rfid-pass-form">
                    <div className="add-rfid-pass-form-field">
                        <label htmlFor="rfidCode">
                            Код RFID
                        </label>
                        <input
                            id="rfidCode"
                            type="text"
                            value={rfidCode}
                            onChange={(e) => setRfidCode(e.target.value)}
                            placeholder="Введите код RFID"
                        />
                    </div>

                    <div className="add-rfid-pass-modal-actions">
                        <button
                            type="button"
                            className="add-rfid-pass-btn add"
                            onClick={handleAdd}
                            disabled={!rfidCode.trim()}
                        >
                            Добавить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddRfidPassModal;

