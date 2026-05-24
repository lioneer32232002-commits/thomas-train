// Main application — supports level-select, challenge levels, and free mode

const COLS = 8, ROWS = 5;
let cellSize = 60;
let drawOffsetX = 0, drawOffsetY = 0;   // centres the COLS×ROWS grid in the canvas
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

// ── Message overlay mode ──────────────────────────────────────────────────────
let messageMode = 'info';        // 'info' | 'level-complete' | 'confirm'
let pendingConfirmAction = null;

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
    drawOffsetX = Math.floor((w - COLS * cellSize) / 2);
    drawOffsetY = Math.floor((h - ROWS * cellSize) / 2);
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
    const px = (clientX - rect.left) * scaleX - drawOffsetX;
    const py = (clientY - rect.top)  * scaleY - drawOffsetY;
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
    if (messageMode === 'confirm') {
      // "取消" — just dismiss, do nothing
      messageMode = 'info';
      pendingConfirmAction = null;
      return;
    }
    // In level mode "返回選關" goes back to level select
    if (gameMode === 'level') {
      exitToSelect();
    }
  });
  document.getElementById('message-next').addEventListener('click', () => {
    if (messageMode === 'confirm') {
      document.getElementById('message-overlay').style.display = 'none';
      messageMode = 'info';
      const action = pendingConfirmAction;
      pendingConfirmAction = null;
      if (action) action();
      return;
    }
    onNextLevel();
  });

  // Reset progress button
  document.getElementById('btn-reset').addEventListener('click', () => {
    showConfirm(
      '⚠️',
      '確定要重置所有進度嗎？\n所有關卡和分數都會清除！',
      '確定重置', '取消',
      () => {
        resetProgress();
      }
    );
  });

  // Level select buttons (generated)
  buildLevelSelectUI();
  showLevelSelect();
});

// ── Level Select UI ───────────────────────────────────────────────────────────
function buildLevelSelectUI() {
  updateScoreDisplay();
  const progress = getLevelProgress();
  const groups = { 1: 'ls-g1', 2: 'ls-g2', 3: 'ls-g3', 4: 'ls-g4', 5: 'ls-g5' };

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
  ['ls-g1','ls-g2','ls-g3','ls-g4','ls-g5'].forEach(id => {
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
  if (level.group === 4) {
    const g3Levels = LEVELS.filter(l => l.group === 3);
    const allG3Done = g3Levels.every(l => progress.completed.has(l.id));
    if (!allG3Done) return false;
    const g4Levels = LEVELS.filter(l => l.group === 4);
    const firstG4 = g4Levels[0];
    if (id === firstG4.id) return true;
    return progress.completed.has(id - 1);
  }
  if (level.group === 5) {
    const g4Levels = LEVELS.filter(l => l.group === 4);
    const allG4Done = g4Levels.every(l => progress.completed.has(l.id));
    if (!allG4Done) return false;
    const g5Levels = LEVELS.filter(l => l.group === 5);
    const firstG5 = g5Levels[0];
    if (id === firstG5.id) return true;
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
  updateScoreDisplay();
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
  drawOffsetX = Math.floor((w - COLS * cellSize) / 2);
  drawOffsetY = Math.floor((h - ROWS * cellSize) / 2);
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
  drawOffsetX = Math.floor((w - COLS * cellSize) / 2);
  drawOffsetY = Math.floor((h - ROWS * cellSize) / 2);
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
  animPath.forEach(wp => { wp.x += drawOffsetX; wp.y += drawOffsetY; });

  // Level complete!
  try { playSuccess(); } catch(e) {}
  isRunning = true;
  startTrain(animPath, getLevelCarriageCount(currentLevelId));
  try { setTimeout(startChugSound, 600); } catch(e) {}
  launchStars();
  saveLevelComplete(currentLevelId);

  // Show completion message after one full lap
  const lapMs = Math.ceil(animPath.length / trainSpeed * (1000 / 60));
  completionTimer = setTimeout(() => {
    stopTrain();
    try { stopChugSound(); } catch(e) {}
    isRunning = false;
    showLevelComplete(currentLevelId);
  }, lapMs);
}

function showLevelComplete(levelId) {
  messageMode = 'level-complete';
  const nextId = levelId + 1;
  const hasNext = nextId <= 25;
  const level = getLevelById(levelId);
  const earned = level ? level.group * 10 : 0;
  const totalScore = getScore();
  const maxScore = getMaxScore();

  document.getElementById('message-icon').textContent = '🎉';
  document.getElementById('message-text').textContent =
    `第 ${levelId} 關完成！🚂\n獲得 +${earned} 分！⭐\n總分：${totalScore} / ${maxScore}`;

  document.getElementById('message-close').textContent = '返回選關';
  const nextBtn = document.getElementById('message-next');
  nextBtn.textContent = '下一關 →';
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

// ── Gap hint SVGs ────────────────────────────────────────────────────────────
function getGapHintSVG(type) {
  const svgs = {
    'straight-h': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="20" width="50" height="10" fill="#BCAAA4"/>
      <rect x="7" y="20" width="5" height="10" fill="#6D4C41"/>
      <rect x="19" y="20" width="5" height="10" fill="#6D4C41"/>
      <rect x="31" y="20" width="5" height="10" fill="#6D4C41"/>
      <rect x="43" y="20" width="5" height="10" fill="#6D4C41"/>
      <line x1="0" y1="18" x2="50" y2="18" stroke="#757575" stroke-width="3"/>
      <line x1="0" y1="32" x2="50" y2="32" stroke="#757575" stroke-width="3"/>
    </svg>`,
    'straight-v': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="0" width="10" height="50" fill="#BCAAA4"/>
      <rect x="20" y="7" width="10" height="5" fill="#6D4C41"/>
      <rect x="20" y="19" width="10" height="5" fill="#6D4C41"/>
      <rect x="20" y="31" width="10" height="5" fill="#6D4C41"/>
      <rect x="20" y="43" width="10" height="5" fill="#6D4C41"/>
      <line x1="18" y1="0" x2="18" y2="50" stroke="#757575" stroke-width="3"/>
      <line x1="32" y1="0" x2="32" y2="50" stroke="#757575" stroke-width="3"/>
    </svg>`,
    'curve-ne': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <path d="M 25 0 A 25 25 0 0 0 50 25" stroke="#BCAAA4" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M 31 0 A 19 19 0 0 0 50 19" stroke="#757575" stroke-width="2.5" fill="none"/>
      <path d="M 19 0 A 31 31 0 0 0 50 31" stroke="#757575" stroke-width="2.5" fill="none"/>
    </svg>`,
    'curve-nw': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <path d="M 25 0 A 25 25 0 0 1 0 25" stroke="#BCAAA4" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M 19 0 A 19 19 0 0 1 0 19" stroke="#757575" stroke-width="2.5" fill="none"/>
      <path d="M 31 0 A 31 31 0 0 1 0 31" stroke="#757575" stroke-width="2.5" fill="none"/>
    </svg>`,
    'curve-se': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <path d="M 25 50 A 25 25 0 0 1 50 25" stroke="#BCAAA4" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M 31 50 A 19 19 0 0 1 50 31" stroke="#757575" stroke-width="2.5" fill="none"/>
      <path d="M 19 50 A 31 31 0 0 1 50 19" stroke="#757575" stroke-width="2.5" fill="none"/>
    </svg>`,
    'curve-sw': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <path d="M 25 50 A 25 25 0 0 0 0 25" stroke="#BCAAA4" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M 19 50 A 19 19 0 0 0 0 31" stroke="#757575" stroke-width="2.5" fill="none"/>
      <path d="M 31 50 A 31 31 0 0 0 0 19" stroke="#757575" stroke-width="2.5" fill="none"/>
    </svg>`,
    'tunnel': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="28" width="50" height="22" fill="#BCAAA4"/>
      <path d="M 3 30 Q 25 4 47 30 Z" fill="#78909C"/>
      <ellipse cx="25" cy="30" rx="11" ry="8" fill="#1A1A1A"/>
      <line x1="0" y1="26" x2="50" y2="26" stroke="#757575" stroke-width="3"/>
      <line x1="0" y1="34" x2="50" y2="34" stroke="#757575" stroke-width="3"/>
    </svg>`,
    'bridge': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="30" width="50" height="20" fill="#B3E5FC"/>
      <rect x="6" y="22" width="8" height="28" fill="#9E9E9E"/>
      <rect x="36" y="22" width="8" height="28" fill="#9E9E9E"/>
      <path d="M 10 22 Q 25 6 40 22" stroke="#9E9E9E" stroke-width="3.5" fill="none"/>
      <rect x="0" y="16" width="50" height="8" fill="#BCAAA4"/>
      <line x1="0" y1="14" x2="50" y2="14" stroke="#757575" stroke-width="3"/>
      <line x1="0" y1="26" x2="50" y2="26" stroke="#757575" stroke-width="3"/>
    </svg>`,
    'station': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="18" width="30" height="18" fill="#FFF9C4"/>
      <polygon points="6,18 25,6 44,18" fill="#E53935"/>
      <rect x="20" y="22" width="10" height="8" fill="#90CAF9"/>
      <rect x="0" y="33" width="50" height="10" fill="#BCAAA4"/>
      <line x1="0" y1="31" x2="50" y2="31" stroke="#757575" stroke-width="3"/>
      <line x1="0" y1="43" x2="50" y2="43" stroke="#757575" stroke-width="3"/>
    </svg>`,
    'crossing': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="18" width="50" height="14" fill="#BCAAA4"/>
      <rect x="18" y="0" width="14" height="50" fill="#78909C"/>
      <rect x="18" y="0" width="14" height="4" fill="#F44336"/>
      <rect x="18" y="46" width="14" height="4" fill="#F44336"/>
      <line x1="24" y1="0" x2="24" y2="18" stroke="#FFD700" stroke-width="2.5" stroke-dasharray="4,4"/>
      <line x1="24" y1="32" x2="24" y2="50" stroke="#FFD700" stroke-width="2.5" stroke-dasharray="4,4"/>
      <line x1="0" y1="16" x2="50" y2="16" stroke="#555" stroke-width="2.5"/>
      <line x1="0" y1="34" x2="50" y2="34" stroke="#555" stroke-width="2.5"/>
    </svg>`,
  };
  return svgs[type] || svgs['straight-h'];
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
      el.innerHTML = getGapHintSVG(g.type);
      overlay.appendChild(el);
    }
    // Position (include draw offset so indicator aligns with centred canvas)
    el.style.left   = (drawOffsetX + g.c * cellSize) + 'px';
    el.style.top    = (drawOffsetY + g.r * cellSize) + 'px';
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

function resetProgress() {
  try { localStorage.removeItem('thomas_progress'); } catch(e) {}
  refreshLevelSelectUI();
  updateScoreDisplay();
}

// ── Carriages ────────────────────────────────────────────────────────────────
function getLevelCarriageCount(levelId) {
  const level = getLevelById(levelId);
  if (!level) return 0;
  const groupLevels = LEVELS.filter(l => l.group === level.group);
  return groupLevels.indexOf(level) + 1;  // 1-based position within group
}

// ── Scoring ───────────────────────────────────────────────────────────────────
// Points per group: group × 10  (G1=10, G2=20, G3=30, G4=40, G5=50) → max 750
function getScore() {
  const progress = getLevelProgress();
  return LEVELS.reduce((sum, l) => sum + (progress.completed.has(l.id) ? l.group * 10 : 0), 0);
}

function getMaxScore() {
  return LEVELS.reduce((sum, l) => sum + l.group * 10, 0);
}

function updateScoreDisplay() {
  const el = document.getElementById('ls-score');
  if (el) el.textContent = `⭐ ${getScore()} / ${getMaxScore()} 分`;
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

  // Full-canvas grass background
  gridCtx.fillStyle = '#81C784';
  gridCtx.fillRect(0, 0, w, h);

  // Everything else is drawn relative to the centred grid origin
  gridCtx.save();
  gridCtx.translate(drawOffsetX, drawOffsetY);

  // Grid lines (only within the COLS×ROWS play area)
  gridCtx.strokeStyle = 'rgba(0,100,0,0.15)';
  gridCtx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    gridCtx.beginPath(); gridCtx.moveTo(0, r*c); gridCtx.lineTo(COLS*c, r*c); gridCtx.stroke();
  }
  for (let col = 0; col <= COLS; col++) {
    gridCtx.beginPath(); gridCtx.moveTo(col*c, 0); gridCtx.lineTo(col*c, ROWS*c); gridCtx.stroke();
  }

  // Tracks
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

  // Subtle blue tint on locked preset cells in level mode
  if (gameMode === 'level') {
    levelPreset.forEach(key => {
      if (isGapCell(...key.split(',').map(Number))) return;
      const [r, col] = key.split(',').map(Number);
      gridCtx.fillStyle = 'rgba(21,101,192,0.08)';
      gridCtx.fillRect(col*c, r*c, c, c);
    });
  }

  gridCtx.restore();
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
  animPath.forEach(wp => { wp.x += drawOffsetX; wp.y += drawOffsetY; });

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
  messageMode = 'info';
  document.getElementById('message-icon').textContent = icon;
  document.getElementById('message-text').textContent = text;
  document.getElementById('message-close').textContent = '好的！';
  document.getElementById('message-next').style.display = showNext ? '' : 'none';
  document.getElementById('message-overlay').style.display = 'flex';
}

function showConfirm(icon, text, confirmLabel, cancelLabel, action) {
  messageMode = 'confirm';
  pendingConfirmAction = action;
  document.getElementById('message-icon').textContent = icon;
  document.getElementById('message-text').textContent = text;
  document.getElementById('message-close').textContent = cancelLabel || '取消';
  const nextBtn = document.getElementById('message-next');
  nextBtn.style.display = '';
  nextBtn.textContent = confirmLabel || '確定';
  nextBtn.dataset.nextId = '';
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
