// Track definitions
// Each track type defines: which sides it connects (N/S/E/W)
// and how to draw it on the grid cell

const CELL = 60; // pixels per grid cell

// Connection sides: N=top, S=bottom, E=right, W=left
const TRACK_DEFS = {
  'straight-h': { connects: ['W','E'], draw: drawStraightH },
  'straight-v': { connects: ['N','S'], draw: drawStraightV },
  'curve-ne':   { connects: ['N','E'], draw: drawCurveNE },
  'curve-nw':   { connects: ['N','W'], draw: drawCurveNW },
  'curve-se':   { connects: ['S','E'], draw: drawCurveSE },
  'curve-sw':   { connects: ['S','W'], draw: drawCurveSW },
  'tunnel':     { connects: ['W','E'], draw: drawTunnel, special: 'tunnel' },
  'bridge':     { connects: ['W','E'], draw: drawBridge, special: 'bridge' },
};

// Grid state: grid[row][col] = { type: 'straight-h', ... } or null
let grid = {};
let gridCols = 0;
let gridRows = 0;

function initGrid(cols, rows) {
  gridCols = cols;
  gridRows = rows;
  grid = {};
}

function getCell(row, col) {
  return (grid[row] && grid[row][col]) || null;
}

function setCell(row, col, type) {
  if (!grid[row]) grid[row] = {};
  if (type === null) {
    delete grid[row][col];
  } else {
    grid[row][col] = { type };
  }
}

function clearGrid() {
  grid = {};
}

// ── Drawing helpers ──────────────────────────────────────────────

function drawStraightH(ctx, x, y, c) {
  const mid = y + c/2;
  // Ground
  ctx.fillStyle = '#A5D6A7';
  ctx.fillRect(x, y, c, c);
  // Ties (crosspieces)
  ctx.fillStyle = '#6D4C41';
  for (let i = 0.15; i < 1; i += 0.22) {
    ctx.fillRect(x + c*i, mid - c*0.18, c*0.1, c*0.36);
  }
  // Rails
  ctx.strokeStyle = '#757575';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, mid - c*0.12); ctx.lineTo(x+c, mid - c*0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, mid + c*0.12); ctx.lineTo(x+c, mid + c*0.12); ctx.stroke();
}

function drawStraightV(ctx, x, y, c) {
  const mid = x + c/2;
  ctx.fillStyle = '#A5D6A7';
  ctx.fillRect(x, y, c, c);
  ctx.fillStyle = '#6D4C41';
  for (let i = 0.15; i < 1; i += 0.22) {
    ctx.fillRect(mid - c*0.18, y + c*i, c*0.36, c*0.1);
  }
  ctx.strokeStyle = '#757575';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(mid - c*0.12, y); ctx.lineTo(mid - c*0.12, y+c); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mid + c*0.12, y); ctx.lineTo(mid + c*0.12, y+c); ctx.stroke();
}

function drawCurve(ctx, x, y, c, cx, cy, startAngle, endAngle) {
  ctx.fillStyle = '#A5D6A7';
  ctx.fillRect(x, y, c, c);
  const r1 = c * 0.88, r2 = c * 1.12;
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = c * 0.22;
  ctx.beginPath();
  ctx.arc(cx, cy, (r1+r2)/2, startAngle, endAngle);
  ctx.stroke();
  ctx.strokeStyle = '#757575';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, r1, startAngle, endAngle); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r2, startAngle, endAngle); ctx.stroke();
  // Ties along curve
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = c * 0.08;
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / steps);
    ctx.beginPath();
    ctx.moveTo(cx + r1*Math.cos(a), cy + r1*Math.sin(a));
    ctx.lineTo(cx + r2*Math.cos(a), cy + r2*Math.sin(a));
    ctx.stroke();
  }
}

function drawCurveNE(ctx, x, y, c) {
  drawCurve(ctx, x, y, c, x, y+c, -Math.PI/2, 0);
}
function drawCurveNW(ctx, x, y, c) {
  drawCurve(ctx, x, y, c, x+c, y+c, Math.PI, -Math.PI/2);
}
function drawCurveSE(ctx, x, y, c) {
  drawCurve(ctx, x, y, c, x, y, 0, Math.PI/2);
}
function drawCurveSW(ctx, x, y, c) {
  drawCurve(ctx, x, y, c, x+c, y, Math.PI/2, Math.PI);
}

function drawTunnel(ctx, x, y, c) {
  drawStraightH(ctx, x, y, c);
  // Mountain shape
  ctx.fillStyle = '#78909C';
  ctx.beginPath();
  ctx.moveTo(x, y+c);
  ctx.lineTo(x, y+c*0.4);
  ctx.quadraticCurveTo(x+c*0.5, y-c*0.1, x+c, y+c*0.4);
  ctx.lineTo(x+c, y+c);
  ctx.fill();
  // Tunnel mouth
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(x+c/2, y+c*0.7, c*0.22, Math.PI, 0);
  ctx.rect(x+c*0.28, y+c*0.7, c*0.44, c*0.3);
  ctx.fill();
  // Ground strip
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(x, y+c*0.82, c, c*0.05);
  ctx.fillRect(x, y+c*0.93, c, c*0.05);
}

function drawBridge(ctx, x, y, c) {
  // Sky/water below
  ctx.fillStyle = '#B3E5FC';
  ctx.fillRect(x, y, c, c);
  // Water ripples
  ctx.strokeStyle = '#0288D1';
  ctx.lineWidth = 1.5;
  for (let wy = y+c*0.75; wy < y+c; wy += c*0.08) {
    ctx.beginPath();
    ctx.moveTo(x, wy);
    ctx.quadraticCurveTo(x+c*0.25, wy-4, x+c*0.5, wy);
    ctx.quadraticCurveTo(x+c*0.75, wy+4, x+c, wy);
    ctx.stroke();
  }
  // Pillars
  ctx.fillStyle = '#9E9E9E';
  ctx.fillRect(x+c*0.12, y+c*0.5, c*0.12, c*0.5);
  ctx.fillRect(x+c*0.76, y+c*0.5, c*0.12, c*0.5);
  // Arch
  ctx.strokeStyle = '#757575';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x+c/2, y+c*0.5, c*0.38, Math.PI, 0);
  ctx.stroke();
  // Deck (rails on top)
  const mid = y + c*0.42;
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(x, mid - c*0.06, c, c*0.12);
  for (let i = 0.15; i < 1; i += 0.22) {
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x + c*i, mid - c*0.12, c*0.08, c*0.24);
  }
  ctx.strokeStyle = '#616161';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x, mid - c*0.1); ctx.lineTo(x+c, mid - c*0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, mid + c*0.1); ctx.lineTo(x+c, mid + c*0.1); ctx.stroke();
}

// ── Path finding / validation ─────────────────────────────────────

function getConnections(row, col) {
  const cell = getCell(row, col);
  if (!cell) return [];
  return TRACK_DEFS[cell.type]?.connects || [];
}

function opposite(dir) {
  return { N:'S', S:'N', E:'W', W:'E' }[dir];
}

function neighbor(row, col, dir) {
  return {
    N: [row-1, col],
    S: [row+1, col],
    E: [row, col+1],
    W: [row, col-1],
  }[dir];
}

// Returns array of [row,col] reachable from (startRow, startCol) following track connections
// Also returns whether it forms a complete loop
function validateTrack() {
  // Find any track cell to start
  let startRow = null, startCol = null;
  for (const r in grid) {
    for (const c in grid[r]) {
      if (grid[r][c]) { startRow = parseInt(r); startCol = parseInt(c); break; }
    }
    if (startRow !== null) break;
  }
  if (startRow === null) return { valid: false, reason: 'empty', path: [] };

  // Count total cells
  let totalCells = 0;
  for (const r in grid) for (const c in grid[r]) if (grid[r][c]) totalCells++;

  // BFS/DFS following connections
  const visited = new Set();
  const path = [];
  const key = (r,c) => `${r},${c}`;

  // Walk: follow track connections, build ordered path
  let cur = [startRow, startCol];
  let prevDir = null;
  const maxSteps = totalCells + 2;

  // Try to build ordered path from start
  // Use DFS that respects connectivity
  function buildPath(r, c, fromDir, steps) {
    if (steps > maxSteps * 2) return null;
    const k = key(r, c);
    const cell = getCell(r, c);
    if (!cell) return null;
    const conns = getConnections(r, c);
    // Check that the incoming direction matches one of our connections
    if (fromDir && !conns.includes(opposite(fromDir))) return null;

    if (path.length > 0 && r === startRow && c === startCol) {
      // Completed the loop!
      return true;
    }
    if (visited.has(k)) return null;
    visited.add(k);
    path.push([r, c]);

    for (const dir of conns) {
      if (dir === opposite(fromDir)) continue; // don't go back
      const [nr, nc] = neighbor(r, c, dir);
      const result = buildPath(nr, nc, dir, steps + 1);
      if (result) return true;
    }
    visited.delete(k);
    path.pop();
    return null;
  }

  const conns0 = getConnections(startRow, startCol);
  let found = false;
  for (const dir of conns0) {
    path.length = 0;
    visited.clear();
    const result = buildPath(startRow, startCol, null, 0);
    if (result === true) { found = true; break; }
    // Try starting by going in one direction
    path.length = 0;
    visited.clear();
    visited.add(key(startRow, startCol));
    path.push([startRow, startCol]);
    const [nr, nc] = neighbor(startRow, startCol, dir);
    const r2 = buildPath(nr, nc, dir, 1);
    if (r2 === true) { found = true; break; }
    path.length = 0;
    visited.clear();
  }

  if (!found) {
    // Try simple loop detection
    const loopPath = findLoop();
    if (loopPath) return { valid: true, path: loopPath };
    return { valid: false, reason: 'no-loop', path: [] };
  }
  return { valid: true, path };
}

function findLoop() {
  // Find all track cells
  const cells = [];
  for (const r in grid) for (const c in grid[r]) if (grid[r][c]) cells.push([parseInt(r), parseInt(c)]);
  if (cells.length < 3) return null;

  const key = (r,c) => `${r},${c}`;
  const adj = {};
  for (const [r,c] of cells) {
    adj[key(r,c)] = [];
    for (const dir of getConnections(r,c)) {
      const [nr, nc] = neighbor(r, c, dir);
      const nk = key(nr, nc);
      const ncell = getCell(nr, nc);
      if (ncell && getConnections(nr, nc).includes(opposite(dir))) {
        adj[key(r,c)].push([nr, nc, dir]);
      }
    }
  }

  // DFS to find loop
  const visited = new Set();
  const path = [];
  const [sr, sc] = cells[0];
  const startKey = key(sr, sc);

  function dfs(r, c, fromDir) {
    const k = key(r, c);
    if (path.length > 1 && r === sr && c === sc) return true; // loop found
    if (visited.has(k)) return false;
    visited.add(k);
    path.push([r, c]);
    for (const [nr, nc, dir] of (adj[k] || [])) {
      if (dir === opposite(fromDir)) continue;
      if (dfs(nr, nc, dir)) return true;
    }
    visited.delete(k);
    path.pop();
    return false;
  }

  for (const [nr, nc, dir] of (adj[startKey] || [])) {
    path.length = 0;
    visited.clear();
    path.push([sr, sc]);
    visited.add(startKey);
    if (dfs(nr, nc, dir)) return [...path];
  }
  return null;
}

// Build a smooth SVG-like path array for train animation
// Returns array of {x, y, angle} waypoints in canvas pixels
function buildAnimPath(loopPath, cellSize) {
  const pts = [];
  const c = cellSize;

  for (let i = 0; i < loopPath.length; i++) {
    const [r, col] = loopPath[i];
    const cell = getCell(r, col);
    if (!cell) continue;
    const type = cell.type;
    const px = col * c, py = r * c;
    const midX = px + c/2, midY = py + c/2;

    const prev = loopPath[(i - 1 + loopPath.length) % loopPath.length];
    const next = loopPath[(i + 1) % loopPath.length];

    // entry direction (from prev cell to this cell)
    const entryDir = getCellDirection(prev, [r, col]);
    // exit direction (from this cell to next cell)
    const exitDir = getCellDirection([r, col], next);

    const waypoints = getCellWaypoints(type, px, py, c, entryDir, exitDir);
    pts.push(...waypoints);
  }
  return pts;
}

function getCellDirection([r1,c1], [r2,c2]) {
  if (r2 < r1) return 'N';
  if (r2 > r1) return 'S';
  if (c2 < c1) return 'W';
  if (c2 > c1) return 'E';
  return 'E';
}

function getCellWaypoints(type, px, py, c, entryDir, exitDir) {
  const pts = [];
  const steps = 8;

  if (type === 'straight-h' || type === 'tunnel' || type === 'bridge') {
    const mid = py + c/2;
    const startX = (entryDir === 'W') ? px : px + c;
    const endX   = (exitDir  === 'E') ? px + c : px;
    for (let t = 0; t <= steps; t++) {
      const x = startX + (endX - startX) * t/steps;
      pts.push({ x, y: mid, angle: (endX > startX) ? 0 : Math.PI,
                 special: (type === 'tunnel' && t > 1 && t < steps-1) ? 'tunnel' :
                          (type === 'bridge' && t > 1 && t < steps-1) ? 'bridge' : null });
    }
  } else if (type === 'straight-v') {
    const mid = px + c/2;
    const startY = (entryDir === 'N') ? py : py + c;
    const endY   = (exitDir  === 'S') ? py + c : py;
    for (let t = 0; t <= steps; t++) {
      const y = startY + (endY - startY) * t/steps;
      pts.push({ x: mid, y, angle: (endY > startY) ? Math.PI/2 : -Math.PI/2, special: null });
    }
  } else if (type.startsWith('curve-')) {
    // Determine arc center and angles
    let cx, cy, r, startAngle, endAngle;
    const R = c;
    if (type === 'curve-ne') { cx = px; cy = py+c; r = R; startAngle = -Math.PI/2; endAngle = 0; }
    else if (type === 'curve-nw') { cx = px+c; cy = py+c; r = R; startAngle = Math.PI; endAngle = -Math.PI/2; }
    else if (type === 'curve-se') { cx = px; cy = py; r = R; startAngle = 0; endAngle = Math.PI/2; }
    else { cx = px+c; cy = py; r = R; startAngle = Math.PI/2; endAngle = Math.PI; }

    // Determine direction of traversal
    let aStart = startAngle, aEnd = endAngle;
    // Check if we need to reverse
    const entryPt = { x: cx + r*Math.cos(startAngle), y: cy + r*Math.sin(startAngle) };
    const exitPt  = { x: cx + r*Math.cos(endAngle),   y: cy + r*Math.sin(endAngle) };
    // Entry from entryDir means we enter from that side of the cell
    const entryX = entryDir === 'W' ? px : entryDir === 'E' ? px+c : px+c/2;
    const entryY = entryDir === 'N' ? py : entryDir === 'S' ? py+c : py+c/2;
    const d1 = Math.hypot(entryPt.x - entryX, entryPt.y - entryY);
    const d2 = Math.hypot(exitPt.x  - entryX, exitPt.y  - entryY);
    if (d1 > d2) { [aStart, aEnd] = [aEnd, aStart]; }

    // Handle angle wrap
    let diff = aEnd - aStart;
    if (diff > Math.PI)  diff -= 2*Math.PI;
    if (diff < -Math.PI) diff += 2*Math.PI;

    for (let t = 0; t <= steps; t++) {
      const a = aStart + diff * t/steps;
      const x = cx + r*Math.cos(a);
      const y = cy + r*Math.sin(a);
      const angle = a + (diff > 0 ? Math.PI/2 : -Math.PI/2);
      pts.push({ x, y, angle, special: null });
    }
  }
  return pts;
}
