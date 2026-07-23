import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    getV2TestEvents,
    getV2TestMeta,
    postV2TestCommand,
} from '../api/v2ProtocolTestApi';

const POLL_MS = 1000;

/**
 * Hidden test page for protocol v2 (not in sidebar).
 * Open: /v2-protocol-test
 */
export default function V2ProtocolTestPage() {
    const [meta, setMeta] = useState(null);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);
    const [session, setSession] = useState('1');
    const [fromIdx, setFromIdx] = useState('41');
    const [toIdx, setToIdx] = useState('99');
    const afterIdRef = useRef(0);

    const poll = useCallback(async () => {
        try {
            const [m, ev] = await Promise.all([
                getV2TestMeta(),
                getV2TestEvents(afterIdRef.current),
            ]);
            setMeta(m);
            if (Array.isArray(ev) && ev.length > 0) {
                afterIdRef.current = ev[ev.length - 1].id;
                // newest on top; API batch is ascending by id
                setEvents((prev) => [...[...ev].reverse(), ...prev].slice(0, 300));
            }
            setError(null);
        } catch (e) {
            setError(e.message || String(e));
        }
    }, []);

    useEffect(() => {
        poll();
        const id = setInterval(poll, POLL_MS);
        return () => clearInterval(id);
    }, [poll]);

    const send = async (body) => {
        try {
            await postV2TestCommand(body);
            await poll();
        } catch (e) {
            setError(e.message || String(e));
        }
    };

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <h1 style={styles.h1}>Protocol v2 test</h1>
                <div style={styles.meta}>
                    MAC: <code>{meta?.testMac || '…'}</code>
                    {' · '}
                    pending cmds: {meta?.pendingCommands ?? '—'}
                    {' · '}
                    poll {POLL_MS}ms
                </div>
                {error && <div style={styles.error}>{error}</div>}
            </header>

            <section style={styles.commands}>
                <button type="button" style={styles.btn} onClick={() => send({ type: 'REQ_SESSION_INFO', session: Number(session) })}>
                    0x03 session info
                </button>
                <label style={styles.label}>
                    session
                    <input style={styles.input} value={session} onChange={(e) => setSession(e.target.value)} />
                </label>
                <label style={styles.label}>
                    from
                    <input style={styles.input} value={fromIdx} onChange={(e) => setFromIdx(e.target.value)} />
                </label>
                <label style={styles.label}>
                    to
                    <input style={styles.input} value={toIdx} onChange={(e) => setToIdx(e.target.value)} />
                </label>
                <button
                    type="button"
                    style={styles.btn}
                    onClick={() => send({
                        type: 'REQ_HISTORY',
                        session: Number(session),
                        from: Number(fromIdx),
                        to: Number(toIdx),
                    })}
                >
                    0x05 history range
                </button>
                <button type="button" style={styles.btn} onClick={() => send({ type: 'PRIO_HISTORY' })}>
                    0x08 prio history
                </button>
                <button type="button" style={styles.btn} onClick={() => send({ type: 'STOP_HISTORY' })}>
                    0x09 stop history
                </button>
                <button type="button" style={styles.btnSecondary} onClick={() => setEvents([])}>
                    clear UI
                </button>
            </section>

            <div style={styles.feed}>
                {events.length === 0 && (
                    <div style={styles.empty}>Waiting for packets from device…</div>
                )}
                {events.map((ev) => (
                    <article key={ev.id} style={ev.direction === 'IN' ? styles.cardIn : styles.cardOut}>
                        <div style={styles.cardHead}>
                            <strong>{ev.direction}</strong>
                            <span>#{ev.id}</span>
                            <span>{new Date(ev.tsEpochMs).toLocaleTimeString()}</span>
                            <span>{ev.mac}</span>
                        </div>
                        <div style={styles.block}>
                            <div style={styles.blockTitle}>raw hex</div>
                            <pre style={styles.pre}>{ev.rawHex}</pre>
                        </div>
                        <div style={styles.block}>
                            <div style={styles.blockTitle}>json</div>
                            <pre style={styles.pre}>{JSON.stringify(ev.json, null, 2)}</pre>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}

const styles = {
    page: {
        // #root: overflow hidden + flex column — скролл внутри этой страницы
        flex: '1 1 auto',
        minHeight: 0,
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        background: '#111827',
        color: '#e5e7eb',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        padding: '16px 20px 40px',
        boxSizing: 'border-box',
    },
    header: { marginBottom: 16 },
    h1: { margin: '0 0 8px', fontSize: 20, fontWeight: 600 },
    meta: { fontSize: 13, opacity: 0.85 },
    error: { marginTop: 8, color: '#fca5a5', fontSize: 13 },
    commands: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        background: '#1f2937',
        borderRadius: 8,
    },
    label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, opacity: 0.8 },
    input: {
        width: 72,
        padding: '6px 8px',
        borderRadius: 4,
        border: '1px solid #374151',
        background: '#111827',
        color: '#e5e7eb',
    },
    btn: {
        padding: '8px 12px',
        borderRadius: 6,
        border: 'none',
        background: '#2563eb',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 12,
    },
    btnSecondary: {
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px solid #4b5563',
        background: 'transparent',
        color: '#e5e7eb',
        cursor: 'pointer',
        fontSize: 12,
    },
    feed: { display: 'flex', flexDirection: 'column', gap: 12 },
    empty: { opacity: 0.6, padding: 24, textAlign: 'center' },
    cardIn: {
        background: '#0f172a',
        border: '1px solid #1e3a5f',
        borderRadius: 8,
        padding: 12,
    },
    cardOut: {
        background: '#14532d22',
        border: '1px solid #166534',
        borderRadius: 8,
        padding: 12,
    },
    cardHead: {
        display: 'flex',
        gap: 12,
        fontSize: 12,
        marginBottom: 8,
        opacity: 0.9,
    },
    block: { marginTop: 8 },
    blockTitle: { fontSize: 11, opacity: 0.6, marginBottom: 4 },
    pre: {
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        fontSize: 12,
        lineHeight: 1.4,
    },
};
