// Level definitions for challenge mode
// Grid is ROWS=5, COLS=8 (0-indexed)
// All coordinates shifted from original: new_r = old_r - 1, new_c = old_c - 2

const LEVELS = [
  // ── Group 1: 1 gap each ───────────────────────────────────────────────────
  {
    id: 1,
    group: 1,
    title: 'Level 1',
    desc: 'Find the missing horizontal track!',
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
    title: 'Level 2',
    desc: 'A vertical track is missing on the right!',
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
    title: 'Level 3',
    desc: 'A curve is missing in the bottom-left!',
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
    title: 'Level 4',
    desc: 'A curve is missing in the top-right!',
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
    title: 'Level 5',
    desc: 'The bridge has gone missing!',
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
    title: 'Level 6',
    desc: 'Two horizontal tracks missing at the top!',
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
    title: 'Level 7',
    desc: 'One vertical track missing on each side!',
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
    title: 'Level 8',
    desc: 'One horizontal track missing top and bottom!',
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
    title: 'Level 9',
    desc: 'Find the two missing tracks!',
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
    title: 'Level 10',
    desc: 'Two curves have gone missing — can you find them?',
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
    title: 'Level 11',
    desc: 'Big oval — where are the three gaps?',
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

  // Level 12: L-shaped loop (a notch cut from the top-right) — not an oval!
  // Loop: (0,1)se→(0,2)sh→(0,3)sw→(1,3)ne→(1,4)sh→(1,5)sw→(2,5)sv→(3,5)nw
  //       →(3,4)sh→(3,3)sh→(3,2)sh→(3,1)ne→(2,1)sv→(1,1)sv→(0,1)se  ✓
  // (1,3)ne is the inner concave corner. Gaps: (0,3)sw, (1,3)ne, (3,3)sh
  {
    id: 12,
    group: 3,
    title: 'Level 12',
    desc: 'An L-shaped track! Mind the inside corner!',
    preset: [
      {r:0, c:1, type:'curve-se'},
      {r:0, c:2, type:'straight-h'},
      {r:1, c:4, type:'straight-h'},
      {r:1, c:5, type:'curve-sw'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:5, type:'curve-nw'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:1, type:'curve-ne'},
      {r:2, c:1, type:'straight-v'},
      {r:1, c:1, type:'straight-v'},
    ],
    gaps: [
      {r:0, c:3, type:'curve-sw'},
      {r:1, c:3, type:'curve-ne'},
      {r:3, c:3, type:'straight-h'},
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
    title: 'Level 13',
    desc: 'A station appeared! Find those gaps!',
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
    title: 'Level 14',
    desc: 'Where is the tunnel? Three gaps!',
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
      {r:4, c:3, type:'straight-h'},
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
    title: 'Level 15',
    desc: 'Gaps in every direction — keep going!',
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
    title: 'Level 16',
    desc: 'Big oval, four gaps — find them all!',
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

  // Level 17: L-shaped loop with the notch on the TOP-LEFT (mirror of L12) — four gaps.
  // Loop: (0,3)se→(0,4)sh→(0,5)sw→(1,5)sv→(2,5)sv→(3,5)nw→(3,4)sh→(3,3)sh→(3,2)sh
  //       →(3,1)ne→(2,1)sv→(1,1)se→(1,2)sh→(1,3)nw→(0,3)se  ✓
  // (1,3)nw is the inner concave corner. Gaps: (0,3)se, (1,1)se, (1,3)nw, (3,3)sh
  {
    id: 17,
    group: 4,
    title: 'Level 17',
    desc: 'A backwards L — find both corners and two rails!',
    preset: [
      {r:0, c:4, type:'straight-h'},
      {r:0, c:5, type:'curve-sw'},
      {r:1, c:5, type:'straight-v'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:5, type:'curve-nw'},
      {r:3, c:4, type:'straight-h'},
      {r:3, c:2, type:'straight-h'},
      {r:3, c:1, type:'curve-ne'},
      {r:2, c:1, type:'straight-v'},
      {r:1, c:2, type:'straight-h'},
    ],
    gaps: [
      {r:0, c:3, type:'curve-se'},
      {r:1, c:1, type:'curve-se'},
      {r:1, c:3, type:'curve-nw'},
      {r:3, c:3, type:'straight-h'},
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
    title: 'Level 18',
    desc: 'Four gaps around the station!',
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
    title: 'Level 19',
    desc: 'All four corners are missing — curve challenge!',
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

  // Level 20: FIGURE-8! Two loops joined by a 4-way cross at (2,3).
  // Loop: (0,1)se→(0,2)sh→(0,3)sw→(1,3)sv→(2,3)CROSS(N→S)→(3,3)sv→(4,3)ne
  //       →(4,4)sh→(4,5)nw→(3,5)sv→(2,5)sw→(2,4)sh→(2,3)CROSS(E→W)→(2,2)sh
  //       →(2,1)ne→(1,1)sv→(0,1)se  ✓   (the cross is passed straight on each axis)
  // Gaps: (2,3)cross, (2,5)sw, (3,3)sv, (4,4)sh
  {
    id: 20,
    group: 4,
    title: 'Level 20',
    desc: 'A figure-8! Drop the ✚ crossing in the middle!',
    preset: [
      {r:0, c:1, type:'curve-se'},
      {r:0, c:2, type:'straight-h'},
      {r:0, c:3, type:'curve-sw'},
      {r:1, c:1, type:'straight-v'},
      {r:1, c:3, type:'straight-v'},
      {r:2, c:1, type:'curve-ne'},
      {r:2, c:2, type:'straight-h'},
      {r:2, c:4, type:'straight-h'},
      {r:3, c:5, type:'straight-v'},
      {r:4, c:3, type:'curve-ne'},
      {r:4, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:2, c:3, type:'cross'},
      {r:2, c:5, type:'curve-sw'},
      {r:3, c:3, type:'straight-v'},
      {r:4, c:4, type:'straight-h'},
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
    title: 'Level 21',
    desc: 'The whole outer ring! Five gaps to find!',
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
    title: 'Level 22',
    desc: 'Bridge and station — five tough gaps!',
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
      {r:4, c:5, type:'straight-h'},
    ],
  },

  // Level 23: BIG FIGURE-8! Two large loops joined by a 4-way cross at (2,3).
  // Loop: (0,1)se→(0,2)sh→(0,3)sw→(1,3)sv→(2,3)CROSS(N→S)→(3,3)sv→(4,3)ne
  //       →(4,4)sh→(4,5)sh→(4,6)nw→(3,6)sv→(2,6)sw→(2,5)sh→(2,4)sh→(2,3)CROSS(E→W)
  //       →(2,2)sh→(2,1)ne→(1,1)sv→(0,1)se  ✓
  // Gaps: (0,1)se, (2,3)cross, (2,6)sw, (4,3)ne, (4,6)nw
  {
    id: 23,
    group: 5,
    title: 'Level 23',
    desc: 'A giant figure-8 — five gaps including the ✚ crossing!',
    preset: [
      {r:0, c:2, type:'straight-h'},
      {r:0, c:3, type:'curve-sw'},
      {r:1, c:1, type:'straight-v'},
      {r:1, c:3, type:'straight-v'},
      {r:2, c:1, type:'curve-ne'},
      {r:2, c:2, type:'straight-h'},
      {r:2, c:4, type:'straight-h'},
      {r:2, c:5, type:'straight-h'},
      {r:3, c:3, type:'straight-v'},
      {r:3, c:6, type:'straight-v'},
      {r:4, c:4, type:'straight-h'},
      {r:4, c:5, type:'straight-h'},
    ],
    gaps: [
      {r:0, c:1, type:'curve-se'},
      {r:2, c:3, type:'cross'},
      {r:2, c:6, type:'curve-sw'},
      {r:4, c:3, type:'curve-ne'},
      {r:4, c:6, type:'curve-nw'},
    ],
  },

  // Level 24: Full outer ring rows 0-4 cols 0-7, different 5-gap set
  // Full loop same as L21.
  // Gaps: (0,3)sh, (0,6)sh, (1,7)sv, (4,2)sh, (4,5)sh
  {
    id: 24,
    group: 5,
    title: 'Level 24',
    desc: 'Huge ring, five different gaps!',
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
    title: 'Level 25',
    desc: 'Final level! Four curves plus a straight!',
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
