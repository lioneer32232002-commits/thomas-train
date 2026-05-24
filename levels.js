// Level definitions for challenge mode
// Grid is ROWS=5, COLS=8 (0-indexed)
// All coordinates shifted from original: new_r = old_r - 1, new_c = old_c - 2

const LEVELS = [
  // ── Group 1: 1 gap each ───────────────────────────────────────────────────
  {
    id: 1,
    group: 1,
    title: '第 1 關',
    desc: '找找看少了哪條橫軌！',
    preset: [
      {r:1, c:1, type:'curve-se'},
      {r:1, c:2, type:'straight-h'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:5, type:'straight-h'},
      {r:1, c:6, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:6, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:5, type:'straight-h'},
      {r:3, c:6, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:3, type:'straight-h'},
    ],
  },

  {
    id: 2,
    group: 1,
    title: '第 2 關',
    desc: '右邊少了一條直軌！',
    preset: [
      {r:1, c:2, type:'curve-se'},
      {r:1, c:3, type:'straight-h'},
      {r:1, c:4, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'},
      {r:3, c:2, type:'straight-v'},
      {r:3, c:4, type:'straight-v'},
      {r:4, c:2, type:'curve-ne'},
      {r:4, c:3, type:'straight-h'},
      {r:4, c:4, type:'curve-nw'},
    ],
    gaps: [
      {r:2, c:4, type:'straight-v'},
    ],
  },

  {
    id: 3,
    group: 1,
    title: '第 3 關',
    desc: '左下角少了一個彎道！',
    preset: [
      {r:1, c:2, type:'curve-se'},
      {r:1, c:3, type:'straight-h'},
      {r:1, c:4, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'},
      {r:2, c:4, type:'straight-v'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:4, type:'curve-nw'},
    ],
    gaps: [
      {r:3, c:2, type:'curve-ne'},
    ],
  },

  {
    id: 4,
    group: 1,
    title: '第 4 關',
    desc: '右上角少了一個彎道！',
    preset: [
      {r:1, c:2, type:'curve-se'},
      {r:1, c:3, type:'straight-h'},
      {r:2, c:2, type:'straight-v'},
      {r:2, c:4, type:'straight-v'},
      {r:3, c:2, type:'curve-ne'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:4, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:4, type:'curve-sw'},
    ],
  },

  {
    id: 5,
    group: 1,
    title: '第 5 關',
    desc: '橋梁不見了！',
    preset: [
      {r:1, c:1, type:'curve-se'},
      {r:1, c:2, type:'straight-h'},
      {r:1, c:3, type:'tunnel'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:3, c:3, type:'bridge'},
    ],
  },

  // ── Group 2: 2 gaps each ──────────────────────────────────────────────────
  {
    id: 6,
    group: 2,
    title: '第 6 關',
    desc: '上方少了兩條橫軌！',
    preset: [
      {r:1, c:1, type:'curve-se'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:2, type:'straight-h'},
      {r:1, c:3, type:'straight-h'},
    ],
  },

  {
    id: 7,
    group: 2,
    title: '第 7 關',
    desc: '左右各少了一條直軌！',
    preset: [
      {r:1, c:3, type:'curve-se'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:5, type:'curve-sw'},
      {r:3, c:3, type:'curve-ne'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:2, c:3, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
    ],
  },

  {
    id: 8,
    group: 2,
    title: '第 8 關',
    desc: '上下各少了一條橫軌！',
    preset: [
      {r:1, c:2, type:'curve-se'},
      {r:1, c:3, type:'straight-h'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'},
      {r:3, c:2, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:5, type:'straight-v'},
      {r:4, c:2, type:'curve-ne'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:4, type:'straight-h'},
      {r:4, c:3, type:'straight-h'},
    ],
  },

  {
    id: 9,
    group: 2,
    title: '第 9 關',
    desc: '找找看少了哪兩段軌道！',
    preset: [
      {r:1, c:2, type:'straight-h'},
      {r:1, c:3, type:'straight-h'},
      {r:1, c:4, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:4, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:4, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:1, type:'curve-se'},
      {r:3, c:3, type:'straight-h'},
    ],
  },

  {
    id: 10,
    group: 2,
    title: '第 10 關',
    desc: '兩個彎道不見了，你找得到嗎？',
    preset: [
      {r:1, c:2, type:'curve-se'},
      {r:1, c:3, type:'straight-h'},
      {r:2, c:2, type:'straight-v'},
      {r:2, c:4, type:'straight-v'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:4, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:4, type:'curve-sw'},
      {r:3, c:2, type:'curve-ne'},
    ],
  },

  // ── Group 3: 3 gaps each ──────────────────────────────────────────────────
  {
    id: 11,
    group: 3,
    title: '第 11 關',
    desc: '上方三條橫軌都不見了！',
    preset: [
      {r:1, c:1, type:'curve-se'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:2, type:'straight-h'},
      {r:1, c:3, type:'straight-h'},
      {r:1, c:4, type:'straight-h'},
    ],
  },

  {
    id: 12,
    group: 3,
    title: '第 12 關',
    desc: '三個地方出現缺口，加油！',
    preset: [
      {r:1, c:1, type:'curve-se'},
      {r:1, c:3, type:'straight-h'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:1, type:'straight-v'},
      {r:3, c:5, type:'straight-v'},
      {r:4, c:1, type:'curve-ne'},
      {r:4, c:2, type:'straight-h'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:2, type:'straight-h'},
      {r:1, c:4, type:'straight-h'},
      {r:4, c:3, type:'straight-h'},
    ],
  },

  {
    id: 13,
    group: 3,
    title: '第 13 關',
    desc: '橫的直的都有，仔細找！',
    preset: [
      {r:1, c:3, type:'curve-se'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:3, type:'straight-v'},
      {r:3, c:5, type:'straight-v'},
      {r:4, c:3, type:'curve-ne'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:4, type:'straight-h'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:3, type:'straight-v'},
    ],
  },

  {
    id: 14,
    group: 3,
    title: '第 14 關',
    desc: '三個彎道都不見了！挑戰看看！',
    preset: [
      {r:1, c:3, type:'straight-h'},
      {r:2, c:2, type:'straight-v'},
      {r:2, c:4, type:'straight-v'},
      {r:3, c:2, type:'curve-ne'},
      {r:3, c:3, type:'straight-h'},
    ],
    gaps: [
      {r:1, c:2, type:'curve-se'},
      {r:1, c:4, type:'curve-sw'},
      {r:3, c:4, type:'curve-nw'},
    ],
  },

  {
    id: 15,
    group: 3,
    title: '第 15 關',
    desc: '最終關卡！三個缺口等你來填！',
    preset: [
      {r:1, c:1, type:'curve-se'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
    ],
    gaps: [
      {r:1, c:2, type:'straight-h'},
      {r:1, c:3, type:'tunnel'},
      {r:3, c:5, type:'curve-nw'},
    ],
  },
];

function getLevelById(id) {
  return LEVELS.find(l => l.id === id);
}
