// Main application — supports level-select, challenge levels, and free mode

const COLS = 8, ROWS = 5;
let cellSize = 60;
let drawOffsetX = 0, drawOffsetY = 0;   // centres the COLS×ROWS grid in the canvas
let selectedTool = 'straight-h';
let isDrawing = false;
let isDragging = false;
let isToolbarDragging = false;
let toolbarGhostEl = null;
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
const DINO_SPEED       = 0.28;

let dinoPath      = [];
let dinoLoop_path = [];

let dinoStomps  = [];
let brokenCells = new Set();

let dinoAnimId  = null;
let _dinoWalkerImg = null;
function _getDinoImg() {
  if (!_dinoWalkerImg) {
    _dinoWalkerImg = new Image();
    _dinoWalkerImg.src = 'dino-walker.png';
  }
  return _dinoWalkerImg;
}

// ── Dino species ───────────────────────────────────────────────────────────────
// Each has a blocky draw(ctx, S, attack, swing) renderer (drawn in an upright,
// already-flipped local frame; +x is forward, feet sit a little below origin).
let currentDino = null;
const DINO_TYPES = [
  { key:'trex',    name:'A T-Rex',         emoji:'🦖', warn:'A wild T-Rex appeared!',        draw:_drawDinoTRex },
  { key:'tricera', name:'A Triceratops',   emoji:'🦏', warn:'A Triceratops is charging!',    draw:_drawDinoTricera },
  { key:'bronto',  name:'A Brontosaurus',  emoji:'🦕', warn:'A giant Brontosaurus stomped by!', draw:_drawDinoBronto },
  { key:'ptero',   name:'A Pterodactyl',   emoji:'🦅', warn:'A Pterodactyl is dive-bombing!', draw:_drawDinoPtero },
];

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

  // Toolbar drag-to-select AND drag-and-drop onto canvas
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
    if (toolbarGhostEl) toolbarGhostEl.innerHTML = btn.innerHTML;
  }

  function startToolbarDrag(btn, x, y) {
    isToolbarDragging = true;
    if (toolbarGhostEl) toolbarGhostEl.remove();
    toolbarGhostEl = document.createElement('div');
    toolbarGhostEl.className = 'track-ghost';
    toolbarGhostEl.innerHTML = btn.innerHTML;
    document.body.appendChild(toolbarGhostEl);
    toolbarGhostEl.style.left = (x - 26) + 'px';
    toolbarGhostEl.style.top  = (y - 26) + 'px';
  }

  function moveToolbarGhost(x, y) {
    if (!toolbarGhostEl) return;
    toolbarGhostEl.style.left = (x - 26) + 'px';
    toolbarGhostEl.style.top  = (y - 26) + 'px';
  }

  function endToolbarDrag(x, y) {
    isToolbarDragging = false;
    if (toolbarGhostEl) { toolbarGhostEl.remove(); toolbarGhostEl = null; }
    const rect = gridCanvas.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      isDragging = true;   // treat drop as drag (don't clear filled cell)
      lastPlaced = null;
      placeTile({ clientX: x, clientY: y });
      isDragging = false;
    }
  }

  const trackTools = document.getElementById('track-tools');

  // Touch: press on a toolbar button → start drag
  trackTools.addEventListener('touchstart', e => {
    const btn = e.target.closest('.tool-btn');
    if (!btn) return;
    // individual btn handler already called btn.click() to select — just start ghost
    startToolbarDrag(btn, e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  // Touch: drag across toolbar or onto canvas
  trackTools.addEventListener('touchmove', e => {
    if (!isToolbarDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches[0];
    moveToolbarGhost(t.clientX, t.clientY);
    selectToolAt(t.clientX, t.clientY);
  }, { passive: false });

  // Touch: release — drop on canvas if over it
  document.addEventListener('touchend', e => {
    if (!isToolbarDragging) return;
    const t = e.changedTouches[0];
    endToolbarDrag(t.clientX, t.clientY);
  });

  // Mouse: press on toolbar button → start drag
  trackTools.addEventListener('mousedown', e => {
    const btn = e.target.closest('.tool-btn');
    if (!btn) return;
    startToolbarDrag(btn, e.clientX, e.clientY);
  });

  // Mouse: drag
  document.addEventListener('mousemove', e => {
    if (!isToolbarDragging) return;
    moveToolbarGhost(e.clientX, e.clientY);
    selectToolAt(e.clientX, e.clientY);
  });

  // Mouse: release — drop on canvas if over it
  document.addEventListener('mouseup', e => {
    if (!isToolbarDragging) return;
    endToolbarDrag(e.clientX, e.clientY);
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
      // Cancel — just dismiss, do nothing
      messageMode = 'info';
      pendingConfirmAction = null;
      return;
    }
    if (messageMode === 'dino-repair') {
      // Stay in level so player can fix the broken tracks
      messageMode = 'info';
      return;
    }
    // In level mode go back to level select
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
      'Reset all progress?\nAll levels and scores will be cleared!',
      'Reset', 'Cancel',
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

  // ── Profile select 事件 ────────────────────────────────────────────────────
  document.getElementById('ps-add-btn').addEventListener('click', () => {
    showNameDialog((name, avatar) => {
      createProfile(name, avatar);
      // 直接進入關卡選擇
      refreshLevelSelectUI();
      showLevelSelect();
    });
  });

  // 切換玩家按鈕（關卡選單左上）
  document.getElementById('ls-switch-btn').addEventListener('click', () => {
    showProfileSelect();
  });

  // 開場：先到玩家選擇畫面
  showProfileSelect();
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

// ── Profile Select Screen ─────────────────────────────────────────────────────
function showProfileSelect() {
  gameMode = 'select';
  document.getElementById('profile-select').style.display  = 'flex';
  document.getElementById('level-select').style.display    = 'none';
  document.getElementById('game-screen').style.display     = 'none';
  document.getElementById('message-overlay').style.display = 'none';
  buildProfileCards();
}

function buildProfileCards() {
  const profiles  = getProfiles();
  const container = document.getElementById('ps-cards');
  container.innerHTML = '';

  profiles.forEach(p => {
    const completedCount = p.completed.length;
    const score = LEVELS.reduce(
      (s, l) => s + (p.completed.includes(l.id) ? l.group * 10 : 0), 0);

    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.id = p.id;
    card.innerHTML = `
      <span class="pc-avatar">${p.avatar || '🦖'}</span>
      <div class="pc-info">
        <div class="pc-name">${_esc(p.name)}</div>
        <div class="pc-stats">${completedCount} / 25 levels &nbsp;·&nbsp; ⭐ ${score} pts</div>
      </div>
      <button class="pc-play">Play!</button>
      <button class="pc-del" title="Delete player">🗑️</button>
    `;

    // 點「出發」進入遊戲
    card.querySelector('.pc-play').addEventListener('click', () => {
      setCurrentProfileId(p.id);
      refreshLevelSelectUI();
      showLevelSelect();
    });

    // 點「🗑️」第一下 → 確認狀態；第二下 → 真的刪除
    const delBtn = card.querySelector('.pc-del');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (card.classList.contains('confirming')) {
        deleteProfile(p.id);
        buildProfileCards();
      } else {
        card.classList.add('confirming');
        delBtn.textContent = 'Delete?';
        // 點別處取消
        const cancel = () => {
          card.classList.remove('confirming');
          delBtn.textContent = '🗑️';
          document.removeEventListener('click', cancel);
        };
        setTimeout(() => document.addEventListener('click', cancel), 50);
      }
    });

    container.appendChild(card);
  });

  // 顯示/隱藏「新增玩家」按鈕
  document.getElementById('ps-add-btn').style.display =
    profiles.length < MAX_PROFILES ? '' : 'none';
}

function _esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showNameDialog(onConfirm, onCancel) {
  const dialog   = document.getElementById('name-dialog');
  const input    = document.getElementById('name-input');
  const confirmB = document.getElementById('name-confirm-btn');
  const cancelB  = document.getElementById('name-cancel-btn');
  const emojiEl  = document.getElementById('name-dialog-emoji');

  // 重設狀態
  input.value = '';
  let selectedAvatar = '🦖';
  emojiEl.textContent = selectedAvatar;

  // 恐龍選擇按鈕
  const optBtns = dialog.querySelectorAll('.dino-opt');
  optBtns.forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.emoji === selectedAvatar);
    btn.onclick = () => {
      selectedAvatar = btn.dataset.emoji;
      emojiEl.textContent = selectedAvatar;
      optBtns.forEach(b => b.classList.toggle('selected', b === btn));
    };
  });

  dialog.style.display = 'flex';
  setTimeout(() => input.focus(), 80);

  function doConfirm() {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    dialog.style.display = 'none';
    cleanup();
    onConfirm(name, selectedAvatar);
  }
  function doCancel() {
    dialog.style.display = 'none';
    cleanup();
    if (onCancel) onCancel();
  }
  function cleanup() {
    confirmB.onclick = null; cancelB.onclick = null; input.onkeydown = null;
  }
  confirmB.onclick = doConfirm;
  cancelB.onclick  = doCancel;
  input.onkeydown  = e => { if (e.key === 'Enter') doConfirm(); if (e.key === 'Escape') doCancel(); };
}

// ── Screen transitions ────────────────────────────────────────────────────────
function showLevelSelect() {
  gameMode = 'select';
  currentLevelId = null;
  document.getElementById('profile-select').style.display = 'none';
  document.getElementById('level-select').style.display   = 'flex';
  document.getElementById('game-screen').style.display    = 'none';
  document.getElementById('message-overlay').style.display = 'none';
  // 更新玩家名稱列
  const curP = getCurrentProfile();
  const nameEl = document.getElementById('ls-player-name');
  if (nameEl && curP) nameEl.textContent = `👤 ${curP.name}`;
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
    titleEl.textContent = '🎨 Free Build';
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
  if (levelId === 25) { showAllComplete(); return; }
  messageMode = 'level-complete';
  const nextId = levelId + 1;
  const hasNext = nextId <= 25;
  const level = getLevelById(levelId);
  const earned = level ? level.group * 10 : 0;
  const totalScore = getScore();
  const maxScore = getMaxScore();

  document.getElementById('message-icon').textContent = '🎉';
  document.getElementById('message-text').textContent =
    `Level ${levelId} Complete! 🦖\n+${earned} pts! ⭐\nTotal: ${totalScore} / ${maxScore}`;

  document.getElementById('message-close').textContent = 'Back to Levels';
  const nextBtn = document.getElementById('message-next');
  nextBtn.textContent = 'Next Level →';
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

  const SPECIAL_TYPES = new Set(['tunnel', 'bridge', 'station', 'crossing']);

  // Create/update
  levelGaps.forEach(g => {
    const key = `${g.r},${g.c}`;
    const isSpecial = SPECIAL_TYPES.has(g.type);
    let el = overlay.querySelector(`.gap-indicator[data-key="${key}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'gap-indicator';
      el.dataset.key = key;
      overlay.appendChild(el);
    }
    // Position (include draw offset so indicator aligns with centred canvas)
    el.style.left   = (drawOffsetX + g.c * cellSize) + 'px';
    el.style.top    = (drawOffsetY + g.r * cellSize) + 'px';
    el.style.width  = cellSize + 'px';
    el.style.height = cellSize + 'px';

    // Special types always show their SVG so kids know what to drag.
    // Regular gaps show '?' for higher groups until the hint button is used.
    const _level = getLevelById(currentLevelId);
    const _always = !_level || _level.group === 1;
    const _revealed = _always || hintsRevealed.has(key) || isSpecial;
    if (_revealed) {
      if (!el.querySelector('svg')) el.innerHTML = getGapHintSVG(g.type);
    } else {
      if (!el.querySelector('.gap-question')) el.innerHTML = `<span class="gap-question">?</span>`;
    }

    // Extra styling for special gaps: coloured border to catch attention
    if (isSpecial && !gapFilled.has(key)) {
      el.classList.add('gap-special');
    } else {
      el.classList.remove('gap-special');
    }

    if (gapFilled.has(key)) {
      el.classList.add('filled');
    } else {
      el.classList.remove('filled');
    }
  });

  // Highlight toolbar buttons that match remaining unfilled special gaps
  const neededSpecial = new Set(
    levelGaps
      .filter(g => SPECIAL_TYPES.has(g.type) && !gapFilled.has(`${g.r},${g.c}`))
      .map(g => g.type)
  );
  document.querySelectorAll('#track-tools .tool-btn').forEach(btn => {
    const t = btn.dataset.track;
    if (neededSpecial.has(t)) btn.classList.add('tool-needed');
    else btn.classList.remove('tool-needed');
  });

  updateHintBtn();
}

function clearGapOverlay() {
  const overlay = document.getElementById('gap-overlay');
  if (overlay) overlay.innerHTML = '';
  // Also clear toolbar glow
  document.querySelectorAll('#track-tools .tool-btn.tool-needed')
    .forEach(b => b.classList.remove('tool-needed'));
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
    el.textContent = '✅ Done!';
  } else {
    el.textContent = `${remaining} track${remaining > 1 ? 's' : ''} to go`;
  }
}

// ── Profile System ────────────────────────────────────────────────────────────
const PROFILES_KEY = 'thomas_profiles';
const MAX_PROFILES = 3;

function _loadStore() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { profiles: [], currentId: null };
}
function _saveStore(store) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(store)); } catch(e) {}
}

function getProfiles()         { return _loadStore().profiles; }
function getCurrentProfileId() { return _loadStore().currentId; }
function getCurrentProfile() {
  const s = _loadStore();
  return s.profiles.find(p => p.id === s.currentId) || null;
}
function setCurrentProfileId(id) {
  const s = _loadStore(); s.currentId = id; _saveStore(s);
}
function createProfile(name, avatar) {
  const s = _loadStore();
  if (s.profiles.length >= MAX_PROFILES) return null;
  const id = 'p' + Date.now();
  s.profiles.push({ id, name: name.trim().slice(0, 10), avatar: avatar || '🦖', completed: [], dinoLevels: [] });
  s.currentId = id;
  _saveStore(s);
  return id;
}
function deleteProfile(id) {
  const s = _loadStore();
  s.profiles = s.profiles.filter(p => p.id !== id);
  if (s.currentId === id) s.currentId = s.profiles[0]?.id || null;
  _saveStore(s);
}
function resetCurrentProfile() {
  const s = _loadStore();
  const p = s.profiles.find(pr => pr.id === s.currentId);
  if (p) { p.completed = []; p.dinoLevels = []; }
  _saveStore(s);
}

// ── Progress storage ──────────────────────────────────────────────────────────
function getLevelProgress() {
  const p = getCurrentProfile();
  if (p) return { completed: new Set(p.completed) };
  return { completed: new Set() };
}

function saveLevelComplete(id) {
  const s = _loadStore();
  const p = s.profiles.find(pr => pr.id === s.currentId);
  if (p && !p.completed.includes(id)) p.completed.push(id);
  _saveStore(s);
  updateScoreDisplay();
}

function resetProgress() {
  resetCurrentProfile();
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
  if (el) el.textContent = `⭐ ${getScore()} / ${getMaxScore()} pts`;
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

  // ── Minecraft biome background ──────────────────────────────────────────
  // Sky fills the top margin above the grid; grass fills the grid + below.
  const horizon = Math.max(0, drawOffsetY);
  gridCtx.fillStyle = weatherSky[0];
  gridCtx.fillRect(0, 0, w, h);
  // a slightly lighter sky band near the horizon
  if (horizon > 6) {
    gridCtx.fillStyle = weatherSky[1];
    gridCtx.fillRect(0, Math.max(0, horizon - Math.floor(h * 0.10)), w, Math.floor(h * 0.10));
  }

  // Blocky clouds — only when there's a real sky strip to put them in
  if (horizon > h * 0.12) drawWeatherClouds(gridCtx, w, horizon);

  // Grass-block ground, tiled and aligned to the play grid
  gridCtx.save();
  gridCtx.beginPath(); gridCtx.rect(0, horizon, w, h - horizon); gridCtx.clip();
  const ax = ((drawOffsetX % c) + c) % c;
  const ay = ((drawOffsetY % c) + c) % c;
  for (let gy = ay - c; gy < h; gy += c)
    for (let gx = ax - c; gx < w; gx += c)
      drawGrassBlock(gridCtx, gx, gy, c);
  // dirt rim right under the grass horizon
  gridCtx.fillStyle = 'rgba(92,62,42,0.25)';
  gridCtx.fillRect(0, horizon, w, Math.max(2, Math.floor(c * 0.06)));
  gridCtx.restore();

  updateRain(w, h);
  drawRain(gridCtx, w, h);

  // Dino decorations (blocky idle dinos in the margins)
  drawDinos(gridCtx, w, h);

  // Everything else is drawn relative to the centred grid origin
  gridCtx.save();
  gridCtx.translate(drawOffsetX, drawOffsetY);

  // Play-area block seams (subtle)
  gridCtx.strokeStyle = 'rgba(0,0,0,0.10)';
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
      msg = 'No tracks yet!\nPlace some tracks first! 🎉';
    } else {
      msg = 'Tracks not connected yet!\nLook for any gaps! 🔍';
    }
    try { playError(); } catch(e) {}
    showMessage('😅', msg, false);
    return;
  }

  const loopPath = result.path;
  if (!loopPath || loopPath.length < 2) {
    try { playError(); } catch(e) {}
    showMessage('🤔', 'Loop too short!\nAdd more tracks and try again!', false);
    return;
  }

  const animPath = buildAnimPath(loopPath, cellSize);
  if (!animPath || animPath.length < 4) {
    try { playError(); } catch(e) {}
    showMessage('🤔', 'Something looks off with the tracks.\nGive it another try!', false);
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
  document.getElementById('message-close').textContent = 'OK!';
  document.getElementById('message-next').style.display = showNext ? '' : 'none';
  document.getElementById('message-overlay').style.display = 'flex';
}

function showConfirm(icon, text, confirmLabel, cancelLabel, action) {
  messageMode = 'confirm';
  pendingConfirmAction = action;
  document.getElementById('message-icon').textContent = icon;
  document.getElementById('message-text').textContent = text;
  document.getElementById('message-close').textContent = cancelLabel || 'Cancel';
  const nextBtn = document.getElementById('message-next');
  nextBtn.style.display = '';
  nextBtn.textContent = confirmLabel || 'Confirm';
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
  const baseY = h * 0.07;
  const alpha = weatherType === 'sunny' ? 0.95 : 0.8;
  const clr = weatherType === 'rainy' ? '#B4B4B9' : '#FFFFFF';
  const u = Math.max(8, Math.round(h * 0.022));   // cloud "pixel" size
  // Each cloud = a chunky pixel blob (cols of varying height)
  const clouds = [
    { x: w*0.12, y: baseY,        cols: [1,2,3,3,2,1] },
    { x: w*0.52, y: baseY*0.6,    cols: [1,2,2,3,2,2,1] },
    { x: w*0.80, y: baseY*1.25,   cols: [1,2,2,1] },
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = clr;
  clouds.forEach(cl => {
    cl.cols.forEach((tall, i) => {
      ctx.fillRect(cl.x + i*u, cl.y - tall*u, u, tall*u);
    });
    // a flat base row
    ctx.fillRect(cl.x, cl.y, cl.cols.length*u, u);
  });
  // soft shade on the underside
  ctx.globalAlpha = alpha * 0.25;
  ctx.fillStyle = '#000';
  clouds.forEach(cl => ctx.fillRect(cl.x, cl.y + u*0.6, cl.cols.length*u, u*0.4));
  ctx.restore();
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
  if (typeof DINO_TYPES === 'undefined') return;
  const S = Math.round(Math.min(w, h) * 0.12);
  const lvl = (typeof currentLevelId === 'number' ? currentLevelId : 1);
  const groundY = h - S * 0.7;
  const rightMargin = w - (drawOffsetX + COLS * cellSize);
  // Left margin idle dino (faces right)
  if (drawOffsetX > S * 0.9) {
    ctx.save(); ctx.translate(drawOffsetX * 0.5, groundY);
    DINO_TYPES[lvl % DINO_TYPES.length].draw(ctx, S, 0, 0);
    ctx.restore();
  }
  // Right margin idle dino (faces left)
  if (rightMargin > S * 0.9) {
    ctx.save(); ctx.translate(w - rightMargin * 0.5, groundY); ctx.scale(-1, 1);
    DINO_TYPES[(lvl + 1) % DINO_TYPES.length].draw(ctx, S * 1.05, 0, 0);
    ctx.restore();
  }
}


// ── Dino event ────────────────────────────────────────────────────────────────

function getDinoEventLevels() {
  const s = _loadStore();
  const p = s.profiles.find(pr => pr.id === s.currentId);
  if (!p) return [];
  if (p.dinoLevels && p.dinoLevels.length) return p.dinoLevels;
  // Dinos show up often now: about half of every level from group 2 up,
  // picked randomly per player so two kids get different surprises.
  const pool = LEVELS.filter(l => l.group >= 2).map(l => l.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, Math.max(6, Math.ceil(pool.length * 0.5)));
  p.dinoLevels = picks;
  _saveStore(s);
  return picks;
}

function _startDinoEvent(loopPath, pxPath) {
  dinoPath      = pxPath;
  dinoLoop_path = loopPath;
  dinoRunning   = false;
  brokenCells.clear();

  // Pick a random species for this visit
  currentDino = DINO_TYPES[Math.floor(Math.random() * DINO_TYPES.length)];

  // Vary how many tracks get smashed (2–4) and where along the loop
  const n = loopPath.length;
  const stompCount = 2 + Math.floor(Math.random() * 3);
  const jitter = () => (Math.random() - 0.5) * 0.12;
  const fracs = [];
  for (let i = 0; i < stompCount; i++) {
    fracs.push(Math.min(0.92, Math.max(0.08, (i + 0.5) / stompCount + jitter())));
  }
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
      <div class="dino-warn-icon">${currentDino.emoji}</div>
      <div class="dino-warn-text">⚠️ ${currentDino.warn}</div>
      <div class="dino-warn-sub">Watch out — the rails are in danger!</div>
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
    const legSwing = Math.sin(dinoPos * 0.5) * 8;
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
  _playStompRoar();
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
    const _d = currentDino || DINO_TYPES[0];
    showMessage(_d.emoji, _d.name + ' smashed the rails!\nFix the gaps so the minecart can pass! 🔧', false);
    messageMode = 'dino-repair';  // Override so OK stays in level
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

function _drawDinoWalker(ctx, x, y, angle, attack, swing) {
  ctx.save();
  ctx.translate(x, y);
  const goingLeft = Math.cos(angle) < -0.1;
  if (goingLeft) ctx.scale(-1, 1);
  const sc = 1 + attack * 0.05;
  ctx.scale(sc, sc);
  const S = Math.round((typeof cellSize === 'number' ? cellSize : 60) * 0.9);
  const d = currentDino && currentDino.draw ? currentDino.draw : _drawDinoTRex;
  d(ctx, S, attack, swing);
  ctx.restore();
}

function _dinoShadow(ctx, S, cy) {
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, cy, S * 0.55, S * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

function _drawDinoTRex(ctx, S, attack, swing) {
  const R = (x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
  const G='#5FA83C', D='#3B6B22', B='#C7E6A0', O='#2E5418';
  const bob = Math.sin(swing*0.15)*S*0.03;
  _dinoShadow(ctx, S, S*0.66+bob);
  const lLift = Math.max(0,-Math.sin(swing*0.15))*S*0.12;
  const rLift = attack*S*0.30;
  R(-S*0.16, S*0.10+bob-lLift, S*0.16, S*0.46, D);
  R(-S*0.20, S*0.50+bob-lLift, S*0.26, S*0.10, D);
  R(-S*0.80, -S*0.06+bob, S*0.32, S*0.16, G);
  R(-S*1.00, S*0.04+bob, S*0.24, S*0.14, D);
  R(-S*0.50, -S*0.26+bob, S*0.78, S*0.46, G);
  R(-S*0.42, -S*0.04+bob, S*0.52, S*0.22, B);
  R(S*0.04, S*0.06+bob-rLift, S*0.16, S*0.48, G);
  R(S*0.00, S*0.50+bob-rLift, S*0.28, S*0.10, D);
  R(S*0.10, -S*0.04+bob, S*0.10, S*0.18, D);
  R(S*0.18, -S*0.62+bob, S*0.42, S*0.34, G);
  R(S*0.20, -S*0.60+bob, S*0.38, S*0.06, '#7DC850');
  const jaw = attack*S*0.12;
  R(S*0.52, -S*0.44+bob, S*0.30, S*0.14, G);
  R(S*0.52, -S*0.30+bob+jaw, S*0.28, S*0.08, D);
  R(S*0.58, -S*0.30+bob, S*0.05, S*0.07, '#fff');
  R(S*0.68, -S*0.30+bob, S*0.05, S*0.07, '#fff');
  R(S*0.34, -S*0.54+bob, S*0.12, S*0.12, '#fff');
  R(S*0.40, -S*0.50+bob, S*0.06, S*0.06, '#1A1A1A');
  ctx.strokeStyle=O; ctx.lineWidth=Math.max(1,S*0.02);
  ctx.strokeRect(S*0.18, -S*0.62+bob, S*0.42, S*0.34);
  ctx.strokeRect(-S*0.50, -S*0.26+bob, S*0.78, S*0.46);
}

function _drawDinoTricera(ctx, S, attack, swing) {
  const R = (x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
  const G='#8A9B6E', D='#5E6B47', F='#C2A569', H='#F0EAD6';
  const bob = Math.sin(swing*0.15)*S*0.025;
  const lunge = attack*S*0.14;
  _dinoShadow(ctx, S, S*0.66+bob);
  R(-S*0.40, S*0.16+bob, S*0.16, S*0.40, D);
  R(-S*0.16, S*0.16+bob, S*0.16, S*0.40, D);
  R(S*0.06, S*0.16+bob, S*0.16, S*0.40, D);
  R(S*0.24, S*0.16+bob, S*0.16, S*0.40, D);
  R(-S*0.68, -S*0.04+bob, S*0.24, S*0.16, G);
  R(-S*0.46, -S*0.24+bob, S*0.78, S*0.44, G);
  R(-S*0.40, -S*0.02+bob, S*0.50, S*0.20, '#A7B587');
  const hx=S*0.30+lunge, hy=-S*0.18+bob+lunge*0.4;
  R(hx-S*0.08, hy-S*0.24, S*0.20, S*0.54, F);
  R(hx-S*0.12, hy-S*0.16, S*0.06, S*0.40, D);
  R(hx, hy-S*0.10, S*0.34, S*0.34, G);
  R(hx+S*0.30, hy+S*0.06, S*0.16, S*0.14, D);
  R(hx+S*0.16, hy-S*0.32, S*0.07, S*0.28, H);
  R(hx+S*0.30, hy-S*0.26, S*0.07, S*0.24, H);
  R(hx+S*0.42, hy+S*0.00, S*0.12, S*0.06, H);
  R(hx+S*0.06, hy+S*0.02, S*0.08, S*0.08, '#fff');
  R(hx+S*0.09, hy+S*0.05, S*0.04, S*0.04, '#1A1A1A');
  ctx.strokeStyle=D; ctx.lineWidth=Math.max(1,S*0.02);
  ctx.strokeRect(-S*0.46, -S*0.24+bob, S*0.78, S*0.44);
}

function _drawDinoBronto(ctx, S, attack, swing) {
  const R = (x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
  const G='#6E8FB0', D='#46627E', B='#AEC4DA';
  const bob = Math.sin(swing*0.15)*S*0.02;
  const dip = attack*S*0.5;
  _dinoShadow(ctx, S, S*0.70+bob);
  R(-S*0.42, S*0.18+bob, S*0.18, S*0.46, D);
  R(-S*0.16, S*0.20+bob, S*0.18, S*0.44, D);
  R(S*0.10, S*0.18+bob, S*0.18, S*0.46, D);
  R(S*0.30, S*0.20+bob, S*0.16, S*0.44, D);
  R(-S*0.80, -S*0.02+bob, S*0.36, S*0.16, G);
  R(-S*1.04, S*0.06+bob, S*0.28, S*0.12, D);
  R(-S*0.50, -S*0.30+bob, S*0.92, S*0.50, G);
  R(-S*0.42, -S*0.06+bob, S*0.62, S*0.22, B);
  R(S*0.30, -S*0.62+bob+dip, S*0.18, S*0.40, G);
  R(S*0.40, -S*0.92+bob+dip, S*0.18, S*0.38, G);
  R(S*0.50, -S*1.04+bob+dip, S*0.26, S*0.20, G);
  R(S*0.72, -S*0.98+bob+dip, S*0.12, S*0.10, D);
  R(S*0.58, -S*1.00+bob+dip, S*0.07, S*0.07, '#fff');
  R(S*0.61, -S*0.98+bob+dip, S*0.035, S*0.035, '#1A1A1A');
  ctx.strokeStyle=D; ctx.lineWidth=Math.max(1,S*0.02);
  ctx.strokeRect(-S*0.50, -S*0.30+bob, S*0.92, S*0.50);
}

function _drawDinoPtero(ctx, S, attack, swing) {
  const R = (x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
  const G='#C56A3A', D='#7E3D1F', W='#B5612F', C='#E0A35A';
  const flap = Math.sin(swing*0.25)*S*0.22;
  const dive = attack*S*0.30;
  _dinoShadow(ctx, S, S*0.78);
  ctx.save();
  ctx.translate(0, -S*0.35+dive);
  R(-S*0.70, -S*0.06-flap, S*0.50, S*0.12, D);
  R(-S*0.96, -S*0.02-flap*1.3, S*0.28, S*0.10, D);
  R(-S*0.18, -S*0.12, S*0.40, S*0.26, G);
  R(-S*0.12, -S*0.04, S*0.26, S*0.14, C);
  R(S*0.00, -S*0.06+flap, S*0.55, S*0.12, W);
  R(S*0.50, -S*0.02+flap*1.3, S*0.30, S*0.10, W);
  R(-S*0.05, S*0.12, S*0.07, S*0.16, D);
  R(S*0.08, S*0.12, S*0.07, S*0.16, D);
  R(S*0.18, -S*0.18, S*0.22, S*0.20, G);
  R(S*0.38, -S*0.12, S*0.32, S*0.08, D);
  R(S*0.14, -S*0.30, S*0.16, S*0.10, C);
  R(S*0.26, -S*0.14, S*0.07, S*0.07, '#fff');
  R(S*0.29, -S*0.12, S*0.035, S*0.035, '#1A1A1A');
  ctx.restore();
}

function _playDinoRoar() {
  // Alarm siren: alternating hi-lo beeps
  try {
    const ac = new (window.AudioContext||window.webkitAudioContext)();
    const freqs = [1040, 740, 1040, 740, 1040, 740];
    freqs.forEach((freq, i) => {
      const delay = i * 0.17;
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(freq, ac.currentTime + delay);
      g.gain.setValueAtTime(0.0, ac.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.28, ac.currentTime + delay + 0.04);
      g.gain.setValueAtTime(0.28, ac.currentTime + delay + 0.11);
      g.gain.linearRampToValueAtTime(0.0, ac.currentTime + delay + 0.15);
      o.start(ac.currentTime + delay);
      o.stop(ac.currentTime + delay + 0.16);
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

function _playStompRoar() {
  // Short dinosaur growl: descending sawtooth burst
  try {
    const ac = new (window.AudioContext||window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.45);
    g.gain.setValueAtTime(0.5, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
    o.start(ac.currentTime); o.stop(ac.currentTime + 0.5);
    // Low rumble underneath
    const o2 = ac.createOscillator(), g2 = ac.createGain();
    o2.connect(g2); g2.connect(ac.destination);
    o2.type = 'sine';
    o2.frequency.setValueAtTime(80, ac.currentTime);
    o2.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.4);
    g2.gain.setValueAtTime(0.35, ac.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45);
    o2.start(ac.currentTime + 0.05); o2.stop(ac.currentTime + 0.5);
  } catch(e) {}
}

// ── Grand Finale Celebration ──────────────────────────────────────────────────
let _celebCtx    = null;
let _celebW      = 0;
let _celebH      = 0;
let _celebAnimId = null;
let _celebParts  = [];
let _celebBurst  = 0;

function showAllComplete() {
  document.getElementById('message-overlay').style.display = 'none';
  const overlay = document.getElementById('celebration-overlay');
  document.getElementById('celebration-score').textContent =
    `⭐  ${getScore()} / ${getMaxScore()} pts`;
  overlay.style.display = 'flex';
  _startCelebration();
  _playGrandFanfare();
  document.getElementById('celebration-back').onclick = () => {
    _stopCelebration();
    overlay.style.display = 'none';
    showProfileSelect();
  };
}

function _startCelebration() {
  const canvas = document.getElementById('celebration-canvas');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  _celebCtx = canvas.getContext('2d');
  _celebW = canvas.width;
  _celebH = canvas.height;
  _celebParts = [];
  _celebBurst = 0;
  // Opening volley: 7 bursts spread over first 1.5 s
  for (let i = 0; i < 7; i++) {
    setTimeout(() => { if (_celebCtx) _celebLaunch(); }, i * 210);
  }
  (function frame() {
    _celebCtx.fillStyle = 'rgba(8,8,28,0.17)';
    _celebCtx.fillRect(0, 0, _celebW, _celebH);
    _celebBurst++;
    if (_celebBurst % 54 === 0) _celebLaunch();
    _celebUpdate();
    _celebAnimId = requestAnimationFrame(frame);
  })();
}

function _stopCelebration() {
  if (_celebAnimId) { cancelAnimationFrame(_celebAnimId); _celebAnimId = null; }
  _celebCtx = null;
  _celebParts = [];
}

function _celebLaunch() {
  const x   = _celebW * 0.12 + Math.random() * _celebW * 0.76;
  const y   = _celebH * 0.06 + Math.random() * _celebH * 0.48;
  const hue = Math.random() * 360;
  // Spark burst
  const n = 55 + Math.floor(Math.random() * 35);
  for (let i = 0; i < n; i++) {
    const a   = (Math.PI * 2 * i / n) + (Math.random() - 0.5) * 0.4;
    const spd = 1.8 + Math.random() * 5.5;
    _celebParts.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 1.0, decay: 0.013 + Math.random() * 0.013,
      r: 1.8 + Math.random() * 2.4,
      col: `hsl(${hue + Math.random() * 45},100%,65%)`,
      ribbon: false,
    });
  }
  // Confetti ribbons
  const cols = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6BFF','#FF9A3C','#00E5FF','#FFFFFF'];
  for (let i = 0; i < 24; i++) {
    _celebParts.push({
      x, y,
      vx: (Math.random() - 0.5) * 10,
      vy: -Math.random() * 10 - 1,
      life: 1.0, decay: 0.006 + Math.random() * 0.007,
      r: 0,
      col: cols[Math.floor(Math.random() * cols.length)],
      ribbon: true,
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.28,
      w: 6 + Math.random() * 11,
      h: 3  + Math.random() * 5,
    });
  }
}

function _celebUpdate() {
  const ctx = _celebCtx;
  _celebParts = _celebParts.filter(p => p.life > 0.02);
  for (const p of _celebParts) {
    p.vy += 0.072;
    p.vx *= 0.993; p.vy *= 0.993;
    p.x  += p.vx;  p.y  += p.vy;
    p.life -= p.decay;
    ctx.globalAlpha = Math.min(1, p.life * 0.95);
    if (p.ribbon) {
      p.rot += p.rotSpd;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * Math.max(0.15, p.life), 0, Math.PI * 2);
      ctx.fillStyle = p.col;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function _playGrandFanfare() {
  try {
    const ac = getAudioCtx();
    // Triumphant rising arpeggio: C4 → E4 → G4 → C5 → E5 → G5 → C6 (big sustain)
    const notes = [
      [523,  0.00, 0.50],
      [659,  0.14, 0.50],
      [784,  0.28, 0.52],
      [1047, 0.44, 0.56],
      [1319, 0.58, 0.58],
      [1568, 0.72, 0.62],
      [2093, 0.92, 1.10],  // top note — long hold
    ];
    notes.forEach(([freq, delay, dur]) => {
      [1, 2, 2.756].forEach((ratio, hi) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.value = freq * ratio;
        const vol = [0.28, 0.10, 0.06][hi];
        const t = ac.currentTime + delay;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.start(t); o.stop(t + dur + 0.06);
      });
    });
    // Low bass octave echo on the upper half of melody
    notes.slice(3).forEach(([freq, delay, dur]) => {
      [1, 2].forEach((ratio, hi) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.value = freq * ratio * 0.5;
        const vol = [0.09, 0.04][hi];
        const t = ac.currentTime + delay + 0.18;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.75);
        o.start(t); o.stop(t + dur);
      });
    });
  } catch(e) {}
}
