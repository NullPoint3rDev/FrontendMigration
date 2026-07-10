/**
 * ponytail: тултип должен совпадать с горизонталью Chart.js stepped:'before'
 * (удержание y_i на [x_i, x_{i+1})), без обнуления по длинному gap.
 * node FrontendMigration/src/utils/weldingTooltipStepped.check.mjs
 */

function valueAtSteppedBefore(series, ts) {
    const byX = new Map();
    series.forEach((p, idx) => {
        if (!byX.has(p.x)) byX.set(p.x, []);
        byX.get(p.x).push({ y: p.y, idx });
    });
    const distinct = [...byX.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([x, arr]) => {
            arr.sort((a, b) => a.idx - b.idx);
            return { x, y: arr[arr.length - 1].y };
        });
    if (ts < distinct[0].x || ts > distinct[distinct.length - 1].x) return null;
    for (let i = 0; i < distinct.length - 1; i += 1) {
        if (ts < distinct[i + 1].x) return distinct[i].y;
    }
    return distinct[distinct.length - 1].y;
}

const t0 = 1_000_000;
// Редкий ряд истории: плато 140, потом 119 (как на скринах 4–6).
const series = [
    { x: t0, y: 0 },
    { x: t0, y: 140 },
    { x: t0 + 60_000, y: 119 },
    { x: t0 + 61_000, y: 141 },
    { x: t0 + 62_000, y: 132 },
    { x: t0 + 70_000, y: 132 },
    { x: t0 + 70_000, y: 0 },
];

// Посреди длинного плато 140 — тултип 140 (не 0 из‑за gap и не 119 «следующей» точки).
const midPlateau = valueAtSteppedBefore(series, t0 + 30_000);
if (midPlateau !== 140) {
    console.error('FAIL mid plateau', midPlateau);
    process.exit(1);
}

if (valueAtSteppedBefore(series, t0 + 60_500) !== 119) {
    console.error('FAIL after step to 119');
    process.exit(1);
}
if (valueAtSteppedBefore(series, t0 + 61_500) !== 141) {
    console.error('FAIL after step to 141');
    process.exit(1);
}
if (valueAtSteppedBefore(series, t0 + 65_000) !== 132) {
    console.error('FAIL plateau 132');
    process.exit(1);
}

console.log('weldingTooltipStepped self-check OK');
