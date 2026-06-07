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

// ── Biome / ambient ─────────────────────────────────────────────────────────
let weatherSky = ['#87CEEB','#B8E4F9']; // current sky gradient (set from biome)
let ambientType = 'none';               // 'none'|'snow'|'leaves'|'ember'
let ambientParticles = [];
let weatherAnimId = null;

// Each difficulty group lives in its own climate.
const BIOME_BY_GROUP = { 1:'plains', 2:'desert', 3:'snow', 4:'jungle', 5:'volcano' };

function applyBiome(group) {
  activeBiome = BIOME_BY_GROUP[group] || 'plains';
  const b = getBiome();
  weatherSky = b.sky;
  ambientType = b.ambient || 'none';
  ambientParticles = [];
}

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
let dinoDebris  = [];   // flying voxel chunks from smashed rails

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
    cellSize = Math.floor(Math.min(w / (COLS + 2), h / (ROWS + 1.8)));   // reserve margin for scenery
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
  document.getElementById('btn-dino-dex').addEventListener('click', showDinoDex);
  document.getElementById('dex-close').addEventListener('click', () => {
    document.getElementById('dex-overlay').style.display = 'none';
  });
  document.getElementById('btn-stickers').addEventListener('click', showStickerWall);
  document.getElementById('sticker-close').addEventListener('click', () => {
    document.getElementById('sticker-overlay').style.display = 'none';
  });
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
  cellSize = Math.floor(Math.min(w / (COLS + 2), h / (ROWS + 1.8)));   // reserve margin for scenery
  drawOffsetX = Math.floor((w - COLS * cellSize) / 2);
  drawOffsetY = Math.floor((h - ROWS * cellSize) / 2);
  const gc = document.getElementById('grid-canvas');
  const tc = document.getElementById('train-canvas');
  gc.width = tc.width = w; gc.height = tc.height = h;
  gc.style.width = tc.style.width = w + 'px';
  gc.style.height = tc.style.height = h + 'px';
  initGrid(COLS, ROWS);
  applyBiome(1);   // Creative mode → sunny plains
  redrawGrid();
  startAmbientAnim();
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
  cellSize = Math.floor(Math.min(w / (COLS + 2), h / (ROWS + 1.8)));   // reserve margin for scenery
  applyLevelCentering(w, h, id);
  const gc = document.getElementById('grid-canvas');
  const tc = document.getElementById('train-canvas');
  gc.width = tc.width = w; gc.height = tc.height = h;
  gc.style.width = tc.style.width = w + 'px';
  gc.style.height = tc.style.height = h + 'px';

  initGrid(COLS, ROWS);
  reloadLevelGrid();
  applyBiome(level.group);
  redrawGrid();
  updateGapOverlay();
  updateHintBtn();
  startAmbientAnim();

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

  document.getElementById('message-icon').textContent = _stickerFor(levelId);
  document.getElementById('message-text').textContent =
    `Level ${levelId} Complete! 🦖\n+${earned} pts! ⭐\n🏆 New sticker: ${_stickerFor(levelId)}\nTotal: ${totalScore} / ${maxScore}`;

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
    'cross': `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="20" width="50" height="10" fill="#BCAAA4"/>
      <rect x="20" y="0" width="10" height="50" fill="#BCAAA4"/>
      <line x1="0" y1="18" x2="50" y2="18" stroke="#757575" stroke-width="3"/>
      <line x1="0" y1="32" x2="50" y2="32" stroke="#757575" stroke-width="3"/>
      <line x1="18" y1="0" x2="18" y2="50" stroke="#757575" stroke-width="3"/>
      <line x1="32" y1="0" x2="32" y2="50" stroke="#757575" stroke-width="3"/>
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

  const SPECIAL_TYPES = new Set(['tunnel', 'bridge', 'station', 'crossing', 'cross']);

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
  s.profiles.push({ id, name: name.trim().slice(0, 10), avatar: avatar || '🦖', completed: [], dinoLevels: [], dinoDex: [] });
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
  if (p) { p.completed = []; p.dinoLevels = []; p.dinoDex = []; }
  _saveStore(s);
}

// ── Dino Dex (collect each species you meet) ──────────────────────────────────
function getDinoDex() {
  const p = getCurrentProfile();
  return new Set((p && p.dinoDex) || []);
}
function _recordDinoSeen(key) {
  const s = _loadStore();
  const p = s.profiles.find(pr => pr.id === s.currentId);
  if (!p) return false;
  if (!p.dinoDex) p.dinoDex = [];
  if (p.dinoDex.includes(key)) return false;
  p.dinoDex.push(key);
  _saveStore(s);
  return true;
}
function _showDinoDiscovered() {
  const dino = DINO_TYPES.find(d => d.key === (currentDino && currentDino.key)) || currentDino;
  if (!dino) return;
  const dex = getDinoDex();
  const all = DINO_TYPES.every(d => dex.has(d.key));
  showDesc(all
    ? `🏆 ${dino.name} added — Dino Dex COMPLETE!`
    : `📖 New dino! ${dino.name} added to your Dex (${dex.size}/${DINO_TYPES.length})`);
  try { _playSpeciesRoar(dino.key); } catch (e) {}
}

function _drawDexPortrait(ctx, w, h, dino, locked) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  const S = Math.min(w, h) * 0.40;
  ctx.translate(w * 0.52, h * 0.74);
  try { dino.draw(ctx, S, 0, 0); } catch (e) {}
  ctx.restore();
  if (locked) {
    // Recolour every drawn pixel into a dark silhouette
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#2f2f3a';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    ctx.fillStyle = '#FCD63F';
    ctx.font = `bold ${Math.round(h * 0.34)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', w * 0.52, h * 0.55);
  }
}

function showDinoDex() {
  const dex = getDinoDex();
  const wrap = document.getElementById('dex-cards');
  if (!wrap) return;
  wrap.innerHTML = '';
  DINO_TYPES.forEach(d => {
    const unlocked = dex.has(d.key);
    const card = document.createElement('div');
    card.className = 'collect-card ' + (unlocked ? 'unlocked' : 'locked');
    const cv = document.createElement('canvas');
    cv.width = 150; cv.height = 120; cv.className = 'dex-portrait';
    card.appendChild(cv);
    const name = document.createElement('div');
    name.className = 'collect-name';
    name.textContent = unlocked ? d.name : '? ? ?';
    card.appendChild(name);
    wrap.appendChild(card);
    _drawDexPortrait(cv.getContext('2d'), cv.width, cv.height, d, !unlocked);
    if (unlocked) {
      card.title = 'Tap to hear its roar!';
      card.addEventListener('click', () => { try { _playSpeciesRoar(d.key); } catch (e) {} });
    }
  });
  const all = DINO_TYPES.every(d => dex.has(d.key));
  document.getElementById('dex-progress').textContent =
    all ? '🎉 All dinos collected — Dino Master!' : `Collected ${dex.size} / ${DINO_TYPES.length} — tap a dino to hear it!`;
  document.getElementById('dex-overlay').style.display = 'flex';
}

// ── Sticker wall (one fun sticker per completed level) ────────────────────────
const STICKERS = [
  '🦖','🦕','🥚','🦴','🌋','❄️','🌴','🌵','⭐','🌟',
  '🍃','🦎','🐉','🪨','🏔️','🌺','🦅','🌞','🍀','💎',
  '🦣','🐲','🥇','👑','🏆',
];
function _stickerFor(id) { return STICKERS[(id - 1) % STICKERS.length]; }

function showStickerWall() {
  const progress = getLevelProgress();
  const grid = document.getElementById('sticker-grid');
  if (!grid) return;
  grid.innerHTML = '';
  LEVELS.forEach(l => {
    const earned = progress.completed.has(l.id);
    const cell = document.createElement('div');
    cell.className = 'sticker-slot ' + (earned ? 'earned' : 'locked');
    cell.textContent = earned ? _stickerFor(l.id) : '🔒';
    cell.title = earned ? `Level ${l.id}` : `Level ${l.id} — not done yet`;
    grid.appendChild(cell);
  });
  const done = progress.completed.size;
  document.getElementById('sticker-progress').textContent =
    done >= LEVELS.length ? '🌟 Full wall! Every sticker earned!' : `${done} / ${LEVELS.length} stickers earned`;
  document.getElementById('sticker-overlay').style.display = 'flex';
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

  // Biome-block ground, tiled and aligned to the play grid
  gridCtx.save();
  gridCtx.beginPath(); gridCtx.rect(0, horizon, w, h - horizon); gridCtx.clip();
  const ax = ((drawOffsetX % c) + c) % c;
  const ay = ((drawOffsetY % c) + c) % c;
  for (let gy = ay - c; gy < h; gy += c)
    for (let gx = ax - c; gx < w; gx += c)
      drawGroundBlock(gridCtx, gx, gy, c);
  // dirt rim right under the horizon
  gridCtx.fillStyle = 'rgba(92,62,42,0.25)';
  gridCtx.fillRect(0, horizon, w, Math.max(2, Math.floor(c * 0.06)));
  gridCtx.restore();

  updateAmbient(w, h);
  drawAmbient(gridCtx, w, h);

  // Biome scenery + creatures filling the side margins (and sky band if any)
  drawBiomeBackground(gridCtx, w, h);

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

// ── Ambient particles (biome-driven: snow / leaves / embers) ──────────────────
function updateAmbient(w, h) {
  if (ambientType === 'none') return;
  const cap = ambientType === 'ember' ? 70 : 110;
  while (ambientParticles.length < cap) {
    if (ambientType === 'ember') {
      ambientParticles.push({ x: Math.random()*w, y: h*0.5 + Math.random()*h*0.5,
        vx: (Math.random()-0.5)*0.5, vy: -(0.6+Math.random()*1.4),
        s: 2+Math.random()*3, life: 1 });
    } else if (ambientType === 'snow') {
      ambientParticles.push({ x: Math.random()*w, y: -10 - Math.random()*h*0.3,
        vx: (Math.random()-0.5)*0.5, vy: 1+Math.random()*1.5,
        s: 2+Math.random()*3, sway: Math.random()*Math.PI*2 });
    } else { // leaves
      ambientParticles.push({ x: Math.random()*w, y: -10 - Math.random()*h*0.3,
        vx: (Math.random()-0.5)*0.9, vy: 0.8+Math.random()*1.3,
        s: 3+Math.random()*4, rot: Math.random()*6, vr: (Math.random()-0.5)*0.2,
        col: Math.random()<0.5 ? '#5FB04C' : '#E0A35A' });
    }
  }
  ambientParticles.forEach(p => {
    if (ambientType === 'ember')      { p.y += p.vy; p.x += p.vx; p.life -= 0.012; }
    else if (ambientType === 'snow')  { p.sway += 0.05; p.y += p.vy; p.x += p.vx + Math.sin(p.sway)*0.4; }
    else                              { p.rot += p.vr; p.y += p.vy; p.x += p.vx; }
  });
  ambientParticles = ambientParticles.filter(p =>
    ambientType === 'ember' ? p.life > 0 : p.y < h + 12);
}

function drawAmbient(ctx, w, h) {
  if (ambientType === 'none') return;
  ctx.save();
  ambientParticles.forEach(p => {
    if (ambientType === 'ember') {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = (p.life > 0.6) ? '#FFD27A' : '#FF7A30';
      ctx.fillRect(p.x, p.y, p.s, p.s);
    } else if (ambientType === 'snow') {
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(p.x, p.y, p.s, p.s);
    } else {
      ctx.globalAlpha = 0.9;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col; ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s*0.6);
      ctx.restore();
    }
  });
  ctx.restore();
}

function drawWeatherClouds(ctx, w, h) {
  const b = getBiome();
  const baseY = h * 0.07;
  const alpha = (activeBiome === 'volcano') ? 0.7 : 0.92;
  const clr = b.cloud || '#FFFFFF';
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

function startAmbientAnim() {
  if (weatherAnimId) cancelAnimationFrame(weatherAnimId);
  function loop() {
    if (ambientType !== 'none' && gameMode !== 'select') {
      redrawGrid();
      weatherAnimId = requestAnimationFrame(loop);
    } else {
      weatherAnimId = null;
    }
  }
  if (ambientType !== 'none') weatherAnimId = requestAnimationFrame(loop);
}

// ── Biome background: fill the side margins (always visible) with blocky props
//    and several creatures, plus a couple of props in the sky band when present.
const SCENE_KINDS = {
  plains:  ['tree', 'critter', 'bush', 'dino', 'tree', 'critter'],
  desert:  ['cactus', 'critter', 'rock', 'dino', 'cactus', 'critter'],
  snow:    ['pine', 'snowman', 'critter', 'dino', 'pine', 'critter'],
  jungle:  ['jtree', 'critter', 'bird', 'dino', 'jtree', 'critter'],
  volcano: ['volcano', 'rock', 'critter', 'dino', 'rock', 'critter'],
};
// Per-biome critter colours (so the little background animals match the climate)
const CRITTER_COLORS = {
  plains:  ['#5FA83C', '#3B6B22'], desert: ['#C9A24E', '#9A7A30'],
  snow:    ['#FFFFFF', '#CBDBE7'], jungle: ['#E0533A', '#9E2E1C'],
  volcano: ['#7A4A3A', '#3B231C'],
};

function drawBiomeBackground(ctx, w, h) {
  const gridLeft  = drawOffsetX;
  const gridRight = drawOffsetX + COLS * cellSize;
  const baseY = h - Math.max(3, Math.round(h * 0.02));
  const u = Math.max(5, Math.round(Math.min(w, h) * 0.05));
  ctx.save();
  if (gridLeft > u * 2.4)        _populateMargin(ctx, 0, gridLeft, baseY, u, 0);
  if (w - gridRight > u * 2.4)   _populateMargin(ctx, gridRight, w, baseY, u, 1);
  // A few props sitting up on the sky band when there's room above the grid
  const horizon = Math.max(0, drawOffsetY);
  if (horizon > h * 0.16) _skyProps(ctx, w, horizon, Math.max(4, Math.round(horizon * 0.08)));
  ctx.restore();
}

function _populateMargin(ctx, x0, x1, baseY, u, side) {
  const span = x1 - x0;
  const slots = Math.max(2, Math.min(5, Math.floor(span / (u * 3.0))));
  const kinds = SCENE_KINDS[activeBiome] || SCENE_KINDS.plains;
  const R = (x, y, ww, hh, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh));
  };
  for (let i = 0; i < slots; i++) {
    const x = x0 + span * (i + 0.5) / slots;
    const seed = i + side * 3;
    const size = u * ((seed % 2 === 0) ? 1.15 : 0.85);
    _biomeItem(ctx, R, kinds[seed % kinds.length], x, baseY, size, side);
  }
}

function _biomeItem(ctx, R, kind, x, baseY, u, side) {
  const cc = CRITTER_COLORS[activeBiome] || CRITTER_COLORS.plains;
  switch (kind) {
    case 'tree':    _propTree(R, x, baseY, u, '#3B6B22', '#5FA83C'); break;
    case 'jtree':   _propTree(R, x, baseY, u, '#1F4D17', '#3F7F33'); break;
    case 'bush':    _propBush(R, x, baseY, u); break;
    case 'cactus':  _propCactus(R, x, baseY, u); break;
    case 'pine':    _propPine(R, x, baseY, u); break;
    case 'snowman': _propSnowman(R, x, baseY, u); break;
    case 'volcano': _propVolcano(R, x, baseY, u * 1.3); break;
    case 'rock':    _propRock(R, x, baseY, u); break;
    case 'bird':    _propBird(R, x, baseY - u * 2.2, u); break;
    case 'critter': _propCritter(R, x, baseY, u, cc[0], cc[1]); break;
    case 'dino':    _bigCreature(ctx, x, baseY, u, side); break;
  }
}

// A big blocky idle dino (one of the 4 species), biome-flavoured, facing inward
function _bigCreature(ctx, x, baseY, u, side) {
  if (typeof DINO_TYPES === 'undefined') return;
  const S = u * 2.6;
  const lvl = (typeof currentLevelId === 'number' ? currentLevelId : 1);
  const idx = (lvl + Math.round(x)) % DINO_TYPES.length;
  ctx.save();
  ctx.translate(x, baseY - S * 0.02);
  if (side === 1) ctx.scale(-1, 1);   // right-margin creatures face left
  try { DINO_TYPES[idx].draw(ctx, S, 0, 0); } catch (e) {}
  ctx.restore();
}

function _skyProps(ctx, w, horizon, u) {
  const R = (x, y, ww, hh, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh));
  };
  if (activeBiome === 'desert') _propSun(R, w * 0.85, horizon * 0.34, u * 1.2);
  if (activeBiome === 'jungle') _propBird(R, w * 0.5, horizon * 0.5, u);
  if (activeBiome === 'volcano') _propVolcano(R, w * 0.5, horizon, u * 1.1);
}

function _propSnowman(R, x, baseY, u) {
  R(x - u*0.9,  baseY - u*1.7, u*1.8, u*1.7, '#FFFFFF');   // bottom ball
  R(x - u*0.65, baseY - u*3.0, u*1.3, u*1.3, '#FFFFFF');   // middle
  R(x - u*0.45, baseY - u*4.0, u*0.9, u*1.0, '#FFFFFF');   // head
  R(x - u*0.9,  baseY - u*0.4, u*1.8, u*0.4, '#DCEBF5');   // shaded base
  // coal eyes + buttons
  R(x - u*0.22, baseY - u*3.75, u*0.18, u*0.18, '#1A1A1A');
  R(x + u*0.06, baseY - u*3.75, u*0.18, u*0.18, '#1A1A1A');
  R(x - u*0.08, baseY - u*2.9,  u*0.16, u*0.16, '#1A1A1A');
  R(x - u*0.08, baseY - u*2.45, u*0.16, u*0.16, '#1A1A1A');
  // carrot nose
  R(x + u*0.05, baseY - u*3.5, u*0.5, u*0.16, '#FF7A30');
  // top hat
  R(x - u*0.6, baseY - u*4.5, u*1.2, u*0.3, '#1A1A1A');
  R(x - u*0.4, baseY - u*5.1, u*0.8, u*0.7, '#1A1A1A');
}

function _propTree(R, x, baseY, u, dark, light) {
  R(x - u*0.4, baseY - u*2.2, u*0.8, u*2.2, '#6E4A28');     // trunk
  R(x - u*1.6, baseY - u*3.4, u*3.2, u*1.3, dark);          // canopy base
  R(x - u*1.1, baseY - u*4.4, u*2.2, u*1.1, light);         // canopy mid
  R(x - u*0.6, baseY - u*5.1, u*1.2, u*0.8, light);         // canopy top
}
function _propBush(R, x, baseY, u) {
  R(x - u, baseY - u*1.2, u*2, u*1.2, '#3F7F33');
  R(x - u*0.6, baseY - u*1.6, u*1.2, u*0.5, '#5FB04C');
}
function _propCactus(R, x, baseY, u) {
  const g = '#3E8E41';
  R(x - u*0.4, baseY - u*3, u*0.8, u*3, g);
  R(x - u*0.4, baseY - u*3, u*0.8, u*0.4, '#56A85B');
  R(x - u*1.3, baseY - u*2.2, u*0.9, u*0.55, g); R(x - u*1.3, baseY - u*2.6, u*0.5, u*1, g);
  R(x + u*0.5, baseY - u*1.8, u*0.9, u*0.55, g); R(x + u*0.9, baseY - u*2.6, u*0.5, u*1.2, g);
}
function _propSun(R, x, y, u) {
  R(x - u, y - u, u*2, u*2, '#FFD54A');
  R(x - u*0.6, y - u*1.4, u*1.2, u*0.4, '#FFE89A');
}
function _propPine(R, x, baseY, u) {
  const g = '#2F6B3A', cap = '#FFFFFF';
  R(x - u*0.4, baseY - u, u*0.8, u, '#5A3E22');
  R(x - u*1.6, baseY - u*2.0, u*3.2, u*1.0, g);
  R(x - u*1.2, baseY - u*3.0, u*2.4, u*1.0, g);
  R(x - u*0.8, baseY - u*3.9, u*1.6, u*1.0, g);
  R(x - u*1.6, baseY - u*2.0, u*3.2, u*0.3, cap);
  R(x - u*1.2, baseY - u*3.0, u*2.4, u*0.3, cap);
  R(x - u*0.8, baseY - u*3.9, u*1.6, u*0.3, cap);
  R(x - u*0.5, baseY - u*4.4, u*1.0, u*0.5, cap);
}
function _propVolcano(R, x, baseY, u) {
  const rock = '#3B302D', rockL = '#4E403C';
  for (let i = 0; i < 4; i++) {
    const wRow = u*(5 - i*0.9);
    R(x - wRow/2, baseY - u*(i+1), wRow, u, i%2 ? rock : rockL);
  }
  R(x - u*1.2, baseY - u*4.0, u*2.4, u*0.6, '#FF7A30');     // crater glow
  R(x - u*0.7, baseY - u*4.3, u*1.4, u*0.4, '#FFD27A');
  R(x - u*1.6, baseY - u*3.2, u*0.4, u*1.4, '#FF5A20');     // lava drips
  R(x + u*1.0, baseY - u*2.6, u*0.35, u*1.0, '#FF5A20');
  R(x - u*0.8, baseY - u*5.2, u*1.6, u*0.8, 'rgba(90,70,64,0.85)');  // smoke
  R(x - u*0.3, baseY - u*6.0, u*1.0, u*0.7, 'rgba(110,90,84,0.7)');
}
function _propRock(R, x, baseY, u) {
  R(x - u, baseY - u*1.2, u*2, u*1.2, '#3B302D');
  R(x - u*0.7, baseY - u*1.5, u*1, u*0.5, '#4E403C');
  R(x - u*0.2, baseY - u*0.8, u*0.4, u*0.4, '#FF7A30');
}
function _propBird(R, x, y, u) {
  R(x - u*0.8, y, u*0.8, u*0.4, '#1F4D17');   // wing
  R(x, y - u*0.2, u*0.9, u*0.5, '#E0A35A');   // body
  R(x + u*0.7, y - u*0.4, u*0.4, u*0.4, '#C56A3A'); // head
}
// A tiny blocky four-legged critter silhouette
function _propCritter(R, x, baseY, u, col, colD) {
  R(x - u, baseY - u*0.9, u*1.8, u*0.7, col);      // body
  R(x + u*0.6, baseY - u*1.5, u*0.7, u*0.8, col);  // head
  R(x - u*1.4, baseY - u*1.3, u*0.5, u*0.5, colD); // raised tail
  R(x - u*0.8, baseY - u*0.2, u*0.3, u*0.4, colD); // legs
  R(x + u*0.4, baseY - u*0.2, u*0.3, u*0.4, colD);
  R(x + u*1.05, baseY - u*1.25, u*0.18, u*0.18, '#1A1A1A'); // eye
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
  dinoDebris = [];

  // Pick a random species for this visit
  currentDino = DINO_TYPES[Math.floor(Math.random() * DINO_TYPES.length)];
  // Record it in the player's Dino Dex (cute collection)
  const _firstTime = _recordDinoSeen(currentDino.key);

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
  setTimeout(() => _playSpeciesRoar(currentDino.key), 550);   // its actual voice

  setTimeout(() => {
    warn.style.animation = 'dinoWarnOut 0.4s ease-in forwards';
    setTimeout(() => {
      warn.remove();
      _runDinoLoop();
      // After the rampage, celebrate any newly-discovered species
      if (_firstTime) setTimeout(_showDinoDiscovered, 200);
    }, 400);
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

    // Flying voxel debris from smashed rails
    _updateDrawDebris(trainCtx);

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
  // Burst of blocky debris from the smashed tile centre
  const cx = drawOffsetX + stomp.c * cellSize + cellSize / 2;
  const cy = drawOffsetY + stomp.r * cellSize + cellSize / 2;
  _spawnDebris(cx, cy, cellSize);
  _playDinoStomp();
  _playSpeciesRoar(currentDino && currentDino.key);
  _screenShake(12, 450);
  redrawGrid();
}

// Spawn flying voxel chunks coloured like a shattered rail (rail/tie/ballast/ground)
function _spawnDebris(cx, cy, c) {
  const cols = ['#C8C8C8', '#9A9A9A', '#7E5630', '#4A3019'];
  const b = (typeof getBiome === 'function') ? getBiome() : null;
  if (b) cols.push(b.base, b.tuftD);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a  = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 5;
    dinoDebris.push({
      x: cx + (Math.random() - 0.5) * c * 0.5,
      y: cy + (Math.random() - 0.5) * c * 0.3,
      vx: Math.cos(a) * sp,
      vy: -Math.abs(Math.sin(a) * sp) - 2.5 - Math.random() * 3.5,
      size: Math.max(3, c * (0.07 + Math.random() * 0.07)),
      col: cols[Math.floor(Math.random() * cols.length)],
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.5,
      life: 38 + Math.random() * 22, g: 0.45,
    });
  }
  // A quick ground dust ring
  for (let i = 0; i < 7; i++) {
    const a = (Math.PI * 2 * i / 7);
    dinoDebris.push({
      x: cx, y: cy + c * 0.25,
      vx: Math.cos(a) * (1.5 + Math.random()),
      vy: -0.5 - Math.random(),
      size: Math.max(4, c * 0.12), col: 'rgba(160,140,110,0.7)',
      rot: 0, vr: 0, life: 22, g: 0.12, dust: true,
    });
  }
}

function _updateDrawDebris(ctx) {
  dinoDebris = dinoDebris.filter(p => p.life > 0);
  dinoDebris.forEach(p => {
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
    if (p.dust) { p.size += 0.6; p.vx *= 0.92; }
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.dust ? 22 : 18)));
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.col;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    if (!p.dust) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
  });
}

function _finishDinoEvent() {
  dinoRunning = false;
  cancelAnimationFrame(dinoAnimId);
  trainCtx.clearRect(0, 0, trainCanvas.width, trainCanvas.height);
  brokenCells.clear();
  dinoDebris = [];

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

// Minecraft "destroy stage" look: the block is gouged out into a dark pit with
// blocky pixel cracks — no smooth lines, no red.
function _drawCrackOverlay(ctx, x, y, c) {
  ctx.save();
  const u = c / 8;   // 8×8 voxel grid
  // Darkened crater
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(x, y, c, c);
  // Raw dirt at the bottom of the pit
  ctx.fillStyle = 'rgba(58,40,24,0.55)';
  [[2,3],[3,3],[4,3],[3,4],[4,4],[5,4],[2,5],[4,5],[5,5],[3,6]].forEach(([gx,gy]) =>
    ctx.fillRect(x + gx*u, y + gy*u, u, u));
  // Jagged crack voxels (the classic spreading-crack pattern)
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  [[3,0],[3,1],[4,2],[3,3],[2,3],[4,4],[5,5],[4,5],[1,4],[0,5],
   [6,3],[7,4],[2,6],[3,6],[5,7],[4,7]].forEach(([gx,gy]) =>
    ctx.fillRect(x + gx*u, y + gy*u, u, u));
  // A few lighter chipped edges to catch the light
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  [[3,2],[4,3],[2,4],[5,6]].forEach(([gx,gy]) =>
    ctx.fillRect(x + gx*u, y + gy*u, u, u));
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

// Distinct voice per species — trex roars, ptero screeches, bronto rumbles…
function _playSpeciesRoar(key) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const now = ac.currentTime;
    const tone = (type, f0, f1, dur, vol, delay = 0) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination); o.type = type;
      o.frequency.setValueAtTime(f0, now + delay);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + delay + dur);
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(vol, now + delay + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      o.start(now + delay); o.stop(now + delay + dur + 0.05);
    };
    switch (key) {
      case 'trex':    // deep, powerful roar
        tone('sawtooth', 220, 60, 0.5, 0.5);
        tone('sine',      90, 30, 0.55, 0.4, 0.04);
        break;
      case 'tricera': // gruff two-note bellow
        tone('square',   300, 150, 0.4, 0.30);
        tone('sawtooth', 150,  90, 0.45, 0.22, 0.18);
        break;
      case 'bronto':  // long, gentle, very low rumble
        tone('sine',     120, 55, 0.95, 0.5);
        tone('triangle',  70, 38, 1.0,  0.3, 0.05);
        break;
      case 'ptero':   // high screech
        tone('sawtooth', 900, 1550, 0.16, 0.22);
        tone('sawtooth', 1500, 650, 0.22, 0.18, 0.13);
        break;
      default:
        tone('sawtooth', 200, 60, 0.45, 0.4);
    }
  } catch (e) {}
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
