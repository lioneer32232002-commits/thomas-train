// Track definitions
// Consistent rail geometry across all types:
//   R  = c / 2           (arc radius for curves)
//   W  = c * 0.12        (half-gauge — same as straight tracks)
// Curve centers are at the corner of the cell diagonally opposite the "bulge":
//   NE → top-right  corner  (x+c, y)
//   NW → top-left   corner  (x,   y)
//   SE → bot-right  corner  (x+c, y+c)
//   SW → bot-left   corner  (x,   y+c)

const TRACK_DEFS = {
  'straight-h': { connects: ['W','E'], draw: drawStraightH },
  'straight-v': { connects: ['N','S'], draw: drawStraightV },
  'curve-ne':   { connects: ['N','E'], draw: drawCurveNE },
  'curve-nw':   { connects: ['N','W'], draw: drawCurveNW },
  'curve-se':   { connects: ['S','E'], draw: drawCurveSE },
  'curve-sw':   { connects: ['S','W'], draw: drawCurveSW },
  'tunnel':     { connects: ['W','E'], draw: drawTunnel,   special: 'tunnel' },
  'bridge':     { connects: ['W','E'], draw: drawBridge,   special: 'bridge' },
  'station':    { connects: ['W','E'], draw: drawStation,  special: 'station' },
  'crossing':   { connects: ['W','E'], draw: drawCrossing, special: 'crossing' },
  'cross':      { connects: ['N','S','E','W'], draw: drawCross },
};

let grid = {};
let gridCols = 0;
let gridRows = 0;

function initGrid(cols, rows) { gridCols = cols; gridRows = rows; grid = {}; }
function getCell(row, col)     { return (grid[row] && grid[row][col]) || null; }
function setCell(row, col, type) {
  if (!grid[row]) grid[row] = {};
  if (type === null) delete grid[row][col];
  else grid[row][col] = { type };
}
function clearGrid() { grid = {}; }

// ── Drawing primitives ───────────────────────────────────────────────────────

const W_FRAC = 0.12; // half-gauge as fraction of c

// ── Biomes ───────────────────────────────────────────────────────────────────
// Each level group is set in a different climate. The biome drives the ground
// blocks, sky, clouds, ambient particles and background scenery.
let activeBiome = 'plains';
const BIOMES = {
  plains:  { sky:['#87CEEB','#B8E4F9'], base:'#6CAB3C', tuftL:'#7DC850', tuftD:'#5E9A30', dirt:'#5C3E2A', cloud:'#FFFFFF', ambient:'none'   },
  desert:  { sky:['#E8BE78','#F7E3B0'], base:'#E3C079', tuftL:'#EFD79A', tuftD:'#C9A24E', dirt:'#A07C3E', cloud:'#FBEFD0', ambient:'none'   },
  snow:    { sky:['#A9C7DD','#DCEBF5'], base:'#EAF2F7', tuftL:'#FFFFFF', tuftD:'#CBDBE7', dirt:'#9DB0BC', cloud:'#FFFFFF', ambient:'snow'   },
  jungle:  { sky:['#86C079','#BCE0A8'], base:'#3F7F33', tuftL:'#5FB04C', tuftD:'#2C5E22', dirt:'#3E2C18', cloud:'#E8F5DD', ambient:'leaves' },
  volcano: { sky:['#6E4040','#9A6450'], base:'#4A3B38', tuftL:'#6B4A40', tuftD:'#2A1F1D', dirt:'#241A18', cloud:'#7A5A50', glow:'#FF7A30', ambient:'ember' },
};
function getBiome() { return BIOMES[activeBiome] || BIOMES.plains; }

// A single Minecraft-style ground block (top view): biome base colour, checker
// shading, pixel tufts, and a faint block seam. Shared by the playfield + track beds.
function drawGroundBlock(ctx, x, y, c) {
  const b = getBiome();
  ctx.fillStyle = b.base;
  ctx.fillRect(x, y, c, c);
  // 2×2 checker shading
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(x, y, c / 2, c / 2);
  ctx.fillRect(x + c / 2, y + c / 2, c / 2, c / 2);
  const u = c / 8;
  ctx.fillStyle = b.tuftL;
  [[1,1],[3,2],[6,1],[2,5],[5,4],[7,6],[4,6],[6,3]].forEach(([gx,gy]) =>
    ctx.fillRect(x + gx*u, y + gy*u, u, u));
  ctx.fillStyle = b.tuftD;
  [[2,2],[5,1],[1,4],[7,3],[3,7],[6,6]].forEach(([gx,gy]) =>
    ctx.fillRect(x + gx*u, y + gy*u, u, u));
  // Volcano: a couple of glowing ember specks per block
  if (b.glow) {
    ctx.fillStyle = b.glow;
    [[4,2],[1,6]].forEach(([gx,gy]) => ctx.fillRect(x + gx*u, y + gy*u, u, u));
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, c - 1, c - 1);
}
// Back-compat alias (some callers still say grass)
function drawGrassBlock(ctx, x, y, c) { drawGroundBlock(ctx, x, y, c); }

function drawBed(ctx, x, y, c) {
  drawGroundBlock(ctx, x, y, c);
}

function drawStraightH(ctx, x, y, c) {
  const mid = y + c / 2, W = c * W_FRAC;
  drawBed(ctx, x, y, c);
  // Ballast
  ctx.fillStyle = '#7E5630';
  ctx.fillRect(x, mid - W * 1.8, c, W * 3.6);
  // Ties
  ctx.fillStyle = '#4A3019';
  for (let i = 0.07; i < 1; i += 0.19) {
    ctx.fillRect(x + c * i, mid - W * 1.8, c * 0.085, W * 3.6);
  }
  // Rails
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, mid - W); ctx.lineTo(x + c, mid - W); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, mid + W); ctx.lineTo(x + c, mid + W); ctx.stroke();
}

function drawStraightV(ctx, x, y, c) {
  const mid = x + c / 2, W = c * W_FRAC;
  drawBed(ctx, x, y, c);
  ctx.fillStyle = '#7E5630';
  ctx.fillRect(mid - W * 1.8, y, W * 3.6, c);
  ctx.fillStyle = '#4A3019';
  for (let i = 0.07; i < 1; i += 0.19) {
    ctx.fillRect(mid - W * 1.8, y + c * i, W * 3.6, c * 0.085);
  }
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(mid - W, y); ctx.lineTo(mid - W, y + c); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mid + W, y); ctx.lineTo(mid + W, y + c); ctx.stroke();
}

// A 4-way crossing where two straight rails intersect (lets tracks make a
// figure-8 — the cart passes straight through on each axis).
function drawCross(ctx, x, y, c) {
  const mid = y + c / 2, midx = x + c / 2, W = c * W_FRAC;
  drawBed(ctx, x, y, c);
  // Ballast both ways
  ctx.fillStyle = '#7E5630';
  ctx.fillRect(x, mid - W * 1.8, c, W * 3.6);
  ctx.fillRect(midx - W * 1.8, y, W * 3.6, c);
  // Ties both ways
  ctx.fillStyle = '#4A3019';
  for (let i = 0.07; i < 1; i += 0.19) {
    ctx.fillRect(x + c * i, mid - W * 1.8, c * 0.085, W * 3.6);
    ctx.fillRect(midx - W * 1.8, y + c * i, W * 3.6, c * 0.085);
  }
  // Rails both ways
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, mid - W); ctx.lineTo(x + c, mid - W); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, mid + W); ctx.lineTo(x + c, mid + W); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(midx - W, y); ctx.lineTo(midx - W, y + c); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(midx + W, y); ctx.lineTo(midx + W, y + c); ctx.stroke();
}

// Unified curve drawer
// cx,cy = arc center (cell corner); R = c/2
// aStart,aEnd = arc start/end angles; ccw = anticlockwise
function drawCurve(ctx, x, y, c, cx, cy, aStart, aEnd, ccw) {
  const W = c * W_FRAC, R = c / 2;
  drawBed(ctx, x, y, c);

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, c, c); ctx.clip();

  // Ballast arc
  ctx.strokeStyle = '#7E5630'; ctx.lineWidth = W * 3.6;
  ctx.beginPath(); ctx.arc(cx, cy, R, aStart, aEnd, ccw); ctx.stroke();

  // Ties (6 evenly spaced crosspieces)
  let span = aEnd - aStart;
  if (ccw)  { if (span > 0)  span -= 2 * Math.PI; }
  else       { if (span < 0)  span += 2 * Math.PI; }
  ctx.strokeStyle = '#4A3019'; ctx.lineWidth = c * 0.07;
  for (let i = 0; i <= 5; i++) {
    const a = aStart + span * (i / 5);
    ctx.beginPath();
    ctx.moveTo(cx + (R - W * 1.8) * Math.cos(a), cy + (R - W * 1.8) * Math.sin(a));
    ctx.lineTo(cx + (R + W * 1.8) * Math.cos(a), cy + (R + W * 1.8) * Math.sin(a));
    ctx.stroke();
  }

  // Rails
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, R - W, aStart, aEnd, ccw); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R + W, aStart, aEnd, ccw); ctx.stroke();

  ctx.restore();
}

// NE: top → right, bulge top-right, center = (x+c, y)
function drawCurveNE(ctx, x, y, c) {
  drawCurve(ctx, x, y, c, x + c, y,     Math.PI,     Math.PI / 2,   true);
}
// NW: top → left, bulge top-left, center = (x, y)
function drawCurveNW(ctx, x, y, c) {
  drawCurve(ctx, x, y, c, x,     y,     0,           Math.PI / 2,   false);
}
// SE: bottom → right, bulge bot-right, center = (x+c, y+c)
function drawCurveSE(ctx, x, y, c) {
  drawCurve(ctx, x, y, c, x + c, y + c, Math.PI,    -Math.PI / 2,   false);
}
// SW: bottom → left, bulge bot-left, center = (x, y+c)
function drawCurveSW(ctx, x, y, c) {
  drawCurve(ctx, x, y, c, x,     y + c, 0,          -Math.PI / 2,   true);
}

function drawTunnel(ctx, x, y, c) {
  drawStraightH(ctx, x, y, c);
  const W = c * W_FRAC;
  // Mountain
  ctx.fillStyle = '#78909C';
  ctx.beginPath();
  ctx.moveTo(x, y + c);
  ctx.lineTo(x, y + c * 0.38);
  ctx.quadraticCurveTo(x + c * 0.5, y - c * 0.08, x + c, y + c * 0.38);
  ctx.lineTo(x + c, y + c);
  ctx.fill();
  // Re-draw track on top of mountain base (so rails are visible)
  const mid = y + c / 2;
  ctx.fillStyle = '#7E5630';
  ctx.fillRect(x, mid - W * 1.8, c, W * 3.6);
  ctx.fillStyle = '#4A3019';
  for (let i = 0.07; i < 1; i += 0.19) {
    ctx.fillRect(x + c * i, mid - W * 1.8, c * 0.085, W * 3.6);
  }
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, mid - W); ctx.lineTo(x + c, mid - W); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, mid + W); ctx.lineTo(x + c, mid + W); ctx.stroke();
  // Tunnel mouth
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.arc(x + c / 2, mid + W * 1.8, W * 2.2, Math.PI, 0);
  ctx.rect(x + c / 2 - W * 2.2, mid + W * 1.8, W * 4.4, W * 2.5);
  ctx.fill();
}

function drawStation(ctx, x, y, c) {
  // Draw the track base first (identical to straight-h)
  drawStraightH(ctx, x, y, c);
  const W = c * W_FRAC;

  // Platform: light gray rectangle in lower half
  ctx.fillStyle = '#CFD8DC';
  ctx.fillRect(x + c * 0.05, y + c * 0.52, c * 0.9, c * 0.22);
  // Platform edge stripe
  ctx.fillStyle = '#B0BEC5';
  ctx.fillRect(x + c * 0.05, y + c * 0.52, c * 0.9, c * 0.04);

  // Station building body (upper half)
  ctx.fillStyle = '#FFF9C4';
  ctx.fillRect(x + c * 0.18, y + c * 0.12, c * 0.64, c * 0.40);

  // Roof: red trapezoid / triangle
  ctx.fillStyle = '#E53935';
  ctx.beginPath();
  ctx.moveTo(x + c * 0.10, y + c * 0.12);         // left eave
  ctx.lineTo(x + c * 0.90, y + c * 0.12);         // right eave
  ctx.lineTo(x + c * 0.75, y + c * 0.02);         // right peak
  ctx.lineTo(x + c * 0.25, y + c * 0.02);         // left peak
  ctx.closePath();
  ctx.fill();

  // Window: small square
  ctx.fillStyle = '#90CAF9';
  ctx.fillRect(x + c * 0.38, y + c * 0.20, c * 0.24, c * 0.18);
  // Window frame
  ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + c * 0.38, y + c * 0.20, c * 0.24, c * 0.18);
  // Window cross
  ctx.beginPath();
  ctx.moveTo(x + c * 0.50, y + c * 0.20);
  ctx.lineTo(x + c * 0.50, y + c * 0.38);
  ctx.moveTo(x + c * 0.38, y + c * 0.29);
  ctx.lineTo(x + c * 0.62, y + c * 0.29);
  ctx.stroke();

  // Building outline
  ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + c * 0.18, y + c * 0.12, c * 0.64, c * 0.40);

  // Re-draw rails on top so they aren't obscured
  const mid = y + c / 2;
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, mid - W); ctx.lineTo(x + c, mid - W); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, mid + W); ctx.lineTo(x + c, mid + W); ctx.stroke();
}

function drawCrossing(ctx, x, y, c) {
  const mid = y + c / 2, W = c * W_FRAC;
  drawBed(ctx, x, y, c);

  // Grey vertical road band
  ctx.fillStyle = '#78909C';
  ctx.fillRect(x + c * 0.35, y, c * 0.3, c);

  // Yellow center dashes
  ctx.fillStyle = '#FFD700';
  for (let ry = y; ry < y + c; ry += c * 0.2) {
    ctx.fillRect(x + c * 0.475, ry, c * 0.05, c * 0.09);
  }

  // Red warning stripes at top and bottom of road band
  ctx.fillStyle = '#F44336';
  ctx.fillRect(x + c * 0.35, y,             c * 0.3, c * 0.07);
  ctx.fillRect(x + c * 0.35, y + c * 0.93,  c * 0.3, c * 0.07);

  // Ballast
  ctx.fillStyle = '#7E5630';
  ctx.fillRect(x, mid - W * 1.8, c, W * 3.6);
  // Ties
  ctx.fillStyle = '#4A3019';
  for (let i = 0.07; i < 1; i += 0.19) {
    ctx.fillRect(x + c * i, mid - W * 1.8, c * 0.085, W * 3.6);
  }
  // Rails
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, mid - W); ctx.lineTo(x + c, mid - W); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, mid + W); ctx.lineTo(x + c, mid + W); ctx.stroke();

  // Warning sign: red circle with white X
  ctx.fillStyle = '#F44336';
  ctx.beginPath();
  ctx.arc(x + c * 0.12, y + c * 0.14, c * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = `bold ${c * 0.12}px Arial`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('X', x + c * 0.12, y + c * 0.14);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

function drawBridge(ctx, x, y, c) {
  const W = c * W_FRAC, mid = y + c * 0.4;
  drawBed(ctx, x, y, c);
  // Water
  ctx.fillStyle = '#B3E5FC';
  ctx.fillRect(x, y + c * 0.55, c, c * 0.45);
  // Water ripples
  ctx.strokeStyle = '#0288D1'; ctx.lineWidth = 1.5;
  for (let wy = y + c * 0.65; wy < y + c; wy += c * 0.1) {
    ctx.beginPath();
    ctx.moveTo(x, wy);
    ctx.quadraticCurveTo(x + c * 0.25, wy - 3, x + c * 0.5, wy);
    ctx.quadraticCurveTo(x + c * 0.75, wy + 3, x + c, wy);
    ctx.stroke();
  }
  // Pillars
  ctx.fillStyle = '#9E9E9E';
  ctx.fillRect(x + c * 0.1, mid + W * 1.8, c * 0.1, c * 0.5);
  ctx.fillRect(x + c * 0.8, mid + W * 1.8, c * 0.1, c * 0.5);
  // Arch
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + c / 2, mid + W * 1.8, c * 0.35, Math.PI, 0);
  ctx.stroke();
  // Bridge deck ballast + ties + rails (same as straight-h but at mid height)
  ctx.fillStyle = '#7E5630';
  ctx.fillRect(x, mid - W * 1.8, c, W * 3.6);
  ctx.fillStyle = '#4A3019';
  for (let i = 0.07; i < 1; i += 0.19) {
    ctx.fillRect(x + c * i, mid - W * 1.8, c * 0.085, W * 3.6);
  }
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, mid - W); ctx.lineTo(x + c, mid - W); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, mid + W); ctx.lineTo(x + c, mid + W); ctx.stroke();
}

// ── Connectivity ─────────────────────────────────────────────────────────────

function getConnections(row, col) {
  const cell = getCell(row, col);
  return cell ? (TRACK_DEFS[cell.type]?.connects || []) : [];
}
function opposite(dir) { return { N:'S', S:'N', E:'W', W:'E' }[dir]; }
function neighbor(row, col, dir) {
  return { N:[row-1,col], S:[row+1,col], E:[row,col+1], W:[row,col-1] }[dir];
}

function validateTrack() {
  const cells = [];
  for (const r in grid) for (const c in grid[r]) if (grid[r][c]) cells.push([+r, +c]);
  if (!cells.length) return { valid: false, reason: 'empty', path: null };

  const key = (r,c) => `${r},${c}`;

  // Build adjacency: only count edges where BOTH sides connect
  const adj = {};
  for (const [r,c] of cells) {
    adj[key(r,c)] = [];
    for (const dir of getConnections(r,c)) {
      const [nr,nc] = neighbor(r,c,dir);
      if (getCell(nr,nc) && getConnections(nr,nc).includes(opposite(dir)))
        adj[key(r,c)].push({ r: nr, c: nc, dir });
    }
  }

  // DFS looking for a single closed loop. A 'cross' cell may be entered twice
  // (once per axis) and is always passed straight through — that's what lets a
  // figure-8 close as one loop.
  const isCross = (r, c) => getCell(r, c)?.type === 'cross';
  const axisOf  = d => (d === 'E' || d === 'W') ? 'H' : 'V';

  // Start from a non-cross cell so the closed-loop test fires only on a full lap.
  const start = cells.find(([r, c]) => !isCross(r, c)) || cells[0];
  const [sr, sc] = start;
  const visited   = new Set();   // non-cross cells visited
  const crossUsed = {};          // key -> Set of axes already used
  const path = [];

  function dfs(r, c, fromDir) {
    const k = key(r, c);
    if (path.length > 1 && r === sr && c === sc) return true; // closed loop

    if (isCross(r, c)) {
      const ax = axisOf(fromDir);
      const used = crossUsed[k] || (crossUsed[k] = new Set());
      if (used.has(ax)) return false;          // already crossed on this axis
      // Must continue straight through (same travel direction).
      const straight = adj[k].find(nb => nb.dir === fromDir);
      if (!straight) return false;
      used.add(ax); path.push([r, c]);
      if (dfs(straight.r, straight.c, straight.dir)) return true;
      used.delete(ax); path.pop();
      return false;
    }

    if (visited.has(k)) return false;
    visited.add(k); path.push([r, c]);
    for (const nb of adj[k]) {
      if (nb.dir === opposite(fromDir)) continue;
      if (dfs(nb.r, nb.c, nb.dir)) return true;
    }
    visited.delete(k); path.pop();
    return false;
  }

  for (const nb of (adj[key(sr, sc)] || [])) {
    path.length = 0; visited.clear();
    for (const kk in crossUsed) delete crossUsed[kk];
    path.push([sr, sc]); visited.add(key(sr, sc));
    if (dfs(nb.r, nb.c, nb.dir)) return { valid: true, path: [...path] };
  }
  return { valid: false, reason: 'no-loop', path: null };
}

// ── Animation path ────────────────────────────────────────────────────────────

// Curve params keyed by [type][entryDir] → {cx_fn, cy_fn, aStart, aEnd, ccw}
// cx_fn/cy_fn take (px, py, c) → number
const CURVE_PARAMS = {
  'curve-ne': {
    N: { cx:(p,_,c)=>p+c, cy:(_,p,__)=>p,   aS: Math.PI,    aE: Math.PI/2,   ccw: true  },
    E: { cx:(p,_,c)=>p+c, cy:(_,p,__)=>p,   aS: Math.PI/2,  aE: Math.PI,     ccw: false },
  },
  'curve-nw': {
    N: { cx:(p)=>p,        cy:(_,p)=>p,      aS: 0,          aE: Math.PI/2,   ccw: false },
    W: { cx:(p)=>p,        cy:(_,p)=>p,      aS: Math.PI/2,  aE: 0,           ccw: true  },
  },
  'curve-se': {
    S: { cx:(p,_,c)=>p+c, cy:(_,p,c)=>p+c,  aS: Math.PI,    aE:-Math.PI/2,   ccw: false },
    E: { cx:(p,_,c)=>p+c, cy:(_,p,c)=>p+c,  aS:-Math.PI/2,  aE: Math.PI,     ccw: true  },
  },
  'curve-sw': {
    S: { cx:(p)=>p,        cy:(_,p,c)=>p+c,  aS: 0,          aE:-Math.PI/2,   ccw: true  },
    W: { cx:(p)=>p,        cy:(_,p,c)=>p+c,  aS:-Math.PI/2,  aE: 0,           ccw: false },
  },
};

function arcWaypoints(cx, cy, R, aStart, aEnd, ccw, steps, special) {
  const pts = [];
  let span = aEnd - aStart;
  if (ccw)  { if (span > 0)  span -= 2 * Math.PI; }
  else       { if (span < 0)  span += 2 * Math.PI; }
  for (let i = 0; i <= steps; i++) {
    const a = aStart + span * (i / steps);
    const hx = ccw ? Math.sin(a) : -Math.sin(a);
    const hy = ccw ? -Math.cos(a) : Math.cos(a);
    pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a),
               angle: Math.atan2(hy, hx), special: special || null });
  }
  return pts;
}

function getCellDir([r1,c1],[r2,c2]) {
  if (r2<r1) return 'N'; if (r2>r1) return 'S';
  if (c2<c1) return 'W'; return 'E';
}

function buildAnimPath(loopPath, cellSize) {
  const pts = [];
  const c = cellSize, S = 8;
  const n = loopPath.length;

  for (let i = 0; i < n; i++) {
    const [r, col] = loopPath[i];
    const cell = getCell(r, col);
    if (!cell) continue;
    const type = cell.type;
    const px = col * c, py = r * c;
    const entryDir = getCellDir(loopPath[(i - 1 + n) % n], [r, col]);
    const exitDir  = getCellDir([r, col], loopPath[(i + 1) % n]);
    const mid = py + c / 2;
    const sp = (type === 'tunnel') ? 'tunnel' : (type === 'bridge') ? 'bridge' : (type === 'station') ? 'station' : (type === 'crossing') ? 'crossing' : null;

    if (type === 'straight-h' || type === 'tunnel' || type === 'bridge' || type === 'station' || type === 'crossing') {
      const goRight = (exitDir === 'E');
      const trackY  = (type === 'bridge') ? py + c * 0.4 : mid;
      for (let t = 0; t <= S; t++) {
        const frac = goRight ? t/S : 1 - t/S;
        pts.push({ x: px + c*frac, y: trackY, angle: goRight ? 0 : Math.PI, special: sp });
      }
    } else if (type === 'straight-v') {
      const goDown = (exitDir === 'S');
      for (let t = 0; t <= S; t++) {
        const frac = goDown ? t/S : 1 - t/S;
        pts.push({ x: px + c/2, y: py + c*frac, angle: goDown ? Math.PI/2 : -Math.PI/2, special: null });
      }
    } else if (type === 'cross') {
      // Straight pass-through; axis chosen by the travel direction of this visit.
      if (exitDir === 'E' || exitDir === 'W') {
        const goRight = (exitDir === 'E');
        for (let t = 0; t <= S; t++) {
          const frac = goRight ? t/S : 1 - t/S;
          pts.push({ x: px + c*frac, y: mid, angle: goRight ? 0 : Math.PI, special: null });
        }
      } else {
        const goDown = (exitDir === 'S');
        for (let t = 0; t <= S; t++) {
          const frac = goDown ? t/S : 1 - t/S;
          pts.push({ x: px + c/2, y: py + c*frac, angle: goDown ? Math.PI/2 : -Math.PI/2, special: null });
        }
      }
    } else {
      const cp = CURVE_PARAMS[type]?.[entryDir];
      if (!cp) continue;
      const cx = cp.cx(px, py, c);
      const cy = cp.cy(px, py, c);
      pts.push(...arcWaypoints(cx, cy, c/2, cp.aS, cp.aE, cp.ccw, S, sp));
    }
  }
  return pts;
}
