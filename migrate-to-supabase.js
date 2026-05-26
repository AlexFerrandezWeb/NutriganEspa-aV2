// Script de migración: importa productos.json a Supabase
// Uso: node migrate-to-supabase.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function migrate() {
    const raw = fs.readFileSync(path.join(__dirname, 'productos.json'), 'utf8');
    const { productos } = JSON.parse(raw);

    console.log(`Migrando ${productos.length} productos a Supabase...\n`);

    let ok = 0;
    let fail = 0;

    for (const p of productos) {
        const row = {
            id:                  p.id,
            nombre:              p.nombre,
            descripcion:         p.descripcion || null,
            descripcion_completa: p.descripcionCompleta || null,
            precio:              p.precio,
            precio_unitario:     p.precioUnitario || null,
            cantidad_minima:     p.cantidadMinima || 1,
            moneda:              p.moneda || 'EUR',
            imagen:              p.imagen || null,
            categoria:           p.categoria || null,
            especie:             p.especie || null,
            etapa:               p.etapa || null,
            tiempo_liberacion:   p.tiempoLiberacion || null,
            presentacion:        p.presentacion || null,
            peso:                p.peso || null,
            ingredientes:        p.ingredientes || [],
            beneficios:          p.beneficios || [],
            formato:             p.formato || null,
            composicion:         p.composicion || null,
            certificaciones:     p.certificaciones || null,
            temperatura:         p.temperatura || null,
            ficha_tecnica:       p.fichaTecnica || null,
            stock:               p.stock || 0,
            destacado:           p.destacado || false,
        };

        const { error } = await sb.from('productos').upsert(row, { onConflict: 'id' });

        if (error) {
            console.error(`❌ ID ${p.id} — ${p.nombre}: ${error.message}`);
            fail++;
        } else {
            console.log(`✅ ID ${p.id} — ${p.nombre}`);
            ok++;
        }
    }

    console.log(`\nMigración completada: ${ok} OK, ${fail} errores`);
}

migrate().catch(err => {
    console.error('Error fatal:', err.message);
    process.exit(1);
});
