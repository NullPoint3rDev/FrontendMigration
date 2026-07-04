/**
 * Node-запускаемый self-check (без фреймворков): `node src/utils/weldingDespike.selfcheck.mjs`
 * Падает с ненулевым кодом, если фильтр despike сломан.
 */
import assert from 'node:assert/strict';
import { medianOf3, despikeValuesMedian3, despikeValuesMedian3WithinRuns } from './weldingDespike.js';

// median
assert.equal(medianOf3(1, 2, 3), 2);
assert.equal(medianOf3(3, 1, 2), 2);
assert.equal(medianOf3(50.2, 79.7, 43), 50.2);

// Короткие массивы — без изменений.
assert.deepEqual(despikeValuesMedian3([]), []);
assert.deepEqual(despikeValuesMedian3([5]), [5]);
assert.deepEqual(despikeValuesMedian3([5, 9]), [5, 9]);

// Одноточечный dropout в ноль (V=0/I=0 посреди сварки) — гасится.
assert.deepEqual(despikeValuesMedian3([300, 0, 300]), [300, 300, 300]);

// Одноточечный выброс к ХХ (79.7 между 43 и 50.2) — гасится.
assert.deepEqual(despikeValuesMedian3([43, 79.7, 50.2]), [43, 50.2, 50.2]);

// Реальная пауза в 2 отсчёта — сохраняется (не давится).
assert.deepEqual(despikeValuesMedian3([300, 300, 0, 0, 300, 300]), [300, 300, 0, 0, 300, 300]);

// Монотонная рампа — без искажений.
assert.deepEqual(despikeValuesMedian3([10, 20, 30, 40]), [10, 20, 30, 40]);

// Плоский участок — без изменений.
assert.deepEqual(despikeValuesMedian3([25, 25, 25]), [25, 25, 25]);

// Крайние точки не трогаем даже если это выброс.
assert.deepEqual(despikeValuesMedian3([999, 30, 30, 30]), [999, 30, 30, 30]);

// Медиана не протекает через offline между двумя участками сварки.
assert.deepEqual(despikeValuesMedian3([53, 65, 0, 48]), [53, 53, 48, 48]);
assert.deepEqual(
    despikeValuesMedian3WithinRuns([53, 65, 0, 48], [true, true, false, true]),
    [53, 65, 0, 48]
);

console.log('weldingDespike self-check OK');
