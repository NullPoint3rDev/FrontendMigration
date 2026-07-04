/**
 * Медианный фильтр «3 точки» для сварочной телеметрии на графике истории.
 *
 * Гасит одиночные (одноточечные) выбросы и провалы опроса — например, отсчёт
 * обрыва дуги (V прыгает к ХХ ~80 В, ток падает до единиц) или полный dropout
 * (V=0 и I=0) посреди сварки. Реальные фронты и рампы не искажаются: медиана из
 * трёх для монотонной или плоской тройки возвращает средний (неизменный) отсчёт.
 *
 * ponytail: окно фиксированное = 3, поэтому парные глитчи (≥2 подряд одинаковых
 * выброса) не давятся. Апгрейд при появлении таких кейсов — окно 5 или порог по
 * длительности «нештатного» участка.
 */

/** Медиана трёх чисел без сортировки/аллокаций. */
export function medianOf3(a, b, c) {
    return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
}

/**
 * Возвращает новый массив: каждый внутренний отсчёт заменён медианой соседней тройки.
 * Крайние точки и нечисловые значения остаются как есть.
 */
export function despikeValuesMedian3(values) {
    const n = values?.length || 0;
    if (n < 3) return values ? values.slice() : [];
    const out = values.slice();
    for (let i = 1; i < n - 1; i += 1) {
        const a = Number(values[i - 1]);
        const b = Number(values[i]);
        const c = Number(values[i + 1]);
        if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
            out[i] = medianOf3(a, b, c);
        }
    }
    return out;
}

/**
 * Медиана «3 точки» внутри каждого непрерывного isActive-участка.
 * Offline между сваркой не участвует — иначе медиана «протекает» в паузу
 * (тултип 48 В, а линия держит 65 В с предыдущего участка).
 */
export function despikeValuesMedian3WithinRuns(values, isActive) {
    const n = values?.length || 0;
    if (n === 0) return [];
    const out = values.slice();
    let runStart = -1;
    const flush = (runEnd) => {
        if (runStart < 0) return;
        const len = runEnd - runStart;
        if (len >= 3) {
            const seg = despikeValuesMedian3(out.slice(runStart, runEnd));
            for (let j = 0; j < len; j += 1) {
                out[runStart + j] = seg[j];
            }
        }
        runStart = -1;
    };
    for (let i = 0; i < n; i += 1) {
        if (isActive[i]) {
            if (runStart < 0) runStart = i;
        } else {
            flush(i);
        }
    }
    flush(n);
    return out;
}
