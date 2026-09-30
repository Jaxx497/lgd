#!/usr/bin/env python3
"""Generates resources/android-res/: the launcher icons and splash screens (a white open book on
black). Needs Pillow. Run from the repo root after changing the design; the output is committed and
copied over Capacitor's default resources by the Android workflow."""
import io, os, sys, tarfile
from PIL import Image, ImageDraw

SS = 4  # supersampling for smooth edges
OUT = "resources/android-res"
TEMPLATE = "node_modules/@capacitor/cli/assets/android-template.tar.gz"


def bezier(p0, p1, p2, p3, n=32):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        pts.append(tuple(u**3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t**3 * d
                         for a, b, c, d in zip(p0, p1, p2, p3)))
    return pts


# Two pages in a 108-unit space (the adaptive-icon canvas), the book centred on (54, 58).
LEFT = (bezier((52, 43), (46, 39.5), (38, 38.5), (30, 40))
        + bezier((30, 73), (38, 71.5), (46, 72.5), (52, 76)))
RIGHT = [(108 - x, y) for x, y in LEFT]


def glyph(size, k=1.0, fill="white"):
    """The book on a transparent size x size canvas; k scales it about its centre."""
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size * SS / 108
    for page in (LEFT, RIGHT):
        draw.polygon([((x - 54) * k * s + size * SS / 2, (y - 58) * k * s + size * SS / 2) for x, y in page], fill=fill)
    return img.resize((size, size), Image.LANCZOS)


def icon(size, shape):
    """Legacy (pre-adaptive) icon: black square or circle with the book."""
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    box = [0, 0, size * SS - 1, size * SS - 1]
    if shape == "round":
        draw.ellipse(box, fill="black")
    else:
        draw.rounded_rectangle(box, radius=size * SS * 0.2, fill="black")
    img = img.resize((size, size), Image.LANCZOS)
    img.alpha_composite(glyph(size, 1.35))
    return img


def save(img, path):
    path = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)


DENSITY = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, d in DENSITY.items():
    save(icon(round(48 * d), "square"), f"mipmap-{name}/ic_launcher.png")
    save(icon(round(48 * d), "round"), f"mipmap-{name}/ic_launcher_round.png")
    save(glyph(round(108 * d)), f"mipmap-{name}/ic_launcher_foreground.png")

os.makedirs(f"{OUT}/values", exist_ok=True)
with open(f"{OUT}/values/ic_launcher_background.xml", "w") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">#000000</color>\n</resources>\n')

# Splash: same sizes as Capacitor's, white with the icon in the middle.
with tarfile.open(TEMPLATE) as tar:
    for member in tar.getmembers():
        if member.name.endswith("splash.png"):
            width, height = Image.open(io.BytesIO(tar.extractfile(member).read())).size
            splash = Image.new("RGB", (width, height), "white")
            side = round(min(width, height) * 0.25)
            splash.paste(icon(side, "square"), ((width - side) // 2, (height - side) // 2), icon(side, "square"))
            save(splash, member.name.split("res/", 1)[1])
print("wrote", OUT)
