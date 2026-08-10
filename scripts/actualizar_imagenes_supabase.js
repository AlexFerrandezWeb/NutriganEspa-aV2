/**
 * Apunta la columna `imagen` de cada producto a la version .webp generada por
 * scripts/convert_productos_webp.py, dejando los .jpg/.png originales en disco.
 *
 * Solo toca un producto si se cumplen las dos condiciones:
 *   1) su `imagen` actual NO es ya un .webp
 *   2) el .webp equivalente existe realmente en assets/
 *
 * Esa columna la leen tanto la web como el feed de Google Shopping
 * (/productos-google.xml) y el SSR de las fichas, asi que con este cambio los
 * tres pasan a servir el WebP a la vez, sin tocar su logica.
 *
 * Uso:  node scripts/actualizar_imagenes_supabase.js --dry-run
 *       node scripts/actualizar_imagenes_supabase.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const RAIZ = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    const { data: productos, error: readErr } = await sb
        .from('productos')
        .select('id, nombre, imagen')
        .order('id', { ascending: true });

    if (readErr) { console.error('ERROR leyendo:', readErr.message); process.exit(1); }

    // Decidir que se cambia
    const cambios = [];
    const omitidos = [];

    for (const p of productos) {
        const actual = p.imagen || '';
        if (actual.toLowerCase().endsWith('.webp')) {
            omitidos.push({ ...p, motivo: 'ya es webp' });
            continue;
        }
        const nueva = actual.replace(/\.(jpe?g|png)$/i, '.webp');
        if (nueva === actual) {
            omitidos.push({ ...p, motivo: 'extension no reconocida' });
            continue;
        }
        if (!fs.existsSync(path.join(RAIZ, nueva))) {
            omitidos.push({ ...p, motivo: `no existe ${nueva} en disco` });
            continue;
        }
        cambios.push({ id: p.id, nombre: p.nombre, antes: actual, despues: nueva });
    }

    console.log(`Productos en BD:     ${productos.length}`);
    console.log(`A actualizar:        ${cambios.length}`);
    console.log(`Omitidos:            ${omitidos.length}`);
    console.log();

    for (const o of omitidos) {
        console.log(`  -  #${String(o.id).padStart(2)} ${o.imagen}  (${o.motivo})`);
    }
    console.log();
    for (const c of cambios) {
        console.log(`  ->  #${String(c.id).padStart(2)} ${c.antes}  ->  ${c.despues}`);
    }

    if (!cambios.length) { console.log('\nNada que hacer.'); return; }

    if (DRY_RUN) {
        console.log('\n[--dry-run] No se ha escrito nada en Supabase.');
        return;
    }

    // Backup de los valores actuales antes de escribir
    const backupPath = path.join(__dirname, `backup_imagenes_${Date.now()}.json`);
    fs.writeFileSync(
        backupPath,
        JSON.stringify(productos.map(p => ({ id: p.id, nombre: p.nombre, imagen: p.imagen })), null, 2),
        'utf8'
    );
    console.log(`\nBackup de la columna imagen guardado en: ${backupPath}\n`);

    let ok = 0, fallos = 0;
    for (const c of cambios) {
        const { error } = await sb.from('productos').update({ imagen: c.despues }).eq('id', c.id);
        if (error) { console.error(`  ERROR #${c.id}: ${error.message}`); fallos++; }
        else { console.log(`  OK    #${String(c.id).padStart(2)} -> ${c.despues}`); ok++; }
    }

    console.log(`\nActualizados: ${ok}  |  Fallos: ${fallos}`);

    // Verificacion final leyendo de nuevo
    const { data: verif } = await sb
        .from('productos')
        .select('id, imagen')
        .order('id', { ascending: true });

    const sinWebp = verif.filter(p => !(p.imagen || '').toLowerCase().endsWith('.webp'));
    console.log(`\n--- Verificacion ---`);
    console.log(`Productos con imagen .webp: ${verif.length - sinWebp.length}/${verif.length}`);
    if (sinWebp.length) {
        console.log('Siguen sin webp:');
        sinWebp.forEach(p => console.log(`  #${p.id} ${p.imagen}`));
    }
})();
