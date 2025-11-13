const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.xn--nutriganespaa-tkb.com';
const DEFAULT_BRAND = 'Nutrigan';
const DEFAULT_GOOGLE_CATEGORY = 'Animals & Pet Supplies > Farm & Ranch > Livestock Supplies';

const GOOGLE_CATEGORY_MAP = {
  bovinos: 'Animals & Pet Supplies > Farm & Ranch > Livestock Supplies',
  ovinos: 'Animals & Pet Supplies > Farm & Ranch > Livestock Supplies',
  caprinos: 'Animals & Pet Supplies > Farm & Ranch > Livestock Supplies',
  porcinos: 'Animals & Pet Supplies > Farm & Ranch > Livestock Supplies',
  mascotas: 'Animals & Pet Supplies > Pet Supplies',
  aves: 'Animals & Pet Supplies > Farm & Ranch > Livestock Supplies > Poultry Supplies',
};

const productosPath = path.join(__dirname, '..', 'productos.json');
const salidaPath = path.join(__dirname, '..', 'productos-google.xml');

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function limpiarEspacios(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizarUrl(relativePath = '') {
  const cleaned = relativePath.replace(/^\//, '');
  return `${BASE_URL}/${cleaned}`;
}

function obtenerGoogleCategory(producto) {
  if (!producto || !producto.categoria) {
    return DEFAULT_GOOGLE_CATEGORY;
  }

  const categorias = producto.categoria
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  for (const categoria of categorias) {
    if (GOOGLE_CATEGORY_MAP[categoria]) {
      return GOOGLE_CATEGORY_MAP[categoria];
    }
  }

  return DEFAULT_GOOGLE_CATEGORY;
}

function construirProductType(producto) {
  const partes = [
    producto?.categoria,
    producto?.especie,
    producto?.formato,
  ]
    .filter(Boolean)
    .map((parte) => limpiarEspacios(parte));

  return partes.length ? partes.join(' > ') : 'Productos de Nutrición Animal';
}

function formatearPrecio(producto) {
  const precio = Number(producto?.precio ?? 0);
  const moneda = producto?.moneda || 'EUR';
  return `${precio.toFixed(2)} ${moneda}`;
}

function disponibilidad(producto) {
  const stock = Number(producto?.stock ?? 0);
  if (Number.isNaN(stock) || stock <= 0) {
    return 'out of stock';
  }
  return 'in stock';
}

function obtenerMpN(producto) {
  if (producto?.mpn) {
    return producto.mpn;
  }
  if (producto?.sku) {
    return producto.sku;
  }
  return `SKU-${producto?.id ?? 'NA'}`;
}

function obtenerImagen(producto) {
  if (!producto?.imagen) {
    return `${BASE_URL}/assets/logo_nutriganesp.webp`;
  }
  return normalizarUrl(producto.imagen);
}

function obtenerDescripcion(producto) {
  const descripcion = producto?.descripcionCompleta || producto?.descripcion || 'Producto de nutrición animal Nutrigan.';
  const limpia = limpiarEspacios(descripcion);
  // Google permite hasta 5000 caracteres, recortar por seguridad.
  return limpia.slice(0, 5000);
}

function generarItem(producto) {
  const id = producto?.id;
  if (id === undefined || id === null) {
    throw new Error('Producto sin ID detectado al generar el feed.');
  }

  const titulo = escapeXml(limpiarEspacios(producto.nombre || `Producto ${id}`));
  const descripcion = escapeXml(obtenerDescripcion(producto));
  const link = escapeXml(`${BASE_URL}/producto.html?id=${id}`);
  const imageLink = escapeXml(obtenerImagen(producto));
  const brand = escapeXml(producto?.marca || DEFAULT_BRAND);
  const condition = 'new';
  const availability = disponibilidad(producto);
  const price = formatearPrecio(producto);
  const googleCategory = escapeXml(obtenerGoogleCategory(producto));
  const productType = escapeXml(construirProductType(producto));
  const mpn = escapeXml(obtenerMpN(producto));
  const customLabel0 = escapeXml(producto?.categoria || 'General');
  const customLabel1 = escapeXml(producto?.especie || 'Ganadería');
  const customLabel2 = escapeXml(producto?.formato || producto?.presentacion || 'Producto');
  const customLabel3 = escapeXml(producto?.peso || producto?.etapa || '');

  return [
    '    <item>',
    `      <g:id>${id}</g:id>`,
    `      <g:title>${titulo}</g:title>`,
    `      <g:description>${descripcion}</g:description>`,
    `      <g:link>${link}</g:link>`,
    `      <g:image_link>${imageLink}</g:image_link>`,
    `      <g:brand>${brand}</g:brand>`,
    `      <g:condition>${condition}</g:condition>`,
    `      <g:availability>${availability}</g:availability>`,
    `      <g:price>${price}</g:price>`,
    `      <g:google_product_category>${googleCategory}</g:google_product_category>`,
    `      <g:product_type>${productType}</g:product_type>`,
    `      <g:mpn>${mpn}</g:mpn>`,
    '      <g:shipping>',
    '        <g:country>ES</g:country>',
    '        <g:service>Estándar</g:service>',
    '        <g:price>0.00 EUR</g:price>',
    '      </g:shipping>',
    `      <g:custom_label_0>${customLabel0}</g:custom_label_0>`,
    `      <g:custom_label_1>${customLabel1}</g:custom_label_1>`,
    `      <g:custom_label_2>${customLabel2}</g:custom_label_2>`,
    `      <g:custom_label_3>${customLabel3}</g:custom_label_3>`,
    '    </item>',
  ].join('\n');
}

function generarFeed(productos) {
  const items = productos.map(generarItem);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    '    <title>Nutrigan España - Productos de Nutrición Animal</title>',
    `    <link>${BASE_URL}</link>`,
    '    <description>Suplementos nutricionales de alta calidad para ganado bovino, ovino, caprino y porcino</description>',
    '',
    items.join('\n\n'),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

function main() {
  try {
    if (!fs.existsSync(productosPath)) {
      throw new Error(`No se encuentra el archivo productos.json en ${productosPath}`);
    }

    const contenido = fs.readFileSync(productosPath, 'utf8');
    const datos = JSON.parse(contenido);

    if (!datos || !Array.isArray(datos.productos)) {
      throw new Error('El archivo productos.json no contiene un array "productos" válido.');
    }

    const productos = datos.productos.filter((producto) => {
      // Si existe la propiedad visibleEnGoogle, respetarla; en caso contrario, asumir true
      if (producto.hasOwnProperty('visibleEnGoogle')) {
        return Boolean(producto.visibleEnGoogle);
      }
      return true;
    });

    if (productos.length === 0) {
      throw new Error('No hay productos disponibles para generar el feed de Google.');
    }

    // Ordenar por ID ascendente para consistencia
    productos.sort((a, b) => Number(a.id) - Number(b.id));

    const xml = generarFeed(productos);
    fs.writeFileSync(salidaPath, xml, 'utf8');

    console.log(`✅ Feed de Google generado con ${productos.length} productos.`);
    console.log(`📄 Archivo creado en: ${salidaPath}`);
  } catch (error) {
    console.error('❌ Error al generar el feed de Google:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generarFeed,
};

