/**
 * ponytail: «Выкл(деж)» должен считаться standby (иначе live-дорожка зелёная).
 * node FrontendMigration/src/utils/weldingMachineStateDisplay.check.mjs
 */
import assert from 'node:assert/strict';
import { isStandbyMachineState, formatWeldingMachineStateDisplay } from './weldingMachineStateDisplay.js';

assert.equal(isStandbyMachineState('Дежурный режим'), true);
assert.equal(isStandbyMachineState('дежурный'), true);
assert.equal(isStandbyMachineState('standby'), true);
assert.equal(isStandbyMachineState('Выкл(деж)'), true);
assert.equal(isStandbyMachineState('выкл(деж)'), true);
assert.equal(isStandbyMachineState('Включен'), false);
assert.equal(isStandbyMachineState('Сварка'), false);

assert.equal(formatWeldingMachineStateDisplay('Дежурный режим'), 'Выкл(деж)');
assert.equal(formatWeldingMachineStateDisplay('Выкл(деж)'), 'Выкл(деж)');

console.log('weldingMachineStateDisplay self-check OK');
