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
  // Level 11: Large oval rows 1-3, cols 0-7, 3 spread-out sh gaps
  // Full loop: (1,0)se→(1,1)sh→(1,2)sh→(1,3)sh→(1,4)sh→(1,5)sh→(1,6)sh→(1,7)sw
  //            →(2,7)sv→(3,7)nw→(3,6)sh→(3,5)sh→(3,4)sh→(3,3)sh→(3,2)sh→(3,1)sh→(3,0)ne
  //            →(2,0)sv→(1,0)se  ✓
  // Gaps: (1,2)sh, (1,5)sh, (3,4)sh
  {
    id: 11,
    group: 3,
    title: '第 11 關',
    desc: '大橢圓，三個缺口在哪裡？',
    preset: [
      {r:1, c:0, type:'curve-se'},
      {r:1, c:1, type:'straight-h'},
      {r:1, c:3, type:'straight-h'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:6, type:'straight-h'},
      {r:1, c:7, type:'curve-sw'},
      {r:2, c:0, type:'straight-v'},
      {r:2, c:7, type:'straight-v'},
      {r:3, c:0, type:'curve-ne'},
      {r:3, c:1, type:'straight-h'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:5, type:'straight-h'},
      {r:3, c:6, type:'straight-h'},
      {r:3, c:7, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:2, type:'straight-h'},
      {r:1, c:5, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
    ],
  },

  // Level 12: Medium rectangle rows 1-3, cols 2-5, 2 curve + 1 straight gaps
  // Full loop: (1,2)se→(1,3)sh→(1,4)sh→(1,5)sw→(2,5)sv→(3,5)nw→(3,4)sh→(3,3)sh→(3,2)ne
  //            →(2,2)sv→(1,2)se  ✓
  // Gaps: (1,2)se, (3,5)nw, (3,3)sh
  {
    id: 12,
    group: 3,
    title: '第 12 關',
    desc: '彎道找得到嗎？三個缺口！',
    preset: [
      {r:1, c:3, type:'straight-h'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:2, type:'curve-ne'},
      {r:3, c:4, type:'straight-h'},
    ],
    gaps: [
      {r:1, c:2, type:'curve-se'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:5, type:'curve-nw'},
    ],
  },

  // Level 13: Loop rows 1-3, cols 1-6, includes station as preset, 3 sh gaps
  // Full loop: (1,1)se→(1,2)sh→(1,3)station→(1,4)sh→(1,5)sh→(1,6)sw
  //            →(2,6)sv→(3,6)nw→(3,5)sh→(3,4)sh→(3,3)sh→(3,2)sh→(3,1)ne
  //            →(2,1)sv→(1,1)se  ✓
  // Gaps: (1,2)sh, (3,4)sh, (3,2)sh
  {
    id: 13,
    group: 3,
    title: '第 13 關',
    desc: '火車站出現了！找找缺口在哪！',
    preset: [
      {r:1, c:1, type:'curve-se'},
      {r:1, c:3, type:'station'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:5, type:'straight-h'},
      {r:1, c:6, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:6, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:5, type:'straight-h'},
      {r:3, c:6, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:2, type:'straight-h'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
    ],
  },

  // Level 14: Loop rows 1-4, cols 2-5, includes tunnel as a gap
  // Full loop: (1,2)se→(1,3)sh→(1,4)tunnel→(1,5)sw→(2,5)sv→(3,5)sv→(4,5)nw
  //            →(4,4)sh→(4,3)sh→(4,2)ne→(3,2)sv→(2,2)sv→(1,2)se  ✓
  // Gaps: (1,3)sh, (1,4)tunnel, (4,3)sh
  {
    id: 14,
    group: 3,
    title: '第 14 關',
    desc: '山洞在哪裡？三個缺口！',
    preset: [
      {r:1, c:2, type:'curve-se'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:2, type:'straight-v'},
      {r:3, c:5, type:'straight-v'},
      {r:4, c:2, type:'curve-ne'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:3, type:'straight-h'},
      {r:1, c:4, type:'tunnel'},
      {r:4, c:3, type:'crossing'},
    ],
  },

  // Level 15: Loop rows 0-3, cols 1-6, mixed sh + sv gap
  // Full loop: (0,1)se→(0,2)sh→(0,3)sh→(0,4)sh→(0,5)sh→(0,6)sw
  //            →(1,6)sv→(2,6)sv→(3,6)nw→(3,5)sh→(3,4)sh→(3,3)sh→(3,2)sh→(3,1)ne
  //            →(2,1)sv→(1,1)sv→(0,1)se  ✓
  // Gaps: (0,3)sh, (3,3)sh, (1,6)sv
  {
    id: 15,
    group: 3,
    title: '第 15 關',
    desc: '橫的直的都有缺口，加油！',
    preset: [
      {r:0, c:1, type:'curve-se'},
      {r:0, c:2, type:'straight-h'},
      {r:0, c:4, type:'straight-h'},
      {r:0, c:5, type:'straight-h'},
      {r:0, c:6, type:'curve-sw'},
      {r:1, c:1, type:'straight-v'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:6, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:5, type:'straight-h'},
      {r:3, c:6, type:'curve-nw'},
    ],
    gaps: [
      {r:0, c:3, type:'straight-h'},
      {r:1, c:6, type:'straight-v'},
      {r:3, c:3, type:'straight-h'},
    ],
  },

  // ── Group 4: 4 gaps each ──────────────────────────────────────────────────
  // Level 16: Large oval rows 1-3 cols 0-7, 4 sh gaps
  // Full loop same as L11. Gaps: (1,1)sh, (1,4)sh, (1,6)sh, (3,3)sh
  {
    id: 16,
    group: 4,
    title: '第 16 關',
    desc: '大橢圓四個缺口，找到全部！',
    preset: [
      {r:1, c:0, type:'curve-se'},
      {r:1, c:2, type:'straight-h'},
      {r:1, c:3, type:'straight-h'},
      {r:1, c:5, type:'straight-h'},
      {r:1, c:7, type:'curve-sw'},
      {r:2, c:0, type:'straight-v'},
      {r:2, c:7, type:'straight-v'},
      {r:3, c:0, type:'curve-ne'},
      {r:3, c:1, type:'straight-h'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:5, type:'straight-h'},
      {r:3, c:6, type:'straight-h'},
      {r:3, c:7, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:1, type:'straight-h'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:6, type:'straight-h'},
      {r:3, c:3, type:'straight-h'},
    ],
  },

  // Level 17: Tall rectangle rows 0-4, cols 2-5, 4 mixed gaps
  // Full loop: (0,2)se→(0,3)sh→(0,4)sh→(0,5)sw→(1,5)sv→(2,5)sv→(3,5)sv→(4,5)nw
  //            →(4,4)sh→(4,3)sh→(4,2)ne→(3,2)sv→(2,2)sv→(1,2)sv→(0,2)se  ✓
  // Gaps: (0,3)sh, (0,5)curve-sw, (4,4)sh, (3,2)sv
  {
    id: 17,
    group: 4,
    title: '第 17 關',
    desc: '高高的長方形，四個缺口！',
    preset: [
      {r:0, c:2, type:'curve-se'},
      {r:0, c:4, type:'straight-h'},
      {r:1, c:2, type:'straight-v'},
      {r:1, c:5, type:'straight-v'},
      {r:2, c:2, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:4, c:2, type:'curve-ne'},
      {r:4, c:3, type:'straight-h'},
      {r:4, c:5, type:'curve-nw'},
      {r:3, c:5, type:'straight-v'},
    ],
    gaps: [
      {r:0, c:3, type:'straight-h'},
      {r:0, c:5, type:'curve-sw'},
      {r:3, c:2, type:'straight-v'},
      {r:4, c:4, type:'crossing'},
    ],
  },

  // Level 18: Large loop rows 1-3 cols 1-7, station as preset, 4 sh gaps
  // Full loop: (1,1)se→(1,2)sh→(1,3)station→(1,4)sh→(1,5)sh→(1,6)sh→(1,7)sw
  //            →(2,7)sv→(3,7)nw→(3,6)sh→(3,5)sh→(3,4)sh→(3,3)sh→(3,2)sh→(3,1)ne
  //            →(2,1)sv→(1,1)se  ✓
  // Gaps: (1,2)sh, (1,5)sh, (3,5)sh, (3,3)sh
  {
    id: 18,
    group: 4,
    title: '第 18 關',
    desc: '火車站旁邊有四個缺口！',
    preset: [
      {r:1, c:1, type:'curve-se'},
      {r:1, c:3, type:'station'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:6, type:'straight-h'},
      {r:1, c:7, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:7, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:6, type:'straight-h'},
      {r:3, c:7, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:2, type:'straight-h'},
      {r:1, c:5, type:'straight-h'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:5, type:'straight-h'},
    ],
  },

  // Level 19: Large loop rows 1-4, cols 1-6, ALL 4 corners are gaps
  // Full loop: (1,1)se→(1,2)sh→(1,3)sh→(1,4)sh→(1,5)sh→(1,6)sw
  //            →(2,6)sv→(3,6)sv→(4,6)nw→(4,5)sh→(4,4)sh→(4,3)sh→(4,2)sh→(4,1)ne
  //            →(3,1)sv→(2,1)sv→(1,1)se  ✓
  // Gaps: (1,1)se, (1,6)sw, (4,6)nw, (4,1)ne  — all 4 corners!
  {
    id: 19,
    group: 4,
    title: '第 19 關',
    desc: '四個角都不見了！考驗彎道！',
    preset: [
      {r:1, c:2, type:'straight-h'},
      {r:1, c:3, type:'straight-h'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:5, type:'straight-h'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:6, type:'straight-v'},
      {r:3, c:1, type:'straight-v'},
      {r:3, c:6, type:'straight-v'},
      {r:4, c:2, type:'straight-h'},
      {r:4, c:3, type:'straight-h'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:5, type:'straight-h'},
    ],
    gaps: [
      {r:1, c:1, type:'curve-se'},
      {r:1, c:6, type:'curve-sw'},
      {r:4, c:1, type:'curve-ne'},
      {r:4, c:6, type:'curve-nw'},
    ],
  },

  // Level 20: Loop rows 0-3, cols 2-6, 2 curves + 2 straights as gaps
  // Full loop: (0,2)se→(0,3)sh→(0,4)sh→(0,5)sh→(0,6)sw
  //            →(1,6)sv→(2,6)sv→(3,6)nw→(3,5)sh→(3,4)sh→(3,3)sh→(3,2)ne
  //            →(2,2)sv→(1,2)sv→(0,2)se  ✓
  // Gaps: (0,4)sh, (0,6)sw, (3,4)sh, (3,2)ne
  {
    id: 20,
    group: 4,
    title: '第 20 關',
    desc: '彎道加直軌，四個缺口！',
    preset: [
      {r:0, c:2, type:'curve-se'},
      {r:0, c:3, type:'straight-h'},
      {r:0, c:5, type:'straight-h'},
      {r:1, c:2, type:'straight-v'},
      {r:1, c:6, type:'straight-v'},
      {r:2, c:2, type:'straight-v'},
      {r:2, c:6, type:'straight-v'},
      {r:3, c:3, type:'straight-h'},
      {r:3, c:5, type:'straight-h'},
      {r:3, c:6, type:'curve-nw'},
    ],
    gaps: [
      {r:0, c:4, type:'straight-h'},
      {r:0, c:6, type:'curve-sw'},
      {r:3, c:2, type:'curve-ne'},
      {r:3, c:4, type:'straight-h'},
    ],
  },

  // ── Group 5: 5 gaps each ──────────────────────────────────────────────────
  // Level 21: Full outer ring rows 0-4, cols 0-7
  // Full loop: (0,0)se→(0,1)sh→(0,2)sh→(0,3)sh→(0,4)sh→(0,5)sh→(0,6)sh→(0,7)sw
  //            →(1,7)sv→(2,7)sv→(3,7)sv→(4,7)nw→(4,6)sh→(4,5)sh→(4,4)sh→(4,3)sh
  //            →(4,2)sh→(4,1)sh→(4,0)ne→(3,0)sv→(2,0)sv→(1,0)sv→(0,0)se  ✓
  // Gaps: (0,2)sh, (0,5)sh, (4,3)sh, (4,6)sh, (2,7)sv
  {
    id: 21,
    group: 5,
    title: '第 21 關',
    desc: '整個大圈圈！五個缺口在哪裡？',
    preset: [
      {r:0, c:0, type:'curve-se'},
      {r:0, c:1, type:'straight-h'},
      {r:0, c:3, type:'straight-h'},
      {r:0, c:4, type:'straight-h'},
      {r:0, c:6, type:'straight-h'},
      {r:0, c:7, type:'curve-sw'},
      {r:1, c:0, type:'straight-v'},
      {r:1, c:7, type:'straight-v'},
      {r:2, c:0, type:'straight-v'},
      {r:3, c:0, type:'straight-v'},
      {r:3, c:7, type:'straight-v'},
      {r:4, c:0, type:'curve-ne'},
      {r:4, c:1, type:'straight-h'},
      {r:4, c:2, type:'straight-h'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:5, type:'straight-h'},
      {r:4, c:7, type:'curve-nw'},
    ],
    gaps: [
      {r:0, c:2, type:'straight-h'},
      {r:0, c:5, type:'straight-h'},
      {r:2, c:7, type:'straight-v'},
      {r:4, c:3, type:'straight-h'},
      {r:4, c:6, type:'straight-h'},
    ],
  },

  // Level 22: Large loop rows 1-4 cols 0-7, bridge + station as presets, 5 sh/sv gaps
  // Full loop: (1,0)se→(1,1)sh→(1,2)bridge→(1,3)sh→(1,4)station→(1,5)sh→(1,6)sh→(1,7)sw
  //            →(2,7)sv→(3,7)sv→(4,7)nw→(4,6)sh→(4,5)sh→(4,4)sh→(4,3)sh→(4,2)sh
  //            →(4,1)sh→(4,0)ne→(3,0)sv→(2,0)sv→(1,0)se  ✓
  // Gaps: (1,3)sh, (1,6)sh, (4,3)sh, (4,5)sh, (2,7)sv
  {
    id: 22,
    group: 5,
    title: '第 22 關',
    desc: '橋梁加火車站！五個缺口超難！',
    preset: [
      {r:1, c:0, type:'curve-se'},
      {r:1, c:1, type:'straight-h'},
      {r:1, c:2, type:'bridge'},
      {r:1, c:4, type:'station'},
      {r:1, c:5, type:'straight-h'},
      {r:1, c:7, type:'curve-sw'},
      {r:2, c:0, type:'straight-v'},
      {r:3, c:0, type:'straight-v'},
      {r:3, c:7, type:'straight-v'},
      {r:4, c:0, type:'curve-ne'},
      {r:4, c:1, type:'straight-h'},
      {r:4, c:2, type:'straight-h'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:6, type:'straight-h'},
      {r:4, c:7, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:3, type:'straight-h'},
      {r:1, c:6, type:'straight-h'},
      {r:2, c:7, type:'straight-v'},
      {r:4, c:3, type:'straight-h'},
      {r:4, c:5, type:'crossing'},
    ],
  },

  // Level 23: Tall loop rows 0-4, cols 1-6, all 4 corners + 1 mid-top as gaps
  // Full loop: (0,1)se→(0,2)sh→(0,3)sh→(0,4)sh→(0,5)sh→(0,6)sw
  //            →(1,6)sv→(2,6)sv→(3,6)sv→(4,6)nw→(4,5)sh→(4,4)sh→(4,3)sh→(4,2)sh→(4,1)ne
  //            →(3,1)sv→(2,1)sv→(1,1)sv→(0,1)se  ✓
  // Gaps: (0,1)se, (0,6)sw, (4,6)nw, (4,1)ne, (0,3)sh
  {
    id: 23,
    group: 5,
    title: '第 23 關',
    desc: '四個彎道加一條直軌，找到了嗎？',
    preset: [
      {r:0, c:2, type:'straight-h'},
      {r:0, c:4, type:'straight-h'},
      {r:0, c:5, type:'straight-h'},
      {r:1, c:1, type:'straight-v'},
      {r:1, c:6, type:'straight-v'},
      {r:2, c:1, type:'straight-v'},
      {r:2, c:6, type:'straight-v'},
      {r:3, c:1, type:'straight-v'},
      {r:3, c:6, type:'straight-v'},
      {r:4, c:2, type:'straight-h'},
      {r:4, c:3, type:'straight-h'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:5, type:'straight-h'},
    ],
    gaps: [
      {r:0, c:1, type:'curve-se'},
      {r:0, c:3, type:'straight-h'},
      {r:0, c:6, type:'curve-sw'},
      {r:4, c:1, type:'curve-ne'},
      {r:4, c:6, type:'curve-nw'},
    ],
  },

  // Level 24: Full outer ring rows 0-4 cols 0-7, different 5-gap set
  // Full loop same as L21.
  // Gaps: (0,3)sh, (0,6)sh, (1,7)sv, (4,2)sh, (4,5)sh
  {
    id: 24,
    group: 5,
    title: '第 24 關',
    desc: '超大圓圈，五個缺口各不同！',
    preset: [
      {r:0, c:0, type:'curve-se'},
      {r:0, c:1, type:'straight-h'},
      {r:0, c:2, type:'straight-h'},
      {r:0, c:4, type:'straight-h'},
      {r:0, c:5, type:'straight-h'},
      {r:0, c:7, type:'curve-sw'},
      {r:1, c:0, type:'straight-v'},
      {r:2, c:0, type:'straight-v'},
      {r:2, c:7, type:'straight-v'},
      {r:3, c:0, type:'straight-v'},
      {r:3, c:7, type:'straight-v'},
      {r:4, c:0, type:'curve-ne'},
      {r:4, c:1, type:'straight-h'},
      {r:4, c:3, type:'straight-h'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:6, type:'straight-h'},
      {r:4, c:7, type:'curve-nw'},
    ],
    gaps: [
      {r:0, c:3, type:'straight-h'},
      {r:0, c:6, type:'straight-h'},
      {r:1, c:7, type:'straight-v'},
      {r:4, c:2, type:'straight-h'},
      {r:4, c:5, type:'straight-h'},
    ],
  },

  // Level 25: Full outer ring rows 0-4 cols 0-7, all 4 corners + 1 sv side as gaps
  // Full loop same as L21.
  // Gaps: (0,0)se, (0,7)sw, (4,7)nw, (4,0)ne, (2,0)sv
  {
    id: 25,
    group: 5,
    title: '第 25 關',
    desc: '最終關卡！四個彎道加一條直軌！',
    preset: [
      {r:0, c:1, type:'straight-h'},
      {r:0, c:2, type:'straight-h'},
      {r:0, c:3, type:'straight-h'},
      {r:0, c:4, type:'straight-h'},
      {r:0, c:5, type:'straight-h'},
      {r:0, c:6, type:'straight-h'},
      {r:1, c:0, type:'straight-v'},
      {r:1, c:7, type:'straight-v'},
      {r:2, c:7, type:'straight-v'},
      {r:3, c:0, type:'straight-v'},
      {r:3, c:7, type:'straight-v'},
      {r:4, c:1, type:'straight-h'},
      {r:4, c:2, type:'straight-h'},
      {r:4, c:3, type:'straight-h'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:5, type:'straight-h'},
      {r:4, c:6, type:'straight-h'},
    ],
    gaps: [
      {r:0, c:0, type:'curve-se'},
      {r:0, c:7, type:'curve-sw'},
      {r:2, c:0, type:'straight-v'},
      {r:4, c:0, type:'curve-ne'},
      {r:4, c:7, type:'curve-nw'},
    ],
  },
];

function getLevelById(id) {
  return LEVELS.find(l => l.id === id);
}
