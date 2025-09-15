require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

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

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración CORS para producción y desarrollo
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://nutriganespaña.com', 'https://nutriganespana.com'] // Dominios de producción
    : ['*']; // Permitir todas las conexiones en desarrollo

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware para parsear JSON (debe ir antes de las rutas)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para manejar preflight requests
app.options('*', cors());

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

// Middleware para debug - capturar todas las peticiones
app.use('/api/*', (req, res, next) => {
    console.log(`=== PETICIÓN RECIBIDA ===`);
    console.log(`URL: ${req.url}`);
    console.log(`Método: ${req.method}`);
    console.log(`Headers:`, req.headers);
    console.log(`Body:`, req.body);
    console.log(`========================`);
    next();
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
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        
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
            
            // Construir URL completa usando el host de la petición
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

            // Solo añadir imágenes si la URL es válida
            if (imagenUrl) {
                lineItem.price_data.product_data.images = [imagenUrl];
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
        
        const respuesta = {
            success: true,
            pedido: {
                sessionId: session.id,
                productos: productos,
                total: session.amount_total / 100, // Stripe devuelve en centavos
                currency: session.currency,
                fecha: new Date(session.created * 1000).toISOString(),
                customer_email: session.customer_email || (session.customer_details ? session.customer_details.email : null),
                shipping_address: session.shipping_details
            }
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

// Middleware para servir archivos estáticos (debe ir después de las rutas de API)
app.use(express.static(path.join(__dirname)));

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('El servidor está escuchando en todas las interfaces de red');
}); 