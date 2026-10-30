const fs = require('fs');
const path = require('path');

// Los borradores se guardan en Storage, no en el disco efímero del alojamiento.
// Solo al activarlos se incorporan a la tabla de productos de venta.
module.exports = function createPendingProducts(sb, seed, root) {
    const bucketName = 'catalogo';
    const draftPath = 'productos-pendientes.json';
    let pending = structuredClone(seed);
    let bucketReady = false;
    let writing = Promise.resolve();
    let loadError = null;
    const bucket = () => sb.storage.from(bucketName);
    const missing = error => /not found|does not exist/i.test(error.message || '');
    async function load() {
        const { data, error } = await bucket().download(draftPath);
        if (error) {
            if (!missing(error)) throw error;
            return;
        }
        const saved = JSON.parse(await data.text());
        if (!Array.isArray(saved)) throw new Error('El catálogo pendiente guardado no es válido');
        pending = saved;
        bucketReady = true;
    }
    const ready = load().catch(error => {
        loadError = error;
        console.error('No se pudo leer el catálogo pendiente guardado:', error.message);
    });

    async function ensureBucket() {
        if (bucketReady) return;
        const { data, error } = await sb.storage.getBucket(bucketName);
        if (!data) {
            if (error && !missing(error)) throw error;
            const result = await sb.storage.createBucket(bucketName, { public: true });
            if (result.error) throw result.error;
        } else if (!data.public) {
            throw new Error('El bucket del catálogo debe permitir leer sus imágenes públicas');
        }
        bucketReady = true;
    }
    async function persist(next) {
        await ensureBucket();
        const { error } = await bucket().upload(draftPath, Buffer.from(JSON.stringify(next)), {
            contentType: 'application/json', upsert: true, cacheControl: '0'
        });
        if (error) throw error;
        pending = next;
    }
    async function publishFile(value, contentType) {
        if (!value || /^https:\/\//i.test(value)) return value;
        const resolved = path.resolve(root, value.replace(/^\//, ''));
        const assets = path.resolve(root, 'assets') + path.sep;
        if (!resolved.startsWith(assets)) throw new Error('La imagen y la ficha deben estar en assets');
        const name = 'optidry/' + path.basename(resolved);
        const { error } = await bucket().upload(name, fs.readFileSync(resolved), { contentType, upsert: true });
        if (error) throw error;
        return bucket().getPublicUrl(name).data.publicUrl;
    }
    async function save(id, changes) {
        await ready;
        if (loadError) {
            await load();
            loadError = null;
        }
        const current = pending.find(p => p.id === Number(id));
        if (!current) throw Object.assign(new Error('El producto pendiente ya no existe'), { status: 404 });
        const next = { ...current };
        const protectedFields = new Set(['id', 'updated_at', 'proximo_lanzamiento', 'pendiente_catalogo', 'disponibilidad_texto']);
        for (const key of Object.keys(current)) {
            if (!protectedFields.has(key) && Object.hasOwn(changes, key)) next[key] = changes[key];
        }
        const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
        if (typeof next.nombre !== 'string' || !next.nombre.trim()) invalid('El nombre es obligatorio');
        if (next.precio !== null && (typeof next.precio !== 'number' || !Number.isFinite(next.precio) || next.precio <= 0)) {
            invalid('Escribe un precio mayor que cero o deja el precio pendiente');
        }
        if (typeof next.disponible !== 'boolean') invalid('Indica si el producto está disponible');
        if (next.disponible && next.precio === null) invalid('Para activar el producto debes indicar un precio mayor que cero');
        if (next.disponible && (!Number.isInteger(next.stock) || next.stock <= 0)) invalid('Para activar el producto indica también un stock mayor que cero');
        next.updated_at = new Date().toISOString();
        await ensureBucket();
        if (!next.disponible) {
            await persist(pending.map(p => p.id === next.id ? next : p));
            return { producto: next, activado: false };
        }
        const active = { ...next };
        for (const key of ['proximo_lanzamiento', 'disponibilidad_texto', 'pendiente_catalogo']) delete active[key];
        active.imagen = await publishFile(active.imagen, 'image/webp');
        active.ficha_tecnica = await publishFile(active.ficha_tecnica, 'application/pdf');
        for (const key of ['ingredientes', 'beneficios']) {
            if (Array.isArray(active[key])) active[key] = active[key].join('\n');
        }
        const { error } = await sb.from('productos').insert(active);
        if (error) throw error;
        // La tabla tiene prioridad aunque falle la limpieza del borrador.
        try { await persist(pending.filter(p => p.id !== next.id)); }
        catch (error) { console.error('No se pudo retirar el borrador activado:', error.message); }
        return { producto: active, activado: true };
    }
    return {
        ready,
        get: id => pending.find(p => p.id === Number(id)),
        merge: products => {
            const ids = new Set(products.map(p => Number(p.id)));
            return products.concat(pending.filter(p => !ids.has(p.id)).map(p => ({ ...p, pendiente_catalogo: true })));
        },
        save(id, changes) {
            const operation = writing.then(() => save(id, changes));
            writing = operation.catch(() => {});
            return operation;
        }
    };
};
