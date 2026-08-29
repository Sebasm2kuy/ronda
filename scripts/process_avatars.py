#!/usr/bin/env python3
"""Procesa fotos crudas en avatares 3:4 (720x960) para usuarios demo de RONDA."""
from PIL import Image
import os

RAW = "/home/z/my-project/assets_tmp"
OUT = "/home/z/my-project/public/avatars"
os.makedirs(OUT, exist_ok=True)

# mapping: (source, output_name, crop_mode)
# crop_mode: "top" = ventana desde arriba; "center" = centrado; dict = box manual (left, top_ratio)
MAP = [
    ("raw/w1.jpg",      "sofia.jpg",      "center"),
    ("raw/w7.jpg",      "martina.jpg",    "center"),
    ("raw/w5.jpg",      "carolina.jpg",   "center"),
    ("raw/w3.jpg",      "lucia.jpg",      "center"),
    ("raw2/w2_2.img",   "valentina.jpg",  "center"),
    ("gen_diego.png",   "diego.jpg",      "center"),
    ("raw/m2.jpg",      "andres.jpg",     {"x_off": 0.45, "y_off": 0.0}),    # evita marco blanco derecho
    ("gen_rodrigo.png", "rodrigo.jpg",    "center"),
    ("gen_martin.png",  "martin.jpg",     "center"),
    ("raw/m6.jpg",      "federico.jpg",   "center"),
]

TARGET_W, TARGET_H = 720, 960  # 3:4

def crop_box(im, mode):
    w, h = im.size
    ar = TARGET_W / TARGET_H
    if isinstance(mode, dict):
        # ventana de ancho w', altura completa o parcial según ratio
        cw = min(w, int(h * ar))
        ch = int(cw / ar)
        x = int((w - cw) * mode["x_off"])
        y = int((h - ch) * mode["y_off"])
        return (x, y, x + cw, y + ch)
    if mode == "top":
        cw = min(w, int(h * ar))
        if w * 4 / 3 <= h:
            cw = w
            ch = int(w * 4 / 3)
        else:
            cw = w
            ch = int(w * 4 / 3)
        return (0, 0, cw, ch)
    # center
    if w / h > ar:
        cw, ch = int(h * ar), h
    else:
        cw, ch = w, int(w / ar)
    x = (w - cw) // 2
    y = (h - ch) // 2
    return (x, y, x + cw, y + ch)

for src, name, mode in MAP:
    im = Image.open(os.path.join(RAW, src)).convert("RGB")
    im = im.crop(crop_box(im, mode))
    im = im.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    im.save(os.path.join(OUT, name), quality=86)
    print("ok", name)

# hoja de contactos de verificación
files = sorted(os.listdir(OUT))
tiles = [Image.open(os.path.join(OUT, f)).resize((180, 240)) for f in files]
canvas = Image.new("RGB", (len(tiles) * 190 + 10, 260), "white")
for i, t in enumerate(tiles):
    canvas.paste(t, (10 + i * 190, 10))
canvas.save(os.path.join(RAW, "sheet_final.png"))
print("sheet ok", files)
