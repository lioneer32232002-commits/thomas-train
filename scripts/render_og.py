#!/usr/bin/env python3
"""Render the Dino Rail Craft art in blocky Minecraft pixel style.

This is the authoritative renderer for:
  - og-banner.png        (1200x630 social share image)
  - apple-touch-icon.png (512x512 square app icon)
The in-browser generator generate-og-banner.html mirrors the banner design.
"""
from PIL import Image

W, H = 1200, 630

# Active render target — set via use() so helpers can draw to any image.
CUR_PX = None
CUR_W = 0
CUR_H = 0


def use(image):
    global CUR_PX, CUR_W, CUR_H
    CUR_PX = image.load()
    CUR_W, CUR_H = image.size
    return image


img = use(Image.new("RGB", (W, H), (0, 0, 0)))


# ── primitives ────────────────────────────────────────────────────────────────
def rect(x, y, w, h, c):
    x0, y0 = int(x), int(y)
    x1, y1 = int(x + w), int(y + h)
    if x0 < 0: x0 = 0
    if y0 < 0: y0 = 0
    if x1 > CUR_W: x1 = CUR_W
    if y1 > CUR_H: y1 = CUR_H
    for yy in range(y0, y1):
        for xx in range(x0, x1):
            CUR_PX[xx, yy] = c


def blend(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# Deterministic pseudo-random so the banner is reproducible.
_seed = 1337
def rnd():
    global _seed
    _seed = (_seed * 1103515245 + 12345) & 0x7FFFFFFF
    return _seed / 0x7FFFFFFF


# ── palette ───────────────────────────────────────────────────────────────────
SKY_TOP   = (0x4A, 0x9E, 0xD8)
SKY_MID   = (0x79, 0xC2, 0xEC)
SKY_LOW   = (0xAE, 0xE2, 0xF5)
SUN       = (0xFF, 0xD7, 0x40)
SUN_CORE  = (0xFF, 0xEC, 0x99)
CLOUD     = (0xFF, 0xFF, 0xFF)
CLOUD_SH  = (0xD6, 0xE6, 0xF2)

HILL_FAR  = (0x3E, 0x86, 0x6A)
HILL_NEAR = (0x32, 0x72, 0x58)
GRASS_TOP = (0x7D, 0xC8, 0x50)
GRASS     = (0x6C, 0xAB, 0x3C)
GRASS_DK  = (0x57, 0x8E, 0x30)
DIRT      = (0x8B, 0x5E, 0x3C)
DIRT_DK   = (0x73, 0x4B, 0x2E)
DIRT_LT   = (0x9C, 0x6B, 0x45)

TRUNK     = (0x6B, 0x4A, 0x2B)
TRUNK_DK  = (0x53, 0x39, 0x21)
LEAF      = (0x4E, 0x8A, 0x2A)
LEAF_LT   = (0x63, 0xA8, 0x38)
LEAF_DK   = (0x3B, 0x6B, 0x22)

TIE       = (0x5C, 0x3E, 0x2A)
TIE_LT    = (0x6E, 0x4B, 0x32)
RAIL      = (0xC4, 0xC4, 0xC4)
RAIL_DK   = (0x80, 0x80, 0x80)

IRON      = (0x6B, 0x6B, 0x6B)
IRON_LT   = (0x9A, 0x9A, 0x9A)
IRON_DK   = (0x4F, 0x4F, 0x4F)
IRON_IN   = (0x3F, 0x3F, 0x3F)

DINO      = (0x6C, 0xC0, 0x40)
DINO_LT   = (0x8E, 0xDE, 0x5C)
DINO_DK   = (0x52, 0x9E, 0x2E)
DINO_OUT  = (0x21, 0x40, 0x14)
WHITE     = (0xFF, 0xFF, 0xFF)
BLACK     = (0x1A, 0x1A, 0x1A)

GOLD      = (0xFF, 0xD7, 0x40)
GOLD_DK   = (0xE0, 0xA8, 0x14)
EMERALD   = (0x35, 0xD0, 0x7A)
EMERALD_D = (0x1E, 0xA0, 0x5A)

TXT       = (0xFF, 0xFF, 0xFF)
TXT_SH    = (0x2A, 0x1A, 0x0A)
TXT_FACE  = (0x7D, 0xC8, 0x50)
TXT_FACE2 = (0xFF, 0xE2, 0x59)


# ── 5x7 pixel font ────────────────────────────────────────────────────────────
FONT = {
    "A": ["01110","10001","10001","11111","10001","10001","10001"],
    "B": ["11110","10001","11110","10001","10001","10001","11110"],
    "C": ["01110","10001","10000","10000","10000","10001","01110"],
    "D": ["11110","10001","10001","10001","10001","10001","11110"],
    "E": ["11111","10000","11110","10000","10000","10000","11111"],
    "F": ["11111","10000","11110","10000","10000","10000","10000"],
    "G": ["01110","10001","10000","10111","10001","10001","01111"],
    "H": ["10001","10001","10001","11111","10001","10001","10001"],
    "I": ["11111","00100","00100","00100","00100","00100","11111"],
    "K": ["10001","10010","11100","10010","10001","10001","10001"],
    "L": ["10000","10000","10000","10000","10000","10000","11111"],
    "N": ["10001","11001","10101","10011","10001","10001","10001"],
    "O": ["01110","10001","10001","10001","10001","10001","01110"],
    "R": ["11110","10001","10001","11110","10100","10010","10001"],
    "S": ["01111","10000","10000","01110","00001","00001","11110"],
    "T": ["11111","00100","00100","00100","00100","00100","00100"],
    "U": ["10001","10001","10001","10001","10001","10001","01110"],
    "V": ["10001","10001","10001","10001","10001","01010","00100"],
    "Y": ["10001","10001","01010","00100","00100","00100","00100"],
    " ": ["00000","00000","00000","00000","00000","00000","00000"],
    "!": ["00100","00100","00100","00100","00100","00000","00100"],
    "'": ["00100","00100","01000","00000","00000","00000","00000"],
}


def text(s, x, y, scale, face, shadow=None):
    """Draw blocky pixel text; optional drop-shadow layer."""
    cw = (5 + 1) * scale  # char width incl 1px gap
    if shadow:
        off = scale
        cx = x
        for ch in s:
            g = FONT.get(ch, FONT[" "])
            for ry, rowbits in enumerate(g):
                for rxi, bit in enumerate(rowbits):
                    if bit == "1":
                        rect(cx + rxi * scale + off, y + ry * scale + off, scale, scale, shadow)
            cx += cw
    cx = x
    for ch in s:
        g = FONT.get(ch, FONT[" "])
        for ry, rowbits in enumerate(g):
            for rxi, bit in enumerate(rowbits):
                if bit == "1":
                    rect(cx + rxi * scale, y + ry * scale, scale, scale, face)
        cx += cw


def text_width(s, scale):
    return len(s) * (5 + 1) * scale - scale


# ════════════════════════════════════════════════════════════════════════════
# SKY  — banded blocky gradient
# ════════════════════════════════════════════════════════════════════════════
GROUND_Y = 430
band = 14
for y in range(0, GROUND_Y, band):
    t = y / GROUND_Y
    if t < 0.5:
        c = blend(SKY_TOP, SKY_MID, t / 0.5)
    else:
        c = blend(SKY_MID, SKY_LOW, (t - 0.5) / 0.5)
    rect(0, y, W, band, c)


# Blocky sun (top-right) with stepped rays
def draw_sun(cx, cy):
    s = 16
    rect(cx - 3 * s, cy - 3 * s, 6 * s, 6 * s, SUN)
    rect(cx - 2 * s, cy - 2 * s, 4 * s, 4 * s, SUN_CORE)
    rect(cx - 3 * s, cy - 3 * s, s, s, SUN_CORE)
    rect(cx + 2 * s, cy - 3 * s, s, s, SUN_CORE)
    rect(cx - 3 * s, cy + 2 * s, s, s, SUN_CORE)
    rect(cx + 2 * s, cy + 2 * s, s, s, SUN_CORE)
    # rays
    for (dx, dy) in [(-5, 0), (5, 0), (0, -5), (0, 5)]:
        rect(cx + dx * s - s // 2, cy + dy * s - s // 2, s, s, SUN)
    for (dx, dy) in [(-4, -4), (4, -4), (-4, 4), (4, 4)]:
        rect(cx + dx * s - s // 2, cy + dy * s - s // 2, s, s, SUN)


draw_sun(1070, 130)


# Blocky Minecraft clouds (stepped)
def cloud(x, y, s):
    blocks = [(0,1,4,1),(1,0,3,1),(3,1,3,1),(1,2,6,1),(2,1,2,1),(5,0,2,1)]
    for (bx, by, bw, bh) in blocks:
        rect(x + bx * s, y + by * s, bw * s, bh * s, CLOUD)
    # soft underside
    for (bx, by, bw, bh) in [(1,3,5,1),(3,2,3,1)]:
        rect(x + bx * s, y + by * s, bw * s, bh * s, CLOUD_SH)


cloud(120, 70, 13)
cloud(470, 50, 11)
cloud(760, 95, 10)
cloud(330, 140, 8)


# ════════════════════════════════════════════════════════════════════════════
# BACKGROUND HILLS
# ════════════════════════════════════════════════════════════════════════════
def hill(cx, base, r, color):
    # stepped blocky dome
    steps = [(0.0,1.0),(0.18,0.92),(0.38,0.78),(0.58,0.58),(0.76,0.36),(0.9,0.16)]
    for (h_t, w_t) in steps:
        hh = int(r * (1 - h_t)) - int(r * (1 - (h_t + 0.18)))
        rect(cx - r * w_t, base - r * h_t - hh, r * w_t * 2, hh + 4, color)


hill(220, GROUND_Y, 120, HILL_FAR)
hill(540, GROUND_Y, 150, HILL_FAR)
hill(980, GROUND_Y, 135, HILL_FAR)
hill(760, GROUND_Y, 95, HILL_NEAR)


# ════════════════════════════════════════════════════════════════════════════
# OAK TREES (blocky)
# ════════════════════════════════════════════════════════════════════════════
def tree(x, base, s):
    # trunk
    rect(x - s, base - 5 * s, 2 * s, 5 * s, TRUNK)
    rect(x, base - 5 * s, s, 5 * s, TRUNK_DK)
    # leaf cube cluster (7x5 blocks)
    ly = base - 11 * s
    leaf_map = [
        "0111110",
        "1111111",
        "1111111",
        "1111111",
        "0111110",
    ]
    for ry, row in enumerate(leaf_map):
        for rx, b in enumerate(row):
            if b == "1":
                xx = x - 3 * s + rx * s
                yy = ly + ry * s
                shade = LEAF
                r = rnd()
                if r > 0.78: shade = LEAF_LT
                elif r < 0.25: shade = LEAF_DK
                rect(xx, yy, s, s, shade)


tree(120, GROUND_Y + 6, 9)
tree(1110, GROUND_Y + 10, 11)
tree(640, GROUND_Y - 2, 7)


# ════════════════════════════════════════════════════════════════════════════
# GROUND — grass + textured dirt blocks
# ════════════════════════════════════════════════════════════════════════════
BS = 30  # block size
# grass top strip
rect(0, GROUND_Y, W, 12, GRASS_TOP)
rect(0, GROUND_Y + 12, W, 18, GRASS)
# grass blades poking up
for x in range(0, W, 10):
    if rnd() > 0.5:
        rect(x, GROUND_Y - 4, 4, 4, GRASS_TOP)
# dirt rows with per-block speckle texture
y = GROUND_Y + 30
row_i = 0
while y < H:
    for x in range(0, W, BS):
        base = DIRT if (row_i % 2 == 0) else blend(DIRT, DIRT_DK, 0.18)
        rect(x, y, BS, BS, base)
        # speckles
        for _ in range(5):
            sx = x + int(rnd() * (BS - 6))
            sy = y + int(rnd() * (BS - 6))
            sc = DIRT_DK if rnd() > 0.45 else DIRT_LT
            rect(sx, sy, 6, 6, sc)
        # block outline (subtle)
        rect(x, y, BS, 2, DIRT_DK)
        rect(x, y, 2, BS, blend(DIRT, DIRT_DK, 0.4))
    y += BS
    row_i += 1


# ════════════════════════════════════════════════════════════════════════════
# RAILS  — wooden ties + metal rails across the grass
# ════════════════════════════════════════════════════════════════════════════
RAIL_Y = GROUND_Y + 60
# ties
for x in range(-10, W + 20, 46):
    rect(x, RAIL_Y - 4, 30, 40, TIE)
    rect(x, RAIL_Y - 4, 30, 5, TIE_LT)
    rect(x + 6, RAIL_Y + 2, 4, 30, TIE_LT)
# two metal rails
rect(0, RAIL_Y - 10, W, 8, RAIL)
rect(0, RAIL_Y - 4, W, 3, RAIL_DK)
rect(0, RAIL_Y + 30, W, 8, RAIL)
rect(0, RAIL_Y + 36, W, 3, RAIL_DK)


# ════════════════════════════════════════════════════════════════════════════
# HERO — green dino riding an iron minecart (front-centre)
# ════════════════════════════════════════════════════════════════════════════
def draw_minecart_dino(cx, cy, s):
    """cx,cy = centre of cart top; s = block unit."""
    # ── shadow under cart ──
    rect(cx - 9 * s, cy + 7 * s, 18 * s, 2 * s, blend(GRASS_DK, BLACK, 0.25))

    # ── iron minecart tub ──
    rect(cx - 8 * s, cy, 16 * s, 7 * s, IRON)
    rect(cx - 8 * s, cy, 16 * s, s, IRON_LT)          # top highlight
    rect(cx - 8 * s, cy + 6 * s, 16 * s, s, IRON_DK)  # bottom shade
    rect(cx - 8 * s, cy, s, 7 * s, IRON_LT)           # left edge
    rect(cx + 7 * s, cy, s, 7 * s, IRON_DK)           # right edge
    rect(cx - 7 * s, cy + s, 14 * s, 4 * s, IRON_IN)  # interior
    # rivets
    for rx in range(-7, 8, 3):
        rect(cx + rx * s, cy + 5 * s, s, s, IRON_LT)

    # ── wheels ──
    for wx in (-5, 5):
        rect(cx + wx * s - 2 * s, cy + 7 * s, 4 * s, 3 * s, BLACK)
        rect(cx + wx * s - s, cy + 8 * s, 2 * s, s, IRON_LT)

    # ── dino tail poking out the back-left ──
    rect(cx - 11 * s, cy + s, 3 * s, 2 * s, DINO_DK)
    rect(cx - 10 * s, cy, 2 * s, 2 * s, DINO)

    # ── dino body sitting inside ──
    rect(cx - 2 * s, cy - 4 * s, 5 * s, 5 * s, DINO)
    rect(cx + 2 * s, cy - s, 2 * s, 2 * s, DINO_DK)

    # ── dino head (big, friendly) ──
    hx, hy = cx - 4 * s, cy - 13 * s
    rect(hx, hy, 9 * s, 8 * s, DINO)
    rect(hx, hy, 9 * s, s, DINO_LT)              # top highlight
    rect(hx, hy, 9 * s, 8 * s, DINO)             # base (kept)
    # outline
    rect(hx - s, hy, s, 8 * s, DINO_OUT)
    rect(hx + 9 * s, hy + 3 * s, s, 5 * s, DINO_OUT)
    rect(hx, hy - s, 9 * s, s, DINO_OUT)
    # snout
    rect(hx + 8 * s, hy + 3 * s, 4 * s, 4 * s, DINO)
    rect(hx + 8 * s, hy + 3 * s, 4 * s, s, DINO_LT)
    rect(hx + 8 * s, hy + 6 * s, 4 * s, s, DINO_DK)
    # nostril
    rect(hx + 10 * s, hy + 4 * s, s, s, DINO_OUT)
    # eye (white + pupil)
    rect(hx + 4 * s, hy + s, 3 * s, 3 * s, WHITE)
    rect(hx + 5 * s, hy + 2 * s, 2 * s, 2 * s, BLACK)
    rect(hx + 5 * s, hy + 2 * s, s, s, WHITE)     # glint
    # spikes on head
    for i in range(3):
        rect(hx + i * 3 * s + s, hy - 2 * s, s, 2 * s, DINO_DK)
    # teeth
    for i in range(3):
        rect(hx + 8 * s + i * s, hy + 7 * s, s, s, WHITE)
    # little arm reaching to grab the cart rim
    rect(hx + 6 * s, hy + 8 * s, 2 * s, 3 * s, DINO_DK)


draw_minecart_dino(510, RAIL_Y - 6, 13)


# ════════════════════════════════════════════════════════════════════════════
# FLOATING COLLECTIBLES — gold star + emerald (game rewards)
# ════════════════════════════════════════════════════════════════════════════
def gold_star(cx, cy, s):
    rect(cx - 2 * s, cy - 2 * s, 5 * s, 5 * s, GOLD)
    rect(cx - s, cy - 4 * s, s, s, GOLD)            # top point
    rect(cx, cy - 4 * s, s, 2 * s, GOLD)
    rect(cx + s, cy - 4 * s, s, s, GOLD)
    rect(cx - 4 * s, cy, s, s, GOLD)                # left point
    rect(cx + 3 * s, cy, s, s, GOLD)                # right point
    rect(cx - 2 * s, cy + 3 * s, s, 2 * s, GOLD)    # bottom points
    rect(cx + 2 * s, cy + 3 * s, s, 2 * s, GOLD)
    rect(cx - 2 * s, cy - 2 * s, 5 * s, s, TXT_FACE2)  # highlight
    # outline shade
    rect(cx - 2 * s, cy + 2 * s, 5 * s, s, GOLD_DK)


def emerald(cx, cy, s):
    rect(cx - 2 * s, cy - s, 4 * s, 3 * s, EMERALD)
    rect(cx - s, cy - 2 * s, 2 * s, s, EMERALD)
    rect(cx - s, cy + 2 * s, 2 * s, s, EMERALD)
    rect(cx - 2 * s, cy - s, 4 * s, s, blend(EMERALD, WHITE, 0.4))
    rect(cx - s, cy + s, 2 * s, s, EMERALD_D)


gold_star(900, 250, 9)
gold_star(1020, 365, 7)
emerald(185, 250, 11)
emerald(710, 250, 8)
gold_star(250, 360, 6)


# ════════════════════════════════════════════════════════════════════════════
# TITLE LOGO — "DINO RAIL CRAFT" + play button
# ════════════════════════════════════════════════════════════════════════════
sc = 11
l1 = "DINO RAIL"
l2 = "CRAFT"
w1 = text_width(l1, sc)
x1 = (W - w1) // 2
y1 = 40
# line 1 — green face, dark shadow
text(l1, x1, y1, sc, TXT_FACE, shadow=TXT_SH)
# line 2 — gold face
w2 = text_width(l2, sc)
# leave room for play button to the right of line 2
play_w = 9 * sc
total2 = w2 + 3 * sc + play_w
x2 = (W - total2) // 2
y2 = y1 + 9 * sc
text(l2, x2, y2, sc, TXT_FACE2, shadow=TXT_SH)


# blocky play button (green block + white stepped triangle)
def play_button(x, y, s):
    rect(x, y, 9 * s, 9 * s, TXT_SH)               # shadow
    rect(x - s, y - s, 9 * s, 9 * s, EMERALD)
    rect(x - s, y - s, 9 * s, s, blend(EMERALD, WHITE, 0.35))
    rect(x - s, y + 7 * s, 9 * s, s, EMERALD_D)
    # white triangle ▶
    tri = [(2,1,1,7),(3,2,1,5),(4,3,1,3),(5,4,1,1)]
    for (bx, by, bw, bh) in tri:
        rect(x - s + bx * s, y - s + by * s, bw * s, bh * s, WHITE)


play_button(x2 + w2 + 3 * sc, y2, sc)


img.save("og-banner.png")
print("wrote og-banner.png", img.size)


# ════════════════════════════════════════════════════════════════════════════
# SQUARE APP ICON — apple-touch-icon.png (512x512)
# Reuses the dino-minecart hero on a compact blocky landscape.
# ════════════════════════════════════════════════════════════════════════════
IW = 512
icon = use(Image.new("RGB", (IW, IW), (0, 0, 0)))

# sky bands
iground = 300
iband = 12
for y in range(0, iground, iband):
    t = y / iground
    c = blend(SKY_TOP, SKY_MID, t) if t < 0.6 else blend(SKY_MID, SKY_LOW, (t - 0.6) / 0.4)
    rect(0, y, IW, iband, c)

# sun + cloud
draw_sun(440, 70)
cloud(40, 50, 9)

# rolling hills
hill(120, iground, 95, HILL_FAR)
hill(380, iground, 110, HILL_FAR)
hill(260, iground, 80, HILL_NEAR)
tree(70, iground + 4, 7)
tree(450, iground + 6, 7)

# grass + dirt
rect(0, iground, IW, 10, GRASS_TOP)
rect(0, iground + 10, IW, 14, GRASS)
for x in range(0, IW, 9):
    if rnd() > 0.5:
        rect(x, iground - 3, 3, 3, GRASS_TOP)
y = iground + 24
ri = 0
while y < IW:
    for x in range(0, IW, BS):
        rect(x, y, BS, BS, DIRT if ri % 2 == 0 else blend(DIRT, DIRT_DK, 0.18))
        for _ in range(4):
            sx = x + int(rnd() * (BS - 6)); sy = y + int(rnd() * (BS - 6))
            rect(sx, sy, 6, 6, DIRT_DK if rnd() > 0.45 else DIRT_LT)
        rect(x, y, BS, 2, DIRT_DK)
        rect(x, y, 2, BS, blend(DIRT, DIRT_DK, 0.4))
    y += BS; ri += 1

# rails
irail = iground + 44
for x in range(-10, IW + 20, 44):
    rect(x, irail - 4, 28, 36, TIE)
    rect(x, irail - 4, 28, 5, TIE_LT)
rect(0, irail - 9, IW, 7, RAIL); rect(0, irail - 4, IW, 3, RAIL_DK)
rect(0, irail + 28, IW, 7, RAIL); rect(0, irail + 34, IW, 3, RAIL_DK)

# floating stars
gold_star(70, 120, 6)
gold_star(440, 200, 6)

# hero dino-minecart, centred
draw_minecart_dino(256, irail - 6, 16)

icon.save("apple-touch-icon.png")
print("wrote apple-touch-icon.png", icon.size)
