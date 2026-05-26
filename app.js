// Main application — supports level-select, challenge levels, and free mode

const COLS = 8, ROWS = 5;
let cellSize = 60;
let drawOffsetX = 0, drawOffsetY = 0;   // centres the COLS×ROWS grid in the canvas
let selectedTool = 'straight-h';
let isDrawing = false;
let isDragging = false;
let isToolbarDragging = false;
let isRunning = false;
let gridCanvas, gridCtx;

// ── Weather ────────────────────────────────────────────────────────────────────
let weatherSky = ['#87CEEB','#B8E4F9']; // default sunny
let weatherType = 'sunny';

const WEATHER_CONFIGS = {
  sunny:  { sky: ['#87CEEB','#B8E4F9'], rainChance: 0 },
  cloudy: { sky: ['#B0BEC5','#CFD8DC'], rainChance: 0 },
  rainy:  { sky: ['#78909C','#B0BEC5'], rainChance: 1 },
};
let rainParticles = [];
let weatherAnimId = null;

// ── Mode state ────────────────────────────────────────────────────────────────
let gameMode = 'select';   // 'select' | 'level' | 'free'
let currentLevelId = null;
let levelGaps     = [];    // [{r, c, type}] for current level
let levelPreset   = new Set();  // "r,c" keys that are locked
let gapFilled     = new Set();  // "r,c" keys of correctly filled gaps
let completionTimer = null;

// ── Dino event state ──────────────────────────────────────────────────────────
let dinoEventTriggered = false;
let dinoRunning        = false;
let dinoPos            = 0;
const DINO_SPEED       = 0.10;

let dinoPath      = [];
let dinoLoop_path = [];

let dinoStomps  = [];
let brokenCells = new Set();

let dinoAnimId  = null;

// ── Hint system ───────────────────────────────────────────────────────────────
let hintsRemaining = 0;
let hintsRevealed  = new Set();   // "r,c" keys whose hint icon has been revealed

function getHintQuota(group) {
  return [Infinity, 2, 1, 1, 0][group - 1] ?? 0;
}

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
      applyLevelCentering(w, h, currentLevelId);
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

  // Toolbar drag-to-select
  function selectToolAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const btn = el.closest('.tool-btn');
    if (!btn || btn.disabled || btn.style.display === 'none') return;
    const track = btn.dataset.track;
    if (!track || track === selectedTool) return;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedTool = track;
  }

  const trackTools = document.getElementById('track-tools');
  trackTools.addEventListener('touchmove', e => {
    e.preventDefault();
    e.stopPropagation();
    selectToolAt(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  trackTools.addEventListener('mousedown', () => { isToolbarDragging = true; });
  document.addEventListener('mousemove', e => {
    if (!isToolbarDragging) return;
    selectToolAt(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', () => { isToolbarDragging = false; });

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
      setCell(row, col, selectedTool);
      try { playPlace(); } catch(e) {}
      redrawGrid();
    }
  }

  gridCanvas.addEventListener('mousedown', e => { isDrawing = true; isDragging = false; lastPlaced = null; placeTile(e); });
  gridCanvas.addEventListener('mousemove', e => { if (isDrawing) { isDragging = true; placeTile(e); } });
  window.addEventListener('mouseup', () => { isDrawing = false; isDragging = false; lastPlaced = null; });

  gridCanvas.addEventListener('touchstart', e => { e.preventDefault(); isDrawing = true; isDragging = false; lastPlaced = null; placeTile(e); }, { passive: false });
  gridCanvas.addEventListener('touchmove',  e => { e.preventDefault(); if (isDrawing) { isDragging = true; placeTile(e); } }, { passive: false });
  window.addEventListener('touchend', () => { isDrawing = false; isDragging = false; lastPlaced = null; });

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

  // Hint button
  document.getElementById('btn-hint').addEventListener('click', () => {
    if (hintsRemaining <= 0 || gameMode !== 'level') return;
    const level = getLevelById(currentLevelId);
    if (!level || level.group === 1) return;
    const unrevealed = levelGaps.filter(g =>
      !gapFilled.has(`${g.r},${g.c}`) && !hintsRevealed.has(`${g.r},${g.c}`)
    );
    if (!unrevealed.length) return;
    hintsRevealed.add(`${unrevealed[0].r},${unrevealed[0].c}`);
    if (hintsRemaining !== Infinity) hintsRemaining--;
    updateGapOverlay();
    updateHintBtn();
  });

  // Level select buttons (generated)
  buildLevelSelectUI();
  showLevelSelect();
});

// ── Level centering ───────────────────────────────────────────────────────────
function applyLevelCentering(w, h, levelId) {
  const level = getLevelById(levelId);
  if (!level) return;
  const all = [...level.preset, ...level.gaps];
  if (!all.length) return;
  const minR = Math.min(...all.map(t => t.r));
  const maxR = Math.max(...all.map(t => t.r));
  const minC = Math.min(...all.map(t => t.c));
  const maxC = Math.max(...all.map(t => t.c));
  const levelW = (maxC - minC + 1) * cellSize;
  const levelH = (maxR - minR + 1) * cellSize;
  drawOffsetX = Math.floor((w - levelW) / 2) - minC * cellSize;
  drawOffsetY = Math.floor((h - levelH) / 2) - minR * cellSize;
}

// ── Hint button update ────────────────────────────────────────────────────────
function updateHintBtn() {
  const btn = document.getElementById('btn-hint');
  if (!btn) return;
  const level = getLevelById(currentLevelId);
  if (!level || level.group === 1) { btn.style.display = 'none'; return; }
  btn.style.display = '';
  const countEl = btn.querySelector('.hint-count');
  if (countEl) countEl.textContent = hintsRemaining <= 0 ? '✕' : hintsRemaining;
  btn.disabled = hintsRemaining <= 0;
  btn.style.opacity = hintsRemaining <= 0 ? '0.45' : '1';
}

// ── Toolbar visibility ────────────────────────────────────────────────────────
function updateToolbarVisibility() {
  const progress = getLevelProgress();
  let maxUnlocked = 1;
  for (const level of LEVELS) {
    if (isLevelUnlocked(level.id, progress)) maxUnlocked = Math.max(maxUnlocked, level.id);
  }
  document.querySelectorAll('.tool-btn[data-unlock-level]').forEach(btn => {
    const at = parseInt(btn.dataset.unlockLevel, 10);
    btn.style.display = (maxUnlocked >= at) ? '' : 'none';
  });
  // If selected tool is now hidden, switch to straight-h
  const activeBtn = document.querySelector('.tool-btn.active');
  if (activeBtn && activeBtn.style.display === 'none') {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const fallback = document.querySelector('.tool-btn[data-track="straight-h"]');
    if (fallback) { fallback.classList.add('active'); selectedTool = 'straight-h'; }
  }
}

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
  updateToolbarVisibility();
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
  if (weatherAnimId) { cancelAnimationFrame(weatherAnimId); weatherAnimId = null; }
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

  // Show free-mode header (update text without replacing DOM)
  const titleEl = document.getElementById('level-title-display');
  if (titleEl) {
    titleEl.textContent = '🎨 自由建造';
    titleEl.style.color = '#FFD700';
    titleEl.style.fontSize = '1.2rem';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.textShadow = '1px 1px 4px rgba(0,0,0,0.5)';
  }
  const gapsEl = document.getElementById('gaps-counter');
  if (gapsEl) gapsEl.textContent = '';

  // Hide hint button in free mode
  const hintBtn = document.getElementById('btn-hint');
  if (hintBtn) hintBtn.style.display = 'none';

  // Show test/clear buttons, hide back button area styling
  document.getElementById('btn-test').style.display = '';
  document.getElementById('btn-stop').style.display = 'none';
  document.getElementById('btn-clear').style.display = '';
  clearGapOverlay();

  updateToolbarVisibility();

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
  startWeatherAnim();
}

function startLevel(id) {
  const level = getLevelById(id);
  if (!level) return;

  gameMode = 'level';
  currentLevelId = id;
  isRunning = false;

  // Reset dino event state
  dinoEventTriggered = false;
  dinoRunning = false;
  brokenCells.clear();
  if (dinoAnimId) { cancelAnimationFrame(dinoAnimId); dinoAnimId = null; }

  updateToolbarVisibility();

  // Reset gap tracking
  levelGaps = level.gaps.slice();
  levelPreset.clear();
  gapFilled.clear();
  level.preset.forEach(p => levelPreset.add(`${p.r},${p.c}`));
  levelGaps.forEach(g => levelPreset.add(`${g.r},${g.c}`)); // gaps are also special cells

  // Init hint system
  const _hq = level.group === 1 ? Infinity : getHintQuota(level.group);
  hintsRemaining = _hq;
  hintsRevealed.clear();

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
  applyLevelCentering(w, h, id);
  const gc = document.getElementById('grid-canvas');
  const tc = document.getElementById('train-canvas');
  gc.width = tc.width = w; gc.height = tc.height = h;
  gc.style.width = tc.style.width = w + 'px';
  gc.style.height = tc.style.height = h + 'px';

  initGrid(COLS, ROWS);
  reloadLevelGrid();
  randomWeather();
  redrawGrid();
  updateGapOverlay();
  updateHintBtn();
  startWeatherAnim();

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

  // Single click on a correctly-filled gap with the same tool clears it for re-placement.
  // During drag we skip the clear so dragging over filled gaps doesn't accidentally undo them.
  if (!isDragging && gapFilled.has(key) && getCell(row, col)?.type === selectedTool) {
    gapFilled.delete(key);
    setCell(row, col, null);
    try { playPlace(); } catch(e) {}
    redrawGrid(); updateGapOverlay(); updateGapsCounter(); updateHintBtn();
    return;
  }
  if (isDragging && gapFilled.has(key) && getCell(row, col)?.type === selectedTool) return;

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

  // ── Dino event check ─────────────────────────────────────────────────────
  const _dinoLevels = getDinoEventLevels();
  if (_dinoLevels.includes(currentLevelId) && !dinoEventTriggered) {
    dinoEventTriggered = true;
    const _animPath = animPath.slice();
    _startDinoEvent(result.path, _animPath);
    return;   // don't complete level yet
  }

  // Level complete!
  try { playSuccess(); } catch(e) {}
  isRunning = true;
  startTrain(animPath, getLevelCarriageCount(currentLevelId));
  try { setTimeout(startChugSound, 600); } catch(e) {}
  launchStars();
  saveLevelComplete(currentLevelId);
  updateToolbarVisibility();

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
      const _levelNew = getLevelById(currentLevelId);
      const _alwaysNew = !_levelNew || _levelNew.group === 1;
      if (_alwaysNew || hintsRevealed.has(key)) {
        el.innerHTML = getGapHintSVG(g.type);
      } else {
        el.innerHTML = `<span class="gap-question">?</span>`;
      }
      overlay.appendChild(el);
    }
    // Position (include draw offset so indicator aligns with centred canvas)
    el.style.left   = (drawOffsetX + g.c * cellSize) + 'px';
    el.style.top    = (drawOffsetY + g.r * cellSize) + 'px';
    el.style.width  = cellSize + 'px';
    el.style.height = cellSize + 'px';

    // Always update inner content based on current reveal state
    const _level = getLevelById(currentLevelId);
    const _always = !_level || _level.group === 1;
    const _revealed = _always || hintsRevealed.has(key);
    if (_revealed) {
      if (!el.querySelector('svg')) el.innerHTML = getGapHintSVG(g.type);
    } else {
      if (!el.querySelector('.gap-question')) el.innerHTML = `<span class="gap-question">?</span>`;
    }

    if (gapFilled.has(key)) {
      el.classList.add('filled');
    } else {
      el.classList.remove('filled');
    }
  });
  updateHintBtn();
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
  try { localStorage.removeItem('thomas_dino_levels'); } catch(e) {}
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

  // Full-canvas scene background
  // Sky
  const skyGrad = gridCtx.createLinearGradient(0, 0, 0, h * 0.45);
  skyGrad.addColorStop(0, weatherSky[0]);
  skyGrad.addColorStop(1, weatherSky[1]);
  gridCtx.fillStyle = skyGrad;
  gridCtx.fillRect(0, 0, w, h * 0.45);
  // Ground
  const groundGrad = gridCtx.createLinearGradient(0, h * 0.45, 0, h);
  groundGrad.addColorStop(0, '#6DBF67');
  groundGrad.addColorStop(1, '#4A9E44');
  gridCtx.fillStyle = groundGrad;
  gridCtx.fillRect(0, h * 0.45, w, h * 0.55);
  // Horizon haze
  const hazeGrad = gridCtx.createLinearGradient(0, h*0.38, 0, h*0.52);
  hazeGrad.addColorStop(0, 'rgba(135,206,235,0.3)');
  hazeGrad.addColorStop(1, 'rgba(107,184,103,0)');
  gridCtx.fillStyle = hazeGrad;
  gridCtx.fillRect(0, h*0.38, w, h*0.14);

  // Weather effects (clouds, rain)
  drawWeatherClouds(gridCtx, w, h);
  updateRain(w, h);
  drawRain(gridCtx, w, h);

  // Dino decorations
  drawDinos(gridCtx, w, h);

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

  // Draw crack overlays for dino-broken cells
  brokenCells.forEach(key => {
    const [rc, cc] = key.split(',').map(Number);
    _drawCrackOverlay(gridCtx, cc*c, rc*c, c);
  });

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

// ── Weather functions ─────────────────────────────────────────────────────────
function setWeather(type) {
  weatherType = type;
  const cfg = WEATHER_CONFIGS[type] || WEATHER_CONFIGS.sunny;
  weatherSky = cfg.sky;
  rainParticles = [];
}

function randomWeather() {
  const roll = Math.random();
  if (roll < 0.6) setWeather('sunny');
  else if (roll < 0.85) setWeather('cloudy');
  else setWeather('rainy');
}

function updateRain(w, h) {
  if (weatherType !== 'rainy') return;
  // Spawn new drops
  while (rainParticles.length < 120) {
    rainParticles.push({ x: Math.random()*w, y: Math.random()*h*0.4 - h*0.4, speed: 4+Math.random()*5, len: 8+Math.random()*10 });
  }
  rainParticles.forEach(p => { p.y += p.speed; p.x -= 0.8; });
  rainParticles = rainParticles.filter(p => p.y < h);
}

function drawRain(ctx, w, h) {
  if (weatherType !== 'rainy') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(174,214,241,0.55)';
  ctx.lineWidth = 1.2;
  rainParticles.forEach(p => {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 1, p.y + p.len);
    ctx.stroke();
  });
  ctx.restore();
}

function drawWeatherClouds(ctx, w, h) {
  const baseY = h * 0.08;
  const alpha = weatherType === 'sunny' ? 0.85 : 0.7;
  const clr = weatherType === 'rainy' ? 'rgba(180,180,185,' : 'rgba(255,255,255,';
  const clouds = [
    { x: w*0.12, y: baseY,      r: [30,20,24] },
    { x: w*0.55, y: baseY*0.7,  r: [38,26,30] },
    { x: w*0.82, y: baseY*1.3,  r: [28,18,22] },
  ];
  clouds.forEach(c => {
    ctx.save();
    ctx.globalAlpha = alpha;
    c.r.forEach((r, i) => {
      ctx.fillStyle = clr + (0.7 + i*0.1) + ')';
      ctx.beginPath();
      ctx.arc(c.x + (i-1)*r*0.9, c.y, r, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.restore();
  });
}

function startWeatherAnim() {
  if (weatherAnimId) cancelAnimationFrame(weatherAnimId);
  function loop() {
    if (weatherType === 'rainy' && gameMode !== 'select') {
      redrawGrid();
      weatherAnimId = requestAnimationFrame(loop);
    } else {
      weatherAnimId = null;
    }
  }
  if (weatherType === 'rainy') weatherAnimId = requestAnimationFrame(loop);
}

// ── Dino decorations ──────────────────────────────────────────────────────────
function drawDinos(ctx, w, h) {
  // Dino 1: small T-Rex in bottom-left margin, outside grid
  const s1 = Math.min(w, h) * 0.07;
  const x1 = drawOffsetX * 0.4, y1 = h - s1 * 1.8;
  if (drawOffsetX > s1 * 1.5) _drawTRex(ctx, x1, y1, s1, '#5D8A3C');

  // Dino 2: slightly larger in bottom-right margin
  const s2 = Math.min(w, h) * 0.085;
  const x2 = w - drawOffsetX * 0.5, y2 = h - s2 * 1.6;
  if (drawOffsetX > s2 * 1.5) _drawTRex(ctx, x2, y2, s2, '#7A5C2E', true);
}

function _drawTRex(ctx, cx, baseY, s, color, flip) {
  ctx.save();
  if (flip) { ctx.translate(cx*2, 0); ctx.scale(-1, 1); }
  ctx.fillStyle = color;
  // Body
  ctx.beginPath();
  ctx.ellipse(cx, baseY - s*0.5, s*0.55, s*0.38, -0.1, 0, Math.PI*2);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.ellipse(cx + s*0.55, baseY - s*0.9, s*0.3, s*0.2, 0.3, 0, Math.PI*2);
  ctx.fill();
  // Snout
  ctx.fillRect(cx + s*0.72, baseY - s*0.84, s*0.2, s*0.1);
  // Tail
  ctx.beginPath();
  ctx.moveTo(cx - s*0.55, baseY - s*0.5);
  ctx.lineTo(cx - s*0.95, baseY - s*0.2);
  ctx.lineTo(cx - s*0.7,  baseY - s*0.45);
  ctx.closePath(); ctx.fill();
  // Upper-arm (tiny)
  ctx.beginPath();
  ctx.ellipse(cx + s*0.3, baseY - s*0.4, s*0.1, s*0.06, 0.8, 0, Math.PI*2);
  ctx.fill();
  // Legs
  ctx.fillStyle = color;
  ctx.fillRect(cx - s*0.1, baseY - s*0.15, s*0.14, s*0.55);
  ctx.fillRect(cx + s*0.15, baseY - s*0.05, s*0.14, s*0.45);
  // Feet
  ctx.fillRect(cx - s*0.14, baseY + s*0.38, s*0.22, s*0.07);
  ctx.fillRect(cx + s*0.12, baseY + s*0.38, s*0.22, s*0.07);
  // Eye
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(cx + s*0.65, baseY - s*0.95, s*0.055, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(cx + s*0.67, baseY - s*0.95, s*0.03, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── Dino event ────────────────────────────────────────────────────────────────

function getDinoEventLevels() {
  const KEY = 'thomas_dino_levels';
  try {
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
  // Pick 2 random from groups 4-5
  const pool = LEVELS.filter(l => l.group >= 4).map(l => l.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, 2);
  try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch(e) {}
  return picks;
}

function _startDinoEvent(loopPath, pxPath) {
  dinoPath      = pxPath;
  dinoLoop_path = loopPath;
  dinoRunning   = false;
  brokenCells.clear();

  // Pick 3 stomp positions: tile indices at ~20%, ~50%, ~75% of loop
  const n = loopPath.length;
  const fracs = [0.22, 0.50, 0.76];
  dinoStomps = [];
  const used = new Set();
  fracs.forEach(fr => {
    let best = null;
    for (let delta = 0; delta < n; delta++) {
      for (const sign of [1, -1]) {
        const ti = ((Math.floor(fr * n) + sign * delta) % n + n) % n;
        const [r, c] = loopPath[ti];
        const key = `${r},${c}`;
        if (used.has(key)) continue;
        if (!isPresetCell(r, c)) continue;
        const cell = getCell(r, c);
        if (!cell) continue;
        best = { ti, r, c, origType: cell.type };
        break;
      }
      if (best) break;
    }
    if (best) { used.add(`${best.r},${best.c}`); dinoStomps.push(best); }
  });

  // Assign path fractions for stomp triggers
  const pn = dinoPath.length;
  dinoStomps.forEach(s => {
    s.pathIdx      = Math.floor((s.ti / n) * pn);
    s.phase        = 'pending';
    s.timer        = 0;
    s.animLegRaise = 0;
  });

  // Warning overlay
  const warn = document.createElement('div');
  warn.id = 'dino-warning';
  warn.innerHTML = `
    <div class="dino-warn-box">
      <div class="dino-warn-icon">🦖</div>
      <div class="dino-warn-text">⚠️ 暴龍出現了！</div>
      <div class="dino-warn-sub">快逃！軌道要被踩壞了！</div>
    </div>`;
  document.body.appendChild(warn);
  _playDinoRoar();

  setTimeout(() => {
    warn.style.animation = 'dinoWarnOut 0.4s ease-in forwards';
    setTimeout(() => { warn.remove(); _runDinoLoop(); }, 400);
  }, 2000);
}

function _runDinoLoop() {
  dinoRunning = true;
  dinoPos     = 0;

  function frame() {
    if (!dinoRunning) return;

    trainCtx.clearRect(0, 0, trainCanvas.width, trainCanvas.height);

    const totalPts = dinoPath.length;
    const idx = Math.floor(dinoPos) % totalPts;
    const wp  = dinoPath[idx];
    if (!wp) { dinoAnimId = requestAnimationFrame(frame); return; }

    // Check stomp triggers
    let activeStomps = dinoStomps.filter(s => s.phase !== 'pending' && s.phase !== 'done');
    let currentStomp = activeStomps[0] || null;

    if (!currentStomp) {
      for (const s of dinoStomps) {
        if (s.phase === 'pending' && idx >= s.pathIdx) {
          s.phase = 'raising';
          s.timer = 0;
          currentStomp = s;
          break;
        }
      }
    }

    // Update stomp animation
    let isStomping = false;
    if (currentStomp) {
      currentStomp.timer++;
      if (currentStomp.phase === 'raising') {
        currentStomp.animLegRaise = Math.min(1, currentStomp.timer / 25);
        isStomping = true;
        if (currentStomp.timer >= 30) {
          currentStomp.phase = 'slamming';
          currentStomp.timer = 0;
        }
      } else if (currentStomp.phase === 'slamming') {
        currentStomp.animLegRaise = Math.max(0, 1 - currentStomp.timer / 8);
        isStomping = true;
        if (currentStomp.timer === 3) {
          _doStomp(currentStomp, wp);
        }
        if (currentStomp.timer >= 35) {
          currentStomp.phase = 'done';
          currentStomp = null;
        }
      }
    }

    // Advance position (pause while stomping)
    if (!currentStomp) dinoPos += DINO_SPEED;

    // Draw crack overlays on train canvas so they update smoothly
    brokenCells.forEach(key => {
      const [r2, c2] = key.split(',').map(Number);
      _drawCrackOverlay(trainCtx,
        drawOffsetX + c2 * cellSize,
        drawOffsetY + r2 * cellSize,
        cellSize);
    });

    // Draw T-Rex
    const legSwing = Math.sin(dinoPos * 0.25) * 8;
    _drawDinoWalker(trainCtx, wp.x, wp.y, wp.angle,
                    isStomping ? (currentStomp ? currentStomp.animLegRaise : 0) : 0,
                    legSwing);

    // Check completion
    if (dinoPos >= totalPts) {
      _finishDinoEvent();
      return;
    }

    dinoAnimId = requestAnimationFrame(frame);
  }
  dinoAnimId = requestAnimationFrame(frame);
}

function _doStomp(stomp, wp) {
  const key = `${stomp.r},${stomp.c}`;
  brokenCells.add(key);
  _playDinoStomp();
  _screenShake(10, 400);
  redrawGrid();
}

function _finishDinoEvent() {
  dinoRunning = false;
  cancelAnimationFrame(dinoAnimId);
  trainCtx.clearRect(0, 0, trainCanvas.width, trainCanvas.height);
  brokenCells.clear();

  // Convert stomped preset tiles to new gaps
  dinoStomps.forEach(s => {
    const key = `${s.r},${s.c}`;
    levelPreset.delete(key);
    setCell(s.r, s.c, null);
    levelGaps.push({ r: s.r, c: s.c, type: s.origType });
  });

  redrawGrid();
  updateGapOverlay();
  updateGapsCounter();
  updateHintBtn();

  setTimeout(() => {
    showMessage('🦖', '暴龍踩壞了 3 條軌道！\n幫湯瑪士修好它們！', false);
  }, 300);
}

function _screenShake(intensity, durationMs) {
  const area = document.getElementById('main-area');
  const t0 = performance.now();
  function shake(t) {
    const elapsed = t - t0;
    if (elapsed >= durationMs) { area.style.transform = ''; return; }
    const decay = 1 - elapsed / durationMs;
    const dx = (Math.random() - 0.5) * intensity * decay * 2;
    const dy = (Math.random() - 0.5) * intensity * decay * 2;
    area.style.transform = `translate(${dx}px,${dy}px)`;
    requestAnimationFrame(shake);
  }
  requestAnimationFrame(shake);
}

function _drawCrackOverlay(ctx, x, y, c) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,0,0,0.45)';
  ctx.fillRect(x, y, c, c);
  ctx.strokeStyle = '#B71C1C';
  ctx.lineWidth = Math.max(2, c * 0.025);
  const cks = [
    [[0.15,0.25],[0.48,0.52],[0.82,0.42]],
    [[0.48,0.52],[0.38,0.82]],
    [[0.28,0.38],[0.48,0.52],[0.62,0.28]],
    [[0.48,0.52],[0.72,0.72]],
  ];
  cks.forEach(pts => {
    ctx.beginPath();
    ctx.moveTo(x + c*pts[0][0], y + c*pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(x + c*pts[i][0], y + c*pts[i][1]);
    ctx.stroke();
  });
  ctx.fillStyle = '#6D4C41';
  [[0.2,0.8],[0.75,0.85],[0.85,0.2],[0.1,0.5]].forEach(([fx,fy]) => {
    ctx.beginPath(); ctx.arc(x+c*fx, y+c*fy, c*0.035, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function _drawDinoWalker(ctx, x, y, angle, legRaise, legSwing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const S = 1.6;
  ctx.scale(S, S);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 32, 32, 9, 0, 0, Math.PI*2); ctx.fill();

  // Body
  ctx.fillStyle = '#4E342E';
  ctx.beginPath(); ctx.ellipse(-4, 0, 30, 20, -0.1, 0, Math.PI*2); ctx.fill();

  // Tail
  ctx.beginPath();
  ctx.moveTo(-28, 2);
  ctx.bezierCurveTo(-42, 6, -54, -4, -58, -12);
  ctx.bezierCurveTo(-54, -6, -44, 10, -28, 10);
  ctx.fill();

  // Head
  ctx.fillStyle = '#4E342E';
  ctx.beginPath(); ctx.ellipse(22, -16, 20, 13, 0.35, 0, Math.PI*2); ctx.fill();

  // Snout
  ctx.fillStyle = '#6D4C41';
  ctx.beginPath(); ctx.ellipse(38, -13, 13, 7, 0.15, 0, Math.PI*2); ctx.fill();

  // Lower jaw (open slightly during stomp)
  ctx.fillStyle = '#5D4037';
  const jawAngle = legRaise * 0.3;
  ctx.save(); ctx.translate(28,-10); ctx.rotate(jawAngle);
  ctx.beginPath(); ctx.ellipse(10,-4,12,5,0.15,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#FFFDE7';
  for(let i=0;i<4;i++){
    ctx.beginPath(); ctx.moveTo(i*6,0); ctx.lineTo(i*6+3,6); ctx.lineTo(i*6+6,0); ctx.fill();
  }
  ctx.restore();

  // Eye (angry)
  ctx.fillStyle = '#FFEB3B';
  ctx.beginPath(); ctx.ellipse(18, -22, 6, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#E53935';
  ctx.beginPath(); ctx.ellipse(19, -22, 4, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(20, -22, 2, 0, Math.PI*2); ctx.fill();
  // Angry brow
  ctx.strokeStyle='#3E2723'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(12,-29); ctx.lineTo(26,-25); ctx.stroke();

  // Tiny arms
  ctx.fillStyle='#5D4037';
  ctx.beginPath(); ctx.ellipse(14, 4, 8, 5, 0.9, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#3E2723';
  ctx.fillRect(19, 7, 5, 3); ctx.fillRect(22, 9, 4, 3);

  // Legs
  const raisedY = 14 - legRaise * 18;
  const raisedH = 22 + legRaise * 4;

  // Left leg (walking swing)
  ctx.fillStyle='#4E342E';
  ctx.fillRect(-10, 16, 11, 20 + Math.max(0, legSwing * 0.4));
  ctx.fillStyle='#3E2723'; ctx.fillRect(-13, 35+Math.max(0,legSwing*0.4), 17, 7);

  // Right leg (stomp leg)
  ctx.fillStyle='#4E342E';
  ctx.fillRect(4, raisedY, 11, raisedH);
  ctx.fillStyle='#3E2723'; ctx.fillRect(2, raisedY+raisedH, 17, 7);

  // Impact dust when slamming
  if (legRaise < 0.15 && legRaise >= 0) {
    ctx.fillStyle='rgba(120,80,40,0.55)';
    for(let d=0;d<5;d++){
      const a=d/5*Math.PI*2, dist=20*(0.15-legRaise)/0.15;
      ctx.beginPath(); ctx.arc(10+Math.cos(a)*dist, 44+Math.sin(a)*dist*0.4, 3+d, 0, Math.PI*2); ctx.fill();
    }
  }

  ctx.restore();
}

function _playDinoRoar() {
  try {
    const ac = new (window.AudioContext||window.webkitAudioContext)();
    [0, 0.15, 0.35].forEach(delay => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(90 - delay*60, ac.currentTime+delay);
      o.frequency.exponentialRampToValueAtTime(35, ac.currentTime+delay+0.7);
      g.gain.setValueAtTime(0.55, ac.currentTime+delay);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+delay+0.9);
      o.start(ac.currentTime+delay); o.stop(ac.currentTime+delay+0.9);
    });
  } catch(e) {}
}

function _playDinoStomp() {
  try {
    const ac = new (window.AudioContext||window.webkitAudioContext)();
    // Deep thud
    const o=ac.createOscillator(), g=ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type='sine';
    o.frequency.setValueAtTime(55, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(18, ac.currentTime+0.35);
    g.gain.setValueAtTime(0.9, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.5);
    o.start(ac.currentTime); o.stop(ac.currentTime+0.5);
    // Crack noise burst
    const len=ac.sampleRate*0.18, buf=ac.createBuffer(1,len,ac.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2)*0.7;
    const src=ac.createBufferSource();
    const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=600; bp.Q.value=1.5;
    src.buffer=buf; src.connect(bp); bp.connect(ac.destination);
    src.start(ac.currentTime+0.03);
  } catch(e) {}
}
