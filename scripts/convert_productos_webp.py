"""Convierte las fotos de producto (.jpg/.png) a WebP dejando el original intacto.

Mismo planteamiento que convert_carrusel_webp.py, con dos diferencias:

  - Limita el LADO MAYOR, no el ancho. Casi todas las fotos de producto son
    verticales (3072x4096); capando solo el ancho a 1600 quedarian a 2133px de
    alto, que sigue siendo enorme para un contenedor que como mucho mide 400px.
  - No sobrescribe: escribe <nombre>.webp junto al original. La columna `imagen`
    de Supabase se apunta despues al .webp (ver actualizar_imagenes_supabase.js),
    asi el cambio es reversible sin tocar ficheros.

Uso:  python scripts/convert_productos_webp.py [--dry-run]
"""

import os
import sys
import glob

from PIL import Image

MAX_LADO = 1600  # lado mayor; el contenedor mas grande de la web mide 400px
QUALITY = 82

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def convertir(path, dry_run=False):
    img = Image.open(path)
    w, h = img.size

    # Las fotos de producto no tienen transparencia, pero por si acaso entra
    # alguna con alpha la aplanamos sobre blanco (el fondo de las fichas).
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        fondo = Image.new("RGB", img.size, (255, 255, 255))
        fondo.paste(img, mask=img.split()[-1])
        img = fondo
    else:
        img = img.convert("RGB")

    lado = max(w, h)
    if lado > MAX_LADO:
        escala = MAX_LADO / lado
        img = img.resize((round(w * escala), round(h * escala)), Image.LANCZOS)

    destino = os.path.splitext(path)[0] + ".webp"
    if not dry_run:
        img.save(destino, "WEBP", quality=QUALITY, method=6)

    viejo = os.path.getsize(path)
    nuevo = os.path.getsize(destino) if not dry_run else 0
    return {
        "origen": os.path.basename(path),
        "destino": os.path.basename(destino),
        "dim_antes": (w, h),
        "dim_despues": img.size,
        "bytes_antes": viejo,
        "bytes_despues": nuevo,
    }


def main():
    dry_run = "--dry-run" in sys.argv
    os.chdir(RAIZ)

    rutas = sorted(
        glob.glob("assets/producto*.jpg") + glob.glob("assets/producto*.png"),
        key=lambda p: int("".join(c for c in os.path.basename(p) if c.isdigit()) or 0),
    )
    if not rutas:
        print("No se encontro ninguna foto de producto que convertir.")
        return

    total_antes = total_despues = 0
    for path in rutas:
        r = convertir(path, dry_run)
        total_antes += r["bytes_antes"]
        total_despues += r["bytes_despues"]
        print(
            "%-22s %4dx%-4d %7.2f MB  ->  %-23s %4dx%-4d %7.2f MB"
            % (
                r["origen"], r["dim_antes"][0], r["dim_antes"][1], r["bytes_antes"] / 1048576,
                r["destino"], r["dim_despues"][0], r["dim_despues"][1], r["bytes_despues"] / 1048576,
            )
        )

    print()
    print("Ficheros:          %d" % len(rutas))
    print("Peso antes:        %.2f MB" % (total_antes / 1048576))
    print("Peso despues:      %.2f MB" % (total_despues / 1048576))
    if total_antes:
        print("Reduccion:         %.1f%%" % (100 - total_despues / total_antes * 100))


if __name__ == "__main__":
    main()
