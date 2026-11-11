# 緑/マゼンタ背景を抜いて img/*.webp(透過) にする。~/tools/pyimg/bin/python art/key.py [名前...]
# 体(b_*)は余白を切って高さ 480px、反転して出た絵(暗い背景＋緑の線)は線と背景を入れ替える
import numpy as np, os, sys, json
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); OUT = D + '/../img/'
INK = np.array([43, 43, 43], np.float32)

def key(src, mag=False):
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # 反転判定: 四隅が暗い
    corners = np.concatenate([a[:8, :8].reshape(-1, 3), a[-8:, -8:].reshape(-1, 3)])
    if corners.mean() < 80:
        dark = (np.abs(a - corners.mean(0)).sum(-1) < 40)
        greenish = (g - np.maximum(r, b)) > 60
        al = np.where(dark, 0.0, 1.0)
        a = np.where(greenish[..., None], INK, a)
        # 緑の縁のにじみ
        gg = (g - np.maximum(r, b)); edge = (gg > 15) & ~greenish
        a = np.where(edge[..., None], INK, a)
        out = np.dstack([a, al[..., None] * 255]).clip(0, 255).astype(np.uint8)
        im = Image.fromarray(out, 'RGBA')
    else:
        k = (np.minimum(r, b) - g) if mag else (g - np.maximum(r, b))
        al = 1 - np.clip((k - 18) / (70 - 18), 0, 1)
        if mag:
            lim = g + 8; r = np.where(k > 0, np.minimum(r, np.maximum(lim, r * al)), r); b = np.where(k > 0, np.minimum(b, np.maximum(lim, b * al)), b)
        else:
            lim = np.maximum(r, b); g = np.where(g > lim, lim, g)
        out = np.dstack([r, g, b, al * 255]).clip(0, 255).astype(np.uint8)
        im = Image.fromarray(out, 'RGBA')
    A = im.split()[3].filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7)); im.putalpha(A)
    return im

def trim(im, h):
    bb = im.split()[3].point(lambda v: 255 if v > 20 else 0).getbbox(); im = im.crop(bb)
    w = round(im.width * h / im.height); return im.resize((w, h), Image.LANCZOS)

ONLY = sys.argv[1:]
for n in ['b_maru', 'b_sankaku', 'b_shikaku', 'b_purin', 'b_mame', 'b_shizuku', 'box', 'boss', 'boss_mad']:
    f = D + '/raw/' + n + '.png'
    if not os.path.exists(f) or (ONLY and n not in ONLY): continue
    im = trim(key(f, mag=n.startswith('boss')), 420 if n.startswith('b_') or n == 'box' else 520)
    im.save(OUT + n + '.webp', quality=88, method=6); print(n, im.size, os.path.getsize(OUT + n + '.webp') // 1024, 'KB')
f = D + '/raw/hats.png'
if os.path.exists(f) and (not ONLY or 'hats' in ONLY):
    im = key(f); W = im.width
    for i, n in enumerate(['h_cone', 'h_top', 'h_knit']):
        c = im.crop((i * W // 3, 0, (i + 1) * W // 3, im.height)); c = trim(c, 200); c.save(OUT + n + '.webp', quality=88); print(n, c.size)
f = D + '/raw/bg.png'
if os.path.exists(f) and (not ONLY or 'bg' in ONLY):
    bg = Image.open(f).convert('RGB'); bg = bg.crop((0, int(bg.height * 0.25), bg.width, bg.height)); bg = bg.resize((768, round(768 * bg.height / bg.width)), Image.LANCZOS); bg.save(OUT + 'bg.webp', quality=82); print('bg', bg.size, os.path.getsize(OUT + 'bg.webp') // 1024)
