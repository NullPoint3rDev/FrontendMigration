/**
 * ponytail: график сварки только внутри сегментов; тултип не показывает значения на зелёном.
 * node FrontendMigration/src/utils/weldingPulseGap.check.mjs
 */
const MAX_GAP = 20_000;

function buildSegments(samples) {
    const segments = [];
    let current = null;
    samples.forEach((s) => {
        if (s.isWelding) {
            if (!current) current = { start: s.x, end: s.x };
            else if (s.x - current.end > MAX_GAP) {
                current.end = s.x;
                segments.push(current);
                current = { start: s.x, end: s.x };
            } else current.end = s.x;
        } else if (current) {
            current.end = s.x;
            segments.push(current);
            current = null;
        }
    });
    if (current) {
        current.end = current.end + Math.min(MAX_GAP, 3000);
        segments.push(current);
    }
    return segments;
}

function buildSeries(points, segments) {
    const series = [];
    const push = (x, y) => {
        const prev = series[series.length - 1];
        if (prev && prev.x === x && prev.y === y) return;
        series.push({ x, y });
    };
    push(points[0].ts, 0);
    segments.forEach((seg) => {
        push(seg.start, 0);
        let lastY = 0;
        points.forEach((p) => {
            if (p.ts < seg.start || p.ts >= seg.end || !p.isWelding || !(p.y > 0)) return;
            if (lastY === 0) { push(p.ts, 0); push(p.ts, p.y); }
            else push(p.ts, p.y);
            lastY = p.y;
        });
        if (lastY > 0) { push(seg.end, lastY); push(seg.end, 0); }
        else push(seg.end, 0);
    });
    return series;
}

function valueAt(series, ts) {
    const byX = new Map();
    for (const p of series) byX.set(p.x, p.y);
    const d = [...byX.entries()].sort((a, b) => a[0] - b[0]).map(([x, y]) => ({ x, y }));
    if (!d.length || ts < d[0].x || ts > d[d.length - 1].x) return null;
    for (let i = 0; i < d.length - 1; i += 1) {
        if (ts < d[i + 1].x) return d[i].y;
    }
    return d[d.length - 1].y;
}

function inSeg(ts, segs) {
    return segs.some((s) => ts >= s.start && ts < s.end);
}

const t0 = 1_000_000;
const samples = [
    { x: t0, ts: t0, isWelding: true, y: 200 },
    { x: t0 + 5_000, ts: t0 + 5_000, isWelding: false, y: 0 },
    { x: t0 + 10_000, ts: t0 + 10_000, isWelding: false, y: 0 },
];
const segs = buildSegments(samples);
const series = buildSeries(samples, segs);

// На зелёном (после конца сегмента) — не рисуем и тултип пуст
const after = t0 + 7_000;
if (inSeg(after, segs)) {
    console.error('FAIL should be outside weld seg', segs);
    process.exit(1);
}
const yAfter = valueAt(series, after);
if (yAfter && yAfter > 0) {
    console.error('FAIL chart must be 0 on green', yAfter, series);
    process.exit(1);
}

// Внутри жёлтого — рисуем
const mid = t0 + 1_000;
if (!inSeg(mid, segs) || !(valueAt(series, mid) > 0)) {
    console.error('FAIL inside weld', mid, segs, series);
    process.exit(1);
}

console.log('ok');
