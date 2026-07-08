import React, { useEffect, useRef, useState } from 'react';

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const RU_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export const isoToDisplayDate = (iso) => {
    if (!iso) return '';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    return `${m[3]}.${m[2]}.${m[1]}`;
};

export const displayToIsoDate = (display) => {
    const m = String(display || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return '';
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return '';
    return `${m[3]}-${m[2]}-${m[1]}`;
};

export const formatDateTyping = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length === 0) return '';
    if (digits.length === 1) return digits;

    const day = digits.slice(0, 2);
    if (digits.length === 2) return `${day}.`;

    const monthPart = digits.slice(2);
    if (digits.length === 3) return `${day}.${monthPart}`;

    const month = digits.slice(2, 4);
    if (digits.length === 4) return `${day}.${month}.`;

    return `${day}.${month}.${digits.slice(4)}`;
};

const isoToDate = (iso) => {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const dateToIso = (d) => {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
};

const buildMonthGrid = (view) => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
};

export function MiniCalendar({ selectedIso, minDate, maxDate, onPick, showYearNav = true }) {
    const initial = isoToDate(selectedIso) || (maxDate ? new Date(maxDate) : new Date());
    const [view, setView] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
    const selected = isoToDate(selectedIso);

    const canNext = (() => {
        if (!maxDate) return true;
        const next = new Date(view.getFullYear(), view.getMonth() + 1, 1);
        return next <= startOfDay(maxDate);
    })();

    const canPrevYear = !minDate || view.getFullYear() > minDate.getFullYear();
    const canNextYear = !maxDate || view.getFullYear() < maxDate.getFullYear();

    const shiftMonth = (dir) => setView(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
    const shiftYear = (dir) => setView(prev => new Date(prev.getFullYear() + dir, prev.getMonth(), 1));

    const isDayDisabled = (day) => {
        const d = startOfDay(new Date(view.getFullYear(), view.getMonth(), day));
        if (minDate && d < startOfDay(minDate)) return true;
        if (maxDate && d > startOfDay(maxDate)) return true;
        return false;
    };

    return (
        <div className="welder-cal" onMouseDown={(e) => e.preventDefault()}>
            <div className="welder-cal-nav">
                {showYearNav ? (
                    <button type="button" className="welder-cal-nav-btn welder-cal-nav-btn-year" onClick={() => shiftYear(-1)} disabled={!canPrevYear} aria-label="Предыдущий год">&lt;&lt;</button>
                ) : null}
                <button type="button" className="welder-cal-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">&lt;</button>
                <span className="welder-cal-title">{RU_MONTHS[view.getMonth()]} {view.getFullYear()}</span>
                <button type="button" className="welder-cal-nav-btn" onClick={() => shiftMonth(1)} disabled={!canNext} aria-label="Следующий месяц">&gt;</button>
                {showYearNav ? (
                    <button type="button" className="welder-cal-nav-btn welder-cal-nav-btn-year" onClick={() => shiftYear(1)} disabled={!canNextYear} aria-label="Следующий год">&gt;&gt;</button>
                ) : null}
            </div>
            <div className="welder-cal-weekdays">
                {WEEK_DAYS.map(d => <div key={d} className="welder-cal-weekday">{d}</div>)}
            </div>
            <div className="welder-cal-days">
                {buildMonthGrid(view).map((day, idx) => {
                    if (!day) return <div key={idx} className="welder-cal-day empty" />;
                    const disabled = isDayDisabled(day);
                    const isSel = selected && selected.getFullYear() === view.getFullYear()
                        && selected.getMonth() === view.getMonth() && selected.getDate() === day;
                    return (
                        <button
                            key={idx}
                            type="button"
                            className={`welder-cal-day ${isSel ? 'selected' : ''}`}
                            disabled={disabled}
                            onClick={() => onPick(dateToIso(new Date(view.getFullYear(), view.getMonth(), day)))}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Поле даты: ручной ввод DD.MM.YYYY + кастомный календарь. value/onChange в ISO (YYYY-MM-DD). */
export default function WelderDateField({ value, onChange, placeholder, disabled, minDate, maxDate, validate, className }) {
    const [text, setText] = useState(isoToDisplayDate(value));
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const focusedRef = useRef(false);

    useEffect(() => {
        if (focusedRef.current) return;
        setText(isoToDisplayDate(value));
    }, [value]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const runValidate = (iso) => {
        const err = validate ? (validate(iso) || '') : '';
        setError(err);
        return err;
    };

    const handleTextChange = (e) => {
        const formatted = formatDateTyping(e.target.value);
        setText(formatted);
        const iso = displayToIsoDate(formatted);
        if (iso) {
            const err = runValidate(iso);
            onChange(err ? '' : iso);
        } else {
            setError('');
            onChange('');
        }
    };

    const handleBlur = () => {
        focusedRef.current = false;
        if (text && !displayToIsoDate(text)) {
            setText('');
            setError('');
            onChange('');
        }
    };

    const handlePick = (iso) => {
        setText(isoToDisplayDate(iso));
        runValidate(iso);
        onChange(iso);
        setOpen(false);
    };

    return (
        <div className={`welder-date-field ${error ? 'has-error' : ''} ${className || ''}`} ref={wrapRef}>
            <input
                type="text"
                inputMode="numeric"
                value={text}
                onFocus={() => { focusedRef.current = true; }}
                onChange={handleTextChange}
                onBlur={handleBlur}
                placeholder={placeholder || 'ДД.ММ.ГГГГ'}
                disabled={disabled}
                maxLength={10}
                className={error ? 'error' : ''}
            />
            <svg
                className="welder-date-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                onClick={() => { if (!disabled) setOpen(o => !o); }}
            >
                <rect x="3" y="4" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3 7H13" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 2V5M10 2V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {open && !disabled && (
                <div className="welder-date-popup">
                    <MiniCalendar selectedIso={value} minDate={minDate} maxDate={maxDate} onPick={handlePick} />
                </div>
            )}
            {error && <span className="welder-date-error">{error}</span>}
        </div>
    );
}
