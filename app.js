// Main application — supports level-select, challenge levels, and free mode

const COLS = 10, ROWS = 7;
let cellSize = 60;
let selectedTool = 'straight-h';
let isDrawing = false;
let isRunning = false;
let gridCanvas, gridCtx;

// ── Mode state ────────────────────────────────────────────────────────────────
let gameMode = 'select';   // 'select' | 'level' | 'free'
let currentLevelId = null;
let levelGaps     = [];    // [{r, c, type}] for current level
let levelPreset   = new Set();  // "r,c" keys that are locked
let gapFilled     = new Set();  // "r,c" keys of correctly filled gaps
let completionTimer = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  gridCanvas = document.getElementById('grid-canvas');
  gridCtx    = gridCanvas.getContext('2d');
  const tCanvas = document.getElementById('train-canvas');

  // Resize canvases
  function resize() {
    const area = document.getElementById('main-area');
    const w = area.clientWidth, h = area.clientHeight;
    cellSize = Math.floor(Math.min(w / COLS, h / ROWS));
    // Fill the full area — tracks stay in the COLS×ROWS region, rest is green
    gridCanvas.width  = tCanvas.width  = w;
    gridCanvas.height = tCanvas.height = h;
    gridCanvas.style.width  = tCanvas.style.width  = w + 'px';
    gridCanvas.style.height = tCanvas.style.height = h + 'px';
    initGrid(COLS, ROWS);
    if (gameMode === 'level' && currentLevelId !== null) {
      reloadLevelGrid();
    }
    redrawGrid();
    if (gameMode === 'level') updateGapOverlay();
  }
  window.addEventListener('resize', () => {
    if (gameMode !== 'select') resize();
  });

  initTrainCanvas(tCanvas);

  // Tool selection
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTool = btn.dataset.track;
    });
    btn.addEventListener('touchstart', e => { e.preventDefault(); btn.click(); }, { passive: false });
  });

  // Canvas interaction
  function getCellFromEvent(e) {
    const rect = gridCanvas.getBoundingClientRect();
    const scaleX = gridCanvas.width / rect.width;
    const scaleY = gridCanvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const px = (clientX - rect.left) * scaleX;
    const py = (clientY - rect.top)  * scaleY;
    const col = Math.floor(px / cellSize);
    const row = Math.floor(py / cellSize);
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) return { row, col };
    return null;
  }

  let lastPlaced = null;
  function placeTile(e) {
    if (isRunning) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const { row, col } = cell;
    const cellKey = `${row},${col}`;
    if (cellKey === lastPlaced) return;
    lastPlaced = cellKey;

    if (gameMode === 'level') {
      onLevelCellClick(row, col);
    } else {
      // Free mode
      if (selectedTool === 'eraser') {
        setCell(row, col, null);
      } else {
        setCell(row, col, selectedTool);
      }
      try { playPlace(); } catch(e) {}
      redrawGrid();
    }
  }

  gridCanvas.addEventListener('mousedown', e => { isDrawing = true; lastPlaced = null; placeTile(e); });
  gridCanvas.addEventListener('mousemove', e => { if (isDrawing) placeTile(e); });
  window.addEventListener('mouseup', () => { isDrawing = false; lastPlaced = null; });

  gridCanvas.addEventListener('touchstart', e => { e.preventDefault(); isDrawing = true; lastPlaced = null; placeTile(e); }, { passive: false });
  gridCanvas.addEventListener('touchmove',  e => { e.preventDefault(); if (isDrawing) placeTile(e); }, { passive: false });
  window.addEventListener('touchend', () => { isDrawing = false; lastPlaced = null; });

  // Buttons
  document.getElementById('btn-test').addEventListener('click', handleTest);
  document.getElementById('btn-stop').addEventListener('click', handleStop);
  document.getElementById('btn-clear').addEventListener('click', handleClear);
  document.getElementById('btn-back').addEventListener('click', exitToSelect);
  document.getElementById('btn-free-mode').addEventListener('click', startFreeMode);
  document.getElementById('message-close').addEventListener('click', () => {
    document.getElementById('message-overlay').style.display = 'none';
    // In level mode "好的！" / "返回選關" goes back to level select
    if (gameMode === 'level') {
      exitToSelect();
    }
  });
  document.getElementById('message-next').addEventListener('click', onNextLevel);

  // Level select buttons (generated)
  buildLevelSelectUI();
  showLevelSelect();
});

// ── Level Select UI ───────────────────────────────────────────────────────────
function buildLevelSelectUI() {
  const progress = getLevelProgress();
  const groups = { 1: 'ls-g1', 2: 'ls-g2', 3: 'ls-g3' };

  LEVELS.forEach(level => {
    const containerId = groups[level.group];
    const container = document.getElementById(containerId);
    if (!container) return;

    const btn = document.createElement('button');
    btn.className = 'ls-level-btn';
    btn.dataset.levelId = level.id;

    const isUnlocked = isLevelUnlocked(level.id, progress);
    const isCompleted = progress.completed.has(level.id);

    if (isUnlocked) {
      btn.classList.add('unlocked');
      if (isCompleted) btn.classList.add('completed');
      btn.textContent = level.id;
      btn.addEventListener('click', () => startLevel(level.id));
      btn.addEventListener('touchstart', e => { e.preventDefault(); btn.click(); }, { passive: false });
    } else {
      btn.classList.add('locked');
      btn.textContent = level.id;
      btn.disabled = true;
    }

    container.appendChild(btn);
  });
}

function refreshLevelSelectUI() {
  // Clear existing buttons
  ['ls-g1','ls-g2','ls-g3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  buildLevelSelectUI();
}

function isLevelUnlocked(id, progress) {
  if (id === 1) return true;
  // Unlock within group: need previous level in same group completed
  // Unlock group 2: need all group-1 levels completed
  // Unlock group 3: need all group-2 levels completed
  const level = getLevelById(id);
  if (!level) return false;

  if (level.group === 1) {
    // Each level in group 1 unlocked after previous
    return progress.completed.has(id - 1) || id === LEVELS.filter(l=>l.group===1)[0].id;
  }
  if (level.group === 2) {
    const g1Levels = LEVELS.filter(l => l.group === 1);
    const allG1Done = g1Levels.every(l => progress.completed.has(l.id));
    if (!allG1Done) return false;
    const g2Levels = LEVELS.filter(l => l.group === 2);
    const firstG2 = g2Levels[0];
    if (id === firstG2.id) return true;
    return progress.completed.has(id - 1);
  }
  if (level.group === 3) {
    const g2Levels = LEVELS.filter(l => l.group === 2);
    const allG2Done = g2Levels.every(l => progress.completed.has(l.id));
    if (!allG2Done) return false;
    const g3Levels = LEVELS.filter(l => l.group === 3);
    const firstG3 = g3Levels[0];
    if (id === firstG3.id) return true;
    return progress.completed.has(id - 1);
  }
  return false;
}

// ── Screen transitions ────────────────────────────────────────────────────────
function showLevelSelect() {
  gameMode = 'select';
  currentLevelId = null;
  document.getElementById('level-select').style.display = 'flex';
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('message-overlay').style.display = 'none';
  if (isRunning) {
    stopTrain();
    try { stopChugSound(); } catch(e) {}
    isRunning = false;
  }
  if (completionTimer) { clearTimeout(completionTimer); completionTimer = null; }
}

function exitToSelect() {
  handleStop();
  clearGrid();
  levelGaps = [];
  levelPreset.clear();
  gapFilled.clear();
  clearGapOverlay();
  refreshLevelSelectUI();
  showLevelSelect();
}

function startFreeMode() {
  gameMode = 'free';
  currentLevelId = null;
  levelGaps = [];
  levelPreset.clear();
  gapFilled.clear();

  document.getElementById('level-select').style.display = 'none';
  document.getElementById('game-screen').style.display = 'flex';

  // Show free-mode header
  document.getElementById('level-info').innerHTML =
    '<div id="level-title-display" style="color:#FFD700;font-size:1.2rem;font-weight:bold;text-shadow:1px 1px 4px rgba(0,0,0,0.5)">🎨 自由建造</div>' +
    '<div id="gaps-counter"></div>';

  // Show test/clear buttons, hide back button area styling
  document.getElementById('btn-test').style.display = '';
  document.getElementById('btn-stop').style.display = 'none';
  document.getElementById('btn-clear').style.display = '';
  clearGapOverlay();

  // Resize/init
  const area = document.getElementById('main-area');
  const w = area.clientWidth, h = area.clientHeight;
  cellSize = Math.floor(Math.min(w / COLS, h / ROWS));
  const gc = document.getElementById('grid-canvas');
  const tc = document.getElementById('train-canvas');
  gc.width = tc.width = w; gc.height = tc.height = h;
  gc.style.width = tc.style.width = w + 'px';
  gc.style.height = tc.style.height = h + 'px';
  initGrid(COLS, ROWS);
  redrawGrid();
}

function startLevel(id) {
  const level = getLevelById(id);
  if (!level) return;

  gameMode = 'level';
  currentLevelId = id;
  isRunning = false;

  // Reset gap tracking
  levelGaps = level.gaps.slice();
  levelPreset.clear();
  gapFilled.clear();
  level.preset.forEach(p => levelPreset.add(`${p.r},${p.c}`));
  levelGaps.forEach(g => levelPreset.add(`${g.r},${g.c}`)); // gaps are also special cells

  document.getElementById('level-select').style.display = 'none';
  document.getElementById('game-screen').style.display = 'flex';

  // Update header
  document.getElementById('level-title-display').textContent = level.title;
  updateGapsCounter();

  // Hide test/clear, show back
  document.getElementById('btn-test').style.display = 'none';
  document.getElementById('btn-stop').style.display = 'none';
  document.getElementById('btn-clear').style.display = 'none';

  // Resize canvas and populate grid
  const area = document.getElementById('main-area');
  const w = area.clientWidth, h = area.clientHeight;
  cellSize = Math.floor(Math.min(w / COLS, h / ROWS));
  const gc = document.getElementById('grid-canvas');
  const tc = document.getElementById('train-canvas');
  gc.width = tc.width = w; gc.height = tc.height = h;
  gc.style.width = tc.style.width = w + 'px';
  gc.style.height = tc.style.height = h + 'px';

  initGrid(COLS, ROWS);
  reloadLevelGrid();
  redrawGrid();
  updateGapOverlay();

  // Show hint desc
  showDesc(level.desc);
}

function reloadLevelGrid() {
  const level = getLevelById(currentLevelId);
  if (!level) return;
  clearGrid();
  level.preset.forEach(p => setCell(p.r, p.c, p.type));
  // Re-place already-filled gaps
  level.gaps.forEach(g => {
    if (gapFilled.has(`${g.r},${g.c}`)) {
      setCell(g.r, g.c, g.type);
    }
  });
}

// ── Level cell interaction ────────────────────────────────────────────────────
function onLevelCellClick(row, col) {
  const key = `${row},${col}`;

  // Can only place on gap cells, and only if not already running
  if (isRunning) return;
  if (!isGapCell(row, col)) return;

  const gap = levelGaps.find(g => g.r === row && g.c === col);
  if (!gap) return;

  if (selectedTool === 'eraser') {
    // Allow erasing a gap cell to reset it
    if (gapFilled.has(key)) {
      gapFilled.delete(key);
      setCell(row, col, null);
      try { playPlace(); } catch(e) {}
      redrawGrid();
      updateGapOverlay();
      updateGapsCounter();
    }
    return;
  }

  // Place the selected track type
  setCell(row, col, selectedTool);
  try { playPlace(); } catch(e) {}

  // Check if it matches the correct answer
  if (selectedTool === gap.type) {
    gapFilled.add(key);
  } else {
    gapFilled.delete(key);
  }

  redrawGrid();
  updateGapOverlay();
  updateGapsCounter();

  // Check if all gaps are correctly filled
  autoCheckLevel();
}

function isGapCell(row, col) {
  return levelGaps.some(g => g.r === row && g.c === col);
}

function isPresetCell(row, col) {
  const key = `${row},${col}`;
  return levelPreset.has(key) && !isGapCell(row, col);
}

function autoCheckLevel() {
  if (gameMode !== 'level') return;
  const allFilled = levelGaps.every(g => gapFilled.has(`${g.r},${g.c}`));
  if (!allFilled) return;

  // Validate the full track loop
  const result = validateTrack();
  if (!result.valid) return;
  const loopPath = result.path;
  if (!loopPath || loopPath.length < 2) return;
  const animPath = buildAnimPath(loopPath, cellSize);
  if (!animPath || animPath.length < 4) return;

  // Level complete!
  try { playSuccess(); } catch(e) {}
  isRunning = true;
  startTrain(animPath);
  try { setTimeout(startChugSound, 600); } catch(e) {}
  launchStars();
  saveLevelComplete(currentLevelId);

  // Show completion message after 2.5s
  completionTimer = setTimeout(() => {
    stopTrain();
    try { stopChugSound(); } catch(e) {}
    isRunning = false;
    showLevelComplete(currentLevelId);
  }, 2500);
}

function showLevelComplete(levelId) {
  const nextId = levelId + 1;
  const hasNext = nextId <= 15;

  document.getElementById('message-icon').textContent = '🎉';
  document.getElementById('message-text').textContent =
    `第 ${levelId} 關完成！\n湯瑪士好棒棒！ 🚂⭐`;

  document.getElementById('message-close').textContent = '返回選關';
  const nextBtn = document.getElementById('message-next');
  if (hasNext && isLevelUnlocked(nextId, getLevelProgress())) {
    nextBtn.style.display = '';
    nextBtn.dataset.nextId = nextId;
  } else {
    nextBtn.style.display = 'none';
  }
  document.getElementById('message-overlay').style.display = 'flex';
}

function onNextLevel() {
  const nextBtn = document.getElementById('message-next');
  const nextId = parseInt(nextBtn.dataset.nextId, 10);
  document.getElementById('message-overlay').style.display = 'none';
  clearGrid();
  levelGaps = [];
  levelPreset.clear();
  gapFilled.clear();
  clearGapOverlay();
  startLevel(nextId);
}

// ── Gap overlay DOM management ────────────────────────────────────────────────
function updateGapOverlay() {
  const overlay = document.getElementById('gap-overlay');
  if (!overlay) return;
  if (gameMode !== 'level') { overlay.innerHTML = ''; return; }

  // Remove old indicators not in current gaps list
  const existingIds = new Set();
  overlay.querySelectorAll('.gap-indicator').forEach(el => existingIds.add(el.dataset.key));

  // Build set of needed keys
  const neededKeys = new Set(levelGaps.map(g => `${g.r},${g.c}`));

  // Remove stale
  overlay.querySelectorAll('.gap-indicator').forEach(el => {
    if (!neededKeys.has(el.dataset.key)) el.remove();
  });

  // Create/update
  levelGaps.forEach(g => {
    const key = `${g.r},${g.c}`;
    let el = overlay.querySelector(`.gap-indicator[data-key="${key}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'gap-indicator';
      el.dataset.key = key;
      overlay.appendChild(el);
    }
    // Position
    const x = g.c * cellSize;
    const y = g.r * cellSize;
    el.style.left   = x + 'px';
    el.style.top    = y + 'px';
    el.style.width  = cellSize + 'px';
    el.style.height = cellSize + 'px';

    if (gapFilled.has(key)) {
      el.classList.add('filled');
    } else {
      el.classList.remove('filled');
    }
  });
}

function clearGapOverlay() {
  const overlay = document.getElementById('gap-overlay');
  if (overlay) overlay.innerHTML = '';
}

function getGapIndicatorEl(r, c) {
  const key = `${r},${c}`;
  return document.querySelector(`.gap-indicator[data-key="${key}"]`);
}

function updateGapsCounter() {
  const remaining = levelGaps.filter(g => !gapFilled.has(`${g.r},${g.c}`)).length;
  const el = document.getElementById('gaps-counter');
  if (!el) return;
  if (remaining === 0) {
    el.textContent = '✅ 完成！';
  } else {
    el.textContent = `還差 ${remaining} 條軌道`;
  }
}

// ── Progress storage ──────────────────────────────────────────────────────────
function getLevelProgress() {
  try {
    const raw = localStorage.getItem('thomas_progress');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { completed: new Set(parsed.completed || []) };
    }
  } catch(e) {}
  return { completed: new Set() };
}

function saveLevelComplete(id) {
  const progress = getLevelProgress();
  progress.completed.add(id);
  try {
    localStorage.setItem('thomas_progress', JSON.stringify({
      completed: Array.from(progress.completed)
    }));
  } catch(e) {}
}

// ── Hint desc (dismisses on click) ───────────────────────────────────────────
let descTimer = null;
function showDesc(text) {
  // Use a temporary overlay (non-blocking)
  let el = document.getElementById('level-desc-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'level-desc-toast';
    el.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.75); color:white; border-radius:20px;
      padding:10px 24px; font-size:1rem; font-weight:bold;
      z-index:60; pointer-events:none;
      animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
      text-align:center;
    `;
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.display = 'block';
  if (descTimer) clearTimeout(descTimer);
  descTimer = setTimeout(() => { el.style.display = 'none'; }, 2800);
}

// ── Free mode actions ─────────────────────────────────────────────────────────
function redrawGrid() {
  const w = gridCanvas.width, h = gridCanvas.height;
  const c = cellSize;

  // Background grass
  gridCtx.fillStyle = '#81C784';
  gridCtx.fillRect(0, 0, w, h);

  // Grid lines — cover full canvas, not just the logical COLS×ROWS region
  gridCtx.strokeStyle = 'rgba(0,100,0,0.15)';
  gridCtx.lineWidth = 1;
  for (let r = 0; r * c <= h; r++) {
    gridCtx.beginPath(); gridCtx.moveTo(0, r*c); gridCtx.lineTo(w, r*c); gridCtx.stroke();
  }
  for (let col = 0; col * c <= w; col++) {
    gridCtx.beginPath(); gridCtx.moveTo(col*c, 0); gridCtx.lineTo(col*c, h); gridCtx.stroke();
  }

  // Draw tracks
  for (const r in grid) {
    for (const col in grid[r]) {
      const cell = grid[r][col];
      if (!cell) continue;
      const def = TRACK_DEFS[cell.type];
      if (def && def.draw) {
        def.draw(gridCtx, parseInt(col)*c, parseInt(r)*c, c);
      }
    }
  }

  // In level mode, draw a subtle tint on preset cells to show they're locked
  if (gameMode === 'level') {
    levelPreset.forEach(key => {
      if (isGapCell(...key.split(',').map(Number))) return; // skip gap indicators
      const [r, col] = key.split(',').map(Number);
      // Subtle lock indicator: small padlock icon area
      gridCtx.fillStyle = 'rgba(21,101,192,0.08)';
      gridCtx.fillRect(col*c, r*c, c, c);
    });
  }
}

function handleTest() {
  if (isRunning) return;
  try { playToot(); } catch(e) {}

  const result = validateTrack();
  if (!result.valid) {
    let msg = '';
    if (result.reason === 'empty') {
      msg = '還沒有鐵軌！\n先放一些鐵軌吧！🎉';
    } else {
      msg = '鐵軌還沒有連成一個圈圈！\n找找看有沒有缺口？🔍';
    }
    try { playError(); } catch(e) {}
    showMessage('😅', msg, false);
    return;
  }

  const loopPath = result.path;
  if (!loopPath || loopPath.length < 2) {
    try { playError(); } catch(e) {}
    showMessage('🤔', '鐵軌太短了！\n多放幾條鐵軌再試試！', false);
    return;
  }

  const animPath = buildAnimPath(loopPath, cellSize);
  if (!animPath || animPath.length < 4) {
    try { playError(); } catch(e) {}
    showMessage('🤔', '鐵軌好像有問題，\n再試試看？', false);
    return;
  }

  try { playSuccess(); } catch(e) {}
  isRunning = true;
  document.getElementById('btn-test').style.display = 'none';
  document.getElementById('btn-stop').style.display = '';
  startTrain(animPath);
  try { setTimeout(startChugSound, 600); } catch(e) {}
  launchStars();
}

function handleStop() {
  if (!isRunning) return;
  isRunning = false;
  stopTrain();
  try { stopChugSound(); } catch(e) {}
  if (gameMode === 'free') {
    document.getElementById('btn-test').style.display = '';
    document.getElementById('btn-stop').style.display = 'none';
  }
}

function handleClear() {
  if (isRunning) handleStop();
  clearGrid();
  redrawGrid();
  try { playPlace(); } catch(e) {}
}

function showMessage(icon, text, showNext) {
  document.getElementById('message-icon').textContent = icon;
  document.getElementById('message-text').textContent = text;
  document.getElementById('message-close').textContent = '好的！';
  document.getElementById('message-next').style.display = showNext ? '' : 'none';
  document.getElementById('message-overlay').style.display = 'flex';
}

function launchStars() {
  const area = document.getElementById('main-area');
  const rect = area.getBoundingClientRect();
  for (let i = 0; i < 12; i++) {
    const star = document.createElement('div');
    star.style.cssText = `
      position:fixed;
      left:${rect.left + Math.random()*rect.width}px;
      top:${rect.top + Math.random()*rect.height}px;
      font-size:${24+Math.random()*20}px;
      pointer-events:none;
      z-index:50;
      animation: starFly 1.2s ease-out forwards;
      animation-delay:${Math.random()*0.4}s;
    `;
    star.textContent = ['⭐','🌟','✨'][Math.floor(Math.random()*3)];
    document.body.appendChild(star);
    setTimeout(() => star.remove(), 1800);
  }
}
