require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

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

// Función para verificar si hay stock suficiente para los productos
async function verificarStock(productos) {
    console.log('🔍 Verificando stock de productos...');

    const ids = productos.map(p => p.id);
    const { data: productosDB, error } = await supabaseAdmin
        .from('productos')
        .select('id, nombre, stock')
        .in('id', ids);

    if (error) throw error;

    const productosSinStock = [];

    productos.forEach(productoCarrito => {
        const producto = (productosDB || []).find(p => p.id === productoCarrito.id);
        const cantidadSolicitada = parseInt(productoCarrito.cantidad);

        if (producto) {
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
    const host = req.headers.host || '';
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

// Endpoint para procesar pagos con tarjeta
app.post('/api/procesar-pago', async (req, res) => {
    try {
        console.log('Recibida solicitud de pago:', {
            token: req.body.token,
            amount: req.body.amount,
            currency: req.body.currency
        });

        if (!req.body.token || !req.body.amount || !req.body.currency) {
            return res.status(400).json({
                success: false,
                message: 'Datos de pago incompletos'
            });
        }

        const { token, amount, currency } = req.body;

        // Crear el cargo en Stripe
        const charge = await stripe.charges.create({
            amount: amount,
            currency: currency,
            source: token,
            description: 'Pago de productos Nutrigan España',
            metadata: {
                modo: 'prueba'
            }
        });

        // Guardar información del pago (simulado)
        const pedidoId = 'PED' + Date.now().toString().slice(-6);

        res.json({
            success: true,
            message: 'Pago procesado correctamente',
            chargeId: charge.id,
            pedidoId: pedidoId
        });
    } catch (error) {
        console.error('Error al procesar el pago:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al procesar el pago'
        });
    }
});

// Endpoint para crear sesión de Stripe Checkout
app.post('/api/crear-sesion-stripe', async (req, res) => {
    try {
        console.log('=== RECIBIDA PETICIÓN A /api/crear-sesion-stripe ===');
        console.log('Método:', req.method);
        console.log('URL:', req.url);
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        console.log('Content-Type:', req.get('Content-Type'));
        console.log('Origin:', req.get('Origin'));
        console.log('===============================================');

        const { productos, total, moneda = 'eur' } = req.body;

        if (!productos || productos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay productos en el carrito'
            });
        }

        // Función para generar URL completa de imagen
        function getImageUrl(imagenPath) {
            if (!imagenPath) return null;

            // Si ya es una URL completa, la devolvemos tal como está
            if (imagenPath.startsWith('http')) {
                return imagenPath;
            }

            // Para desarrollo local, usar localhost:3000
            if (req.get('host').includes('localhost') || req.get('host').includes('127.0.0.1')) {
                return `http://localhost:3000${imagenPath}`;
            }

            // Para producción, usar el dominio real
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            return `${baseUrl}${imagenPath}`;
        }

        // Convertir productos al formato de Stripe
        const lineItems = productos.map(producto => {
            // Obtener URL completa de la imagen
            const imagenUrl = getImageUrl(producto.imagen);

            console.log(`Producto: ${producto.nombre}, Imagen: ${imagenUrl}`);

            const lineItem = {
                price_data: {
                    currency: moneda,
                    product_data: {
                        name: producto.nombre,
                        description: `Cantidad: ${producto.cantidad} • Envío gratuito incluido`
                    },
                    unit_amount: Math.round((producto.precioFinal || producto.precio) * 100) // Stripe usa centavos
                },
                quantity: producto.cantidad
            };

            // Solo añadir imágenes si estamos en producción o si la URL es accesible públicamente
            const isProduction = process.env.NODE_ENV === 'production';
            const isPublicUrl = imagenUrl && !imagenUrl.includes('localhost') && !imagenUrl.includes('127.0.0.1');

            if (isProduction && isPublicUrl) {
                lineItem.price_data.product_data.images = [imagenUrl];
                console.log(`Imagen añadida para ${producto.nombre}: ${imagenUrl}`);
            } else if (!isProduction) {
                // Para desarrollo, usar imágenes públicas que Stripe puede acceder
                // Usar imágenes de ejemplo que sabemos que funcionan
                const placeholderImages = {
                    'producto2': 'https://stripe.com/img/v3/home/social.png',
                    'producto3': 'https://stripe.com/img/v3/home/social.png',
                    'producto9': 'https://stripe.com/img/v3/home/social.png',
                    'producto11': 'https://stripe.com/img/v3/home/social.png'
                };

                // Extraer el nombre del archivo de imagen
                const imageName = imagenUrl ? imagenUrl.split('/').pop().replace('.webp', '') : 'default';
                const placeholderImage = placeholderImages[imageName] || 'https://stripe.com/img/v3/home/social.png';

                lineItem.price_data.product_data.images = [placeholderImage];
                console.log(`Imagen placeholder añadida para ${producto.nombre} (desarrollo): ${placeholderImage}`);
                console.log(`LineItem completo:`, JSON.stringify(lineItem, null, 2));
            } else {
                console.log(`Imagen omitida para ${producto.nombre} (URL no pública)`);
            }

            return lineItem;
        });

        // Guardar información del pedido en localStorage del servidor (simulado)
        const pedidoInfo = {
            productos: productos,
            total: total,
            fecha: new Date().toISOString(),
            sessionId: null // Se asignará después
        };

        // Crear la sesión de Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/pago-exitoso.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.protocol}://${req.get('host')}/carrito.html`,
            metadata: {
                total: total.toString(),
                cantidad_productos: productos.length.toString(),
                productos_json: JSON.stringify(productos.map(p => ({
                    id: p.id,
                    c: p.cantidad,
                    p: p.precioFinal || p.precio
                })))
            },
            customer_creation: 'always',
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['ES']
            },
            phone_number_collection: {
                enabled: true
            },
            // Añadir mensaje personalizado
            custom_text: {
                submit: {
                    message: 'Nutrigan España - Productos de calidad para el bienestar animal. Envío gratuito incluido en todos los pedidos.'
                }
            }
        });

        // Asignar el sessionId al pedido
        pedidoInfo.sessionId = session.id;

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Error al crear sesión de Stripe:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al crear sesión de pago'
        });
    }
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

                // Reducir stock de los productos vendidos
                await reducirStock(productos);
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

// Endpoint para procesar contrareembolso
app.post('/api/procesar-contrareembolso', async (req, res) => {
    try {
        const { direccion, ciudad, codigoPostal, amount } = req.body;

        // Aquí implementarías la lógica para procesar el contrareembolso
        // Por ejemplo, crear un pedido en tu sistema con estado "pendiente de pago"

        const pedidoId = 'CR' + Date.now().toString().slice(-6);

        res.json({
            success: true,
            message: 'Pedido creado correctamente',
            pedidoId: pedidoId,
            metodoPago: 'contrareembolso'
        });
    } catch (error) {
        console.error('Error al procesar contrareembolso:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

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
            .select('id, nombre, precio, imagen')
            .in('id', ids);

        if (sbError || !productosActuales) {
            return res.status(500).json({ success: false, message: 'Error al verificar precios' });
        }

        // Crear línea de productos para Stripe con precios de Supabase
        const lineItems = productos.map(producto => {
            const actual = productosActuales.find(p => p.id === producto.id);
            if (!actual) throw new Error(`Producto ${producto.id} no encontrado`);
            const precioUnitario = actual.precio;
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
        const session = await stripe.checkout.sessions.create({
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
            // Configuración de campos de facturación
            billing_address_collection: 'required',
            // Configuración de teléfono
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
            }
        });

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

// Servir producto.html con meta tags inyectados server-side desde Supabase
const productoTemplate = fs.readFileSync(path.join(__dirname, 'producto.html'), 'utf8');

app.get('/producto.html', async (req, res) => {
    const id = parseInt(req.query.id);

    if (!id || isNaN(id)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(productoTemplate);
    }

    const { data: producto, error } = await supabaseAdmin
        .from('productos')
        .select('id, nombre, descripcion, descripcion_completa, imagen, precio, stock, especie, etapa, categoria')
        .eq('id', id)
        .single();

    if (error || !producto) {
        return res.status(404).send('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Producto no encontrado | Nutrigan España</title></head><body><h1>Producto no encontrado</h1><a href="/productos.html">Ver todos los productos</a></body></html>');
    }

    const title = `${producto.nombre} | Nutrigan España`;
    const rawDesc = (producto.descripcion_completa || producto.descripcion || '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const description = rawDesc.substring(0, 155);
    const canonical = `https://www.xn--nutriganespaa-tkb.com/producto.html?id=${id}`;
    const imageUrl = resolveImageUrl(producto.imagen);
    const disponibilidad = (parseInt(producto.stock) || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
    const precio = parseFloat(producto.precio || 0).toFixed(2);

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': producto.nombre,
        'description': rawDesc.substring(0, 500) || description,
        'image': imageUrl,
        'url': canonical,
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
    <script type="application/ld+json">${JSON.stringify(schema)}</script>`;

    const html = productoTemplate
        .replace('<title id="producto-titulo">Producto | Nutrigan España</title>', `<title id="producto-titulo">${escapeHtml(title)}</title>`)
        .replace('<!-- PRODUCT_SEO_PLACEHOLDER -->', seoTags);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

// Redirigir URLs antiguas /docs/*.pdf a la ubicación actual /assets/fichas-tecnicas/*.pdf
app.get('/docs/:filename', (req, res) => {
    res.redirect(301, '/assets/fichas-tecnicas/' + req.params.filename);
});

// Redirigir página de galería antigua a productos
app.get('/galeria.html', (req, res) => {
    res.redirect(301, '/productos.html');
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

let sitemapCache = { xml: null, expiresAt: 0 };

app.get('/sitemap.xml', async (req, res) => {
    const now = Date.now();
    if (sitemapCache.xml && now < sitemapCache.expiresAt) {
        res.setHeader('Content-Type', 'application/xml');
        return res.send(sitemapCache.xml);
    }

    const { data: productos, error } = await supabaseAdmin
        .from('productos')
        .select('id, updated_at')
        .order('id', { ascending: true });

    if (error) return res.status(500).send('Error generando sitemap');

    const today = new Date().toISOString().split('T')[0];

    const staticUrls = STATIC_PAGES.map(p => `
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
    <loc>${BASE_URL}/producto.html?id=${p.id}</loc>
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

app.get('/productos-google.xml', async (req, res) => {
    const now = Date.now();
    if (googleFeedCache.xml && now < googleFeedCache.expiresAt) {
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.send(googleFeedCache.xml);
    }

    const { data: productos, error } = await supabaseAdmin
        .from('productos')
        .select('id, nombre, descripcion, descripcion_completa, precio, imagen, categoria, especie, etapa, presentacion, peso, stock')
        .order('id', { ascending: true });

    if (error) return res.status(500).send('Error generando feed de productos');

    const items = productos.map(p => {
        const disponibilidad = (parseInt(p.stock) || 0) > 0 ? 'in stock' : 'out of stock';
        const rawDesc = p.descripcion_completa || p.descripcion || '';
        const descripcion = escapeXml(rawDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 5000));
        const imageUrl = buildImageUrl(p.imagen);
        const productType = escapeXml(buildProductType(p));

        return `
    <item>
      <g:id>${p.id}</g:id>
      <g:title>${escapeXml(p.nombre)}</g:title>
      <g:description>${descripcion}</g:description>
      <g:link>${BASE_URL}/producto.html?id=${p.id}</g:link>
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

// Middleware para servir archivos estáticos (debe ir después de las rutas de API)
app.use(express.static(path.join(__dirname)));

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log('El servidor está escuchando en todas las interfaces de red');
    console.log('Configurado para funcionar en Render');
}); 