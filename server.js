require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// Regla de promociones, la misma que usa el navegador (ver promociones.js).
const promos = require('./promociones.js');

// Cliente Supabase con service role (solo backend, nunca en frontend)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Verificar y mostrar las variables de entorno
console.log('Configuración de entorno:');
console.log('PORT:', process.env.PORT);
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Configurada' : 'No configurada');
console.log('STRIPE_PUBLIC_KEY:', process.env.STRIPE_PUBLIC_KEY ? 'Configurada' : 'No configurada');

// Verificar que las claves de Stripe estén configuradas
if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLIC_KEY) {
    console.error('Error: Las claves de Stripe no están configuradas en el archivo .env');
    process.exit(1);
}

// Verificar que las claves sean válidas (prueba o producción)
if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_') || !process.env.STRIPE_PUBLIC_KEY.startsWith('pk_')) {
    console.error('Error: Las claves de Stripe deben ser válidas (sk_ y pk_)');
    console.error('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY);
    console.error('STRIPE_PUBLIC_KEY:', process.env.STRIPE_PUBLIC_KEY);
    process.exit(1);
}

// Detectar si estamos en modo producción
const isProduction = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
console.log('Modo:', isProduction ? 'PRODUCCIÓN' : 'PRUEBA');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuración de nodemailer para envío de correos
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'javiernutrigan@gmail.com',
        pass: process.env.EMAIL_PASS // Esta será la contraseña de aplicación de Gmail
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Disponibilidad de cara al cliente. Manda la columna `disponible` de Supabase;
// el `stock` numérico ya no decide nada visible porque no se lleva inventario real.
//
// El `!== false` es deliberado: si la columna llegara nula o el producto viniera
// sin ese campo, se considera disponible. Preferimos fallar hacia "se puede
// comprar" antes que esconder el catálogo entero por un problema de datos.
function estaDisponible(producto) {
    return producto && producto.disponible !== false;
}

// Función para verificar si hay stock suficiente para los productos
async function verificarStock(productos) {
    console.log('🔍 Verificando stock de productos...');

    const ids = productos.map(p => p.id);
    const { data: productosDB, error } = await supabaseAdmin
        .from('productos')
        .select('id, nombre, stock, disponible')
        .in('id', ids);

    if (error) throw error;

    const productosSinStock = [];

    productos.forEach(productoCarrito => {
        const producto = (productosDB || []).find(p => p.id === productoCarrito.id);
        const cantidadSolicitada = parseInt(productoCarrito.cantidad);

        if (producto) {
            // Un producto marcado como agotado se rechaza aquí, en el servidor,
            // antes de crear la sesión de pago. Deshabilitar el botón en el
            // navegador no basta: un carrito guardado en localStorage hace días
            // llega igual hasta el checkout con el producto ya retirado.
            if (!estaDisponible(producto)) {
                console.log(`🚫 ${producto.nombre}: marcado como NO disponible`);
                productosSinStock.push({
                    nombre: producto.nombre,
                    error: 'Agotado temporalmente'
                });
                return;
            }

            const stockDisponible = parseInt(producto.stock);
            console.log(`📦 ${producto.nombre}: stock ${stockDisponible}, solicitado ${cantidadSolicitada}`);
            if (stockDisponible < cantidadSolicitada) {
                productosSinStock.push({ nombre: producto.nombre, stockDisponible, cantidadSolicitada });
            }
        } else {
            productosSinStock.push({
                nombre: `Producto ID ${productoCarrito.id}`,
                stockDisponible: 0,
                cantidadSolicitada,
                error: 'Producto no encontrado'
            });
        }
    });

    return productosSinStock;
}

// Función para reducir el stock de productos vendidos
async function reducirStock(productosVendidos) {
    console.log('🔄 Reduciendo stock de productos vendidos...');

    const ids = productosVendidos.map(p => p.id);
    const { data: productosDB, error: fetchError } = await supabaseAdmin
        .from('productos')
        .select('id, nombre, stock')
        .in('id', ids);

    if (fetchError) throw fetchError;

    for (const pVendido of productosVendidos) {
        const pDB = (productosDB || []).find(p => p.id === pVendido.id);
        if (!pDB) { console.error(`❌ Producto ID ${pVendido.id} no encontrado`); continue; }

        const cantidadVendida = parseInt(pVendido.cantidad);
        const stockActual = parseInt(pDB.stock);
        const nuevoStock = Math.max(0, stockActual - cantidadVendida);

        const { error } = await supabaseAdmin
            .from('productos')
            .update({ stock: nuevoStock })
            .eq('id', pDB.id);

        if (error) {
            console.error(`❌ Error actualizando stock de ${pDB.nombre}:`, error.message);
        } else {
            console.log(`✅ ${pDB.nombre}: stock ${stockActual} → ${nuevoStock}`);
        }
    }
}

// Lista de dominios permitidos para CORS
const whitelist = [
    'https://xn--nutriganespaa-tkb.com',
    'https://www.xn--nutriganespaa-tkb.com',
    'https://nutriganespaña.com',
    'https://nutriganespana.com',
    'https://nutrigan-web.onrender.com',
    // Desarrollo local (Live Server y similares)
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5504',
    'http://127.0.0.1:5504',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Solo logear si hay un problema o si es una petición importante
        if (!origin) {
            // Peticiones sin origin (Postman, apps móviles) - permitir silenciosamente
            callback(null, true);
        } else if (whitelist.indexOf(origin) !== -1) {
            // Origin válido - permitir silenciosamente
            callback(null, true);
        } else {
            // Origin no válido - logear y bloquear
            console.log('❌ CORS - Origin bloqueado:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200 // Para navegadores legacy
};

// Usa el middleware de CORS con las opciones
app.use(cors(corsOptions));

// Función para enviar correo de notificación de pedido
async function enviarCorreoPedido(pedido) {
    try {
        const { productos, total, currency, customer_email, shipping_address, fecha } = pedido;

        // Crear lista de productos
        let listaProductos = '';
        productos.forEach((producto, index) => {
            listaProductos += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${producto.nombre}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${producto.cantidad}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${producto.precio}€</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${(producto.precio * producto.cantidad).toFixed(2)}€</td>
                </tr>
            `;
        });

        // Información de envío
        let infoEnvio = 'No disponible';
        if (shipping_address) {
            const { address, name } = shipping_address;
            infoEnvio = `
                <strong>Nombre:</strong> ${name}<br>
                <strong>Dirección:</strong> ${address.line1}<br>
                ${address.line2 ? `<strong>Dirección 2:</strong> ${address.line2}<br>` : ''}
                <strong>Ciudad:</strong> ${address.city}<br>
                <strong>Código Postal:</strong> ${address.postal_code}<br>
                <strong>País:</strong> ${address.country}
            `;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER || 'javiernutrigan@gmail.com',
            to: 'javiernutrigan@gmail.com',
            subject: `Nuevo Pedido - Nutrigan España - ${new Date(fecha).toLocaleDateString('es-ES')}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c5530; text-align: center;">Nuevo Pedido Recibido</h2>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #2c5530; margin-top: 0;">Información del Pedido</h3>
                        <p><strong>Fecha:</strong> ${new Date(fecha).toLocaleString('es-ES')}</p>
                        <p><strong>Email del Cliente:</strong> ${customer_email || 'No proporcionado'}</p>
                        <p><strong>Total:</strong> ${total}€</p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #2c5530; margin-top: 0;">Dirección de Envío</h3>
                        <div>${infoEnvio}</div>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #2c5530; margin-top: 0;">Productos Pedidos</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                            <thead>
                                <tr style="background-color: #2c5530; color: white;">
                                    <th style="padding: 10px; border: 1px solid #ddd;">#</th>
                                    <th style="padding: 10px; border: 1px solid #ddd;">Producto</th>
                                    <th style="padding: 10px; border: 1px solid #ddd;">Cantidad</th>
                                    <th style="padding: 10px; border: 1px solid #ddd;">Precio Unit.</th>
                                    <th style="padding: 10px; border: 1px solid #ddd;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${listaProductos}
                            </tbody>
                        </table>
                        <div style="text-align: right; margin-top: 15px; font-size: 18px; font-weight: bold;">
                            <strong>Total: ${total}€</strong>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 30px; color: #666;">
                        <p>Este correo fue generado automáticamente por el sistema de Nutrigan España</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Correo enviado correctamente:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        return false;
    }
}

// Middleware para parsear JSON (debe ir antes de las rutas)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Redirigir a la URL canónica: HTTPS + www
app.use((req, res, next) => {
    // Las rutas de API nunca se redirigen (evita romper POST con redirect 301)
    if (req.path.startsWith('/api/')) return next();

    const host = req.headers.host || '';

    // Localhost no necesita redirección (desarrollo local)
    if (host.includes('localhost') || host.includes('127.0.0.1')) return next();

    // El dominio de Render no necesita redirección www
    if (host.includes('onrender.com')) {
        if (req.path === '/index.html') return res.redirect(301, '/');
        return next();
    }

    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const isWww = host.startsWith('www.');
    const isHttps = proto === 'https';

    if (!isWww || !isHttps) {
        const canonical = 'https://www.' + host.replace(/^www\./, '') + req.url;
        return res.redirect(301, canonical);
    }

    // Redirigir /index.html → /
    if (req.path === '/index.html') {
        return res.redirect(301, '/');
    }

    next();
});

// Middleware adicional para manejar preflight requests
app.options('*', (req, res) => {
    console.log('=== PETICIÓN OPTIONS (PREFLIGHT) ===');
    console.log('URL:', req.url);
    console.log('Origin:', req.headers.origin);
    console.log('===============================');

    const origin = req.headers.origin;
    if (whitelist.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400'); // Cache preflight por 24 horas
        res.sendStatus(200);
    } else {
        res.status(403).send('Origin not allowed by CORS');
    }
});

// Endpoint para obtener configuración de Stripe
app.get('/api/stripe-config', (req, res) => {
    res.json({
        publicKey: process.env.STRIPE_PUBLIC_KEY,
        isProduction: isProduction
    });
});

// Endpoint de prueba para verificar que el servidor funciona
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        mode: isProduction ? 'PRODUCCIÓN' : 'PRUEBA'
    });
});

// Middleware para debug - capturar todas las peticiones (solo en desarrollo)
if (!isProduction) {
    app.use('/api/*', (req, res, next) => {
        console.log(`=== PETICIÓN RECIBIDA ===`);
        console.log(`URL: ${req.url}`);
        console.log(`Método: ${req.method}`);
        console.log(`Headers:`, req.headers);
        console.log(`Body:`, req.body);
        console.log(`========================`);
        next(); // Asegurar que se pase al siguiente middleware
    });
}

// Endpoint de prueba para simular datos de pedido
app.get('/api/pedido-test/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    console.log('=== PETICIÓN DE PRUEBA A /api/pedido-test ===');
    console.log('SessionId:', sessionId);

    // Simular respuesta
    const respuestaPrueba = {
        success: true,
        pedido: {
            sessionId: sessionId,
            productos: [
                {
                    id: '1',
                    nombre: 'Bolutech flash',
                    precio: 54.26,
                    precioFinal: 59.686,
                    cantidad: 2,
                    imagen: '/assets/producto14.webp'
                },
                {
                    id: '2',
                    nombre: 'Bolutech activ',
                    precio: 44.3,
                    precioFinal: 48.73,
                    cantidad: 1,
                    imagen: '/assets/producto2.webp'
                }
            ],
            total: 168.102,
            currency: 'eur',
            fecha: new Date().toISOString(),
            customer_email: 'cliente@ejemplo.com',
            shipping_address: null
        }
    };

    console.log('Enviando respuesta de prueba:', respuestaPrueba);
    res.json(respuestaPrueba);
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error('Error en el servidor:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Endpoint para verificar el estado de una sesión de Stripe
app.get('/api/verificar-sesion/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        res.json({
            success: true,
            session: {
                id: session.id,
                payment_status: session.payment_status,
                customer_email: session.customer_email,
                amount_total: session.amount_total,
                currency: session.currency,
                metadata: session.metadata
            }
        });
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Endpoint para obtener información del pedido desde session_id
app.get('/api/pedido/:sessionId', async (req, res) => {
    try {
        console.log('=== PETICIÓN A /api/pedido/:sessionId ===');
        console.log('SessionId:', req.params.sessionId);

        const { sessionId } = req.params;

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        console.log('Estado del pago:', session.payment_status);
        console.log('Metadata:', session.metadata);
        console.log('Customer email:', session.customer_email);
        console.log('Customer details:', session.customer_details);

        if (session.payment_status !== 'paid') {
            console.log('Pago no completado, estado:', session.payment_status);
            return res.status(400).json({
                success: false,
                message: 'El pago no ha sido completado'
            });
        }

        // Parsear los productos desde los metadata
        let productos = [];
        if (session.metadata && session.metadata.productos_json) {
            try {
                const productosMin = JSON.parse(session.metadata.productos_json);
                console.log('Productos minimizados recibidos:', productosMin);

                // Re-hidratar productos desde Supabase
                const minIds = productosMin.map(p => p.id);
                const { data: productosDB } = await supabaseAdmin
                    .from('productos')
                    .select('id, nombre, imagen, precio')
                    .in('id', minIds);

                productos = productosMin.map(pMin => {
                    const pFull = (productosDB || []).find(p => p.id === pMin.id);
                    if (pFull) {
                        return {
                            ...pFull,
                            cantidad: pMin.c,
                            precio: pMin.p,
                            precioFinal: pMin.p,
                            imagen: pFull.imagen && pFull.imagen.startsWith('http')
                                ? pFull.imagen
                                : `/assets/${require('path').basename(pFull.imagen || 'logo.png')}`
                        };
                    }
                    return { id: pMin.id, nombre: `Producto ID ${pMin.id}`, precio: pMin.p, cantidad: pMin.c, imagen: '/assets/logo.png' };
                });

                console.log('Productos re-hidratados:', productos.length);

                // Comprobar idempotencia: evitar reducción de stock duplicada si el endpoint
                // se llama más de una vez con el mismo session_id.
                // Requiere tabla en Supabase: CREATE TABLE pedidos_procesados (
                //   id BIGSERIAL PRIMARY KEY,
                //   stripe_session_id TEXT UNIQUE NOT NULL,
                //   created_at TIMESTAMPTZ DEFAULT NOW()
                // );
                const { data: yaProcessado } = await supabaseAdmin
                    .from('pedidos_procesados')
                    .select('id')
                    .eq('stripe_session_id', sessionId)
                    .maybeSingle();

                if (!yaProcessado) {
                    await reducirStock(productos);
                    await supabaseAdmin
                        .from('pedidos_procesados')
                        .insert({ stripe_session_id: sessionId });
                } else {
                    console.log('⚠️ Pedido ya procesado anteriormente, omitiendo reducción de stock:', sessionId);
                }
            } catch (e) {
                console.error('Error al parsear/hidratar productos:', e);
            }
        }

        const pedido = {
            sessionId: session.id,
            productos: productos,
            total: session.amount_total / 100, // Stripe devuelve en centavos
            currency: session.currency,
            fecha: new Date(session.created * 1000).toISOString(),
            customer_email: session.customer_email || (session.customer_details ? session.customer_details.email : null),
            shipping_address: session.shipping_details
        };

        // Enviar correo de notificación (no esperamos a que termine para responder al cliente)
        enviarCorreoPedido(pedido).then(enviado => {
            if (enviado) {
                console.log('✅ Correo de notificación enviado para el pedido:', session.id);
            } else {
                console.log('❌ Error al enviar correo de notificación para el pedido:', session.id);
            }
        }).catch(error => {
            console.error('❌ Error en el envío de correo:', error);
        });

        const respuesta = {
            success: true,
            pedido: pedido
        };

        console.log('Enviando respuesta:', respuesta);
        res.json(respuesta);
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// El contrareembolso se retiro como metodo de pago. Aqui vivia
// POST /api/procesar-contrareembolso, que ademas nunca llego a implementarse:
// devolvia un pedidoId inventado sin registrar el pedido ni avisar por email,
// y ningun frontend lo llamaba. Eliminado para no dejar una ruta publica que
// aparenta crear pedidos. Si algun dia se recupera el contrareembolso, hay que
// escribirlo de cero contra Supabase + el envio de correo, como hace Stripe.

// Endpoint para crear sesión de checkout de Stripe
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        console.log('=== RECIBIDA PETICIÓN A /api/create-checkout-session ===');
        console.log('Body:', req.body);

        const { productos, total, cantidadTotal } = req.body;

        if (!productos || productos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay productos en el carrito'
            });
        }

        // Verificar stock antes de crear la sesión de checkout
        const productosSinStock = await verificarStock(productos);
        if (productosSinStock.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Stock insuficiente para algunos productos',
                productosSinStock: productosSinStock
            });
        }

        // Obtener precios actuales de Supabase (nunca confiar en el precio del cliente)
        const ids = productos.map(p => p.id);
        const { data: productosActuales, error: sbError } = await supabaseAdmin
            .from('productos')
            // select('*') y no una lista de columnas: hacen falta tambien las
            // columnas de la oferta, y asi se recogen solas sin fallar con 42703
            // mientras no existan.
            .select('*')
            .in('id', ids);

        if (sbError || !productosActuales) {
            return res.status(500).json({ success: false, message: 'Error al verificar precios' });
        }

        // Crear línea de productos para Stripe con precios de Supabase
        const lineItems = productos.map(producto => {
            const actual = productosActuales.find(p => p.id === producto.id);
            if (!actual) throw new Error(`Producto ${producto.id} no encontrado`);
            // Oferta por volumen. Se calcula aqui, con los datos de Supabase y la
            // cantidad de esta linea, y no se lee del carrito: el precio que se
            // cobra lo decide el servidor, igual que el precio normal.
            const promo = promos.promocionDe(actual);
            const aplicaLaOferta = promo && producto.cantidad >= promo.cajasMinimas;
            const precioUnitario = aplicaLaOferta ? promo.precioCajaPromo : actual.precio;
            const imagenUrl = actual.imagen && actual.imagen.startsWith('http')
                ? actual.imagen
                : `https://www.xn--nutriganespaa-tkb.com/${actual.imagen}`;
            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: actual.nombre,
                        images: [imagenUrl]
                    },
                    unit_amount: Math.round(parseFloat(precioUnitario) * 100)
                },
                quantity: producto.cantidad
            };
        });

        // Crear sesión de checkout
        const opcionesSesion = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: 'https://www.xn--nutriganespaa-tkb.com/gracias-compra.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://www.xn--nutriganespaa-tkb.com/carrito.html',
            // Configuración de envíos
            shipping_options: [
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: {
                            amount: 0,
                            currency: 'eur',
                        },
                        display_name: 'Envío gratuito',
                        delivery_estimate: {
                            minimum: {
                                unit: 'business_day',
                                value: 5,
                            },
                            maximum: {
                                unit: 'business_day',
                                value: 10,
                            },
                        },
                    },
                },
            ],
            // Configuración de campos de envío
            shipping_address_collection: {
                allowed_countries: ['ES']
            },
            // Facturación en 'auto': Stripe ya recoge la dirección de envío justo arriba
            // y ofrece "usar la misma para facturación". Con 'required' se pintaba un
            // segundo bloque de ~6 campos duplicados, un punto claro de abandono.
            billing_address_collection: 'auto',
            // Teléfono: se mantiene obligatorio a propósito. Stripe Checkout no permite
            // pedirlo como opcional (o se recoge y es obligatorio, o no se pide), y el
            // reparto de Correos Express a explotaciones rurales necesita contacto para
            // coordinar la entrega. Un campo de más compensa frente a entregas fallidas.
            phone_number_collection: {
                enabled: true
            },
            // Configuración de cliente
            customer_creation: 'always',
            // Metadatos del pedido
            metadata: {
                total: lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0) / 100 + '',
                cantidadTotal: cantidadTotal.toString(),
                productos_json: JSON.stringify(productos.map(p => {
                    const actual = productosActuales.find(a => a.id === p.id);
                    return { id: p.id, c: p.cantidad, p: parseFloat(actual?.precio || 0) };
                }))
            },
            // Mensaje personalizado
            custom_text: {
                submit: {
                    message: 'Nutrigan España - Productos de calidad para el bienestar animal. Envío gratuito incluido en todos los pedidos.'
                }
            },
            // Icono de la pestaña del navegador en la pagina de Stripe. Sin esto
            // Checkout usa el del Dashboard, al que no tenemos acceso: la cuenta
            // es del cliente. Con branding_settings se manda en cada sesion y
            // pisa lo que haya configurado alli.
            //
            // type 'url' y no 'file' a proposito: 'file' obliga a subir el PNG a
            // Stripe con la API y guardar el id, o sea a tener una clave que
            // funcione. Apuntando a la URL publica se usa el mismo fichero que
            // ya sirve el sitio, que es justo lo que hace falta para que la
            // pestaña se vea igual que en el resto de paginas.
            branding_settings: {
                icon: {
                    type: 'url',
                    url: 'https://www.xn--nutriganespaa-tkb.com/assets/favicon-nutrigan.png'
                }
            }
        };

        // branding_settings no existe en la version de API del proyecto, asi que
        // se pide la que lo trae solo para esta llamada. Global seria peligroso:
        // mas abajo se lee session.shipping_details al recuperar la sesion para
        // el correo del pedido, y ese campo cambia de sitio en versiones nuevas.
        // Aqui solo se leen id y url, que no cambian.
        let session;
        try {
            session = await stripe.checkout.sessions.create(
                opcionesSesion,
                { apiVersion: '2025-09-30.clover' }
            );
        } catch (errorMarca) {
            // Un icono no vale una venta perdida: si la marca por sesion la
            // rechaza Stripe -version, formato del PNG, lo que sea- se reintenta
            // sin ella y el cliente puede pagar igual. Si el fallo era otro, el
            // segundo intento vuelve a fallar y lo recoge el catch de fuera.
            console.error('Marca por sesion rechazada, se reintenta sin ella:', errorMarca.message);
            delete opcionesSesion.branding_settings;
            session = await stripe.checkout.sessions.create(opcionesSesion);
        }

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Error al crear sesión de checkout:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear sesión de pago'
        });
    }
});

// Endpoint para obtener todos los productos desde Supabase
app.get('/api/productos', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('productos')
        .select('*')
        .order('id', { ascending: true });

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, productos: data });
});

app.get('/api/productos/:id', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('productos')
        .select('*')
        .eq('id', parseInt(req.params.id))
        .single();

    if (error) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    res.json({ success: true, producto: data });
});

// Helpers compartidos por SSR y feed de Google Shopping
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function resolveImageUrl(imagen) {
    if (!imagen) return '';
    if (imagen.startsWith('http')) return imagen;
    const clean = imagen.startsWith('/') ? imagen : '/' + imagen;
    return `https://www.xn--nutriganespaa-tkb.com${clean}`;
}

// Ruta para el atributo src de la imagen principal. A diferencia de resolveImageUrl
// -que devuelve URL absoluta porque og:image y schema.org la necesitan asi- aqui
// interesa una ruta relativa a la raiz: evita forzar peticiones al host canonico
// si alguien llega por otro dominio.
//
// Si el producto no tiene imagen se cae al logo, que pesa 8,6 KB, en vez de dejar
// un src roto o vacio.
const IMAGEN_DE_RESERVA = '/assets/logo_nutrigan-nav.webp';

function resolveImageSrc(imagen) {
    if (!imagen) return IMAGEN_DE_RESERVA;
    if (imagen.startsWith('http')) return imagen;
    return imagen.startsWith('/') ? imagen : '/' + imagen;
}

// Recorta la meta description sin partir palabras. Antes se hacía substring(0, 155)
// en seco y en Google se leían cortes a media palabra (p. ej. "...Ap").
// Deja hueco para la elipsis y limpia la puntuación que quede colgando al final.
function recortarDescripcion(texto, max = 155) {
    const limpio = String(texto || '').trim();
    if (limpio.length <= max) return limpio;

    const corte = limpio.slice(0, max - 1);
    const ultimoEspacio = corte.lastIndexOf(' ');
    const base = ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte;

    return base.replace(/[\s.,;:¡!¿?()\[\]/\-–—]+$/, '') + '…';
}

// Servir producto.html con meta tags inyectados server-side desde Supabase
const productoTemplate = fs.readFileSync(path.join(__dirname, 'producto.html'), 'utf8');

const PRODUCT_BASE = 'https://www.xn--nutriganespaa-tkb.com';
const NOT_FOUND_HTML = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>Producto no encontrado | Nutrigan España</title></head><body><h1>Producto no encontrado</h1><a href="/productos.html">Ver todos los productos</a></body></html>';

// Convierte el nombre de un producto en un slug estable para URLs limpias.
// Quita ®/acentos, así el slug no cambia aunque el nombre los lleve o no.
function slugify(str) {
    return String(str || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[®™©]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Cache slug -> id (60 min) para resolver /producto/:slug sin columna slug en BD
let slugMapCache = { map: null, expiresAt: 0 };
async function getSlugMap() {
    const now = Date.now();
    if (slugMapCache.map && now < slugMapCache.expiresAt) return slugMapCache.map;
    const { data, error } = await supabaseAdmin.from('productos').select('id, nombre');
    if (error || !data) throw error || new Error('No se pudo cargar el índice de productos');
    const map = new Map();
    data.forEach(p => map.set(slugify(p.nombre), p.id));
    slugMapCache = { map, expiresAt: now + 60 * 60 * 1000 };
    return map;
}

// Genera el HTML del producto con meta tags + JSON-LD inyectados server-side
function renderProductoHtml(producto, canonical) {
    const title = `${producto.nombre} | Nutrigan España`;
    const rawDesc = (producto.descripcion_completa || producto.descripcion || '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const description = recortarDescripcion(rawDesc, 155);
    const imageUrl = resolveImageUrl(producto.imagen);
    const disponibilidad = estaDisponible(producto) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
    const precio = parseFloat(producto.precio || 0).toFixed(2);

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': producto.nombre,
        'description': rawDesc.substring(0, 500) || description,
        'image': imageUrl,
        'url': canonical,
        'sku': String(producto.id),
        'mpn': `SKU-${producto.id}`,
        'brand': { '@type': 'Brand', 'name': 'Nutrigan España' },
        'offers': {
            '@type': 'Offer',
            'priceCurrency': 'EUR',
            'price': precio,
            'priceValidUntil': '2027-12-31',
            'itemCondition': 'https://schema.org/NewCondition',
            'availability': disponibilidad,
            'url': canonical,
            'seller': { '@type': 'Organization', 'name': 'Nutrigan España' },
            'shippingDetails': {
                '@type': 'OfferShippingDetails',
                'shippingRate': { '@type': 'MonetaryAmount', 'value': '0', 'currency': 'EUR' },
                'shippingDestination': { '@type': 'DefinedRegion', 'addressCountry': 'ES' },
                'deliveryTime': {
                    '@type': 'ShippingDeliveryTime',
                    'handlingTime': { '@type': 'QuantitativeValue', 'minValue': 0, 'maxValue': 1, 'unitCode': 'DAY' },
                    'transitTime': { '@type': 'QuantitativeValue', 'minValue': 5, 'maxValue': 10, 'unitCode': 'DAY' }
                }
            },
            'hasMerchantReturnPolicy': {
                '@type': 'MerchantReturnPolicy',
                'applicableCountry': 'ES',
                'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
                'merchantReturnDays': 30,
                'returnMethod': 'https://schema.org/ReturnByMail',
                'returnFees': 'https://schema.org/ReturnFeesCustomerResponsibility',
                'merchantReturnLink': 'https://www.xn--nutriganespaa-tkb.com/politica-devoluciones.html'
            }
        }
    };

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'Inicio', 'item': 'https://www.xn--nutriganespaa-tkb.com/' },
            { '@type': 'ListItem', 'position': 2, 'name': 'Productos', 'item': 'https://www.xn--nutriganespaa-tkb.com/productos.html' },
            { '@type': 'ListItem', 'position': 3, 'name': producto.nombre, 'item': canonical }
        ]
    };

    const seoTags = `<meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="product">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:site_name" content="Nutrigan España">
    <meta property="og:locale" content="es_ES">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${canonical}">
    <meta property="twitter:title" content="${escapeHtml(title)}">
    <meta property="twitter:description" content="${escapeHtml(description)}">
    <meta property="twitter:image" content="${escapeHtml(imageUrl)}">
    <script>window.__PRODUCTO_ID__=${parseInt(producto.id)};</script>
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;

    // Imagen principal con el src ya puesto. Es el elemento LCP de la ficha: si se
    // deja vacio para que lo rellene el JS tras consultar Supabase, el navegador no
    // puede empezar la descarga hasta que ese viaje termina y el fetchpriority="high"
    // no sirve de nada. La ruta sale de la misma columna `imagen` que alimentan la
    // web y el feed de Google, asi que no se reintroduce ningun desfase.
    const imgPrincipal = '<img id="producto-imagen-principal"'
        + ` src="${escapeHtml(resolveImageSrc(producto.imagen))}"`
        + ` alt="${escapeHtml(producto.nombre)}"`
        + ' class="imagen-principal" fetchpriority="high" decoding="async">';

    // El nombre y la descripcion se inyectan tambien en el cuerpo, no solo en
    // las meta: el HTML que recibe Google traia «Cargando producto...» como
    // <h1>, que es la senal de contenido mas fuerte de la pagina. El JavaScript
    // los reescribe despues con lo mismo, asi que no cambia nada para quien
    // navega; cambia para quien lee el HTML sin ejecutarlo.
    // La completa, que es la que producto.js pinta en ese hueco. Tienen que
    // coincidir: si el HTML dice una cosa y el JavaScript la sustituye por
    // otra, Google ve un texto y el visitante otro.
    const descripcionCuerpo = (producto.descripcion_completa || producto.descripcion || '')
        .replace(/<[^>]*>/g, '').trim();

    return productoTemplate
        .replace('<title id="producto-titulo">Producto | Nutrigan España</title>', `<title id="producto-titulo">${escapeHtml(title)}</title>`)
        .replace('<!-- PRODUCT_SEO_PLACEHOLDER -->', seoTags)
        .replace('<span id="breadcrumb-nombre">Cargando...</span>',
            `<span id="breadcrumb-nombre">${escapeHtml(producto.nombre)}</span>`)
        .replace('<h1 class="producto-hero-titulo" id="producto-nombre">Cargando producto...</h1>',
            `<h1 class="producto-hero-titulo" id="producto-nombre">${escapeHtml(producto.nombre)}</h1>`)
        .replace('<h2 class="producto-titulo" id="producto-titulo-detalle">Cargando...</h2>',
            `<h2 class="producto-titulo" id="producto-titulo-detalle">${escapeHtml(producto.nombre)}</h2>`)
        .replace('<p>Cargando descripción...</p>',
            `<p>${escapeHtml(descripcionCuerpo)}</p>`)
        // Por id y no por la cadena completa: asi el reemplazo aguanta si algun dia
        // cambian los atributos de la etiqueta en producto.html.
        .replace(/<img id="producto-imagen-principal"[^>]*>/, imgPrincipal);
}

// URL antigua /producto.html?id= -> 301 a la URL limpia /producto/<slug> (consolida SEO)
app.get('/producto.html', async (req, res) => {
    const id = parseInt(req.query.id);

    if (!id || isNaN(id)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(productoTemplate);
    }

    const { data: producto, error } = await supabaseAdmin
        .from('productos')
        .select('nombre')
        .eq('id', id)
        .single();

    if (error || !producto) {
        // Producto descatalogado (id ya no existe): 301 al catálogo en vez de 404,
        // así recuperamos la visita de Google y damos mejor UX.
        return res.redirect(301, '/productos.html');
    }

    return res.redirect(301, '/producto/' + slugify(producto.nombre));
});

// URL limpia /producto/<slug>
app.get('/producto/:slug', async (req, res) => {
    const slug = req.params.slug;

    let map;
    try {
        map = await getSlugMap();
    } catch (e) {
        console.error('Error cargando índice de slugs:', e);
        return res.status(500).send('Error al cargar el producto');
    }

    const id = map.get(slug);
    // Slug inexistente (producto retirado/descatalogado, o URL vieja que Google tiene
    // indexada): 301 al catálogo en vez de 404, igual que /producto.html?id=<retirado>.
    // Así recuperamos la visita y damos mejor UX. Ver commit 70d42de.
    if (!id) return res.redirect(301, '/productos.html');

    const { data: producto, error } = await supabaseAdmin
        .from('productos')
        .select('id, nombre, descripcion, descripcion_completa, imagen, precio, stock, disponible, especie, etapa, categoria')
        .eq('id', id)
        .single();

    if (error || !producto) return res.status(404).send(NOT_FOUND_HTML);

    // Si el slug pedido no es el canónico (p. ej. nombre cambiado), redirigir al actual
    const canonicalSlug = slugify(producto.nombre);
    if (slug !== canonicalSlug) return res.redirect(301, '/producto/' + canonicalSlug);

    const canonical = `${PRODUCT_BASE}/producto/${canonicalSlug}`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderProductoHtml(producto, canonical));
});

// Redirigir URLs antiguas /docs/*.pdf a la ubicación actual /assets/fichas-tecnicas/*.pdf
app.get('/docs/:filename', (req, res) => {
    res.redirect(301, '/assets/fichas-tecnicas/' + req.params.filename);
});

// Redirigir página de galería antigua a productos
app.get('/galeria.html', (req, res) => {
    res.redirect(301, '/productos.html');
});

// Servir /productos.html inyectando un índice de enlaces a todas las fichas de
// producto. El catálogo visible se renderiza con JS (Supabase), así que en el HTML
// puro no hay enlaces internos a los productos y Google tarda en rastrearlos
// (aparecían en GSC como "Descubierta: actualmente sin indexar"). Este bloque da
// un enlace real y crawleable a cada producto. Caché 60 min, como el sitemap.
const PRODUCTOS_HTML_TEMPLATE = fs.readFileSync(path.join(__dirname, 'productos.html'), 'utf8');
let productosHtmlCache = {};   // clave: 'todos' o el slug de la categoría

/**
 * Categorías con página propia.
 *
 * El filtro del catálogo vivía sólo en JavaScript, así que «productos para
 * ovinos» y «productos veterinarios para vacas» competían con una única página
 * titulada «Productos». Cada categoría tiene ahora su URL, su título y su H1,
 * que es lo que Google necesita para distinguirlas.
 *
 * Los textos apuntan a las búsquedas reales medidas con Semrush el 2026-08-24,
 * no a lo que suena bien: `productos veterinarios para vacas` (40/mes, sin
 * competencia) y `productos para ovinos` (70/mes) son las dos con opciones.
 */
const CATEGORIAS_CATALOGO = {
    bovinos: {
        nombre: 'Bovinos',
        h1: 'Productos veterinarios para vacas',
        subtitulo: 'Bolos, suplementos y tratamientos para vacuno de leche y de carne',
        title: 'Productos veterinarios para vacas | Bolos y suplementos | Nutrigan España',
        description: 'Productos veterinarios para vacas: bolos de calcio y fósforo, suplementos para el periparto, tratamientos de patas y desinfectantes. Envío gratis a toda la península.'
    },
    ovinos: {
        nombre: 'Ovinos',
        h1: 'Productos para ovinos',
        subtitulo: 'Suplementos nutricionales y sanitarios para ganado ovino',
        title: 'Productos para ovinos | Suplementos para ovejas | Nutrigan España',
        description: 'Productos para ovinos: suplementos nutricionales, cicatrizantes y productos sanitarios para ovejas y corderos. Envío gratis a toda la península.'
    },
    caprinos: {
        nombre: 'Caprinos',
        h1: 'Productos veterinarios para cabras',
        subtitulo: 'Suplementos nutricionales y sanitarios para ganado caprino',
        title: 'Productos veterinarios para cabras | Ganado caprino | Nutrigan España',
        description: 'Productos veterinarios para cabras: suplementos nutricionales, cicatrizantes y productos sanitarios para ganado caprino. Envío gratis a toda la península.'
    },
    porcinos: {
        nombre: 'Porcinos',
        h1: 'Productos veterinarios para cerdos',
        subtitulo: 'Suplementos nutricionales y sanitarios para ganado porcino',
        title: 'Productos veterinarios para cerdos | Ganado porcino | Nutrigan España',
        description: 'Productos veterinarios para cerdos: suplementos nutricionales, desinfectantes y productos sanitarios para ganado porcino. Envío gratis a toda la península.'
    },
    equinos: {
        nombre: 'Equinos',
        h1: 'Productos veterinarios para caballos',
        subtitulo: 'Suplementos nutricionales y sanitarios para équidos',
        title: 'Productos veterinarios para caballos | Equinos | Nutrigan España',
        description: 'Productos veterinarios para caballos: suplementos nutricionales, cicatrizantes y productos sanitarios para équidos. Envío gratis a toda la península.'
    },
    perros: {
        nombre: 'Perros',
        h1: 'Productos veterinarios para perros',
        subtitulo: 'Cicatrizantes, repelentes y suplementos para perros',
        title: 'Productos veterinarios para perros | Cicatrizantes y repelentes | Nutrigan España',
        description: 'Productos veterinarios para perros: spray azul cicatrizante, repelentes de insectos y suplementos. Envío gratis a toda la península.'
    }
};

/** ¿Está el producto en esta categoría? La columna es una lista con comas y erratas. */
function productoEnCategoria(producto, categoria) {
    return (producto.categoria || '')
        .split(',')
        .map(c => c.trim().toLowerCase())
        .map(c => (c === 'caprino' ? 'caprinos' : c))
        .includes(categoria);
}

/**
 * Sirve el catálogo, entero o filtrado por categoría.
 * `categoria` a null es el catálogo completo, tal y como estaba.
 */
async function servirCatalogo(req, res, categoria) {
    const now = Date.now();
    const clave = categoria || 'todos';
    const enCache = productosHtmlCache[clave];
    if (enCache && now < enCache.expiresAt) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(enCache.html);
    }

    const cfg = categoria ? CATEGORIAS_CATALOGO[categoria] : null;

    let bloque = '';
    try {
        const { data: todos, error } = await supabaseAdmin
            .from('productos')
            .select('nombre, categoria')
            .order('nombre', { ascending: true });

        const productos = (!error && todos)
            ? (categoria ? todos.filter(p => productoEnCategoria(p, categoria)) : todos)
            : null;

        if (productos && productos.length) {
            const items = productos
                .map(p => `<li><a href="/producto/${slugify(p.nombre)}">${escapeXml(p.nombre)}</a></li>`)
                .join('');
            const tituloIndice = cfg ? escapeXml(cfg.h1) : 'Todos nuestros productos';
            const subIndice = cfg
                ? escapeXml(cfg.subtitulo)
                : 'Explora nuestro catálogo completo de suplementos nutricionales para ganado';
            bloque = `<section class="productos-indice-seo" aria-label="Índice de todos los productos">
      <style>
        .productos-indice-seo{width:100%;max-width:1160px;box-sizing:border-box;margin:0 auto;padding:3.5em 1.5em 4em;border-top:1px solid #ececec}
        .productos-indice-seo__titulo{font-size:1.4em;font-weight:700;color:#1d2336;text-align:center;margin:0 0 .35em}
        .productos-indice-seo__sub{font-size:.92em;color:#9a9a9a;text-align:center;margin:0 auto 2em;max-width:520px}
        .productos-indice-seo__lista{column-width:230px;column-gap:2.5em;list-style:none;padding:0;margin:0}
        .productos-indice-seo__lista li{break-inside:avoid;margin:0 0 .7em}
        .productos-indice-seo__lista a{display:inline-block;color:#555;text-decoration:none;font-size:.92em;line-height:1.35;border-bottom:1px solid transparent;transition:color .2s ease,border-color .2s ease}
        .productos-indice-seo__lista a:hover{color:#1d815d;border-bottom-color:#1d815d}
        @media(max-width:560px){.productos-indice-seo{padding:2.5em 1.2em 3em}.productos-indice-seo__lista{column-width:auto;columns:1}}
      </style>
      <h2 class="productos-indice-seo__titulo">${tituloIndice}</h2>
      <p class="productos-indice-seo__sub">${subIndice}</p>
      <ul class="productos-indice-seo__lista">${items}</ul>
    </section>`;
        }
    } catch (e) {
        console.error('No se pudo generar el índice SEO de productos:', e.message);
    }

    // Enlaces reales entre categorías: sin ellos Google no llega a estas páginas
    // por navegación, sólo por el sitemap. El JavaScript los intercepta para
    // seguir filtrando al instante, sin recargar.
    const navegacion = ['<nav class="categorias-nav" aria-label="Categorías de producto">',
        `<a href="/productos.html"${!categoria ? ' aria-current="page"' : ''}>Todos</a>`]
        .concat(Object.entries(CATEGORIAS_CATALOGO).map(([slug, c]) =>
            `<a href="/productos/${slug}"${categoria === slug ? ' aria-current="page"' : ''}>${escapeXml(c.nombre)}</a>`))
        .concat(['</nav>']).join('');

    const canonical = categoria ? `${BASE_URL}/productos/${categoria}` : `${BASE_URL}/productos.html`;

    let html = PRODUCTOS_HTML_TEMPLATE
        .replace('<!--PRODUCTOS_SEO_LINKS-->', navegacion + bloque)
        .replace('<link rel="canonical" href="https://www.xn--nutriganespaa-tkb.com/productos.html">',
            `<link rel="canonical" href="${canonical}">`)
        .replace('<meta property="og:url" content="https://www.xn--nutriganespaa-tkb.com/productos.html">',
            `<meta property="og:url" content="${canonical}">`);

    if (cfg) {
        html = html
            .replace('<title>Productos Veterinarios | Suplementos para Ganado | Nutrigan España</title>',
                `<title>${escapeHtml(cfg.title)}</title>`)
            .replace('<meta property="og:title" content="Productos Veterinarios | Suplementos para Ganado | Nutrigan España">',
                `<meta property="og:title" content="${escapeHtml(cfg.title)}">`)
            .replace(/<meta name="description"\s+content="[^"]*">/,
                `<meta name="description" content="${escapeHtml(cfg.description)}">`)
            .replace('<h1 class="productos-header-titulo">Productos</h1>',
                `<h1 class="productos-header-titulo">${escapeHtml(cfg.h1)}</h1>`)
            .replace(/<p class="productos-header-subtitulo">[\s\S]*?<\/p>/,
                `<p class="productos-header-subtitulo">${escapeHtml(cfg.subtitulo)}</p>`)
            // Marca para que productos.js arranque ya filtrado por esta categoría.
            .replace('<div class="productos-grid-catalogo" id="productos-grid-catalogo">',
                `<div class="productos-grid-catalogo" id="productos-grid-catalogo" data-categoria-inicial="${categoria}">`);
    }

    productosHtmlCache[clave] = { html, expiresAt: now + 60 * 60 * 1000 };

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
}

app.get('/productos.html', (req, res) => servirCatalogo(req, res, null));

app.get('/productos/:categoria', (req, res) => {
    const categoria = String(req.params.categoria || '').toLowerCase();
    // Categoría inventada: al catálogo entero, no a un 404. Es una URL que
    // alguien puede teclear o que Google puede haber inventado probando.
    if (!CATEGORIAS_CATALOGO[categoria]) return res.redirect(301, '/productos.html');
    return servirCatalogo(req, res, categoria);
});

// Sitemap dinámico generado desde Supabase
const BASE_URL = 'https://www.xn--nutriganespaa-tkb.com';
const STATIC_PAGES = [
    { url: '/',                        changefreq: 'weekly',  priority: '1.0' },
    { url: '/productos.html',          changefreq: 'weekly',  priority: '0.9' },
    { url: '/sobreNosotros.html',      changefreq: 'monthly', priority: '0.8' },
    { url: '/feriaTineo.html',         changefreq: 'monthly', priority: '0.7' },
    { url: '/aviso-legal.html',        changefreq: 'yearly',  priority: '0.3' },
    { url: '/politica-privacidad.html',changefreq: 'yearly',  priority: '0.3' },
    { url: '/politica-cookies.html',   changefreq: 'yearly',  priority: '0.3' },
    { url: '/terminos-condiciones.html',changefreq: 'yearly', priority: '0.3' },
    { url: '/politica-devoluciones.html',changefreq: 'yearly',priority: '0.3' },
];

// Las paginas de categoria van al sitemap con la misma prioridad que el
// catalogo: son las que tienen que posicionar por «productos para ovinos» y
// «productos veterinarios para vacas».
const CATEGORIA_PAGES = Object.keys(CATEGORIAS_CATALOGO).map(slug => ({
    url: `/productos/${slug}`, changefreq: 'weekly', priority: '0.9'
}));

let sitemapCache = { xml: null, expiresAt: 0 };

app.get('/sitemap.xml', async (req, res) => {
    const now = Date.now();
    if (sitemapCache.xml && now < sitemapCache.expiresAt) {
        res.setHeader('Content-Type', 'application/xml');
        return res.send(sitemapCache.xml);
    }

    const { data: productos, error } = await supabaseAdmin
        .from('productos')
        .select('id, nombre, updated_at')
        .order('id', { ascending: true });

    if (error) return res.status(500).send('Error generando sitemap');

    const today = new Date().toISOString().split('T')[0];

    const staticUrls = STATIC_PAGES.concat(CATEGORIA_PAGES).map(p => `
  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

    const productUrls = productos.map(p => {
        const lastmod = p.updated_at ? p.updated_at.split('T')[0] : today;
        return `
  <url>
    <loc>${BASE_URL}/producto/${slugify(p.nombre)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${productUrls}
</urlset>`;

    sitemapCache = { xml, expiresAt: now + 60 * 60 * 1000 };

    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
});

// Google Shopping Feed dinámico generado desde Supabase
let googleFeedCache = { xml: null, expiresAt: 0 };

function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildImageUrl(imagen) {
    if (!imagen) return '';
    if (imagen.startsWith('http')) return imagen;
    const clean = imagen.startsWith('/') ? imagen : '/' + imagen;
    return `${BASE_URL}${clean}`;
}

function buildProductType(producto) {
    const parts = [producto.especie, producto.etapa, producto.categoria].filter(Boolean);
    return parts.length ? parts.join(' > ') : 'Nutrición Animal';
}

const LIMITE_DESCRIPCION_FEED = 5000; // máximo que admite g:description

function limpiarTexto(valor) {
    return String(valor || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Google empareja lo que busca el usuario contra el texto de <g:description>, así
// que ahí tiene que ir todo lo que describe el producto. Beneficios, ingredientes,
// composición y certificaciones ya estaban escritos en Supabase y se pintan en la
// ficha, pero no salían hacia el feed: se añaden detrás de la descripción como
// frases normales, que es como Google espera leerlas (ni listas ni marcado).
function construirDescripcionFeed(producto) {
    const lista = campo => (Array.isArray(producto[campo]) ? producto[campo] : [])
        .map(limpiarTexto)
        .filter(Boolean);

    // Las cadenas sueltas ya vienen separadas por comas desde el panel, así que se
    // copian tal cual; solo se les pone el punto final si no lo traen.
    const frase = (etiqueta, campo) => {
        const texto = limpiarTexto(producto[campo]);
        if (!texto) return '';
        return `${etiqueta}: ${texto}${/[.!?]$/.test(texto) ? '' : '.'}`;
    };

    const partes = [limpiarTexto(producto.descripcion_completa || producto.descripcion)];

    const beneficios = lista('beneficios');
    if (beneficios.length) partes.push(`Beneficios: ${beneficios.join('; ')}.`);

    const ingredientes = lista('ingredientes');
    if (ingredientes.length) partes.push(`Ingredientes: ${ingredientes.join(', ')}.`);

    partes.push(frase('Composición', 'composicion'));
    partes.push(frase('Certificaciones', 'certificaciones'));

    const texto = partes.filter(Boolean).join(' ');
    if (texto.length <= LIMITE_DESCRIPCION_FEED) return texto;

    // Se corta por palabra: partir una a la mitad se lo traga Google tal cual.
    const recorte = texto.slice(0, LIMITE_DESCRIPCION_FEED);
    const ultimoEspacio = recorte.lastIndexOf(' ');
    return (ultimoEspacio > 0 ? recorte.slice(0, ultimoEspacio) : recorte).trim();
}

app.get('/productos-google.xml', async (req, res) => {
    const now = Date.now();
    if (googleFeedCache.xml && now < googleFeedCache.expiresAt) {
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.send(googleFeedCache.xml);
    }

    const { data: productos, error } = await supabaseAdmin
        .from('productos')
        .select('id, nombre, descripcion, descripcion_completa, beneficios, ingredientes, composicion, certificaciones, precio, imagen, categoria, especie, etapa, presentacion, peso, stock, disponible')
        .order('id', { ascending: true });

    if (error) return res.status(500).send('Error generando feed de productos');

    const items = productos.map(p => {
        const disponibilidad = estaDisponible(p) ? 'in stock' : 'out of stock';
        const descripcion = escapeXml(construirDescripcionFeed(p));
        const imageUrl = buildImageUrl(p.imagen);
        const productType = escapeXml(buildProductType(p));

        return `
    <item>
      <g:id>${p.id}</g:id>
      <g:title>${escapeXml(p.nombre)}</g:title>
      <g:description>${descripcion}</g:description>
      <g:link>${BASE_URL}/producto/${slugify(p.nombre)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:brand>Nutrigan</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${disponibilidad}</g:availability>
      <g:price>${parseFloat(p.precio).toFixed(2)} EUR</g:price>
      <g:google_product_category>Animals &amp; Pet Supplies &gt; Farm &amp; Ranch &gt; Livestock Supplies</g:google_product_category>
      <g:product_type>${productType}</g:product_type>
      <g:mpn>SKU-${p.id}</g:mpn>
      <g:shipping>
        <g:country>ES</g:country>
        <g:service>Estándar</g:service>
        <g:price>0.00 EUR</g:price>
      </g:shipping>
      <g:return_policy_label>devolucion_30_dias</g:return_policy_label>
      ${p.especie ? `<g:custom_label_0>${escapeXml(p.especie)}</g:custom_label_0>` : ''}
      ${p.etapa ? `<g:custom_label_1>${escapeXml(p.etapa)}</g:custom_label_1>` : ''}
      ${p.categoria ? `<g:custom_label_2>${escapeXml(p.categoria)}</g:custom_label_2>` : ''}
      ${p.peso ? `<g:custom_label_3>${escapeXml(p.peso)}</g:custom_label_3>` : ''}
    </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Nutrigan España - Productos de Nutrición Animal</title>
    <link>${BASE_URL}</link>
    <description>Suplementos nutricionales de alta calidad para ganado bovino, ovino, caprino y porcino</description>
${items}
  </channel>
</rss>`;

    googleFeedCache = { xml, expiresAt: now + 60 * 60 * 1000 };

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
});

// ============================================================================
// PORTADA CON LA OFERTA INYECTADA DESDE SUPABASE
// ============================================================================
// index.html lleva marcadores que se rellenan aquí con los datos que el cliente
// edita en el panel de administración:
//
//   <!--PROMO_DESTACADA-->                     el bloque grande de oferta
//   <!--PROMO_UNIDAD_<id>_INICIO/_FIN-->       precio por unidad de una tarjeta
//   <!--PROMO_PRECIO_<id>_INICIO/_FIN-->       precio de una tarjeta
//
// Los de tarjeta van por pares y con el precio normal escrito dentro: si
// Supabase no responde se sirve la portada tal cual y la tarjeta conserva su
// precio, en vez de quedarse sin ninguno.
//
// Se hace en servidor y no con JavaScript en el navegador porque la portada
// vive de búsqueda orgánica: el buscador tiene que poder leer la oferta sin
// ejecutar nada. Es el mismo motivo por el que producto.html se sirve desde
// plantilla más arriba.
const portadaTemplate = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Cache de productos para la portada. Cinco minutos: lo justo para que un
// cambio en el panel se vea enseguida sin consultar Supabase en cada visita.
let portadaCache = { productos: null, expiresAt: 0 };

async function getProductosParaPortada() {
    const now = Date.now();
    if (portadaCache.productos && now < portadaCache.expiresAt) return portadaCache.productos;

    // select('*') a propósito y no una lista de columnas: así las columnas de
    // oferta se recogen solas en cuanto existan y, mientras no existan, la
    // consulta no falla con 42703 y tumba la portada entera.
    const { data, error } = await supabaseAdmin.from('productos').select('*');
    if (error || !data) throw error || new Error('No se pudieron cargar los productos');

    portadaCache = { productos: data, expiresAt: now + 5 * 60 * 1000 };
    return data;
}

/** Reemplaza lo que hay entre <!--NOMBRE_INICIO--> y <!--NOMBRE_FIN-->. */
function reemplazarEntreMarcadores(html, nombre, contenido) {
    const re = new RegExp('<!--' + nombre + '_INICIO-->[\\s\\S]*?<!--' + nombre + '_FIN-->', 'g');
    return html.replace(re, contenido);
}

function textoPlano(html) {
    return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Precio por unidad de una tarjeta de la rejilla, con o sin oferta. */
function precioUnidadTarjetaHtml(producto) {
    if (!producto || !producto.precio_unitario) return '';
    const promo = promos.promocionDe(producto);
    if (promo && promo.precioUnidadPromo) {
        return `<strong>${promos.precioUnidadTachadoHTML(promo)}</strong>`;
    }
    return `<strong>(${promos.formatoUnidadSitio(producto.precio_unitario)})</strong>`;
}

/** Precio de una tarjeta de la rejilla, con o sin oferta. */
function precioTarjetaHtml(producto) {
    if (!producto) return '';
    const promo = promos.promocionDe(producto);
    if (promo) {
        return `<div class="producto-precio producto-precio--promo">${promos.precioConTachadoHTML(promo)}</div>`;
    }
    return `<div class="producto-precio">${promos.formatoPrecioSitio(producto.precio)} <span class="precio-iva">IVA inc.</span></div>`;
}

/**
 * Bloque grande de oferta de la portada.
 *
 * Todo sale del producto y de su oferta, nada está escrito aquí: si el cliente
 * mueve la oferta a otro producto desde el panel, el bloque cambia con él sin
 * tocar código.
 */
function bloqueOfertaHtml(producto, promo) {
    const nombre = escapeHtml(producto.nombre);
    const claim = escapeHtml(textoPlano(producto.descripcion));
    const imagen = escapeHtml(producto.imagen || 'assets/logo.png');
    const enlace = `/producto/${slugify(producto.nombre)}`;

    // "Caja de 20 bolos a 58 € en vez de 70 €". Si el producto no declara
    // presentación se dice "La caja", que sigue siendo cierto.
    const presentacion = producto.presentacion ? escapeHtml(producto.presentacion) : 'La caja';

    // Con precio unitario, el titular es el precio por unidad (que es como
    // compara el ganadero); sin él, el de la caja.
    const titular = promo.precioUnidadPromo
        ? `<span class="promo-destacada-precio-nuevo">${promos.formatoEurosConCentimos(promo.precioUnidadPromo)}<span class="promo-destacada-unidad">/unidad</span></span>
                    <span class="promo-destacada-precio-viejo"><span class="visually-hidden">Antes </span>${promos.formatoEurosConCentimos(promo.precioUnidadNormal)}</span>`
        : `<span class="promo-destacada-precio-nuevo">${promos.formatoEurosConCentimos(promo.precioCajaPromo)}</span>
                    <span class="promo-destacada-precio-viejo"><span class="visually-hidden">Antes </span>${promos.formatoEurosConCentimos(promo.precioCajaNormal)}</span>`;

    return `<section class="promo-destacada" id="promo-destacada"
             data-promo-caduca="${promo.caduca}"
             aria-labelledby="promo-destacada-titulo">
        <div class="promo-destacada-container">
            <div class="promo-destacada-imagen">
                <img src="${imagen}" alt="${nombre}" loading="lazy" decoding="async">
                <span class="promo-destacada-sello" aria-hidden="true">
                    <strong>&minus;${promos.formatoEuros(promo.descuentoPorCaja)}</strong>
                    <small>por caja</small>
                </span>
            </div>

            <div class="promo-destacada-texto">
                <p class="promo-destacada-etiqueta">
                    <span class="promo-destacada-punto" aria-hidden="true"></span>
                    Oferta especial
                </p>

                <h2 id="promo-destacada-titulo" class="promo-destacada-titulo">${nombre}</h2>
                <p class="promo-destacada-claim">${claim}</p>

                <p class="promo-destacada-precio">
                    ${titular}
                </p>

                <p class="promo-destacada-caja">
                    ${presentacion} a <strong>${promos.formatoEuros(promo.precioCajaPromo)}</strong> en vez de
                    <span class="promo-destacada-tachado">${promos.formatoEuros(promo.precioCajaNormal)}</span>:
                    <strong>ahorras ${promos.formatoEuros(promo.descuentoPorCaja)} en cada caja</strong>.
                </p>

                <p class="promo-destacada-condicion">
                    <i class="fas fa-circle-check" aria-hidden="true"></i>
                    <span>Llevando <strong>${promo.cajasMinimas} cajas o más</strong>. El descuento se aplica solo en el carrito.</span>
                </p>

                ${promos.esDeLaGamaBolutech(producto) ? promos.avisoAplicadorHTML('promo-destacada-regalo', { conFoto: true }) : ''}

                <a href="${enlace}" class="promo-destacada-btn">Aprovechar la oferta</a>

                <p class="promo-destacada-vigencia">
                    <span class="promo-destacada-vigencia-texto">
                        <i class="fas fa-clock" aria-hidden="true"></i>
                        Válida hasta el ${promos.diaDeFin(promo)} de ${String(promo.hasta).slice(0, 4)}
                    </span>
                    <!-- Lo rellena main.js con el tiempo que queda. Nace oculto para que
                         sin JavaScript no haya un hueco vacío, y sin aria-live para que
                         el segundero de las últimas horas no se lea una vez por segundo. -->
                    <span class="promo-destacada-cuenta" id="promo-destacada-cuenta" hidden></span>
                </p>
            </div>
        </div>
    </section>`;
}

// Cuántos productos caben en la rejilla de la portada. El panel no deja marcar
// más de estos, así que aquí el slice() no debería recortar nunca; está por si
// alguien toca la base a mano.
const MAX_DESTACADOS = 6;

// Separación entre tarjetas en el HTML generado. Va como plantilla multilínea y
// no con secuencias de escape solo para que el fuente de la portada quede
// indentado igual que cuando las tarjetas estaban escritas a mano.
const SEPARADOR_TARJETAS = `

                `;

/**
 * Los productos que van en la rejilla de la portada.
 * Por id, que es estable: el cliente elige cuáles con la casilla «Destacado»,
 * no en qué orden salen.
 */
function productosDestacados(productos) {
    return productos
        .filter(p => p.destacado && estaDisponible(p))
        .sort((a, b) => a.id - b.id)
        .slice(0, MAX_DESTACADOS);
}

/** Una tarjeta de la rejilla de destacados. */
function tarjetaDestacadaHtml(producto) {
    const nombre = escapeHtml(producto.nombre);
    const imagen = escapeHtml(producto.imagen || 'assets/logo.png');
    const enlace = `/producto/${slugify(producto.nombre)}`;

    // La descripción de Supabase puede traer marcado (el <span> del sello ECO,
    // por ejemplo), así que se deja pasar tal cual como ya hace el catálogo.
    const descripcion = producto.descripcion || '';
    const unidad = precioUnidadTarjetaHtml(producto);

    // Solo la etiqueta de oferta: aquí todos son destacados, así que ponérsela a
    // los seis no distinguiría nada.
    const enOferta = !!promos.promocionDe(producto);
    const badge = enOferta
        ? '<span class="producto-badge-oferta">Oferta</span>'
        : '';

    // El mismo aro ámbar que en el catálogo: la etiqueta sola se pierde entre
    // seis tarjetas iguales, y el borde se ve de un vistazo.
    const claseOferta = enOferta ? ' producto-item--oferta' : '';

    return `<a href="${enlace}" class="producto-item producto-link${claseOferta}">
                    <div class="producto-imagen-container">
                        ${badge}
                        <img src="${imagen}" alt="${nombre}" class="producto-imagen" loading="lazy">
                    </div>
                    <h3 class="producto-nombre">${nombre}</h3>
                    <p class="producto-descripcion"><span class="producto-descripcion-texto">${descripcion}</span> ${unidad}</p>
                    ${precioTarjetaHtml(producto)}
                    <button type="button" class="producto-btn js-anadir-carrito"
                            data-id="${escapeHtml(producto.id)}"
                            data-nombre="${nombre}"
                            data-precio="${escapeHtml(producto.precio)}"
                            data-imagen="${imagen}"
                            data-descripcion="${escapeHtml(producto.descripcion || '')}">
                        <i class="fas fa-shopping-cart"></i> Añadir al carrito
                    </button>
                </a>`;
}

/**
 * ItemList de los destacados para Google.
 *
 * El precio que se declara es el de la caja suelta, sin descuento, igual que en
 * la ficha y en el feed de Shopping: es el único que se paga sin condiciones.
 */
function schemaDestacadosJson(destacados) {
    const itemListElement = destacados.map((p, i) => {
        const url = `${PRODUCT_BASE}/producto/${slugify(p.nombre)}`;
        return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'Product',
                name: p.nombre,
                sku: String(p.id),
                mpn: `SKU-${p.id}`,
                description: textoPlano(p.descripcion_completa || p.descripcion),
                image: resolveImageUrl(p.imagen),
                url: url,
                brand: { '@type': 'Brand', name: 'Nutrigan España' },
                offers: {
                    '@type': 'Offer',
                    priceCurrency: 'EUR',
                    price: parseFloat(p.precio || 0).toFixed(2),
                    priceValidUntil: '2027-12-31',
                    itemCondition: 'https://schema.org/NewCondition',
                    availability: estaDisponible(p)
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/OutOfStock',
                    url: url,
                    seller: { '@type': 'Organization', name: 'Nutrigan España' },
                    shippingDetails: {
                        '@type': 'OfferShippingDetails',
                        shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'EUR' },
                        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'ES' },
                        deliveryTime: {
                            '@type': 'ShippingDeliveryTime',
                            handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
                            transitTime: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 10, unitCode: 'DAY' }
                        }
                    },
                    hasMerchantReturnPolicy: {
                        '@type': 'MerchantReturnPolicy',
                        applicableCountry: 'ES',
                        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                        merchantReturnDays: 30,
                        returnMethod: 'https://schema.org/ReturnByMail',
                        returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
                        merchantReturnLink: `${PRODUCT_BASE}/politica-devoluciones.html`
                    }
                }
            }
        };
    });

    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Productos Destacados - Nutrigan España',
        url: `${PRODUCT_BASE}/`,
        itemListElement: itemListElement
    };
}

function renderPortadaHtml(productos) {
    // La oferta destacada es la del primer producto que tenga una vigente. Así
    // el cliente la mueve de producto desde el panel sin tocar la portada.
    const conOferta = productos.find(p => promos.promocionDe(p));

    let html = portadaTemplate.replace('<!--PROMO_DESTACADA-->',
        conOferta ? bloqueOfertaHtml(conOferta, promos.promocionDe(conOferta)) : '');

    const destacados = productosDestacados(productos);

    // Sin destacados no se toca la rejilla: se deja el respaldo escrito en el
    // HTML antes que dejar la portada sin productos.
    if (destacados.length > 0) {
        html = reemplazarEntreMarcadores(html, 'DESTACADOS',
            destacados.map(tarjetaDestacadaHtml).join(SEPARADOR_TARJETAS));
    }

    // El JSON-LD sí se omite si no hay datos: es preferible no decirle nada a
    // Google antes que anunciarle una lista que no coincide con la pagina.
    return html.replace('<!--DESTACADOS_SCHEMA-->', destacados.length > 0
        ? `<script type="application/ld+json">${JSON.stringify(schemaDestacadosJson(destacados))}</script>`
        : '');
}

// La portada solo es correcta servida desde '/', que es donde se rellenan los
// marcadores. Pedida como '/index.html' la cogeria express.static y devolveria
// la plantilla en crudo, sin oferta y con los comentarios sin resolver. En
// produccion ya redirige el middleware de dominio, pero en localhost esta
// desactivado, asi que se cierra aqui para todos los casos.
app.get('/index.html', (req, res) => res.redirect(301, '/'));

app.get('/', async (req, res) => {
    try {
        const productos = await getProductosParaPortada();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Un minuto: el grueso de las visitas lo absorbe la cache de productos de
        // arriba, y asi un cambio de oferta en el panel no tarda cinco minutos en
        // verse en el navegador de quien acaba de hacerlo.
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.send(renderPortadaHtml(productos));
    } catch (error) {
        // La portada no puede caerse porque Supabase falle. Se sirve la
        // plantilla tal cual: sin bloque de oferta, pero con el precio que lleva
        // escrito la tarjeta. Sin cache, para reintentar en la visita siguiente.
        console.error('Portada: no se pudo cargar la oferta desde Supabase:', error);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(portadaTemplate
            .replace('<!--PROMO_DESTACADA-->', '')
            .replace('<!--DESTACADOS_SCHEMA-->', ''));
    }
});

// Ficheros que viven en el repositorio pero no deben servirse por HTTP.
// express.static(__dirname) publica TODO el árbol de forma recursiva, así que sin
// este guardia quedan descargables (lo estuvieron): mover algo a una subcarpeta no
// lo saca de la web, solo le cambia la URL. Va antes del static para ganarle.
//
// Ninguno se usa desde el navegador. Los scripts de Node que leen productos.json
// (migrate-to-supabase.js, test-fix.js) lo hacen con fs.readFileSync, que lee del
// disco y no pasa por Express, así que siguen funcionando igual.
const RUTAS_PRIVADAS = [
    '/backups',              // copias históricas de la hoja de estilos
    '/scripts',              // utilidades de mantenimiento (feed, imágenes, SEO)
    '/server.js',            // lógica de negocio y superficie de API
    '/supabase-schema.sql',  // esquema de la base de datos
    '/productos.json',       // catálogo histórico previo a Supabase
];
RUTAS_PRIVADAS.forEach(ruta => {
    app.use(ruta, (req, res) => res.status(404).send('No encontrado'));
});

// Middleware para servir archivos estáticos (debe ir después de las rutas de API)
app.use(express.static(path.join(__dirname)));

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log('El servidor está escuchando en todas las interfaces de red');
    console.log('Configurado para funcionar en Render');
}); 