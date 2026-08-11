require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    const { data, error } = await sb
        .from('productos')
        .select('id, nombre, descripcion, descripcion_completa')
        .order('id', { ascending: true });

    if (error) { console.error('ERROR:', error.message); process.exit(1); }

    for (const p of data) {
        console.log('========================================');
        console.log(`#${p.id}  ${p.nombre}`);
        console.log('--- descripcion:');
        console.log((p.descripcion || '(vacío)').trim());
        console.log('--- descripcion_completa:');
        console.log((p.descripcion_completa || '(vacío)').trim());
    }
    console.log(`\nTOTAL: ${data.length} productos`);
})();
