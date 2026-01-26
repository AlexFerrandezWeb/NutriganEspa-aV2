const fs = require('fs');
const path = require('path');

// Mock products (simulating what comes from frontend)
const products = [
    { id: 1, nombre: "Bolutech® Flash", precio: 59.69, cantidad: 2 },
    { id: 2, nombre: "Bolutech® Activ", precio: 48.73, cantidad: 1 },
    { id: 3, nombre: "Bolutech® Heel", precio: 84.41, cantidad: 1 },
    { id: 4, nombre: "Bolutech® Prepalac", precio: 61.4, cantidad: 1 },
    { id: 5, nombre: "Bolutech® MG Flash", precio: 58.3, cantidad: 1 }
];

console.log('--- Testing Metadata Minification ---');

// 1. Logic from /api/create-checkout-session
const minifiedProducts = products.map(p => ({
    id: p.id,
    c: p.cantidad,
    p: p.precio // Using 'precio' as in the mock, server uses precioFinal || precio
}));

const productsJson = JSON.stringify(minifiedProducts);
console.log('Minified JSON:', productsJson);
console.log('Length:', productsJson.length);

if (productsJson.length > 500) {
    console.error('FAILED: Metadata length exceeds 500 characters!');
    process.exit(1);
} else {
    console.log('PASSED: Metadata length is within limits.');
}

console.log('\n--- Testing Product Re-hydration ---');

// 2. Logic from /api/pedido/:sessionId
try {
    const productosMin = JSON.parse(productsJson);
    const productosPath = path.join(__dirname, 'productos.json');

    if (!fs.existsSync(productosPath)) {
        console.error('Error: productos.json not found at', productosPath);
        process.exit(1);
    }

    const productosData = JSON.parse(fs.readFileSync(productosPath, 'utf8'));

    const rehydratedProducts = productosMin.map(pMin => {
        const pFull = productosData.productos.find(p => p.id === pMin.id);
        if (pFull) {
            return {
                ...pFull,
                cantidad: pMin.c,
                precio: pMin.p,
                precioFinal: pMin.p,
                imagen: pFull.imagen.startsWith('http') ? pFull.imagen : `/assets/${path.basename(pFull.imagen)}`
            };
        }
        return {
            id: pMin.id,
            nombre: 'Producto no encontrado',
            cantidad: pMin.c
        };
    });

    console.log('Re-hydrated Products Count:', rehydratedProducts.length);

    // Validation
    const p1 = rehydratedProducts.find(p => p.id === 1);
    if (p1 && p1.nombre === "Bolutech® Flash" && p1.cantidad === 2 && p1.imagen.includes('assets/')) {
        console.log('PASSED: Product 1 re-hydrated correctly.');
    } else {
        console.error('FAILED: Product 1 re-hydration failed.', p1);
        process.exit(1);
    }

} catch (error) {
    console.error('FAILED: Re-hydration logic threw error:', error);
    process.exit(1);
}
