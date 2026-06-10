import glob, os
from PIL import Image

MAX_W = 1600  # ancho máximo razonable para el carrusel
QUALITY = 82

for path in glob.glob('assets/Carrusel-*.jpg'):
    img = Image.open(path).convert('RGB')
    w, h = img.size
    if w > MAX_W:
        nh = round(h * MAX_W / w)
        img = img.resize((MAX_W, nh), Image.LANCZOS)
    out = os.path.splitext(path)[0] + '.webp'
    img.save(out, 'WEBP', quality=QUALITY, method=6)
    old_kb = round(os.path.getsize(path) / 1024)
    new_kb = round(os.path.getsize(out) / 1024)
    print(f'{os.path.basename(path)} ({w}x{h}, {old_kb}KB) -> {os.path.basename(out)} ({img.size[0]}x{img.size[1]}, {new_kb}KB)')
