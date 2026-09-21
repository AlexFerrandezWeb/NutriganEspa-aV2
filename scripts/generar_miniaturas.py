# -*- coding: utf-8 -*-
"""Miniaturas de 200px para el panel de busqueda.

Las fotos de producto miden unos 950px de ancho y en el panel se ensenan a 80.
El navegador se descargaba y decodificaba 37 imagenes grandes de golpe al filtrar
por una categoria, que es lo que se veia como «no terminan de cargar».
200 y no 160: en pantallas de mucha densidad, 80 CSS px son 160 reales, y 200 deja
margen sin engordar el fichero.
"""
import io, os, sys
from PIL import Image

RAIZ = 'C:/Proyectos/NutriganV2/'
DESTINO = os.path.join(RAIZ, 'assets', 'mini')
LADO = 200

os.makedirs(DESTINO, exist_ok=True)
originales = sorted(f for f in os.listdir(os.path.join(RAIZ, 'assets'))
                    if f.startswith('producto') and f.lower().endswith('.webp'))

antes = despues = 0
for nombre in originales:
    origen = os.path.join(RAIZ, 'assets', nombre)
    salida = os.path.join(DESTINO, nombre)
    im = Image.open(origen)
    ancho_original = im.width
    im.thumbnail((LADO, LADO), Image.LANCZOS)
    im.save(salida, 'WEBP', quality=82, method=6)
    a, d = os.path.getsize(origen), os.path.getsize(salida)
    antes += a; despues += d
    if ancho_original > 400:
        print('  %-22s %5d px %6d KB  ->  %3d px %4d KB' %
              (nombre, ancho_original, a // 1024, im.width, d // 1024))

print('\n%d miniaturas: %d KB -> %d KB (%d%% menos)' %
      (len(originales), antes // 1024, despues // 1024,
       100 - (despues * 100 // max(antes, 1))))
