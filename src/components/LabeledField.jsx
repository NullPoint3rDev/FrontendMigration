import React from 'react';

/**
 * Поле: слева значение (обрезается), справа приглушённая подпись названия.
 * children — сам контрол (input/button), без placeholder-названия.
 */
export default function LabeledField({ label, required, className, children }) {
    const text = required ? `${label}*` : label;
    return (
        <div className={`labeled-field ${className || ''}`}>
            <div className="labeled-field-control">{children}</div>
            <span className="labeled-field-hint" aria-hidden>{text}</span>
        </div>
    );
}
