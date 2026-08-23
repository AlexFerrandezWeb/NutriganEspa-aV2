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
            unidad: 'bolo',
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

    /**
     * Lo que queda de promoción, para el contador de la home.
     *
     * Devuelve además `modo`, que decide cómo pintarlo: mientras falte más de un
     * día se cuenta en días y basta con calcularlo al cargar la página; en las
     * últimas 24 horas se pasa a horas/minutos/segundos y ahí sí tiene sentido
     * refrescarlo cada segundo. Un contador al segundo faltando meses parece un
     * reclamo falso y obliga a repintar sin motivo.
     *
     * El corte va en 24 horas y no más arriba para que el segundero nunca pase
     * de 23:59:59: un "37:59:55" se lee como 37 minutos.
     *
     * Los días se redondean hacia arriba porque la promoción vale hasta el
     * final del último día: el 31 por la mañana todavía "queda 1 día".
     */
    function tiempoRestante(promo, ahora) {
        if (!promo) return null;
        var t = (ahora instanceof Date ? ahora : new Date()).getTime();
        var restante = new Date(promo.hasta).getTime() - t;
        if (restante <= 0) return null;

        var segundos = Math.floor(restante / 1000);
        return {
            ms: restante,
            modo: restante > 24 * 3600 * 1000 ? 'dias' : 'cuentaAtras',
            dias: Math.ceil(restante / 86400000),
            horas: Math.floor(segundos / 3600),
            minutos: Math.floor((segundos % 3600) / 60),
            segundos: segundos % 60
        };
    }

    /* --------------------------------------------------------------------
       Presentacion
       Los textos de la oferta se escriben aqui y no en cada pagina: aparecen
       en la portada, en el catalogo y en la ficha, y con tres copias acabarian
       diciendo tres cosas distintas en cuanto cambie una cifra.
       -------------------------------------------------------------------- */

    /** 2.9 -> "2,90 €"; 12 -> "12 €" (sin decimales muertos). */
    function formatoEuros(n) {
        var s = parseFloat(n).toFixed(2).replace('.', ',');
        if (s.slice(-3) === ',00') s = s.slice(0, -3);
        return s + ' €';
    }

    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    /**
     * "31 de diciembre" a partir de la fecha de fin.
     * Se lee de la propia cadena ISO en vez de con toLocaleDateString sobre un
     * Date: la promo acaba a las 23:59 de la noche, y a quien tenga el
     * navegador en un huso por delante el Date le daria ya el dia siguiente.
     */
    function diaDeFin(promo) {
        var partes = String(promo.hasta).slice(0, 10).split('-');
        return parseInt(partes[2], 10) + ' de ' + MESES[parseInt(partes[1], 10) - 1];
    }

    /** "€70.00" — el formato que ya usan las tarjetas y la ficha del sitio. */
    function formatoPrecioSitio(n) {
        return '€' + parseFloat(n).toFixed(2);
    }

    /** "3,50€/U" — el formato del precio por unidad que ya usan las tarjetas. */
    function formatoUnidadSitio(n) {
        return parseFloat(n).toFixed(2).replace('.', ',') + '€/U';
    }

    /**
     * Precio por unidad con el normal tachado al lado.
     *
     * Sustituye al precio por unidad de siempre en vez de anadirse debajo: con
     * los dos a la vez la tarjeta ensenaba 3,50 €/U arriba y 2,90 €/U abajo sin
     * relacionarlos, y eso confunde mas de lo que informa.
     */
    function precioUnidadTachadoHTML(promo) {
        if (!promo) return '';
        return '<span class="precio-unidad-antes">' + formatoUnidadSitio(promo.precioUnidadNormal) + '</span>' +
            '<span class="precio-unidad-ahora">' + formatoUnidadSitio(promo.precioUnidadPromo) + '</span>';
    }

    /**
     * Precio de la caja con el normal tachado al lado.
     *
     * La condicion viaja pegada al precio y no en una nota aparte: el importe
     * rebajado solo se paga desde N cajas, y ensenarlo suelto seria a la vez
     * enganoso para quien compre una sola y una discrepancia de precio frente
     * al feed de Google Shopping, que publica el de la caja suelta.
     */
    function precioConTachadoHTML(promo) {
        if (!promo) return '';
        return '<span class="producto-precio-antes">' + formatoPrecioSitio(promo.precioCajaNormal) + '</span>' +
            '<span class="producto-precio-ahora">' + formatoPrecioSitio(promo.precioCajaPromo) + '</span>' +
            '<span class="precio-iva">IVA inc.</span>' +
            '<span class="producto-precio-condicion">desde ' + promo.cajasMinimas +
            ' cajas &middot; ahorras ' + formatoEuros(promo.descuentoPorCaja) + ' en cada caja</span>';
    }

    /** Etiqueta compacta para las tarjetas del catalogo y de la portada. */
    function etiquetaTarjetaHTML(promo) {
        if (!promo) return '';
        return '<div class="producto-promo">' +
            '<span class="producto-promo-precio">' + formatoEuros(promo.precioUnidadPromo) + '/U</span>' +
            '<span class="producto-promo-condicion">ahorras ' +
            formatoEuros(promo.descuentoPorCaja) + ' en cada caja</span>' +
            '</div>';
    }

    /** Recuadro completo para la ficha de producto, con las condiciones. */
    function cajaFichaHTML(promo) {
        if (!promo) return '';
        return '<div class="producto-promo-ficha">' +
            '<p class="producto-promo-ficha-titulo">' +
            '<i class="fas fa-tag" aria-hidden="true"></i> Oferta hasta el ' + diaDeFin(promo) +
            '</p>' +
            '<p class="producto-promo-ficha-cuerpo">' +
            'Los <strong>' + formatoEuros(promo.precioCajaPromo) + ' por caja</strong> ' +
            '(' + formatoEuros(promo.precioUnidadPromo) + ' por ' + promo.unidad + ') se aplican ' +
            'llevando <strong>' + promo.cajasMinimas + ' cajas o más</strong>. ' +
            'Con una sola caja, ' + formatoEuros(promo.precioCajaNormal) + '.' +
            '</p>' +
            '<p class="producto-promo-ficha-ahorro">' +
            'Ahorras <strong>' + formatoEuros(promo.descuentoPorCaja) + ' en cada caja</strong>. ' +
            'El descuento se aplica en el carrito.' +
            '</p>' +
            '</div>';
    }

    var api = {
        PROMOCIONES: PROMOCIONES,
        promocionDe: promocionDe,
        promocionesVigentes: promocionesVigentes,
        descuentoDeLinea: descuentoDeLinea,
        descuentoDeCarrito: descuentoDeCarrito,
        loQueFaltaParaLaPromo: loQueFaltaParaLaPromo,
        tiempoRestante: tiempoRestante,
        formatoEuros: formatoEuros,
        diaDeFin: diaDeFin,
        formatoPrecioSitio: formatoPrecioSitio,
        formatoUnidadSitio: formatoUnidadSitio,
        precioUnidadTachadoHTML: precioUnidadTachadoHTML,
        precioConTachadoHTML: precioConTachadoHTML,
        etiquetaTarjetaHTML: etiquetaTarjetaHTML,
        cajaFichaHTML: cajaFichaHTML
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.NutriganPromos = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
