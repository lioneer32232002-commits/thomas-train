// Level definitions for challenge mode
// Grid is ROWS=5, COLS=8 (0-indexed)
//
// Design goals:
//  - Size RAMP: group 1 loops are tiny (~8 cells), growing to the full
//    5×8 ring (~22 cells) by group 5.
//  - Shape VARIETY: not just ovals — squares, rectangles, L-shapes in
//    several orientations, a "boot", and figure-8s (via the 4-way `cross`).
// Every level's preset+gaps must form one closed loop (verified in-browser).

const LEVELS = [
  // ══ Group 1 (1 gap) — tiny starter loops ════════════════════════════════════
  {
    id: 1, group: 1, title: 'Level 1',
    desc: 'A tiny loop — add the missing top rail!',
    preset: [
      {r:1, c:3, type:'curve-se'}, {r:1, c:5, type:'curve-sw'},
      {r:2, c:3, type:'straight-v'}, {r:2, c:5, type:'straight-v'},
      {r:3, c:3, type:'curve-ne'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:4, type:'straight-h'} ],
  },
  {
    id: 2, group: 1, title: 'Level 2',
    desc: 'One side rail is missing!',
    preset: [
      {r:1, c:2, type:'curve-se'}, {r:1, c:3, type:'straight-h'}, {r:1, c:4, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'},
      {r:3, c:2, type:'curve-ne'}, {r:3, c:3, type:'straight-h'}, {r:3, c:4, type:'curve-nw'},
    ],
    gaps: [ {r:2, c:4, type:'straight-v'} ],
  },
  {
    id: 3, group: 1, title: 'Level 3',
    desc: 'A small rectangle needs one rail.',
    preset: [
      {r:1, c:2, type:'curve-se'}, {r:1, c:4, type:'straight-h'}, {r:1, c:5, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'}, {r:2, c:5, type:'straight-v'},
      {r:3, c:2, type:'curve-ne'}, {r:3, c:3, type:'straight-h'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:3, type:'straight-h'} ],
  },
  {
    id: 4, group: 1, title: 'Level 4',
    desc: 'A corner is missing — which curve fits?',
    preset: [
      {r:1, c:5, type:'straight-h'}, {r:1, c:6, type:'curve-sw'},
      {r:2, c:4, type:'straight-v'}, {r:2, c:6, type:'straight-v'},
      {r:3, c:4, type:'curve-ne'}, {r:3, c:5, type:'straight-h'}, {r:3, c:6, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:4, type:'curve-se'} ],
  },
  {
    id: 5, group: 1, title: 'Level 5',
    desc: 'The bridge is missing — build it!',
    preset: [
      {r:1, c:2, type:'curve-se'}, {r:1, c:3, type:'straight-h'}, {r:1, c:5, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'}, {r:2, c:5, type:'straight-v'},
      {r:3, c:2, type:'curve-ne'}, {r:3, c:3, type:'straight-h'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:4, type:'bridge'} ],
  },

  // ══ Group 2 (2 gaps) — bigger, first non-rectangle ═══════════════════════════
  {
    id: 6, group: 2, title: 'Level 6',
    desc: 'Two top rails are missing!',
    preset: [
      {r:1, c:2, type:'curve-se'}, {r:1, c:5, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'}, {r:2, c:5, type:'straight-v'},
      {r:3, c:2, type:'curve-ne'}, {r:3, c:3, type:'straight-h'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:3, type:'straight-h'}, {r:1, c:4, type:'straight-h'} ],
  },
  {
    id: 7, group: 2, title: 'Level 7',
    desc: 'A taller loop — one rail missing on each side!',
    preset: [
      {r:1, c:2, type:'curve-se'}, {r:1, c:3, type:'straight-h'}, {r:1, c:4, type:'straight-h'}, {r:1, c:5, type:'curve-sw'},
      {r:2, c:5, type:'straight-v'},
      {r:3, c:2, type:'straight-v'},
      {r:4, c:2, type:'curve-ne'}, {r:4, c:3, type:'straight-h'}, {r:4, c:4, type:'straight-h'}, {r:4, c:5, type:'curve-nw'},
    ],
    gaps: [ {r:2, c:2, type:'straight-v'}, {r:3, c:5, type:'straight-v'} ],
  },
  {
    id: 8, group: 2, title: 'Level 8',
    desc: 'A wide loop — one gap top and bottom!',
    preset: [
      {r:1, c:2, type:'curve-se'}, {r:1, c:3, type:'straight-h'}, {r:1, c:5, type:'straight-h'}, {r:1, c:6, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'}, {r:2, c:6, type:'straight-v'},
      {r:3, c:2, type:'curve-ne'}, {r:3, c:3, type:'straight-h'}, {r:3, c:5, type:'straight-h'}, {r:3, c:6, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:4, type:'straight-h'}, {r:3, c:4, type:'straight-h'} ],
  },
  {
    id: 9, group: 2, title: 'Level 9',
    desc: 'Two corners are missing!',
    preset: [
      {r:1, c:4, type:'straight-h'}, {r:1, c:5, type:'straight-h'}, {r:1, c:6, type:'curve-sw'},
      {r:2, c:3, type:'straight-v'}, {r:2, c:6, type:'straight-v'},
      {r:3, c:3, type:'straight-v'}, {r:3, c:6, type:'straight-v'},
      {r:4, c:3, type:'curve-ne'}, {r:4, c:4, type:'straight-h'}, {r:4, c:5, type:'straight-h'},
    ],
    gaps: [ {r:1, c:3, type:'curve-se'}, {r:4, c:6, type:'curve-nw'} ],
  },
  {
    id: 10, group: 2, title: 'Level 10',
    desc: 'A boot-shaped track — mind the step!',
    preset: [
      {r:1, c:2, type:'curve-se'}, {r:1, c:3, type:'straight-h'},
      {r:2, c:2, type:'straight-v'}, {r:2, c:4, type:'curve-ne'}, {r:2, c:5, type:'curve-sw'},
      {r:3, c:2, type:'curve-ne'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:4, type:'curve-sw'}, {r:3, c:3, type:'straight-h'} ],
  },

  // ══ Group 3 (3 gaps) — medium; L-shapes, station & tunnel ════════════════════
  {
    id: 11, group: 3, title: 'Level 11',
    desc: 'A long oval — three gaps to find!',
    preset: [
      {r:1, c:1, type:'curve-se'}, {r:1, c:2, type:'straight-h'}, {r:1, c:4, type:'straight-h'}, {r:1, c:6, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'}, {r:2, c:6, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'}, {r:3, c:2, type:'straight-h'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'straight-h'}, {r:3, c:6, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:3, type:'straight-h'}, {r:1, c:5, type:'straight-h'}, {r:3, c:3, type:'straight-h'} ],
  },
  {
    id: 12, group: 3, title: 'Level 12',
    desc: 'An L-shaped track! Mind the inside corner!',
    preset: [
      {r:0, c:1, type:'curve-se'}, {r:0, c:2, type:'straight-h'},
      {r:1, c:1, type:'straight-v'}, {r:1, c:4, type:'straight-h'}, {r:1, c:5, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'}, {r:2, c:5, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'}, {r:3, c:2, type:'straight-h'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [ {r:0, c:3, type:'curve-sw'}, {r:1, c:3, type:'curve-ne'}, {r:3, c:3, type:'straight-h'} ],
  },
  {
    id: 13, group: 3, title: 'Level 13',
    desc: 'A station appeared! Find the three gaps!',
    preset: [
      {r:1, c:1, type:'curve-se'}, {r:1, c:3, type:'station'}, {r:1, c:4, type:'straight-h'}, {r:1, c:5, type:'straight-h'}, {r:1, c:6, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'}, {r:2, c:6, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'}, {r:3, c:2, type:'straight-h'}, {r:3, c:4, type:'straight-h'}, {r:3, c:6, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:2, type:'straight-h'}, {r:3, c:3, type:'straight-h'}, {r:3, c:5, type:'straight-h'} ],
  },
  {
    id: 14, group: 3, title: 'Level 14',
    desc: 'Where does the tunnel go? Three gaps!',
    preset: [
      {r:1, c:2, type:'curve-se'}, {r:1, c:5, type:'straight-h'}, {r:1, c:6, type:'curve-sw'},
      {r:2, c:2, type:'straight-v'}, {r:2, c:6, type:'straight-v'},
      {r:3, c:2, type:'straight-v'}, {r:3, c:6, type:'straight-v'},
      {r:4, c:2, type:'curve-ne'}, {r:4, c:3, type:'straight-h'}, {r:4, c:5, type:'straight-h'}, {r:4, c:6, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:3, type:'straight-h'}, {r:1, c:4, type:'tunnel'}, {r:4, c:4, type:'straight-h'} ],
  },
  {
    id: 15, group: 3, title: 'Level 15',
    desc: 'A flipped L — find the inside corner!',
    preset: [
      {r:0, c:1, type:'curve-se'}, {r:0, c:2, type:'straight-h'}, {r:0, c:3, type:'straight-h'}, {r:0, c:4, type:'straight-h'}, {r:0, c:5, type:'curve-sw'},
      {r:1, c:1, type:'straight-v'}, {r:1, c:5, type:'straight-v'},
      {r:2, c:2, type:'straight-h'}, {r:2, c:5, type:'straight-v'},
      {r:3, c:3, type:'curve-ne'}, {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [ {r:2, c:1, type:'curve-ne'}, {r:2, c:3, type:'curve-sw'}, {r:3, c:4, type:'straight-h'} ],
  },

  // ══ Group 4 (4 gaps) — large; ovals, L, ring & figure-8 ══════════════════════
  {
    id: 16, group: 4, title: 'Level 16',
    desc: 'The big oval — four gaps to find!',
    preset: [
      {r:1, c:0, type:'curve-se'}, {r:1, c:1, type:'straight-h'}, {r:1, c:3, type:'straight-h'}, {r:1, c:4, type:'straight-h'}, {r:1, c:6, type:'straight-h'}, {r:1, c:7, type:'curve-sw'},
      {r:2, c:0, type:'straight-v'}, {r:2, c:7, type:'straight-v'},
      {r:3, c:0, type:'curve-ne'}, {r:3, c:1, type:'straight-h'}, {r:3, c:2, type:'straight-h'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'straight-h'}, {r:3, c:7, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:2, type:'straight-h'}, {r:1, c:5, type:'straight-h'}, {r:3, c:3, type:'straight-h'}, {r:3, c:6, type:'straight-h'} ],
  },
  {
    id: 17, group: 4, title: 'Level 17',
    desc: 'A backwards L — two corners and two rails!',
    preset: [
      {r:0, c:4, type:'straight-h'}, {r:0, c:5, type:'curve-sw'},
      {r:1, c:2, type:'straight-h'}, {r:1, c:5, type:'straight-v'},
      {r:2, c:1, type:'straight-v'}, {r:2, c:5, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'}, {r:3, c:2, type:'straight-h'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'curve-nw'},
    ],
    gaps: [ {r:0, c:3, type:'curve-se'}, {r:1, c:1, type:'curve-se'}, {r:1, c:3, type:'curve-nw'}, {r:3, c:3, type:'straight-h'} ],
  },
  {
    id: 18, group: 4, title: 'Level 18',
    desc: 'Four gaps around the big station!',
    preset: [
      {r:1, c:1, type:'curve-se'}, {r:1, c:3, type:'station'}, {r:1, c:4, type:'straight-h'}, {r:1, c:6, type:'straight-h'}, {r:1, c:7, type:'curve-sw'},
      {r:2, c:1, type:'straight-v'}, {r:2, c:7, type:'straight-v'},
      {r:3, c:1, type:'curve-ne'}, {r:3, c:2, type:'straight-h'}, {r:3, c:4, type:'straight-h'}, {r:3, c:5, type:'straight-h'}, {r:3, c:7, type:'curve-nw'},
    ],
    gaps: [ {r:1, c:2, type:'straight-h'}, {r:1, c:5, type:'straight-h'}, {r:3, c:3, type:'straight-h'}, {r:3, c:6, type:'straight-h'} ],
  },
  {
    id: 19, group: 4, title: 'Level 19',
    desc: 'All four corners are missing — curve power!',
    preset: [
      {r:1, c:2, type:'straight-h'}, {r:1, c:3, type:'straight-h'}, {r:1, c:4, type:'straight-h'}, {r:1, c:5, type:'straight-h'},
      {r:2, c:1, type:'straight-v'}, {r:2, c:6, type:'straight-v'},
      {r:3, c:1, type:'straight-v'}, {r:3, c:6, type:'straight-v'},
      {r:4, c:2, type:'straight-h'}, {r:4, c:3, type:'straight-h'}, {r:4, c:4, type:'straight-h'}, {r:4, c:5, type:'straight-h'},
    ],
    gaps: [ {r:1, c:1, type:'curve-se'}, {r:1, c:6, type:'curve-sw'}, {r:4, c:1, type:'curve-ne'}, {r:4, c:6, type:'curve-nw'} ],
  },
  {
    id: 20, group: 4, title: 'Level 20',
    desc: 'A figure-8! Drop the ✚ crossing in the middle!',
    preset: [
      {r:0, c:1, type:'curve-se'}, {r:0, c:2, type:'straight-h'}, {r:0, c:3, type:'curve-sw'},
      {r:1, c:1, type:'straight-v'}, {r:1, c:3, type:'straight-v'},
      {r:2, c:1, type:'curve-ne'}, {r:2, c:2, type:'straight-h'}, {r:2, c:4, type:'straight-h'},
      {r:3, c:5, type:'straight-v'},
      {r:4, c:3, type:'curve-ne'}, {r:4, c:5, type:'curve-nw'},
    ],
    gaps: [
      {r:2, c:3, type:'cross'}, {r:2, c:5, type:'curve-sw'},
      {r:3, c:3, type:'straight-v'}, {r:4, c:4, type:'straight-h'},
    ],
  },

  // ══ Group 5 (5 gaps) — the biggest ═══════════════════════════════════════════
  {
    id: 21, group: 5, title: 'Level 21',
    desc: 'The whole outer ring! Five gaps to find!',
    preset: [
      {r:0, c:0, type:'curve-se'}, {r:0, c:1, type:'straight-h'}, {r:0, c:3, type:'straight-h'}, {r:0, c:4, type:'straight-h'}, {r:0, c:6, type:'straight-h'}, {r:0, c:7, type:'curve-sw'},
      {r:1, c:0, type:'straight-v'}, {r:1, c:7, type:'straight-v'},
      {r:2, c:0, type:'straight-v'},
      {r:3, c:0, type:'straight-v'}, {r:3, c:7, type:'straight-v'},
      {r:4, c:0, type:'curve-ne'}, {r:4, c:1, type:'straight-h'}, {r:4, c:2, type:'straight-h'}, {r:4, c:4, type:'straight-h'}, {r:4, c:5, type:'straight-h'}, {r:4, c:7, type:'curve-nw'},
    ],
    gaps: [
      {r:0, c:2, type:'straight-h'}, {r:0, c:5, type:'straight-h'}, {r:2, c:7, type:'straight-v'},
      {r:4, c:3, type:'straight-h'}, {r:4, c:6, type:'straight-h'},
    ],
  },
  {
    id: 22, group: 5, title: 'Level 22',
    desc: 'Bridge and station — five tough gaps!',
    preset: [
      {r:1, c:0, type:'curve-se'}, {r:1, c:1, type:'straight-h'}, {r:1, c:2, type:'bridge'}, {r:1, c:4, type:'station'}, {r:1, c:5, type:'straight-h'}, {r:1, c:7, type:'curve-sw'},
      {r:2, c:0, type:'straight-v'},
      {r:3, c:0, type:'straight-v'}, {r:3, c:7, type:'straight-v'},
      {r:4, c:0, type:'curve-ne'}, {r:4, c:1, type:'straight-h'}, {r:4, c:2, type:'straight-h'}, {r:4, c:4, type:'straight-h'}, {r:4, c:6, type:'straight-h'}, {r:4, c:7, type:'curve-nw'},
    ],
    gaps: [
      {r:1, c:3, type:'straight-h'}, {r:1, c:6, type:'straight-h'}, {r:2, c:7, type:'straight-v'},
      {r:4, c:3, type:'straight-h'}, {r:4, c:5, type:'straight-h'},
    ],
  },
  {
    id: 23, group: 5, title: 'Level 23',
    desc: 'A giant figure-8 — five gaps including the ✚ crossing!',
    preset: [
      {r:0, c:2, type:'straight-h'}, {r:0, c:3, type:'curve-sw'},
      {r:1, c:1, type:'straight-v'}, {r:1, c:3, type:'straight-v'},
      {r:2, c:1, type:'curve-ne'}, {r:2, c:2, type:'straight-h'}, {r:2, c:4, type:'straight-h'}, {r:2, c:5, type:'straight-h'},
      {r:3, c:3, type:'straight-v'}, {r:3, c:6, type:'straight-v'},
      {r:4, c:4, type:'straight-h'}, {r:4, c:5, type:'straight-h'},
    ],
    gaps: [
      {r:0, c:1, type:'curve-se'}, {r:2, c:3, type:'cross'}, {r:2, c:6, type:'curve-sw'},
      {r:4, c:3, type:'curve-ne'}, {r:4, c:6, type:'curve-nw'},
    ],
  },
  {
    id: 24, group: 5, title: 'Level 24',
    desc: 'Huge ring, five different gaps!',
    preset: [
      {r:0, c:0, type:'curve-se'}, {r:0, c:1, type:'straight-h'}, {r:0, c:2, type:'straight-h'}, {r:0, c:4, type:'straight-h'}, {r:0, c:5, type:'straight-h'}, {r:0, c:7, type:'curve-sw'},
      {r:1, c:0, type:'straight-v'}, {r:1, c:7, type:'straight-v'},
      {r:2, c:0, type:'straight-v'}, {r:2, c:7, type:'straight-v'},
      {r:3, c:0, type:'straight-v'},
      {r:4, c:0, type:'curve-ne'}, {r:4, c:1, type:'straight-h'}, {r:4, c:3, type:'straight-h'}, {r:4, c:4, type:'straight-h'}, {r:4, c:6, type:'straight-h'}, {r:4, c:7, type:'curve-nw'},
    ],
    gaps: [
      {r:0, c:3, type:'straight-h'}, {r:0, c:6, type:'straight-h'}, {r:3, c:7, type:'straight-v'},
      {r:4, c:2, type:'straight-h'}, {r:4, c:5, type:'straight-h'},
    ],
  },
  {
    id: 25, group: 5, title: 'Level 25',
    desc: 'Final level! Four curves plus a straight!',
    preset: [
      {r:0, c:1, type:'straight-h'}, {r:0, c:2, type:'straight-h'}, {r:0, c:3, type:'straight-h'}, {r:0, c:4, type:'straight-h'}, {r:0, c:5, type:'straight-h'}, {r:0, c:6, type:'straight-h'},
      {r:1, c:0, type:'straight-v'}, {r:1, c:7, type:'straight-v'},
      {r:2, c:7, type:'straight-v'},
      {r:3, c:0, type:'straight-v'}, {r:3, c:7, type:'straight-v'},
      {r:4, c:1, type:'straight-h'}, {r:4, c:2, type:'straight-h'}, {r:4, c:3, type:'straight-h'}, {r:4, c:4, type:'straight-h'}, {r:4, c:5, type:'straight-h'}, {r:4, c:6, type:'straight-h'},
    ],
    gaps: [
      {r:0, c:0, type:'curve-se'}, {r:0, c:7, type:'curve-sw'}, {r:2, c:0, type:'straight-v'},
      {r:4, c:0, type:'curve-ne'}, {r:4, c:7, type:'curve-nw'},
    ],
  },
];

function getLevelById(id) {
  return LEVELS.find(l => l.id === id);
}
