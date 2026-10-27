/** Deterministic woodland-style camouflage pattern, generated as a tileable SVG. */

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blobPath(cx: number, cy: number, r: number, rand: () => number) {
  const n = 7 + Math.floor(rand() * 4);
  const pts: [number, number][] = [];
  const stretch = 0.6 + rand() * 0.9;
  const rot = rand() * Math.PI;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.55 + rand() * 0.65);
    let x = Math.cos(a) * rr * (1 + stretch);
    let y = Math.sin(a) * rr;
    [x, y] = [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)];
    pts.push([cx + x, cy + y]);
  }
  // Catmull-Rom through the points, as cubic beziers.
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

export function camoSvg(
  colors: [string, string, string, string] = ["#3b4a2b", "#59683a", "#7a7448", "#1f2617"],
  seed = 7,
  size = 420
) {
  const rand = rng(seed);
  const [base, ...layers] = colors;
  let paths = "";
  layers.forEach((color, li) => {
    const count = 9 - li * 2;
    let d = "";
    for (let i = 0; i < count; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const r = size * (0.07 + rand() * 0.07) * (li === 2 ? 0.7 : 1);
      // Repeat across the tile edges so the pattern tiles seamlessly.
      for (const dx of [-size, 0, size])
        for (const dy of [-size, 0, size]) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < -r * 3 || x > size + r * 3 || y < -r * 3 || y > size + r * 3) continue;
          d += blobPath(x, y, r, rng(seed * 100 + li * 17 + i));
        }
    }
    paths += `<path fill="${color}" d="${d}"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${base}"/>${paths}</svg>`;
}

export function camoDataUri(...args: Parameters<typeof camoSvg>) {
  return `url("data:image/svg+xml,${encodeURIComponent(camoSvg(...args))}")`;
}

export const HEADER_CAMO = camoDataUri(["#263019", "#33401f", "#3f4b28", "#1b2213"], 11);
export const HERO_CAMO = camoDataUri(["#3b4a2b", "#56653a", "#7b7449", "#1f2617"], 5, 520);
