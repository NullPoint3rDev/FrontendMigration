/**
 * ponytail: импульс имеет ширину; тултип не clamp'ит за last.
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
            if (prevY > 0) {
                const zeroAt = prevX + MAX_GAP;
                push(zeroAt, prevY);
                push(zeroAt, 0);
            }
            prevY = 0;
        }
        push(x, y);
        prevX = x;
        prevY = y;
    }
    if (prevX != null && prevY > 0) {
        const zeroAt = prevX + MAX_GAP;
        push(zeroAt, prevY);
        push(zeroAt, 0);
    }
    return series;
}

function valueAt(series, ts) {
    const byX = new Map();
    for (const p of series) byX.set(p.x, p.y);
    const distinct = [...byX.entries()].sort((a, b) => a[0] - b[0]).map(([x, y]) => ({ x, y }));
    if (!distinct.length) return null;
    if (ts < distinct[0].x || ts > distinct[distinct.length - 1].x) return null;
    for (let i = 0; i < distinct.length - 1; i += 1) {
        if (ts < distinct[i + 1].x) return distinct[i].y;
    }
    return distinct[distinct.length - 1].y;
}

const t0 = 1_000_000;

// Одиночный отсчёт сварки — не игла нулевой ширины, а плато до MAX_GAP
const lone = buildPulse([{ ts: t0, isWelding: true, y: 101 }]);
const midLone = valueAt(lone, t0 + 5_000);
if (!(midLone > 0)) {
    console.error('FAIL lone pulse should hold', midLone, lone);
    process.exit(1);
}
const afterLone = valueAt(lone, t0 + MAX_GAP + 1);
if (afterLone != null && afterLone !== 0) {
    console.error('FAIL after lone pulse', afterLone, lone);
    process.exit(1);
}

// Тултип справа от last — null (не clamp)
const afterSeries = valueAt(lone, t0 + MAX_GAP + 60_000);
if (afterSeries != null) {
    console.error('FAIL tooltip past last must be null', afterSeries);
    process.exit(1);
}

// Сварка → idle на следующем опросе
const pair = buildPulse([
    { ts: t0, isWelding: true, y: 101 },
    { ts: t0 + 3_000, isWelding: false, y: 0 },
]);
if (!(valueAt(pair, t0 + 1_000) > 0)) {
    console.error('FAIL pair hold', pair);
    process.exit(1);
}
if (valueAt(pair, t0 + 3_000) !== 0) {
    console.error('FAIL pair at idle', valueAt(pair, t0 + 3_000), pair);
    process.exit(1);
}

console.log('ok');
