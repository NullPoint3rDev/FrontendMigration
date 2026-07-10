/**
 * ponytail: самопроверка — плоский ток не заливает дыру >20с; тултип mid-gap = 0.
 * node FrontendMigration/src/utils/weldingPulseGap.check.mjs
 */
const MAX_GAP = 20_000;

function buildPulse(points) {
    const series = [];
    const push = (x, yRaw) => {
        const y = Math.round(Number(yRaw) * 10) / 10;
        const prev = series[series.length - 1];
        if (prev && prev.x === x && prev.y === y) return;
        series.push({ x, y });
    };
    let prevX = null;
    let prevY = 0;
    for (const p of points) {
        const x = p.ts;
        const y = p.isWelding && p.y > 0 ? p.y : 0;
        if (prevX != null && x - prevX > MAX_GAP) {
            if (prevY > 0) push(prevX, 0);
            if (y > 0) push(x, 0);
            prevY = 0;
        }
        push(x, y);
        prevX = x;
        prevY = y;
    }
    if (prevX != null && prevY > 0) push(prevX, 0);
    return series;
}

function compress(points) {
    const n = points.length;
    if (n <= 1) return points.slice();
    const out = [points[0]];
    for (let i = 1; i < n; i += 1) {
        const cur = points[i];
        const prev = out[out.length - 1];
        if (cur.x === prev.x) { out.push(cur); continue; }
        const yCur = Number(cur.y);
        const yPrev = Number(prev.y);
        if (yCur !== yPrev) { out.push(cur); continue; }
        if (yCur > 0 && cur.x - prev.x > MAX_GAP) {
            out.push({ x: prev.x, y: 0 });
            out.push({ x: cur.x, y: 0 });
            out.push(cur);
            continue;
        }
        const next = points[i + 1];
        if (!next || Number(next.y) !== yCur || next.x === cur.x) out.push(cur);
    }
    const last = points[n - 1];
    const tail = out[out.length - 1];
    if (last.x !== tail.x || Number(last.y) !== Number(tail.y)) out.push(last);
    return out;
}

function valueAt(series, ts) {
    const byX = new Map();
    for (const p of series) byX.set(p.x, p.y);
    const distinct = [...byX.entries()].sort((a, b) => a[0] - b[0]).map(([x, y]) => ({ x, y }));
    for (let i = 0; i < distinct.length - 1; i += 1) {
        if (ts < distinct[i + 1].x) {
            if (distinct[i + 1].x - distinct[i].x > MAX_GAP && ts > distinct[i].x) return 0;
            return distinct[i].y;
        }
    }
    return distinct[distinct.length - 1]?.y ?? null;
}

const t0 = 1_000_000;
const sparse = buildPulse([
    { ts: t0, isWelding: true, y: 300 },
    { ts: t0 + 2 * 3600_000, isWelding: true, y: 310 },
]);
const sparseC = compress(sparse);
const mid = valueAt(sparseC, t0 + 3600_000);
if (mid !== 0) {
    console.error('FAIL sparse mid-gap', mid, sparseC);
    process.exit(1);
}

const dense = buildPulse([
    { ts: t0, isWelding: true, y: 300 },
    { ts: t0 + 5_000, isWelding: true, y: 300 },
    { ts: t0 + 10_000, isWelding: true, y: 300 },
    { ts: t0 + 15_000, isWelding: false, y: 0 },
]);
const denseC = compress(dense);
const on = valueAt(denseC, t0 + 7_000);
if (!(on > 0)) {
    console.error('FAIL dense in-weld', on, denseC);
    process.exit(1);
}
const off = valueAt(denseC, t0 + 20_000);
if (off !== 0) {
    console.error('FAIL dense after weld', off, denseC);
    process.exit(1);
}

console.log('ok');
