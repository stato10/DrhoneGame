'use strict';
// Pure math shared with deterministic tests. No sensor access here.
const SensorMath = (() => {
  const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
  function roll(q) {
    if (!q || q.length !== 4 || !Array.from(q).every(Number.isFinite)) return null;
    const n = Math.hypot(...q);
    if (n < .00001) return null;
    const [x, y, z, w] = Array.from(q, v => v / n);
    return Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * 180 / Math.PI;
  }
  const fresh = (at, now) => Number.isFinite(at) && now >= at && now - at < 1500;
  return {wrap, roll, fresh};
})();
if (typeof module !== 'undefined') module.exports = SensorMath;
