/**
 * ponytail: самопроверка — stepped-сварка не тянет Y через паузу > maxGapMs.
 * node FrontendMigration/src/utils/weldingPulseGap.check.mjs
 */
const MAX_GAP = 20_000;

function buildPulse(points) {
    const series = [];
    let wasWelding = false;
    let lastY = 0;
    let prevX = null;
    const push = (x, yRaw) => {
        const y = Math.round(Number(yRaw) * 10) / 10;
        const prev = series[series.length - 1];
        if (prev && prev.x === x && prev.y === y) return;
        series.push({ x, y });
    };
    const close = (atX) => {
        if (!wasWelding) return;
        push(atX, lastY);
        push(atX, 0);
        wasWelding = false;
        lastY = 0;
    };
    for (const p of points) {
        const x = p.ts;
        if (prevX != null && x - prevX > MAX_GAP) close(prevX);
        if (!p.isWelding) {
            if (wasWelding) close(x);
            prevX = x;
            continue;
        }
        const y = p.y;
        if (!(y > 0)) {
            if (wasWelding) close(x);
            prevX = x;
            continue;
        }
        if (!wasWelding) {
            push(x, 0);
            push(x, y);
        } else if (y !== lastY) {
            push(x, y);
        }
        lastY = y;
        wasWelding = true;
        prevX = x;
    }
    if (wasWelding && prevX != null) close(prevX);
    return series;
}

function valueAt(series, ts) {
    const distinct = [];
    const byX = new Map();
    for (const p of series) byX.set(p.x, p.y);
    for (const [x, y] of [...byX.entries()].sort((a, b) => a[0] - b[0])) distinct.push({ x, y });
    for (let i = 0; i < distinct.length - 1; i += 1) {
        if (ts < distinct[i + 1].x) {
            if (distinct[i + 1].x - distinct[i].x > MAX_GAP && ts > distinct[i].x) return 0;
            return distinct[i].y;
        }
    }
    return distinct[distinct.length - 1]?.y ?? null;
}

const t0 = 1_000_000;
const pts = [
    { ts: t0, isWelding: true, y: 300 },
    { ts: t0 + 5_000, isWelding: true, y: 300 },
    // дыра 2 часа без опросов — нельзя тянуть дугу
    { ts: t0 + 2 * 3600_000, isWelding: true, y: 310 },
];
const series = buildPulse(pts);
const mid = valueAt(series, t0 + 3600_000);
if (mid !== 0) {
    console.error('FAIL: mid-gap must be 0, got', mid, series);
    process.exit(1);
}
const near = valueAt(series, t0 + 1_000);
if (!(near > 0)) {
    console.error('FAIL: near weld start must be >0, got', near, series);
    process.exit(1);
}
console.log('ok', series.length, 'points');
