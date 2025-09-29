require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');

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

// Lista de dominios permitidos para CORS
const whitelist = [
    'https://xn--nutriganespaa-tkb.com', 
    'https://www.xn--nutriganespaa-tkb.com',
    'https://nutriganespaña.com', 
    'https://nutriganespana.com', 
    'https://nutrigan-web.onrender.com',
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
                productos_json: JSON.stringify(productos)
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
                productos = JSON.parse(session.metadata.productos_json);
                console.log('Productos parseados:', productos);
            } catch (e) {
                console.error('Error al parsear productos:', e);
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

        // Crear línea de productos para Stripe
        const lineItems = productos.map(producto => ({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: producto.nombre,
                    description: producto.descripcion,
                    images: [`https://www.xn--nutriganespaa-tkb.com/${producto.imagen}`]
                },
                unit_amount: Math.round(producto.precio * 100) // Stripe usa centavos
            },
            quantity: producto.cantidad
        }));

        // Crear sesión de checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: 'https://www.xn--nutriganespaa-tkb.com/gracias-compra.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://www.xn--nutriganespaa-tkb.com/carrito.html',
            metadata: {
                total: total.toString(),
                cantidadTotal: cantidadTotal.toString()
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

// Middleware para servir archivos estáticos (debe ir después de las rutas de API)
app.use(express.static(path.join(__dirname)));

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log('El servidor está escuchando en todas las interfaces de red');
    console.log('Configurado para funcionar en Render');
}); 