import {
    getMachineActivityModeFromTextAndStatus,
    isStateLaneOnlineMode,
} from './weldingMachineActivityMode.js';

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

assert(getMachineActivityModeFromTextAndStatus('Включен', 'Offline') === 'on', 'text Включен wins over Offline');
assert(getMachineActivityModeFromTextAndStatus('Режим ожидания', null) === 'on', 'waiting → on');
assert(getMachineActivityModeFromTextAndStatus('Сварка', 'Idle') === 'welding', 'сварка');
assert(getMachineActivityModeFromTextAndStatus('', 'Offline') === 'off', 'empty + Offline');
assert(getMachineActivityModeFromTextAndStatus('', 'Idle') === 'on', 'empty + Idle status');
assert(getMachineActivityModeFromTextAndStatus('', '') === 'off', 'empty poll not green');
assert(getMachineActivityModeFromTextAndStatus('Выкл', null) === 'off', 'выкл');
assert(getMachineActivityModeFromTextAndStatus('Дежурный режим', 'On') === 'off', 'standby');
assert(isStateLaneOnlineMode('on') && isStateLaneOnlineMode('welding') && !isStateLaneOnlineMode('off'), 'lane mask');

console.log('weldingMachineActivityMode.selfcheck: ok');
