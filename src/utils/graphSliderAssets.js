import trackOff from '../images/graph-sliders/track-off.png';
import knobOn from '../images/graph-sliders/knob-on.png';
import knobOff from '../images/graph-sliders/knob-off.png';
import shadow from '../images/graph-sliders/shadow.png';

const trackGlob = import.meta.glob('../images/graph-sliders/track-*.png', {
    eager: true,
    import: 'default',
});

const TRACK_BY_HEX = {};
Object.entries(trackGlob).forEach(([path, url]) => {
    const m = path.match(/track-([0-9a-fA-F]{6})\.png$/);
    if (m) TRACK_BY_HEX[m[1].toLowerCase()] = url;
});

const TRACK_HEXES = Object.keys(TRACK_BY_HEX);

const parseHex = (hex) => {
    const s = String(hex || '').replace('#', '').trim();
    if (s.length !== 6) return null;
    const n = Number.parseInt(s, 16);
    if (!Number.isFinite(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

/** Ближайший цветной трек слайдера к цвету канала. */
export const resolveSliderTrackUrl = (channelColorHex) => {
    const target = parseHex(channelColorHex);
    if (!target || !TRACK_HEXES.length) return trackOff;
    const key = String(channelColorHex || '').replace('#', '').toLowerCase();
    if (TRACK_BY_HEX[key]) return TRACK_BY_HEX[key];

    let bestHex = TRACK_HEXES[0];
    let bestDist = Number.POSITIVE_INFINITY;
    TRACK_HEXES.forEach((hex) => {
        const c = parseHex(hex);
        if (!c) return;
        const d = (c.r - target.r) ** 2 + (c.g - target.g) ** 2 + (c.b - target.b) ** 2;
        if (d < bestDist) {
            bestDist = d;
            bestHex = hex;
        }
    });
    return TRACK_BY_HEX[bestHex] || trackOff;
};

export { trackOff, knobOn, knobOff, shadow };
