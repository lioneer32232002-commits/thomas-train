// Train animation

let trainCanvas, trainCtx;
let animPath = [];
let trainPos = 0;
let trainSpeed = 0.3; // waypoints per frame
let animRunning = false;
let animFrameId = null;
let smokeParticles = [];
let carriageCount = 0;
let carriageGapWP  = 5;

// Cute egg surprises that hatch into trailing baby dinos (purely decorative)
let eggs = [];
let hatchlings = [];
const BABY_COLORS = [
  { body:'#F5912E', dark:'#8F3F0E', belly:'#FFE0A8' },
  { body:'#6FC2E0', dark:'#2E6E8C', belly:'#CFF0FF' },
  { body:'#C77DD8', dark:'#6E2E80', belly:'#F2D8F8' },
  { body:'#7DC850', dark:'#3B6B22', belly:'#D8F0B0' },
];

const CARRIAGE_COLORS      = ['#E53935','#43A047','#F9A825','#FB8C00','#7B1FA2'];
const CARRIAGE_ROOF_COLORS = ['#B71C1C','#2E7D32','#F57F17','#E65100','#4A148C'];

function initTrainCanvas(canvas) {
  trainCanvas = canvas;
  trainCtx = canvas.getContext('2d');
}

function getCarriageGapWP(path) {
  if (path.length < 2) return 5;
  let total = 0;
  const n = Math.min(path.length, 30);
  for (let i = 1; i < n; i++) {
    const dx = path[i].x - path[i-1].x, dy = path[i].y - path[i-1].y;
    total += Math.sqrt(dx*dx + dy*dy);
  }
  const avg = total / (n - 1);
  return Math.max(3, Math.round(90 / avg));   // ~90 px centre-to-centre
}

function startTrain(path, numCarriages) {
  animPath = path;
  trainPos = 0;
  carriageCount = numCarriages || 0;
  carriageGapWP  = getCarriageGapWP(path);
  animRunning = true;
  smokeParticles = [];
  // Scatter a couple of eggs along the track for the cart to hatch
  eggs = [];
  hatchlings = [];
  if (path.length > 18) {
    const nEggs = 2 + Math.floor(Math.random() * 2);   // 2–3 eggs
    for (let i = 0; i < nEggs; i++) {
      const frac = (i + 1) / (nEggs + 1) + (Math.random() - 0.5) * 0.08;
      const idx = Math.max(4, Math.min(path.length - 2, Math.floor(frac * path.length)));
      eggs.push({ idx, hatched: false, bob: Math.random() * 6 });
    }
  }
  animLoop();
}

function stopTrain() {
  animRunning = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  trainCtx.clearRect(0, 0, trainCanvas.width, trainCanvas.height);
}

function animLoop() {
  if (!animRunning) return;
  trainCtx.clearRect(0, 0, trainCanvas.width, trainCanvas.height);

  // Update smoke
  smokeParticles = smokeParticles.filter(p => p.life > 0);
  smokeParticles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.life -= 1; p.r += 0.3;
    p.alpha = p.life / p.maxLife * 0.5;
  });

  // Draw dust (blocky puffs)
  smokeParticles.forEach(p => {
    trainCtx.save();
    trainCtx.globalAlpha = p.alpha;
    trainCtx.fillStyle = '#D8C9A8';
    const s = p.r * 2;
    trainCtx.fillRect(p.x - p.r, p.y - p.r, s, s);
    trainCtx.restore();
  });

  const idx = Math.floor(trainPos) % animPath.length;
  const wp = animPath[idx];
  if (!wp) { animFrameId = requestAnimationFrame(animLoop); return; }

  // Check special zones
  const inTunnel = wp.special === 'tunnel';
  const onBridge = wp.special === 'bridge';

  // Kick up a little dust behind the cart
  if (Math.random() < 0.22 && !inTunnel) {
    smokeParticles.push({
      x: wp.x - Math.cos(wp.angle)*18,
      y: wp.y - Math.sin(wp.angle)*18,
      vx: (Math.random()-0.5)*0.6,
      vy: -0.5 - Math.random()*0.4,
      r: 3, life: 20, maxLife: 20, alpha: 0.45
    });
  }

  // In tunnel: fade train
  if (inTunnel) {
    trainCtx.globalAlpha = 0.3;
  }

  // Draw bridge highlight
  if (onBridge) {
    trainCtx.save();
    trainCtx.globalAlpha = 0.18;
    trainCtx.fillStyle = '#FFD700';
    trainCtx.fillRect(wp.x - 40, wp.y - 15, 80, 30);
    trainCtx.restore();
  }

  // Eggs sit on the track ahead; the cart hatches them as it passes
  _drawEggs(trainCtx);
  _updateEggs(idx);

  // Hatched babies trail behind the train (furthest back drawn first)
  for (let hi = hatchlings.length - 1; hi >= 0; hi--) {
    const hl = hatchlings[hi];
    const bIdx = ((idx - hl.lag) % animPath.length + animPath.length) % animPath.length;
    const bWp = animPath[bIdx];
    if (!bWp) continue;
    if (bWp.special === 'tunnel') trainCtx.globalAlpha = 0.3;
    drawBabyDino(trainCtx, bWp.x, bWp.y, bWp.angle, hl.col, trainPos);
    trainCtx.globalAlpha = 1;
  }

  // Draw carriages (furthest first so Thomas renders on top)
  for (let ci = carriageCount - 1; ci >= 0; ci--) {
    const offset = (ci + 1) * carriageGapWP;
    const carIdx = ((idx - offset) % animPath.length + animPath.length) % animPath.length;
    const cWp = animPath[carIdx];
    if (!cWp) continue;
    if (cWp.special === 'tunnel') trainCtx.globalAlpha = 0.3;
    drawCarriage(trainCtx, cWp.x, cWp.y, cWp.angle, ci);
    trainCtx.globalAlpha = 1;
  }

  drawThomas(trainCtx, wp.x, wp.y, wp.angle);

  if (inTunnel) trainCtx.globalAlpha = 1;

  trainPos += trainSpeed;
  animFrameId = requestAnimationFrame(animLoop);
}

// A blocky Minecraft minecart carrying a little dino. Forward = +x.
function drawThomas(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const c  = (typeof cellSize === 'number' && cellSize) ? cellSize : 60;
  const hw = c * 0.40;          // cart half-length
  const hh = c * 0.24;          // cart half-height
  const px = c / 16;            // "pixel" unit
  const R  = (x0, y0, ww, hgt, col) => { ctx.fillStyle = col; ctx.fillRect(x0, y0, ww, hgt); };

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, hh + c * 0.16, hw * 1.05, c * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wheels
  const wy = hh + px * 1.4;
  [-hw * 0.62, hw * 0.62].forEach(wx => {
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath(); ctx.arc(wx, wy, c * 0.115, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8A8A8A';
    ctx.beginPath(); ctx.arc(wx, wy, c * 0.045, 0, Math.PI * 2); ctx.fill();
  });
  R(-hw * 0.62, wy - px * 0.4, hw * 1.24, px * 0.8, '#2A2A2A'); // axle bar

  // ── Dino rider (drawn before the cart's front wall so it sits "inside") ──
  // Vivid orange so the rider pops against green grass, blue sky and the grey cart.
  const G = '#F5912E', GD = '#8F3F0E', GL = '#FFC25A', GB = '#FFE0A8';
  // Outline helper — a 1px dark border around a block for that blocky "mob" read
  const RO = (x0, y0, ww, hgt, col) => {
    ctx.fillStyle = col; ctx.fillRect(x0, y0, ww, hgt);
    ctx.strokeStyle = GD; ctx.lineWidth = Math.max(1, px * 0.32);
    ctx.strokeRect(x0, y0, ww, hgt);
  };
  // tail poking out the back
  R(-hw - px * 1.2, -hh - px * 0.5, px * 2.4, px * 1.6, GD);
  // body block down inside the cart
  RO(-px * 1.5, -hh - px * 1.2, px * 4, px * 3, G);
  R(-px * 1.0, -hh - px * 0.6, px * 3, px * 1.4, GB);      // lighter belly
  // neck
  RO(px * 0.6, -hh - px * 4.5, px * 2.6, px * 3.6, G);
  // head
  RO(px * 1.2, -hh - px * 7.6, px * 4.6, px * 3.4, G);
  R(px * 1.4, -hh - px * 7.4, px * 4.2, px * 0.8, GL);     // top highlight
  // snout (forward +x)
  RO(px * 5.4, -hh - px * 6.3, px * 2.4, px * 2.0, G);
  // eye
  R(px * 3.4, -hh - px * 6.8, px * 1.3, px * 1.3, '#FFFFFF');
  R(px * 3.9, -hh - px * 6.4, px * 0.7, px * 0.7, '#1A1A1A');
  // teeth
  R(px * 5.6, -hh - px * 4.4, px * 0.6, px * 0.7, '#FFFFFF');
  R(px * 6.6, -hh - px * 4.4, px * 0.6, px * 0.7, '#FFFFFF');
  // back spikes for a stronger dino silhouette
  ctx.fillStyle = GD;
  ctx.beginPath();
  ctx.moveTo(px * 1.0, -hh - px * 7.4);
  ctx.lineTo(px * 0.2, -hh - px * 8.6);
  ctx.lineTo(px * 1.6, -hh - px * 7.8);
  ctx.closePath(); ctx.fill();
  // tiny arm
  R(px * 4.4, -hh - px * 1.6, px * 1.2, px * 1.8, GD);

  // ── Iron minecart tub ───────────────────────────────────────────────────
  R(-hw, -hh, hw * 2, hh * 2, '#6B6B6B');           // body
  R(-hw, -hh, hw * 2, px * 0.9, '#9A9A9A');          // top rim highlight
  R(-hw, hh - px * 0.9, hw * 2, px * 0.9, '#4F4F4F'); // bottom shade
  R(-hw, -hh, px * 0.9, hh * 2, '#9A9A9A');          // left highlight
  R(hw - px * 0.9, -hh, px * 0.9, hh * 2, '#4F4F4F'); // right shade
  R(-hw + px * 0.9, -hh + px * 0.9, hw * 2 - px * 1.8, hh * 0.9, '#3F3F3F'); // inner cavity lip
  // rivets
  ctx.fillStyle = '#3A3A3A';
  [-hw + px, hw - px * 1.8].forEach(rx => { ctx.fillRect(rx, hh - px * 1.8, px * 0.8, px * 0.8); });

  ctx.restore();
}

// ── Eggs & hatchlings ─────────────────────────────────────────────────────────
function _updateEggs(engineIdx) {
  for (const egg of eggs) {
    if (egg.hatched) continue;
    if (engineIdx >= egg.idx) {           // cart has reached the egg this lap
      egg.hatched = true;
      const lag = (carriageCount + 1) * carriageGapWP
                + hatchlings.length * Math.max(6, Math.round(carriageGapWP * 0.7));
      hatchlings.push({ lag, col: BABY_COLORS[hatchlings.length % BABY_COLORS.length] });
      _hatchBurst(animPath[egg.idx % animPath.length]);
      try { _playHatch(); } catch (e) {}
    }
  }
}

function _hatchBurst(wp) {
  if (!wp) return;
  for (let i = 0; i < 9; i++) {
    smokeParticles.push({
      x: wp.x, y: wp.y - 6,
      vx: (Math.random() - 0.5) * 2.4, vy: -1 - Math.random() * 2.2,
      r: 2.5, life: 22, maxLife: 22, alpha: 0.75,
    });
  }
}

function _drawEggs(ctx) {
  const c = (typeof cellSize === 'number' && cellSize) ? cellSize : 60;
  for (const egg of eggs) {
    if (egg.hatched) continue;
    const wp = animPath[egg.idx % animPath.length];
    if (!wp) continue;
    egg.bob += 0.15;
    _drawEgg(ctx, wp.x, wp.y - c * 0.16 + Math.sin(egg.bob) * c * 0.03, c * 0.5);
  }
}

function _drawEgg(ctx, x, y, s) {
  const w = s * 0.62, h = s * 0.82;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x, y + h * 0.55, w * 0.55, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F3E6C8';
  ctx.beginPath(); ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFF6E2';
  ctx.beginPath(); ctx.ellipse(x - w * 0.12, y - h * 0.13, w * 0.2, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#B98750';
  [[0.18, -0.05, 0.10], [-0.10, 0.18, 0.08], [0.06, 0.32, 0.07], [-0.22, -0.04, 0.06]]
    .forEach(([dx, dy, r]) => {
      ctx.beginPath(); ctx.ellipse(x + dx * w, y + dy * h, r * w, r * h, 0, 0, Math.PI * 2); ctx.fill();
    });
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// A tiny running baby dino that follows the train (blocky, big-headed, cute)
function drawBabyDino(ctx, x, y, angle, col, t) {
  ctx.save();
  ctx.translate(x, y);
  if (Math.cos(angle) < -0.1) ctx.scale(-1, 1);
  const c  = (typeof cellSize === 'number' && cellSize) ? cellSize : 60;
  const s  = c * 0.17;
  const px = s / 4;
  const R  = (x0, y0, w, h, cc) => { ctx.fillStyle = cc; ctx.fillRect(x0, y0, w, h); };
  const swing = Math.sin(t * 0.5) * px * 1.3;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(0, s * 0.95, s * 0.7, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  // little running legs
  R(-px * 1.3, s * 0.4 + swing, px * 1.1, px * 2, col.dark);
  R(px * 0.3,  s * 0.4 - swing, px * 1.1, px * 2, col.dark);
  // tail
  R(-s * 0.95, -px * 0.5, s * 0.55, px * 1.5, col.dark);
  // body + belly
  R(-s * 0.6, -s * 0.2, s * 1.1, s * 0.7, col.body);
  R(-s * 0.4,  s * 0.05, s * 0.7, s * 0.3, col.belly);
  // big cute head
  R(s * 0.1, -s * 0.88, s * 0.82, s * 0.78, col.body);
  // eye
  R(s * 0.56, -s * 0.64, px * 1.2, px * 1.2, '#FFFFFF');
  R(s * 0.73, -s * 0.60, px * 0.55, px * 0.55, '#1A1A1A');
  // head outline for the blocky read
  ctx.strokeStyle = col.dark; ctx.lineWidth = Math.max(1, px * 0.4);
  ctx.strokeRect(s * 0.1, -s * 0.88, s * 0.82, s * 0.78);
  ctx.restore();
}

function drawCarriage(ctx, x, y, angle, idx) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const c  = (typeof cellSize === 'number' && cellSize) ? cellSize : 60;
  const hw = c * 0.36, hh = c * 0.22, px = c / 16;
  const R = (x0, y0, ww, hgt, col) => { ctx.fillStyle = col; ctx.fillRect(x0, y0, ww, hgt); };

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, hh + c * 0.14, hw * 1.05, c * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wheels
  const wy = hh + px * 1.3;
  [-hw * 0.6, hw * 0.6].forEach(wx => {
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath(); ctx.arc(wx, wy, c * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8A8A8A';
    ctx.beginPath(); ctx.arc(wx, wy, c * 0.04, 0, Math.PI * 2); ctx.fill();
  });

  // Wooden chest/crate cart
  R(-hw, -hh, hw * 2, hh * 2, '#9A6B3B');             // crate body
  R(-hw, -hh, hw * 2, px * 0.9, '#B98750');            // top highlight
  R(-hw, hh - px * 0.9, hw * 2, px * 0.9, '#6E4A28');  // bottom shade
  // plank seams
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 1; i < 4; i++) ctx.fillRect(-hw + (hw * 2) * i / 4 - px * 0.2, -hh, px * 0.4, hh * 2);
  // iron band + latch
  R(-hw, -px * 0.6, hw * 2, px * 1.2, '#5A5A5A');
  R(-px * 0.8, -px * 1.4, px * 1.6, px * 2.8, '#C9A22A');

  ctx.restore();
}
