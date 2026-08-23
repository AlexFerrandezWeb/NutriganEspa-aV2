/**
 * PROMOCIONES — regla única, compartida por navegador y servidor.
 *
 * Está en un solo fichero a propósito. El descuento tiene que pintarse en el
 * carrito y cobrarse en Stripe, y si la regla viviera en dos sitios acabarían
 * divergiendo: el cliente vería un total y pagaría otro. Aquí se declara una
 * vez y la consumen carrito.js, producto.js, main.js y server.js.
 *
 * Los precios NO se tocan en Supabase: `precio` sigue siendo el de una caja
 * suelta (70 €). Eso es deliberado — el descuento exige un mínimo de cajas, y
 * el feed de Google Shopping debe seguir publicando el precio sin condiciones.
 */
(function (global) {
    'use strict';

    var PROMOCIONES = [
        {
            id: 'flash-2cajas-2026',
            productoId: 1,
            producto: 'Bolutech® Flash',
            // Desde esta cantidad de cajas en el carrito se aplica el descuento.
            cajasMinimas: 2,
            // Euros que se descuentan por cada caja (0,60 € por bolo x 20 bolos).
            descuentoPorCaja: 12.00,
            unidadesPorCaja: 20,
            precioCajaNormal: 70.00,
            precioUnidadNormal: 3.50,
            precioCajaPromo: 58.00,
            precioUnidadPromo: 2.90,
            // Fin de la promoción: todo el 31 de diciembre entra. La hora va con
            // el desfase de la España peninsular en invierno (CET, +01:00) para
            // que el servidor no la corte antes por estar en UTC.
            hasta: '2026-12-31T23:59:59+01:00'
        }
    ];

    function estaVigente(promo, ahora) {
        var fin = new Date(promo.hasta).getTime();
        var t = (ahora instanceof Date ? ahora : new Date()).getTime();
        return t <= fin;
    }

    /** Promoción vigente de un producto, o null si no tiene o ya caducó. */
    function promocionDe(productoId, ahora) {
        var id = parseInt(productoId, 10);
        for (var i = 0; i < PROMOCIONES.length; i++) {
            if (PROMOCIONES[i].productoId === id && estaVigente(PROMOCIONES[i], ahora)) {
                return PROMOCIONES[i];
            }
        }
        return null;
    }

    /** Promociones vigentes ahora mismo (para pintar la home sin caducados). */
    function promocionesVigentes(ahora) {
        return PROMOCIONES.filter(function (p) { return estaVigente(p, ahora); });
    }

    function redondear(euros) {
        return Math.round(euros * 100) / 100;
    }

    /**
     * Descuento en euros de una línea del carrito. Devuelve 0 si el producto no
     * tiene promoción, si ya caducó o si no llega al mínimo de cajas.
     */
    function descuentoDeLinea(productoId, cantidad, ahora) {
        var promo = promocionDe(productoId, ahora);
        var cajas = parseInt(cantidad, 10) || 0;
        if (!promo || cajas < promo.cajasMinimas) return 0;
        return redondear(promo.descuentoPorCaja * cajas);
    }

    /**
     * Descuento total de un carrito. `items` son objetos con `id` y `cantidad`.
     * Devuelve el total y el desglose por línea, que es lo que necesita el
     * resumen del carrito para nombrar cada descuento.
     */
    function descuentoDeCarrito(items, ahora) {
        var lineas = [];
        var total = 0;

        (items || []).forEach(function (item) {
            var descuento = descuentoDeLinea(item.id, item.cantidad, ahora);
            if (descuento <= 0) return;
            var promo = promocionDe(item.id, ahora);
            lineas.push({
                promoId: promo.id,
                productoId: promo.productoId,
                producto: promo.producto,
                cantidad: parseInt(item.cantidad, 10),
                descuento: descuento
            });
            total += descuento;
        });

        return { total: redondear(total), lineas: lineas };
    }

    /**
     * Cajas que le faltan al cliente para entrar en la promoción, y lo que se
     * ahorraría si las añade. Sirve para el empujón del carrito ("añade 1 caja
     * más y ahorra 24 €"). Devuelve null si no aplica o si ya la tiene.
     */
    function loQueFaltaParaLaPromo(productoId, cantidad, ahora) {
        var promo = promocionDe(productoId, ahora);
        if (!promo) return null;
        var cajas = parseInt(cantidad, 10) || 0;
        if (cajas >= promo.cajasMinimas) return null;
        var faltan = promo.cajasMinimas - cajas;
        return {
            promo: promo,
            cajasQueFaltan: faltan,
            ahorroSiLasAnade: redondear(promo.descuentoPorCaja * promo.cajasMinimas)
        };
    }

    var api = {
        PROMOCIONES: PROMOCIONES,
        promocionDe: promocionDe,
        promocionesVigentes: promocionesVigentes,
        descuentoDeLinea: descuentoDeLinea,
        descuentoDeCarrito: descuentoDeCarrito,
        loQueFaltaParaLaPromo: loQueFaltaParaLaPromo
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.NutriganPromos = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
