# -*- coding: utf-8 -*-
"""Que imagenes de assets/ no usa nadie.

Distingue referencias vivas (lo que sirve la web y lo que hay en la base de
datos) de las historicas: productos.json es el catalogo previo a Supabase y el
servidor lo bloquea por HTTP, y los scripts/*backup*.json son copias de
seguridad de datos viejos. Citar una imagen ahi no la mantiene viva.
"""
import io, os, re, json, subprocess, sys

RAIZ = u'C:/Proyectos/NutriganV2'
BARRA = chr(92)
HISTORICOS = ('productos.json', 'style.css.bak', 'migrate-to-supabase.js', 'test-fix.js')


def es_historico(rel):
    base = rel.split('/')[-1]
    if base in HISTORICOS:
        return True
    return rel.startswith('scripts/') and 'backup' in base and base.endswith('.json')


vivos, historicos = [], []
for dirpath, dirnames, filenames in os.walk(RAIZ):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.git', 'assets', 'backups')]
    for f in filenames:
        if not re.search(r'\.(html|js|css|json|md|xml|txt|py|sql|bak)$', f, re.I):
            continue
        ruta = os.path.join(dirpath, f).replace(BARRA, '/')
        rel = ruta[len(RAIZ) + 1:]
        try:
            cont = io.open(ruta, encoding='utf-8', errors='ignore').read()
        except Exception:
            cont = ''
        (historicos if es_historico(rel) else vivos).append((rel, cont))

print(u'Ficheros vivos revisados: %d' % len(vivos))
print(u'Tratados como historicos: %s' % ', '.join(r for r, _ in historicos))

texto_vivo = '\n'.join(c for _, c in vivos)

salida = subprocess.check_output([
    'node', '-e',
    "const d=require('C:/Proyectos/NutriganV2/node_modules/dotenv');"
    "d.config({path:'C:/Proyectos/NutriganV2/.env'});"
    "const {createClient}=require('C:/Proyectos/NutriganV2/node_modules/@supabase/supabase-js');"
    "createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY)"
    ".from('productos').select('imagen').then(r=>console.log(JSON.stringify("
    "r.data.map(p=>String(p.imagen||'').split('/').pop()).filter(Boolean))));"
]).decode('utf-8')
en_bd = set(json.loads(salida))
print(u'Imagenes citadas en la base de datos: %d' % len(en_bd))

assets = os.path.join(RAIZ, 'assets')
en_uso, sin_uso = [], []
for n in sorted(os.listdir(assets)):
    p = os.path.join(assets, n)
    if not os.path.isfile(p):
        continue
    kb = os.path.getsize(p) // 1024
    (en_uso if (n in texto_vivo or n in en_bd) else sin_uso).append((n, kb))

mb = lambda g: sum(k for _, k in g) // 1024
print(u'\nEN USO:  %3d ficheros, %4d MB' % (len(en_uso), mb(en_uso)))
print(u'SIN USO: %3d ficheros, %4d MB' % (len(sin_uso), mb(sin_uso)))

sin_uso.sort(key=lambda x: -x[1])
print(u'\nLos 15 mas pesados sin uso:')
for n, kb in sin_uso[:15]:
    print(u'  %5d KB  %s' % (kb, n))

ext = {}
for n, _ in sin_uso:
    e = n.split('.')[-1].lower()
    ext[e] = ext.get(e, 0) + 1
print(u'\nPor extension: %s' % ext)

io.open(sys.argv[1] + '/borrables.txt', 'w', encoding='utf-8').write(
    '\n'.join(n for n, _ in sin_uso))
print(u'\nLista completa en borrables.txt')
