import React, { useEffect, useState } from 'react';
import { formatMoscowTime } from '../utils/moscowTime';
import '../styles/headerClock.css';

export default function HeaderClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <span className="monitor-page-header-clock" aria-hidden="true">
            {formatMoscowTime(now)}
        </span>
    );
}
