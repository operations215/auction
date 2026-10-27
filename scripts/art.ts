/**
 * Studio-style illustrations for the demo listings. Each item gets a main shot, a close-up
 * and a stamped label card, so listing galleries look like a real seller's photos.
 */

export type Kind =
  | "helmet" | "jacket" | "beret" | "webbing" | "canteen" | "rucksack" | "duffel" | "patch" | "medal"
  | "binoculars" | "compass" | "radio" | "knife" | "shovel" | "tent" | "document" | "gasmask" | "boots"
  | "messkit" | "cap" | "trousers";

export type ArtOpts = {
  color?: string;
  accent?: string;
  camo?: string[]; // fill the item with a camouflage pattern
  variant?: string;
  text?: string;
  bg?: "canvas" | "slate" | "paper" | "wood";
  label: string[];
  seed?: number;
};

/* ----------------------------------------------------------------- helpers */

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(c: string, amt: number) {
  const [r, g, b] = hex(c);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blob(cx: number, cy: number, r: number, rand: () => number) {
  const n = 7;
  const pts: [number, number][] = [];
  const stretch = 0.5 + rand();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.55 + rand() * 0.6);
    pts.push([cx + Math.cos(a) * rr * (1 + stretch), cy + Math.sin(a) * rr]);
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

function camoPattern(id: string, colors: string[], seed: number) {
  const rand = rng(seed);
  const size = 160;
  let paths = "";
  colors.slice(1).forEach((c, li) => {
    let d = "";
    for (let i = 0; i < 7 - li; i++) {
      const x = rand() * size, y = rand() * size, r = 10 + rand() * 12;
      for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) d += blob(x + dx, y + dy, r, rng(seed * 31 + li * 7 + i));
    }
    paths += `<path fill="${c}" d="${d}"/>`;
  });
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><rect width="${size}" height="${size}" fill="${colors[0]}"/>${paths}</pattern>`;
}

const BACKGROUNDS = {
  canvas: ["#e6dcc0", "#c2b58f"],
  slate: ["#4a5047", "#262a23"],
  paper: ["#f1ead6", "#d6cbab"],
  wood: ["#8a6643", "#4f3721"],
};

function frame(inner: string, defs: string, bg: keyof typeof BACKGROUNDS, viewBox = "0 0 800 600", scale = 1.22) {
  const [a, b] = BACKGROUNDS[bg];
  const grain =
    bg === "wood"
      ? Array.from({ length: 22 }, (_, i) => `<path d="M0 ${i * 28 + 6} Q200 ${i * 28 + (i % 3) * 6} 400 ${i * 28 + 10} T800 ${i * 28 + 4}" stroke="#000" stroke-opacity="0.08" stroke-width="2" fill="none"/>`).join("")
      : `<rect width="800" height="600" fill="url(#weave)" opacity="0.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="800" height="600">
<defs>
<radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
<pattern id="weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0h6M0 3h6" stroke="#000" stroke-opacity="0.06"/><path d="M0 0v6M3 0v6" stroke="#fff" stroke-opacity="0.05"/></pattern>
<pattern id="speckle" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1.2" fill="#000" fill-opacity="0.18"/><circle cx="10" cy="9" r="1" fill="#fff" fill-opacity="0.12"/><circle cx="7" cy="12" r="0.8" fill="#000" fill-opacity="0.15"/></pattern>
<pattern id="twill" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0v8" stroke="#000" stroke-opacity="0.09" stroke-width="2"/></pattern>
<linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f0e8"/><stop offset="0.45" stop-color="#a9aaa2"/><stop offset="0.7" stop-color="#d9dad3"/><stop offset="1" stop-color="#7b7d75"/></linearGradient>
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d27a"/><stop offset="0.5" stop-color="#b8862a"/><stop offset="1" stop-color="#7c5714"/></linearGradient>
<linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2a86c"/><stop offset="0.5" stop-color="#9a5f2b"/><stop offset="1" stop-color="#5e3412"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></linearGradient>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity="0.38"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
${defs}
</defs>
<rect x="-400" y="-300" width="1600" height="1200" fill="url(#bg)"/>${grain}
<ellipse cx="400" cy="530" rx="290" ry="36" fill="#000" opacity="0.28" filter="url(#soft)"/>
<g filter="url(#shadow)"><g transform="translate(400 300) scale(${scale}) translate(-400 -300)">${inner}</g></g>
<rect x="-400" y="-300" width="1600" height="1200" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="80" style="mix-blend-mode:multiply"/>
</svg>`;
}

const stitch = (d: string, color = "#000", op = 0.35) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="2" stroke-dasharray="6 5"/>`;
const sheen = (d: string) => `<path d="${d}" fill="url(#sheen)"/>`;
const snap = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="7" fill="url(#metal)" stroke="#333" stroke-opacity=".4"/>`;
const star = (cx: number, cy: number, r: number, fill: string) => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return `<path d="${d}Z" fill="${fill}"/>`;
};

/* ----------------------------------------------------------------- drawings */

type Draw = (o: Required<Pick<ArtOpts, "color" | "accent">> & ArtOpts, fill: string) => string;

const DRAW: Record<Kind, Draw> = {
  helmet: (o, fill) => {
    const c = o.color;
    if (o.variant === "stahlhelm") {
      const d = "M250,330 C250,190 550,190 550,330 L560,360 C580,380 620,392 640,405 C560,420 480,410 400,410 C320,410 240,420 160,405 C180,392 220,380 240,360 Z";
      return `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#speckle)"/>${sheen(d)}
        <path d="M240,360 C320,375 480,375 560,360" stroke="${shade(c, -0.35)}" stroke-width="5" fill="none"/>
        <circle cx="290" cy="300" r="10" fill="${shade(c, -0.3)}"/><circle cx="290" cy="300" r="5" fill="${shade(c, 0.2)}"/>
        <ellipse cx="350" cy="250" rx="70" ry="28" fill="#fff" opacity=".12" transform="rotate(-18 350 250)"/>
        <path d="M265,390 Q400,500 535,390" stroke="#4b3622" stroke-width="9" fill="none"/>`;
    }
    if (o.variant === "brodie") {
      const brim = "M150,350 C220,300 580,300 650,350 C600,395 200,395 150,350 Z";
      const dome = "M285,345 C280,230 520,230 515,345 Z";
      return `<path d="${brim}" fill="${shade(c, -0.12)}"/><path d="${brim}" fill="url(#speckle)"/>
        <path d="${dome}" fill="${fill}"/><path d="${dome}" fill="url(#speckle)"/>${sheen(dome)}
        <path d="M150,350 C200,392 600,392 650,350" stroke="${shade(c, -0.4)}" stroke-width="4" fill="none"/>
        <circle cx="400" cy="250" r="7" fill="${shade(c, -0.35)}"/>
        <ellipse cx="350" cy="275" rx="50" ry="18" fill="#fff" opacity=".13" transform="rotate(-15 350 275)"/>
        <path d="M300,380 Q400,470 500,380" stroke="#6b5332" stroke-width="9" fill="none"/>`;
    }
    const dome = "M220,365 C215,175 585,175 580,365 Z";
    const brim = "M175,362 C260,385 540,385 625,362 C640,378 615,395 590,398 C460,425 340,425 210,398 C185,395 160,378 175,362 Z";
    return `<path d="M250,385 Q400,500 550,385" stroke="#b39a62" stroke-width="12" fill="none"/>
      <rect x="388" y="455" width="24" height="18" rx="3" fill="url(#metal)"/>
      <path d="${dome}" fill="${fill}"/><path d="${dome}" fill="url(#speckle)"/>${sheen(dome)}
      <path d="${brim}" fill="${shade(c, -0.08)}"/><path d="${brim}" fill="url(#speckle)"/>
      <path d="M190,372 C300,398 500,398 610,372" stroke="${shade(c, -0.45)}" stroke-width="5" fill="none"/>
      <ellipse cx="330" cy="250" rx="80" ry="30" fill="#fff" opacity=".13" transform="rotate(-25 330 250)"/>
      ${o.text ? `<text x="400" y="300" font-family="Impact,Arial Black,sans-serif" font-size="46" fill="${o.accent}" text-anchor="middle" opacity=".9">${o.text}</text>` : ""}`;
  },

  jacket: (o, fill) => {
    const c = o.color;
    const body = "M300,165 L362,145 Q400,170 438,145 L500,165 L585,225 L625,440 L572,452 L545,300 L542,480 L258,480 L255,300 L228,452 L175,440 L215,225 Z";
    const pocket = (x: number, y: number, w: number, h: number) => `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${shade(c, -0.35)}" stroke-width="2"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="url(#twill)"/>
      <path d="M${x - 3},${y - 4} h${w + 6} v${h * 0.32} q-${(w + 6) / 2},10 -${w + 6},0 z" fill="${shade(c, -0.08)}" stroke="${shade(c, -0.4)}" stroke-width="2"/>
      ${stitch(`M${x + 4},${y + 4} h${w - 8}`)}${snap(x + w / 2, y + h * 0.26)}`;
    return `<path d="${body}" fill="${fill}"/><path d="${body}" fill="url(#twill)"/>${sheen(body)}
      ${stitch("M262,470 H538")}${stitch("M232,440 L210,232")}${stitch("M568,440 L590,232")}
      <path d="M362,145 L400,205 L438,145 L428,132 Q400,152 372,132 Z" fill="${shade(c, -0.18)}" stroke="${shade(c, -0.45)}" stroke-width="2"/>
      <path d="M372,132 Q400,118 428,132" stroke="${shade(c, -0.3)}" stroke-width="10" fill="none"/>
      <line x1="400" y1="205" x2="400" y2="480" stroke="${shade(c, -0.5)}" stroke-width="5"/>
      <line x1="400" y1="205" x2="400" y2="480" stroke="url(#metal)" stroke-width="2" stroke-dasharray="3 3"/>
      ${pocket(305, 238, 74, 62)}${pocket(421, 238, 74, 62)}${pocket(292, 352, 86, 86)}${pocket(422, 352, 86, 86)}
      <rect x="421" y="218" width="74" height="15" fill="#2d2a1c" opacity=".85"/>
      <text x="458" y="230" font-family="Arial Black,Arial,sans-serif" font-size="11" fill="#e8dcae" text-anchor="middle" letter-spacing="1">${o.text ?? "U.S. ARMY"}</text>
      <path d="M180,436 L225,446" stroke="${shade(c, -0.4)}" stroke-width="7"/><path d="M575,446 L620,436" stroke="${shade(c, -0.4)}" stroke-width="7"/>
      ${o.variant === "flag" ? `<rect x="215" y="245" width="38" height="24" fill="#fff"/><rect x="215" y="245" width="38" height="24" fill="url(#flagstripes)"/><rect x="215" y="245" width="16" height="12" fill="#2a3a66"/>` : ""}
      ${o.variant === "flag-de" ? `<rect x="215" y="245" width="38" height="8" fill="#111"/><rect x="215" y="253" width="38" height="8" fill="#c8102e"/><rect x="215" y="261" width="38" height="8" fill="#f2c200"/>` : ""}
      ${o.variant === "rank" ? `<path d="M222,262 l16,-10 l16,10 M222,272 l16,-10 l16,10 M222,282 l16,-10 l16,10" stroke="${o.accent}" stroke-width="4" fill="none"/>` : ""}`;
  },

  trousers: (o, fill) => {
    const c = o.color;
    const d = "M300,130 L500,130 L520,480 L425,480 L400,250 L375,480 L280,480 Z";
    const pocket = (x: number) => `<rect x="${x}" y="270" width="62" height="78" rx="5" fill="${fill}" stroke="${shade(c, -0.35)}" stroke-width="2"/><rect x="${x}" y="270" width="62" height="78" rx="5" fill="url(#twill)"/><path d="M${x - 3},266 h68 v24 q-34,8 -68,0z" fill="${shade(c, -0.1)}" stroke="${shade(c, -0.4)}" stroke-width="2"/>${snap(x + 31, 282)}`;
    return `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#twill)"/>${sheen(d)}
      <rect x="296" y="120" width="208" height="30" rx="4" fill="${shade(c, -0.15)}" stroke="${shade(c, -0.4)}" stroke-width="2"/>
      ${[318, 362, 438, 482].map((x) => `<rect x="${x - 5}" y="116" width="10" height="38" rx="2" fill="${shade(c, -0.25)}"/>`).join("")}
      <circle cx="400" cy="135" r="6" fill="url(#metal)"/>
      <path d="M400,150 V245" stroke="${shade(c, -0.45)}" stroke-width="3"/>
      ${stitch("M330,160 C340,190 345,210 340,240")}${stitch("M470,160 C460,190 455,210 460,240")}
      ${pocket(285)}${pocket(453)}
      <path d="M282,470 h94 M424,470 h94" stroke="${shade(c, -0.4)}" stroke-width="6"/>
      ${stitch("M290,455 h80 M430,455 h80")}`;
  },

  cap: (o, fill) => {
    const c = o.color;
    const crown = "M250,330 C250,230 300,200 400,200 C500,200 550,230 550,330 Z";
    return `<path d="M230,330 C300,345 500,345 570,330 C575,350 560,360 540,360 L260,360 C240,360 225,350 230,330Z" fill="${shade(c, -0.15)}"/>
      <path d="${crown}" fill="${fill}"/><path d="${crown}" fill="url(#twill)"/>${sheen(crown)}
      ${stitch("M300,215 C330,260 330,300 320,330")}${stitch("M500,215 C470,260 470,300 480,330")}${stitch("M400,200 V330")}
      <path d="M330,345 C380,420 520,430 610,390 C600,370 560,355 540,355 Z" fill="${shade(c, -0.1)}"/>
      ${stitch("M350,362 C400,410 520,415 590,388")}
      ${o.text ? `<rect x="345" y="245" width="110" height="34" rx="3" fill="#1d1d18"/><text x="400" y="269" font-family="Arial Black,Arial" font-size="16" fill="${o.accent}" text-anchor="middle">${o.text}</text>` : star(400, 265, 26, o.accent)}`;
  },

  beret: (o, fill) => {
    const c = o.color;
    const d = "M205,325 C215,200 420,185 560,215 C640,232 640,300 600,335 C540,375 300,380 205,325 Z";
    return `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#speckle)" opacity=".5"/>${sheen(d)}
      <path d="M215,330 C300,382 530,380 600,338 L598,360 C530,404 300,405 214,352 Z" fill="#2b1d12"/>
      ${stitch("M222,354 C300,398 530,396 594,358", "#d9c38f", 0.6)}
      <path d="M560,370 q20,30 0,55" stroke="#2b1d12" stroke-width="5" fill="none"/>
      <g transform="translate(292 268)">
        <path d="M0,-42 L32,-28 L32,8 C32,30 16,42 0,50 C-16,42 -32,30 -32,8 L-32,-28 Z" fill="${o.accent === "#000" ? "url(#metal)" : "url(#brass)"}" stroke="#4a3610" stroke-width="2"/>
        ${star(0, 2, 20, "#5a4210")}
      </g>`;
  },

  webbing: (o, fill) => {
    const c = o.color;
    const pouch = (x: number) => `
      <rect x="${x}" y="300" width="120" height="140" rx="12" fill="${fill}"/><rect x="${x}" y="300" width="120" height="140" rx="12" fill="url(#twill)"/>${sheen(`M${x},312 a12,12 0 0 1 12,-12 h96 a12,12 0 0 1 12,12 v116 a12,12 0 0 1 -12,12 h-96 a12,12 0 0 1 -12,-12 z`)}
      <path d="M${x - 4},292 h128 v58 q-64,18 -128,0 z" fill="${shade(c, -0.1)}" stroke="${shade(c, -0.4)}" stroke-width="2"/>
      ${stitch(`M${x + 6},300 h108`)}${stitch(`M${x + 8},430 h104`)}
      <rect x="${x + 50}" y="338" width="20" height="14" rx="3" fill="url(#metal)"/>`;
    return `<path d="M290,150 L330,365 M510,150 L470,365 M330,150 Q400,120 470,150" stroke="${shade(c, -0.12)}" stroke-width="34" fill="none" stroke-linecap="round"/>
      <path d="M290,150 L330,365 M510,150 L470,365" stroke="url(#twill)" stroke-width="34" fill="none"/>
      <rect x="300" y="220" width="24" height="14" fill="url(#metal)"/><rect x="476" y="220" width="24" height="14" fill="url(#metal)"/>
      <rect x="120" y="358" width="560" height="44" rx="8" fill="${fill}"/><rect x="120" y="358" width="560" height="44" rx="8" fill="url(#twill)"/>
      ${Array.from({ length: 14 }, (_, i) => `<circle cx="${140 + i * 40}" cy="${i % 2 ? 372 : 388}" r="3.5" fill="url(#metal)" stroke="#333" stroke-opacity=".4"/>`).join("")}
      <rect x="370" y="352" width="60" height="56" rx="6" fill="url(#metal)" stroke="#444" stroke-opacity=".5"/>
      ${pouch(205)}${pouch(475)}`;
  },

  canteen: (o, fill) => {
    const c = o.color;
    const cover = "M300,210 C300,180 500,180 500,210 L520,420 C520,470 280,470 280,420 Z";
    return `<rect x="370" y="150" width="60" height="48" rx="10" fill="#222"/><rect x="374" y="154" width="52" height="10" rx="4" fill="#3d3d3d"/>
      <path d="M430,175 q40,0 40,40" stroke="#555" stroke-width="5" fill="none"/>
      <path d="${cover}" fill="${fill}"/><path d="${cover}" fill="url(#speckle)" opacity=".6"/>${sheen(cover)}
      ${stitch("M310,215 C310,195 490,195 490,215 L508,418 C508,455 292,455 292,418 Z")}
      <path d="M296,205 C296,240 504,240 504,205 L504,250 C470,268 330,268 296,250 Z" fill="${shade(c, -0.12)}"/>
      ${snap(345, 238)}${snap(455, 238)}
      <path d="M330,215 v-35 h20 v35 M450,215 v-35 h20 v35" stroke="url(#metal)" stroke-width="6" fill="none"/>
      <text x="400" y="360" font-family="Impact,Arial Black,sans-serif" font-size="44" fill="${shade(c, -0.45)}" text-anchor="middle" letter-spacing="4">${o.text ?? "U.S."}</text>`;
  },

  rucksack: (o, fill) => {
    const c = o.color;
    const body = "M255,170 C255,150 545,150 545,170 L560,450 C560,480 240,480 240,450 Z";
    const pocket = (x: number, w: number) => `<rect x="${x}" y="335" width="${w}" height="120" rx="14" fill="${shade(c, -0.05)}" stroke="${shade(c, -0.4)}" stroke-width="2"/><rect x="${x}" y="335" width="${w}" height="120" rx="14" fill="url(#twill)"/><path d="M${x - 2},328 h${w + 4} v34 q-${(w + 4) / 2},12 -${w + 4},0z" fill="${shade(c, -0.15)}"/><rect x="${x + w / 2 - 4}" y="340" width="8" height="70" fill="${shade(c, -0.3)}"/><rect x="${x + w / 2 - 11}" y="398" width="22" height="16" rx="3" fill="url(#metal)"/>`;
    return `<rect x="232" y="140" width="336" height="350" rx="20" fill="none" stroke="url(#metal)" stroke-width="10"/>
      <path d="${body}" fill="${fill}"/><path d="${body}" fill="url(#twill)"/>${sheen(body)}
      <path d="M250,165 C250,140 550,140 550,165 L555,285 C470,310 330,310 245,285 Z" fill="${shade(c, -0.12)}" stroke="${shade(c, -0.42)}" stroke-width="2"/>
      ${stitch("M258,280 C340,302 460,302 545,280")}
      <rect x="318" y="270" width="12" height="80" fill="${shade(c, -0.35)}"/><rect x="470" y="270" width="12" height="80" fill="${shade(c, -0.35)}"/>
      <rect x="312" y="300" width="24" height="18" rx="3" fill="url(#metal)"/><rect x="464" y="300" width="24" height="18" rx="3" fill="url(#metal)"/>
      ${pocket(258, 82)}${pocket(359, 82)}${pocket(460, 82)}`;
  },

  duffel: (o, fill) => {
    const c = o.color;
    const d = "M180,250 C180,220 620,220 620,250 L620,420 C620,450 180,450 180,420 Z";
    return `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#twill)"/>${sheen(d)}
      <ellipse cx="180" cy="335" rx="34" ry="86" fill="${shade(c, -0.18)}"/><ellipse cx="620" cy="335" rx="34" ry="86" fill="${shade(c, 0.05)}"/>
      ${Array.from({ length: 8 }, (_, i) => `<circle cx="${250 + i * 45}" cy="232" r="6" fill="url(#metal)"/>`).join("")}
      <path d="M260,230 C300,120 500,120 540,230" stroke="${shade(c, -0.3)}" stroke-width="22" fill="none"/>
      <text x="400" y="355" font-family="Impact,Arial Black,sans-serif" font-size="40" fill="#1b1b14" text-anchor="middle" opacity=".75" letter-spacing="3">${o.text ?? "SMITH J 4417"}</text>`;
  },

  patch: (o) => {
    const c = o.color;
    const v = o.variant ?? "shield";
    const shape =
      v === "circle" ? "M400,165 a150,150 0 1 1 -0.1,0 Z"
        : v === "arrow" ? "M400,150 L540,250 L540,450 L260,450 L260,250 Z"
          : "M270,170 L530,170 L530,330 C530,410 470,450 400,470 C330,450 270,410 270,330 Z";
    const inner =
      v === "circle" ? `${star(400, 315, 85, o.accent)}`
        : v === "arrow" ? `<path d="M400,215 L470,330 L425,330 L455,420 L360,300 L405,300 L370,215 Z" fill="${o.accent}"/>`
          : `<path d="M330,245 L400,305 L470,245 M330,295 L400,355 L470,295" stroke="${o.accent}" stroke-width="22" fill="none"/>`;
    return `${o.text ? `<path d="M265,108 Q400,70 535,108 L535,148 Q400,112 265,148 Z" fill="#1d1f17" stroke="${o.accent}" stroke-width="5"/><text x="400" y="134" font-family="Arial Black,Arial" font-size="26" fill="${o.accent}" text-anchor="middle" letter-spacing="3">${o.text}</text>` : ""}
      <path d="${shape}" fill="${c}" stroke="${shade(c, -0.5)}" stroke-width="14"/>
      <path d="${shape}" fill="url(#twill)"/>
      <path d="${shape}" fill="none" stroke="${o.accent}" stroke-width="5" stroke-dasharray="3 4" opacity=".8"/>
      ${inner}`;
  },

  medal: (o) => {
    const stripes = (o.camo ?? ["#7a1420", "#ffffff", "#1d3a6e", "#ffffff", "#7a1420"]);
    const w = 150 / stripes.length;
    const metal = o.variant === "bronze" ? "url(#bronze)" : o.variant === "silver" ? "url(#metal)" : "url(#brass)";
    const body =
      o.text === "cross"
        ? `<path d="M400,300 L430,330 L470,320 L460,360 L490,390 L460,420 L470,460 L430,450 L400,480 L370,450 L330,460 L340,420 L310,390 L340,360 L330,320 L370,330 Z" fill="${metal}" stroke="#3e2c0c" stroke-width="2"/><circle cx="400" cy="390" r="34" fill="${metal}" stroke="#3e2c0c" stroke-width="2"/>${star(400, 390, 22, "rgba(60,40,10,.55)")}`
        : `<circle cx="400" cy="395" r="88" fill="${metal}" stroke="#3e2c0c" stroke-width="3"/><circle cx="400" cy="395" r="70" fill="none" stroke="#3e2c0c" stroke-opacity=".45" stroke-width="3"/>${star(400, 395, 50, "rgba(60,40,10,.45)")}`;
    return `<clipPath id="rib"><path d="M325,110 H475 V250 L400,282 L325,250 Z"/></clipPath>
      <g clip-path="url(#rib)">${stripes.map((s, i) => `<rect x="${325 + i * w}" y="110" width="${w + 0.5}" height="180" fill="${s}"/>`).join("")}<rect x="325" y="110" width="150" height="180" fill="url(#twill)"/></g>
      <path d="M325,110 H475 V250 L400,282 L325,250 Z" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
      <rect x="318" y="100" width="164" height="16" rx="4" fill="${metal}"/>
      <rect x="385" y="270" width="30" height="30" rx="6" fill="${metal}"/>${body}`;
  },

  binoculars: (o, fill) => {
    const c = o.color;
    const barrel = (x: number) => `
      <rect x="${x}" y="215" width="120" height="235" rx="38" fill="${fill}"/><rect x="${x}" y="215" width="120" height="235" rx="38" fill="url(#speckle)"/>
      <rect x="${x}" y="215" width="120" height="235" rx="38" fill="url(#sheen)"/>
      <rect x="${x + 22}" y="160" width="76" height="70" rx="14" fill="#1d1d1a"/>
      ${Array.from({ length: 5 }, (_, i) => `<rect x="${x + 22}" y="${168 + i * 12}" width="76" height="4" fill="#3a3a35"/>`).join("")}
      <ellipse cx="${x + 60}" cy="450" rx="58" ry="20" fill="#14181c"/><ellipse cx="${x + 60}" cy="448" rx="44" ry="13" fill="#2a4a62"/><ellipse cx="${x + 45}" cy="445" rx="14" ry="5" fill="#a9d1ea" opacity=".7"/>`;
    return `<path d="M250,300 Q200,380 220,500" stroke="#3b2a1a" stroke-width="9" fill="none"/>
      ${barrel(255)}${barrel(425)}
      <rect x="370" y="245" width="60" height="70" rx="12" fill="${shade(c, -0.3)}"/><circle cx="400" cy="235" r="20" fill="#222"/><circle cx="400" cy="235" r="8" fill="url(#metal)"/>
      <rect x="370" y="350" width="60" height="45" rx="10" fill="${shade(c, -0.3)}"/>
      <text x="315" y="345" font-family="Arial Black,Arial" font-size="18" fill="#f1e9cf" text-anchor="middle" opacity=".7">${o.text ?? "7x50"}</text>`;
  },

  compass: () => `
      <path d="M260,215 h280 l-8,-110 h-264 z" fill="#4c5a33"/><path d="M290,200 h220 l-6,-82 h-208z" fill="#26301a"/>
      <line x1="300" y1="160" x2="500" y2="160" stroke="#c9c9c0" stroke-width="2"/><line x1="400" y1="118" x2="400" y2="200" stroke="#c9c9c0" stroke-width="3"/>
      <circle cx="400" cy="345" r="150" fill="#4c5a33"/><circle cx="400" cy="345" r="150" fill="url(#speckle)"/><circle cx="400" cy="345" r="150" fill="url(#sheen)"/>
      <circle cx="400" cy="345" r="122" fill="#1a1d17" stroke="url(#metal)" stroke-width="10"/>
      ${Array.from({ length: 72 }, (_, i) => { const a = (i * 5 * Math.PI) / 180; const r1 = 112, r2 = i % 6 ? 104 : 96; return `<line x1="${400 + Math.sin(a) * r1}" y1="${345 - Math.cos(a) * r1}" x2="${400 + Math.sin(a) * r2}" y2="${345 - Math.cos(a) * r2}" stroke="#e8e4cf" stroke-width="${i % 6 ? 1.5 : 3}"/>`; }).join("")}
      ${["N", "E", "S", "W"].map((t, i) => { const a = (i * 90 * Math.PI) / 180; return `<text x="${400 + Math.sin(a) * 76}" y="${345 - Math.cos(a) * 76 + 10}" font-family="Arial Black,Arial" font-size="30" fill="${t === "N" ? "#e05a3c" : "#e8e4cf"}" text-anchor="middle">${t}</text>`; }).join("")}
      <path d="M400,270 L414,345 L400,420 L386,345 Z" fill="#e8e4cf"/><path d="M400,270 L414,345 L386,345 Z" fill="#c8402c"/><circle cx="400" cy="345" r="9" fill="url(#brass)"/>
      <ellipse cx="350" cy="290" rx="60" ry="22" fill="#fff" opacity=".1" transform="rotate(-30 350 290)"/>
      <path d="M545,330 a28,28 0 1 1 0.1,0" fill="none" stroke="url(#metal)" stroke-width="9"/>`,

  radio: (o, fill) => {
    const c = o.color;
    return `<line x1="520" y1="210" x2="610" y2="40" stroke="#222" stroke-width="7" stroke-linecap="round"/>
      <rect x="250" y="190" width="320" height="270" rx="16" fill="${fill}"/><rect x="250" y="190" width="320" height="270" rx="16" fill="url(#speckle)"/><rect x="250" y="190" width="320" height="270" rx="16" fill="url(#sheen)"/>
      <rect x="275" y="215" width="270" height="105" rx="8" fill="${shade(c, -0.35)}"/>
      <rect x="295" y="235" width="140" height="46" rx="4" fill="#d8c88a"/><text x="365" y="266" font-family="Courier New,monospace" font-size="24" fill="#2b2410" text-anchor="middle">${o.text ?? "47.50"}</text>
      ${[460, 510].map((x) => `<circle cx="${x}" cy="258" r="22" fill="#1b1b18"/><circle cx="${x}" cy="258" r="14" fill="#33332e"/><line x1="${x}" y1="246" x2="${x}" y2="258" stroke="#ddd" stroke-width="3"/>`).join("")}
      ${[300, 360, 420].map((x) => `<circle cx="${x}" cy="370" r="18" fill="#1b1b18"/><circle cx="${x}" cy="370" r="7" fill="url(#metal)"/>`).join("")}
      <rect x="470" y="345" width="70" height="80" rx="6" fill="${shade(c, -0.3)}"/>${Array.from({ length: 6 }, (_, i) => `<line x1="478" y1="${355 + i * 12}" x2="532" y2="${355 + i * 12}" stroke="#111" stroke-width="4"/>`).join("")}
      <path d="M140,300 C130,250 170,215 200,240 L215,265 C200,280 195,330 215,360 L200,385 C165,400 145,350 140,300 Z" fill="#1d1d1a"/>
      <path d="M210,360 C230,420 220,450 250,420" stroke="#1d1d1a" stroke-width="6" fill="none" stroke-dasharray="1 0"/>
      ${Array.from({ length: 10 }, (_, i) => `<circle cx="${212 + i * 4}" cy="${368 + Math.sin(i) * 10 + i * 5}" r="6" fill="none" stroke="#1d1d1a" stroke-width="3"/>`).join("")}`;
  },

  knife: (o, fill) => {
    const c = o.color;
    const leather = Array.from({ length: 12 }, (_, i) => `<rect x="${430 + i * 14}" y="${282}" width="14" height="36" fill="${i % 3 === 2 ? "#3a2414" : i % 2 ? "#8a5a32" : "#a46d3c"}"/>`).join("");
    return `<g transform="rotate(-18 400 300)">
      <path d="M150,330 L420,312 L420,348 L150,345 Q120,338 150,330Z" fill="${fill}"/><path d="M150,330 L420,312 L420,348 L150,345 Z" fill="url(#twill)"/>
      ${stitch("M165,336 L410,324")}<rect x="380" y="306" width="40" height="48" rx="5" fill="url(#metal)"/>
      <path d="M110,250 L400,232 L400,268 L140,268 Q95,262 110,250Z" fill="url(#metal)"/>
      <path d="M150,252 L390,240" stroke="#7a7c75" stroke-width="5"/>
      <rect x="398" y="216" width="22" height="68" rx="4" fill="url(#metal)"/>
      <g transform="translate(0 -62)">${leather}</g>
      <path d="M598,218 h36 q10,0 10,10 v24 q0,10 -10,10 h-36 z" fill="url(#metal)"/>
      <rect x="420" y="352" width="10" height="70" rx="4" fill="${shade(c, -0.25)}" transform="rotate(10 425 352)"/>
    </g>`;
  },

  shovel: (o, fill) => `
      <g transform="rotate(28 400 300)">
      <path d="M330,330 L470,330 L470,470 Q400,540 330,470 Z" fill="${fill}"/><path d="M330,330 L470,330 L470,470 Q400,540 330,470 Z" fill="url(#speckle)"/><path d="M330,330 L470,330 L470,470 Q400,540 330,470 Z" fill="url(#sheen)"/>
      <rect x="375" y="300" width="50" height="38" rx="6" fill="${shade(o.color, -0.3)}"/><circle cx="400" cy="318" r="12" fill="url(#metal)"/>
      <rect x="385" y="70" width="30" height="240" rx="8" fill="#6a4a2a"/><rect x="385" y="70" width="30" height="240" rx="8" fill="url(#sheen)"/>
      <path d="M350,70 h100 v-30 q-50,-30 -100,0 z" fill="${shade(o.color, -0.2)}"/>
      </g>`,

  tent: (o, fill) => {
    const c = o.color;
    return `<line x1="400" y1="140" x2="400" y2="470" stroke="#5a3e22" stroke-width="10"/>
      <path d="M400,150 L140,470 L660,470 Z" fill="${fill}"/><path d="M400,150 L140,470 L660,470 Z" fill="url(#twill)"/>
      <path d="M400,150 L320,470 L480,470 Z" fill="#000" opacity=".28"/>
      ${stitch("M400,160 L150,465")}${stitch("M400,160 L650,465")}
      <path d="M400,150 L100,400 M400,150 L700,400" stroke="#d9cfae" stroke-width="2"/>
      ${[[140, 470], [660, 470], [100, 400], [700, 400]].map(([x, y]) => `<path d="M${x},${y} l-8,30 h16 z" fill="#777"/>`).join("")}
      <circle cx="400" cy="150" r="8" fill="url(#metal)"/>
      ${Array.from({ length: 8 }, (_, i) => `<circle cx="${170 + i * 66}" cy="462" r="4" fill="url(#metal)"/>`).join("")}`;
  },

  document: (o) => {
    const v = o.variant ?? "manual";
    if (v === "map")
      return `<g transform="rotate(-4 400 300)">
        <rect x="170" y="120" width="460" height="360" fill="#ece3c4"/>
        ${Array.from({ length: 9 }, (_, i) => `<line x1="${170 + i * 57.5}" y1="120" x2="${170 + i * 57.5}" y2="480" stroke="#7a8fb0" stroke-width="1.5"/>`).join("")}
        ${Array.from({ length: 7 }, (_, i) => `<line x1="170" y1="${120 + i * 60}" x2="630" y2="${120 + i * 60}" stroke="#7a8fb0" stroke-width="1.5"/>`).join("")}
        ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="460" cy="250" rx="${22 + i * 26}" ry="${14 + i * 17}" transform="rotate(-20 460 250)" stroke="#9a6d3a" stroke-width="${i % 3 === 2 ? 3 : 1.6}" fill="none" opacity=".8"/>`).join("")}
        ${Array.from({ length: 4 }, (_, i) => `<ellipse cx="270" cy="330" rx="${18 + i * 22}" ry="${12 + i * 14}" transform="rotate(25 270 330)" stroke="#9a6d3a" stroke-width="1.6" fill="none" opacity=".7"/>`).join("")}
        <path d="M200,250 L330,270 L380,350 L560,360" stroke="#c0392b" stroke-width="3" fill="none" stroke-dasharray="10 6"/>
        <path d="M170,400 C260,380 330,440 420,410 S560,380 630,420" stroke="#3a78b4" stroke-width="6" fill="none"/>
        <path d="M400,120 V480" stroke="#000" stroke-opacity=".15" stroke-width="3"/><path d="M170,300 H630" stroke="#000" stroke-opacity=".12" stroke-width="3"/>
        <rect x="190" y="135" width="190" height="38" fill="#fff" stroke="#333"/><text x="285" y="160" font-family="Courier New,monospace" font-size="15" fill="#222" text-anchor="middle">${o.text ?? "SHEET 6542 IV"}</text>
      </g>`;
    if (v === "photo")
      return `<g transform="rotate(5 400 300)"><rect x="230" y="110" width="340" height="390" fill="#f5f0e2"/><rect x="250" y="130" width="300" height="300" fill="#57524a"/>
        <rect x="250" y="130" width="300" height="300" fill="url(#speckle)"/>
        ${[310, 400, 490].map((x, i) => `<circle cx="${x}" cy="${250 + (i % 2) * 8}" r="26" fill="#2c2924"/><path d="M${x - 40},${430} C${x - 40},${310} ${x + 40},${310} ${x + 40},${430} Z" fill="#35312b"/><path d="M${x - 30},${238 + (i % 2) * 8} q30,-28 60,0 z" fill="#46413a"/>`).join("")}
        <text x="400" y="475" font-family="Brush Script MT,cursive" font-size="26" fill="#3a3a52" text-anchor="middle">${o.text ?? "Normandy, 1944"}</text></g>`;
    return `<rect x="250" y="140" width="300" height="370" fill="#d8cfb0" transform="rotate(6 400 325)"/>
      <rect x="250" y="130" width="300" height="370" fill="${o.color}"/><rect x="250" y="130" width="300" height="370" fill="url(#twill)"/>
      <rect x="250" y="130" width="22" height="370" fill="#000" opacity=".2"/>
      <text x="410" y="210" font-family="Courier New,monospace" font-size="26" fill="#111" text-anchor="middle" font-weight="bold">${o.text ?? "FM 21-76"}</text>
      ${Array.from({ length: 3 }, (_, i) => `<rect x="320" y="${245 + i * 22}" width="${180 - i * 30}" height="8" fill="#111" opacity=".55"/>`).join("")}
      ${star(410, 380, 40, "#111")}
      <g transform="rotate(-14 420 455)"><rect x="330" y="430" width="180" height="46" fill="none" stroke="#b3241b" stroke-width="5"/><text x="420" y="464" font-family="Arial Black,Arial" font-size="26" fill="#b3241b" text-anchor="middle" letter-spacing="2">RESTRICTED</text></g>`;
  },

  gasmask: (o, fill) => {
    const c = o.color;
    const face = "M300,170 C360,140 440,140 500,170 C560,210 560,330 520,400 C490,450 310,450 280,400 C240,330 240,210 300,170 Z";
    return `<path d="M300,175 C240,130 560,130 500,175" stroke="#2b2b26" stroke-width="16" fill="none"/>
      <path d="${face}" fill="${fill}"/><path d="${face}" fill="url(#speckle)"/>${sheen(face)}
      ${[340, 460].map((x) => `<circle cx="${x}" cy="260" r="50" fill="url(#metal)"/><circle cx="${x}" cy="260" r="40" fill="#1e2a30"/><ellipse cx="${x - 12}" cy="248" rx="14" ry="8" fill="#9cc3d6" opacity=".55"/>`).join("")}
      <path d="M360,350 h80 l14,40 h-108 z" fill="${shade(c, -0.3)}"/>
      <rect x="350" y="385" width="100" height="110" rx="20" fill="#3c4033"/><rect x="350" y="385" width="100" height="110" rx="20" fill="url(#sheen)"/>
      ${Array.from({ length: 5 }, (_, i) => `<rect x="350" y="${400 + i * 18}" width="100" height="5" fill="#2a2d24"/>`).join("")}`;
  },

  boots: (o, fill) => {
    const c = o.color;
    const boot = (dx: number) => `<g transform="translate(${dx} 0)">
      <path d="M300,140 L400,140 L405,360 C470,370 540,390 545,440 L545,460 L280,460 L282,330 Z" fill="${fill}"/><path d="M300,140 L400,140 L405,360 C470,370 540,390 545,440 L545,460 L280,460 L282,330 Z" fill="url(#sheen)"/>
      <path d="M270,460 h285 v22 q0,10 -10,10 h-265 q-10,0 -10,-10 z" fill="#1a1a17"/>
      ${Array.from({ length: 7 }, (_, i) => `<line x1="${380}" y1="${170 + i * 26}" x2="${405}" y2="${182 + i * 26}" stroke="#ddd3b6" stroke-width="3"/>`).join("")}
      ${stitch("M300,330 C380,340 450,360 520,400", "#000", 0.5)}</g>`;
    return `${boot(-90)}<g opacity=".93">${boot(70)}</g>`;
  },

  messkit: (o) => `
      <ellipse cx="400" cy="320" rx="190" ry="140" fill="url(#metal)"/><ellipse cx="400" cy="320" rx="170" ry="122" fill="#b9bab2"/><ellipse cx="400" cy="320" rx="170" ry="122" fill="url(#sheen)"/>
      <path d="M260,320 Q400,240 540,320" stroke="#888" stroke-width="3" fill="none"/>
      <rect x="560" y="300" width="160" height="34" rx="12" fill="url(#metal)" transform="rotate(-10 560 300)"/>
      <text x="400" y="340" font-family="Arial Black,Arial" font-size="26" fill="#6a6b64" text-anchor="middle" opacity=".7">${o.text ?? "U.S. 1945"}</text>`,
};

/* ----------------------------------------------------------------- public */

export function art(kind: Kind, opts: ArtOpts): { main: string; detail: string; label: string } {
  const o = { color: "#556b2f", accent: "#e3c25a", bg: "canvas" as const, ...opts };
  const defs =
    (o.camo && kind !== "medal" ? camoPattern("camo", o.camo, o.seed ?? 3) : "") +
    `<pattern id="flagstripes" width="38" height="24" patternUnits="userSpaceOnUse">${Array.from({ length: 6 }, (_, i) => `<rect y="${i * 4}" width="38" height="2" fill="#b22234"/>`).join("")}</pattern>`;
  const fill = o.camo && kind !== "medal" ? "url(#camo)" : o.color;
  const inner = DRAW[kind](o, fill);
  const main = frame(inner, defs, o.bg);
  const detail = frame(inner, defs, o.bg, "220 150 360 270");

  const lines = o.label
    .map((t, i) => `<text x="400" y="${248 + i * 36}" font-family="Courier New,monospace" font-size="${i === 0 ? 25 : 21}" font-weight="${i === 0 ? "bold" : "normal"}" fill="#1c1c18" text-anchor="middle">${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`)
    .join("");
  const h = 80 + o.label.length * 36;
  const labelInner = `<rect x="215" y="${300 - h / 2 - 10}" width="370" height="${h}" fill="#efe9d6" stroke="#9a9078" stroke-width="2"/>
    <rect x="215" y="${300 - h / 2 - 10}" width="370" height="${h}" fill="url(#weave)"/>
    ${stitch(`M227,${300 - h / 2} h346 v${h - 20} h-346 z`, "#6b6350", 0.6)}
    <g transform="translate(0 ${300 - h / 2 - 10 - 200 + 10})">${lines}</g>`;
  const labelBg = frame("", defs, o.bg, undefined, 1).replace(
    '<g filter="url(#shadow)"><g transform="translate(400 300) scale(1) translate(-400 -300)"></g></g>',
    `<rect x="-400" y="-300" width="1600" height="1200" fill="${fill}"/><rect x="-400" y="-300" width="1600" height="1200" fill="url(#twill)"/><g filter="url(#shadow)" transform="rotate(-3 400 300)">${labelInner}</g>`
  );
  return { main, detail, label: labelBg };
}
