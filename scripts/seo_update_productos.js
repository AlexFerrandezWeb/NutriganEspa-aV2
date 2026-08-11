require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Cambios a aplicar (solo los campos indicados por id)
const UPDATES = {
    27: {
        descripcion: 'Antiinflamatorio, analgésico, refrescante, antiséptico y cicatrizante. No es necesario el masajeo en la ubre después de la aplicación. En caso de mastitis, aplicar en el momento. No necesita supresión ni prescripción veterinaria. Certificación E.L.U.A. Recomendable su uso junto con Dipp Forte 250ml.'
    },
    28: {
        descripcion: 'La aplicación de ambos productos juntos es lo recomendable. Siguiendo los protocolos de secado y postparto, se secan todas las vacas por igual. En caso de mastitis, aplicar de inmediato. Sin período de supresión ni descarte de leche. Sin recetas veterinarias.'
    },
    17: {
        descripcion: 'Spray azul cicatrizante y desinfectante para heridas en ovejas, vacas, cabras y ganado, libre de antibióticos.',
        descripcion_completa: 'Spray azul cicatrizante y desinfectante natural (200ml) para heridas en ovejas, vacas, cabras, ganado y mascotas. Sin antibióticos y sin tiempo de espera en leche ni carne. Su fórmula con dexpantenol y carvacrol (aceite esencial de orégano) mejora la hidratación cutánea, acelera la cicatrización y protege frente a infecciones. Aplicar 1-2 veces al día a 20-30 cm.'
    },
    18: {
        descripcion: 'Spray azul cicatrizante y desinfectante para heridas en ovejas, vacas, cabras y ganado, libre de antibióticos.',
        descripcion_completa: 'Spray azul cicatrizante y desinfectante natural en formato grande (400ml) para heridas en ovejas, vacas, cabras, ganado y mascotas. Sin antibióticos y sin tiempo de espera en leche ni carne. Fórmula con dexpantenol y carvacrol (aceite esencial de orégano) para regeneración cutánea, cicatrización acelerada y protección antibacteriana. Aplicar 1-2 veces al día.'
    }
};

(async () => {
    const ids = Object.keys(UPDATES).map(Number);

    // 1) Backup de los valores actuales
    const { data: actuales, error: readErr } = await sb
        .from('productos')
        .select('id, nombre, descripcion, descripcion_completa')
        .in('id', ids);
    if (readErr) { console.error('ERROR leyendo:', readErr.message); process.exit(1); }

    const backupPath = path.join(__dirname, `seo_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(actuales, null, 2), 'utf8');
    console.log(`Backup guardado en: ${backupPath}\n`);

    // 2) Aplicar updates uno a uno
    for (const id of ids) {
        const { error } = await sb.from('productos').update(UPDATES[id]).eq('id', id);
        if (error) {
            console.error(`❌ #${id} ERROR: ${error.message}`);
        } else {
            console.log(`✅ #${id} actualizado (${Object.keys(UPDATES[id]).join(', ')})`);
        }
    }

    // 3) Verificar
    console.log('\n--- Verificación ---');
    const { data: verif } = await sb
        .from('productos')
        .select('id, descripcion, descripcion_completa')
        .in('id', ids)
        .order('id', { ascending: true });
    for (const p of verif) {
        console.log(`#${p.id} descripcion: ${p.descripcion.substring(0, 80)}...`);
    }
})();
