// Main application

const COLS = 14, ROWS = 9;
let cellSize = 60;
let selectedTool = 'straight-h';
let isDrawing = false;
let isRunning = false;
let gridCanvas, gridCtx;

window.addEventListener('DOMContentLoaded', () => {
  gridCanvas = document.getElementById('grid-canvas');
  gridCtx    = gridCanvas.getContext('2d');
  const tCanvas = document.getElementById('train-canvas');

  // Resize canvases
  function resize() {
    const area = document.getElementById('main-area');
    const w = area.clientWidth, h = area.clientHeight;
    cellSize = Math.floor(Math.min(w / COLS, h / ROWS));
    const cw = cellSize * COLS, ch = cellSize * ROWS;
    gridCanvas.width  = tCanvas.width  = cw;
    gridCanvas.height = tCanvas.height = ch;
    gridCanvas.style.width  = tCanvas.style.width  = cw + 'px';
    gridCanvas.style.height = tCanvas.style.height = ch + 'px';
    initGrid(COLS, ROWS);
    redrawGrid();
  }
  window.addEventListener('resize', resize);
  resize();

  initTrainCanvas(tCanvas);

  // Tool selection
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTool = btn.dataset.track;
    });
    // Touch support
    btn.addEventListener('touchstart', e => { e.preventDefault(); btn.click(); }, { passive: false });
  });

  // Canvas interaction
  function getCell(e) {
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
    const cell = getCell(e);
    if (!cell) return;
    const { row, col } = cell;
    const cellKey = `${row},${col}`;
    if (cellKey === lastPlaced) return;
    lastPlaced = cellKey;
    if (selectedTool === 'eraser') {
      setCell(row, col, null);
    } else {
      setCell(row, col, selectedTool);
    }
    try { playPlace(); } catch(e) {}
    redrawGrid();
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
  document.getElementById('message-close').addEventListener('click', () => {
    document.getElementById('message-overlay').style.display = 'none';
  });
});

function redrawGrid() {
  const w = gridCanvas.width, h = gridCanvas.height;
  const c = cellSize;

  // Background grass
  gridCtx.fillStyle = '#81C784';
  gridCtx.fillRect(0, 0, w, h);

  // Draw grid lines
  gridCtx.strokeStyle = 'rgba(0,100,0,0.15)';
  gridCtx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    gridCtx.beginPath(); gridCtx.moveTo(0, r*c); gridCtx.lineTo(w, r*c); gridCtx.stroke();
  }
  for (let col = 0; col <= COLS; col++) {
    gridCtx.beginPath(); gridCtx.moveTo(col*c, 0); gridCtx.lineTo(col*c, h); gridCtx.stroke();
  }

  // Draw all placed tracks
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
    showMessage('😅', msg);
    return;
  }

  // Build animation path
  const loopPath = result.path;
  if (!loopPath || loopPath.length < 2) {
    try { playError(); } catch(e) {}
    showMessage('🤔', '鐵軌太短了！\n多放幾條鐵軌再試試！');
    return;
  }

  const animPath = buildAnimPath(loopPath, cellSize);
  if (!animPath || animPath.length < 4) {
    try { playError(); } catch(e) {}
    showMessage('🤔', '鐵軌好像有問題，\n再試試看？');
    return;
  }

  // Success!
  try { playSuccess(); } catch(e) {}
  isRunning = true;
  document.getElementById('btn-test').style.display = 'none';
  document.getElementById('btn-stop').style.display = '';
  startTrain(animPath);
  try { setTimeout(startChugSound, 600); } catch(e) {}

  // Confetti-like celebration
  launchStars();
}

function handleStop() {
  isRunning = false;
  stopTrain();
  try { stopChugSound(); } catch(e) {}
  document.getElementById('btn-test').style.display = '';
  document.getElementById('btn-stop').style.display = 'none';
}

function handleClear() {
  if (isRunning) handleStop();
  clearGrid();
  redrawGrid();
  try { playPlace(); } catch(e) {}
}

function showMessage(icon, text) {
  document.getElementById('message-icon').textContent = icon;
  document.getElementById('message-text').textContent = text;
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

// Inject star animation keyframes
const styleEl = document.createElement('style');
styleEl.textContent = `
@keyframes starFly {
  0%   { transform: scale(0) translateY(0); opacity:1; }
  60%  { transform: scale(1.4) translateY(-60px); opacity:1; }
  100% { transform: scale(0.8) translateY(-120px); opacity:0; }
}`;
document.head.appendChild(styleEl);
