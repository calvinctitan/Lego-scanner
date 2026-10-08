# Draws Legará's original app icon, splash image and Android icons with Pillow (pip install pillow).
# Artwork: a yellow toy brick with an "L", on a blue studded plate. Font: Lilita One (SIL Open Font License 1.1).
# Usage, from the mobile folder:
#   python scripts/make-icons.py node_modules/@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf assets
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT = sys.argv[1]
OUT = sys.argv[2]
BLUE, BLUE_STUD, BLUE_STUD_HI, BLUE_SHADOW = (0, 85, 191), (14, 99, 204), (40, 122, 222), (0, 60, 140)
YELLOW, YELLOW_DARK, YELLOW_STUD_HI, INK = (245, 205, 47), (196, 160, 26), (252, 224, 110), (27, 31, 35)

def studded_plate(size):
    img = Image.new('RGB', (size, size), BLUE)
    d = ImageDraw.Draw(img)
    step = size / 8
    r = step * 0.3
    for i in range(8):
        for j in range(8):
            cx, cy = step * (i + 0.5), step * (j + 0.5)
            d.ellipse([cx - r + 3, cy - r + 5, cx + r + 3, cy + r + 5], fill=BLUE_SHADOW)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BLUE_STUD)
            d.ellipse([cx - r * 0.55 - 4, cy - r * 0.55 - 4, cx + r * 0.25 - 4, cy + r * 0.25 - 4], fill=BLUE_STUD_HI)
    return img

def brick(size, scale=1.0, mono=False):
    """A front-view brick with two studs and an L, on a transparent canvas."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 1024 * scale
    cx = size / 2
    w, h = 600 * s, 430 * s
    top = size / 2 - h / 2 + 50 * s
    left, right, bottom = cx - w / 2, cx + w / 2, top + h
    body = (255, 255, 255, 255) if mono else YELLOW + (255,)
    dark = (255, 255, 255, 255) if mono else YELLOW_DARK + (255,)
    # Two studs on top
    sw, sh = 150 * s, 70 * s
    for sx in (cx - 150 * s, cx + 150 * s):
        d.rounded_rectangle([sx - sw / 2, top - sh, sx + sw / 2, top + 20 * s], radius=22 * s, fill=dark)
        d.rounded_rectangle([sx - sw / 2, top - sh, sx + sw / 2, top + 6 * s], radius=22 * s, fill=body)
        if not mono:
            d.rounded_rectangle([sx - sw / 2 + 18 * s, top - sh + 14 * s, sx - sw / 2 + 52 * s, top - 8 * s], radius=10 * s, fill=YELLOW_STUD_HI + (255,))
    # Body with a darker bottom edge
    d.rounded_rectangle([left, top, right, bottom], radius=56 * s, fill=dark)
    d.rounded_rectangle([left, top, right, bottom - 46 * s], radius=56 * s, fill=body)
    # The letter
    font = ImageFont.truetype(FONT, int(330 * s))
    text = 'L'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = cx - tw / 2 - bbox[0]
    ty = top + (h - 46 * s) / 2 - th / 2 - bbox[1]
    if mono:
        # Cut the letter out of the white shape.
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).text((tx, ty), text, font=font, fill=255)
        img.putalpha(Image.eval(Image.composite(Image.new('L', (size, size), 0), img.getchannel('A'), mask), lambda v: v))
    else:
        d.text((tx, ty), text, font=font, fill=INK + (255,))
    return img

def with_shadow(layer, offset=(0, 26), blur=24, alpha=110):
    a = layer.getchannel('A')
    shadow = Image.new('RGBA', layer.size, (0, 30, 80, 0))
    shadow.putalpha(a.point(lambda v: v * alpha // 255).filter(ImageFilter.GaussianBlur(blur)))
    out = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    out.alpha_composite(shadow, offset)
    out.alpha_composite(layer)
    return out

# iOS / main icon: opaque, 1024x1024
icon = studded_plate(1024).convert('RGBA')
icon.alpha_composite(with_shadow(brick(1024, 1.0)))
icon.convert('RGB').save(f'{OUT}/icon.png')
# Splash image: the brick alone on transparent (shown small on the baseplate background)
with_shadow(brick(1024, 1.0), blur=18, alpha=70).save(f'{OUT}/splash-icon.png')
# Android adaptive icon: brick inside the safe zone, blue plate behind, white monochrome version
with_shadow(brick(512, 0.62), offset=(0, 10), blur=10).save(f'{OUT}/android-icon-foreground.png')
studded_plate(512).save(f'{OUT}/android-icon-background.png')
brick(432, 0.62, mono=True).save(f'{OUT}/android-icon-monochrome.png')
# Web favicon
icon.convert('RGB').resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')
print('icons written to', OUT)
