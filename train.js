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
  const G = '#5FA83C', GD = '#3B6B22', GL = '#7DC850';
  // tail poking out the back
  R(-hw - px * 1.2, -hh - px * 0.5, px * 2.4, px * 1.6, GD);
  // body block down inside the cart
  R(-px * 1.5, -hh - px * 1.2, px * 4, px * 3, G);
  // neck
  R(px * 0.6, -hh - px * 4.5, px * 2.6, px * 3.6, G);
  // head
  R(px * 1.2, -hh - px * 7.6, px * 4.6, px * 3.4, G);
  R(px * 1.4, -hh - px * 7.4, px * 4.2, px * 0.8, GL);     // top highlight
  ctx.strokeStyle = GD; ctx.lineWidth = Math.max(1, px * 0.35);
  ctx.strokeRect(px * 1.2, -hh - px * 7.6, px * 4.6, px * 3.4);
  // snout (forward +x)
  R(px * 5.4, -hh - px * 6.3, px * 2.4, px * 2.0, G);
  // eye
  R(px * 3.4, -hh - px * 6.8, px * 1.3, px * 1.3, '#FFFFFF');
  R(px * 3.9, -hh - px * 6.4, px * 0.7, px * 0.7, '#1A1A1A');
  // teeth
  R(px * 5.6, -hh - px * 4.4, px * 0.6, px * 0.7, '#FFFFFF');
  R(px * 6.6, -hh - px * 4.4, px * 0.6, px * 0.7, '#FFFFFF');
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
