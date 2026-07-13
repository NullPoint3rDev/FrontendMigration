/** ponytail: self-check for Core arc heuristics used in isWeldingFromPanelState / isHistoryPointWelding. */

function isArcFromWeldingCurrent(weldRaw, setI) {
    return Number.isFinite(weldRaw) && weldRaw > 10 && weldRaw > setI + 5;
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

assert(isArcFromWeldingCurrent(180, 152), 'arc above setpoint');
assert(!isArcFromWeldingCurrent(152, 152), 'setpoint alone not arc');
assert(!isArcFromWeldingCurrent(8, 0), 'low current not arc');

console.log('weldingArcDetection.selfcheck: ok');
