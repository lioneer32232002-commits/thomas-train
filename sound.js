// Sound effects using Web Audio API
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// ── 火車汽笛聲（多諧波正弦波，溫暖的口哨感）─────────────────────────────────
function playToot() {
  const ctx = getAudioCtx();
  // 基音 + 第2、第3諧波疊加，模擬真實汽笛的溫暖音色
  const harmonics = [440, 880, 1320];
  const vols      = [0.28, 0.12, 0.06];

  harmonics.forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    // 音高由低升高再稍降，模擬火車汽笛
    osc.frequency.setValueAtTime(freq * 0.92, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(freq * 1.05, ctx.currentTime + 0.06);
    osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + 0.28);
    // 音量淡入淡出
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vols[i], ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  });
}

// ── 火車運行聲（白噪音低通濾波，蒸汽質感）────────────────────────────────────
function playChugChug() {
  const ctx = getAudioCtx();

  // 白噪音緩衝
  const len    = Math.floor(ctx.sampleRate * 0.14);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  const src    = ctx.createBufferSource();
  src.buffer   = buffer;

  // 低通濾波 → 去掉刺耳高頻，留下沉穩的蒸汽聲
  const filter       = ctx.createBiquadFilter();
  filter.type        = 'lowpass';
  filter.frequency.value = 260;
  filter.Q.value     = 0.8;

  // 低頻 thud（讓每次「哐」更有重量）
  const osc  = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(85, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
  oGain.gain.setValueAtTime(0.18, ctx.currentTime);
  oGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
  osc.connect(oGain); oGain.connect(ctx.destination);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.14);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.22, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(ctx.currentTime);
}

// ── 過關成功（鐘聲/木琴質感）─────────────────────────────────────────────────
function playSuccess() {
  const ctx = getAudioCtx();
  const notes = [523, 659, 784, 1047]; // C E G C（大調上行）

  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.16;

    // 每個音符疊三個諧波，製造鐘聲泛音
    [1, 2, 2.756].forEach((ratio, hi) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      const vol = [0.28, 0.10, 0.06][hi];
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55 - hi * 0.08);
      osc.start(t); osc.stop(t + 0.6);
    });
  });
}

// ── 放置軌道（木頭清脆敲擊聲）───────────────────────────────────────────────
function playPlace() {
  const ctx = getAudioCtx();

  // 快速音高下降的正弦波 = 木頭敲擊感
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

// ── 錯誤提示（兩聲下行音調，溫和警示）──────────────────────────────────────
function playError() {
  const ctx = getAudioCtx();

  [0, 0.22].forEach(delay => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(370, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + delay + 0.22);
    gain.gain.setValueAtTime(0.18, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.24);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.26);
  });
}

// ── 持續運行音（間隔呼叫 playChugChug）─────────────────────────────────────
let chugInterval = null;
function startChugSound() {
  stopChugSound();
  chugInterval = setInterval(() => { try { playChugChug(); } catch(e){} }, 460);
}
function stopChugSound() {
  if (chugInterval) { clearInterval(chugInterval); chugInterval = null; }
}
