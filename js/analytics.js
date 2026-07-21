// Eventos de ecommerce para GA4 (gtag.js).
// gtag() se define en el <head> de cada página, así que aquí basta con
// comprobar que exista antes de enviar nada.
//
// Este fichero debe cargarse ANTES de producto.js / productos.js / carrito.js.

(function () {
    const CLAVE_PEDIDO_PENDIENTE = 'pedidoPendiente';
    const CLAVE_COMPRAS_ENVIADAS = 'comprasEnviadas';
    const MONEDA = 'EUR';

    function enviar(nombre, parametros) {
        if (typeof gtag !== 'function') {
            console.warn('[GA4] gtag no disponible, evento omitido:', nombre);
            return;
        }
        gtag('event', nombre, parametros);
    }

    function leerJSON(clave, porDefecto) {
        try {
            return JSON.parse(localStorage.getItem(clave)) || porDefecto;
        } catch (e) {
            return porDefecto;
        }
    }

    // Normaliza un producto (del carrito o de Supabase) al formato de item de GA4.
    // Ojo: en el carrito, `precio` es el importe de la línea (unitario x cantidad),
    // por eso el precio unitario se busca primero en `precioUnitario`.
    function aItem(producto, indice) {
        const cantidad = parseInt(producto.cantidad) || 1;
        const precioUnitario = parseFloat(
            producto.precioUnitario || producto.precio_unitario || producto.precio
        ) || 0;

        const item = {
            item_id: String(producto.id || producto.gtin || 'item_' + indice),
            item_name: producto.nombre || 'Producto sin nombre',
            price: Number(precioUnitario.toFixed(2)),
            quantity: cantidad
        };

        if (producto.categoria) {
            item.item_category = producto.categoria;
        }

        return item;
    }

    function aItems(productos) {
        return (productos || []).map(aItem);
    }

    function sumarItems(items) {
        const total = items.reduce(function (suma, item) {
            return suma + item.price * item.quantity;
        }, 0);
        return Number(total.toFixed(2));
    }

    window.NutriganGA = {
        // Ficha de producto abierta.
        verProducto: function (producto) {
            if (!producto) return;
            const items = aItems([producto]);
            enviar('view_item', {
                currency: MONEDA,
                value: sumarItems(items),
                items: items
            });
        },

        // Producto añadido al carrito. `cantidad` sobrescribe la del producto.
        anadirAlCarrito: function (producto, cantidad) {
            if (!producto) return;
            const items = aItems([
                Object.assign({}, producto, { cantidad: cantidad || producto.cantidad || 1 })
            ]);
            enviar('add_to_cart', {
                currency: MONEDA,
                value: sumarItems(items),
                items: items
            });
        },

        // Salida hacia Stripe. Además de enviar begin_checkout, guarda el pedido
        // para poder reconstruir el purchase al volver de la pasarela: el carrito
        // se vacía por el camino y la página de éxito se queda sin datos.
        iniciarCheckout: function (productos, total) {
            const items = aItems(productos);
            const valor = typeof total === 'number' ? Number(total.toFixed(2)) : sumarItems(items);

            try {
                localStorage.setItem(CLAVE_PEDIDO_PENDIENTE, JSON.stringify({
                    items: items,
                    total: valor,
                    fecha: new Date().toISOString()
                }));
            } catch (e) {
                console.warn('[GA4] No se pudo guardar el pedido pendiente:', e);
            }

            enviar('begin_checkout', {
                currency: MONEDA,
                value: valor,
                items: items
            });
        },

        // Compra confirmada. Se llama desde las páginas de éxito.
        // `transactionId` debe ser estable (session_id de Stripe o nº de pedido)
        // para que una recarga de la página no duplique la conversión.
        registrarCompra: function (transactionId, datos) {
            if (!transactionId) {
                console.warn('[GA4] purchase sin transaction_id, evento omitido');
                return false;
            }

            const enviadas = leerJSON(CLAVE_COMPRAS_ENVIADAS, []);
            if (enviadas.indexOf(transactionId) !== -1) {
                return false;
            }

            const pendiente = (datos && datos.items) ? datos : leerJSON(CLAVE_PEDIDO_PENDIENTE, null);
            if (!pendiente || !pendiente.items || pendiente.items.length === 0) {
                console.warn('[GA4] purchase sin líneas de pedido, evento omitido');
                return false;
            }

            const items = pendiente.items;
            const valor = typeof pendiente.total === 'number' ? pendiente.total : sumarItems(items);

            enviar('purchase', {
                transaction_id: transactionId,
                currency: MONEDA,
                value: valor,
                items: items
            });

            // Solo se recuerdan las últimas compras: es un candado antiduplicados,
            // no un histórico.
            enviadas.push(transactionId);
            try {
                localStorage.setItem(CLAVE_COMPRAS_ENVIADAS, JSON.stringify(enviadas.slice(-20)));
                localStorage.removeItem(CLAVE_PEDIDO_PENDIENTE);
            } catch (e) {
                console.warn('[GA4] No se pudo actualizar el estado de compras:', e);
            }

            return true;
        },

        // Clic en el botón de WhatsApp. Es un lead de contacto, no una venta,
        // así que va como evento propio (candidato a evento clave en GA4).
        clicWhatsapp: function (origen) {
            enviar('whatsapp_click', {
                link_url: 'https://wa.me/34626983042',
                origen: origen || 'desconocido'
            });
        },

        // Expuesto para las páginas de éxito que ya tienen sus propios datos
        // de pedido en localStorage (contrareembolso).
        aItems: aItems
    };

    // Captura los clics de WhatsApp en toda la web mediante delegación en
    // document, para no depender del orden de carga ni instrumentar cada botón.
    // Cubre tanto el botón flotante (.whatsapp-float) como cualquier enlace wa.me.
    document.addEventListener('click', function (evento) {
        const enlace = evento.target.closest('a[href*="wa.me"], .whatsapp-float');
        if (!enlace) return;

        const origen = enlace.classList.contains('whatsapp-float')
            ? 'boton_flotante'
            : 'enlace';
        window.NutriganGA.clicWhatsapp(origen);
    });
})();
