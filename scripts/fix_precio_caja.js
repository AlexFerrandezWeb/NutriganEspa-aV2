// El precio de la caja se habia desincronizado del precio por unidad en ocho
// productos: la tarjeta anunciaba 42,35 €/U y cobraba un total que salia a
// 39,49 €/U. Los dos campos son independientes en la tabla y en el panel, asi
// que nada impedia que uno se actualizase sin el otro.
//
// Manda el precio por unidad: precio = precio_unitario x unidades de la caja.
// Las unidades van escritas aqui a mano, leidas de cada presentacion, porque
// "Bote de 200ml" no son 200 unidades y ningun automatismo acierta con eso.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const UNIDADES_POR_CAJA = {
    24: 120,  // "120 Bloques"
    29: 6,    // "6 Botes de 500ml"
    34: 30,   // "30 Cubos"
    37: 60,   // "Palet 60 sacos"
    38: 60,   // "Palet 60 sacos"
    39: 26,   // "Palet 26 garrafas"
    40: 26,   // "Palet 26 garrafas"
    42: 24,   // "Palet 24 sacos"
};

(async () => {
    const ids = Object.keys(UNIDADES_POR_CAJA).map(Number);
    const { data, error } = await sb
        .from('productos')
        .select('id, nombre, precio, precio_unitario, presentacion')
        .in('id', ids)
        .order('id');
    if (error) { console.error('ERROR al leer:', error.message); process.exit(1); }

    if (data.length !== ids.length) {
        console.error(`ERROR: esperaba ${ids.length} productos y he leido ${data.length}.`);
        process.exit(1);
    }

    // Copia de seguridad antes de tocar nada, junto a los otros backups.
    const backup = path.join(__dirname, `backup_precios_${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Copia de seguridad: ${backup}\n`);

    for (const p of data) {
        const nuevo = +(p.precio_unitario * UNIDADES_POR_CAJA[p.id]).toFixed(2);
        if (Math.abs(nuevo - p.precio) < 0.005) {
            console.log(`=  #${p.id} ${p.nombre}: ya estaba en ${nuevo} €`);
            continue;
        }
        const { error: errUpd } = await sb.from('productos').update({ precio: nuevo }).eq('id', p.id);
        if (errUpd) { console.error(`ERROR en #${p.id}: ${errUpd.message}`); process.exit(1); }
        console.log(`OK #${p.id} ${p.nombre}: ${p.precio} € -> ${nuevo} €  (${p.precio_unitario} x ${UNIDADES_POR_CAJA[p.id]})`);
    }
})();
