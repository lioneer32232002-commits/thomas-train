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

  // Draw smoke
  smokeParticles.forEach(p => {
    trainCtx.save();
    trainCtx.globalAlpha = p.alpha;
    trainCtx.fillStyle = 'white';
    trainCtx.beginPath();
    trainCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    trainCtx.fill();
    trainCtx.restore();
  });

  const idx = Math.floor(trainPos) % animPath.length;
  const wp = animPath[idx];
  if (!wp) { animFrameId = requestAnimationFrame(animLoop); return; }

  // Check special zones
  const inTunnel = wp.special === 'tunnel';
  const onBridge = wp.special === 'bridge';

  // Emit smoke
  if (Math.random() < 0.3 && !inTunnel) {
    const angle = wp.angle - Math.PI/2;
    smokeParticles.push({
      x: wp.x + Math.cos(wp.angle)*18,
      y: wp.y + Math.sin(wp.angle)*18,
      vx: Math.cos(angle)*0.8 + (Math.random()-0.5)*0.5,
      vy: Math.sin(angle)*0.8 - 0.8,
      r: 4, life: 25, maxLife: 25, alpha: 0.5
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

function drawThomas(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const s = 1.0; // scale
  ctx.scale(s, s);

  // Body
  ctx.fillStyle = '#1565C0';
  ctx.beginPath();
  ctx.roundRect(-28, -16, 56, 28, 5);
  ctx.fill();

  // Cab top
  ctx.fillStyle = '#1976D2';
  ctx.fillRect(-10, -24, 24, 10);

  // Chimney
  ctx.fillStyle = '#333';
  ctx.fillRect(12, -28, 8, 14);
  ctx.fillStyle = '#555';
  ctx.fillRect(10, -30, 12, 4);

  // Boiler highlight
  ctx.fillStyle = '#1E88E5';
  ctx.beginPath();
  ctx.ellipse(4, -12, 20, 7, 0, 0, Math.PI*2);
  ctx.fill();

  // Face panel
  ctx.fillStyle = '#1976D2';
  ctx.beginPath();
  ctx.roundRect(14, -13, 16, 22, 3);
  ctx.fill();

  // Eyes
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.ellipse(18, -7, 5, 5.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(26, -7, 5, 5.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1565C0';
  ctx.beginPath(); ctx.ellipse(19, -7, 3, 3.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(27, -7, 3, 3.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(20, -8.5, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(28, -8.5, 1.2, 0, Math.PI*2); ctx.fill();

  // Smile
  ctx.strokeStyle = '#FF8F00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(22, -2, 5, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Number "1"
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 9px Arial';
  ctx.fillText('1', -6, 8);

  // Wheels
  const wheelY = 14;
  [-18, 0, 18].forEach(wx => {
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(wx, wheelY, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#757575';
    ctx.beginPath(); ctx.arc(wx, wheelY, 4.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(wx, wheelY, 2, 0, Math.PI*2); ctx.fill();
    // Spokes
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let a = 0; a < Math.PI*2; a += Math.PI/3) {
      ctx.beginPath();
      ctx.moveTo(wx + 1.5*Math.cos(a), wheelY + 1.5*Math.sin(a));
      ctx.lineTo(wx + 4*Math.cos(a), wheelY + 4*Math.sin(a));
      ctx.stroke();
    }
  });

  // Connecting rod
  ctx.strokeStyle = '#FF6F00';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-18, wheelY); ctx.lineTo(18, wheelY);
  ctx.stroke();

  // Front buffer
  ctx.fillStyle = '#FF6F00';
  ctx.fillRect(26, -3, 5, 6);

  ctx.restore();
}

function drawCarriage(ctx, x, y, angle, idx) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const s = 0.90;
  ctx.scale(s, s);

  const color     = CARRIAGE_COLORS[idx % CARRIAGE_COLORS.length];
  const roofColor = CARRIAGE_ROOF_COLORS[idx % CARRIAGE_ROOF_COLORS.length];

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-24, -12, 48, 22, 4);
  ctx.fill();

  // Roof
  ctx.fillStyle = roofColor;
  ctx.fillRect(-22, -17, 44, 6);

  // Windows
  ctx.fillStyle = '#B3E5FC';
  [-11, 4].forEach(wx => {
    ctx.fillRect(wx, -9, 9, 7);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(wx, -9, 9, 7);
  });

  // Wheels
  const wheelY = 12;
  [-12, 12].forEach(wx => {
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(wx, wheelY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#757575';
    ctx.beginPath(); ctx.arc(wx, wheelY, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(wx, wheelY, 1.5, 0, Math.PI * 2); ctx.fill();
  });

  // Coupling hooks
  ctx.fillStyle = '#555';
  ctx.fillRect(-30, -2, 6, 4);
  ctx.fillRect(24, -2, 6, 4);

  ctx.restore();
}
