/**
 * PROMOCIONES — regla única, compartida por navegador y servidor.
 *
 * Está en un solo fichero a propósito. El descuento tiene que pintarse en el
 * catálogo, en la ficha y en el carrito, y cobrarse en Stripe; si la regla
 * viviera en dos sitios acabarían divergiendo y el cliente vería un total y
 * pagaría otro. Aquí se declara una vez y la consumen productos.js,
 * producto.js, main.js, carrito.js y server.js.
 *
 * LOS DATOS DE LA OFERTA VIVEN EN SUPABASE, no aquí: son tres columnas de
 * `productos` que el cliente edita desde el panel de administración. Este
 * fichero solo tiene el cálculo y los textos. Las columnas son:
 *
 *   promo_cajas_minimas   INTEGER        cajas a partir de las cuales aplica
 *   promo_descuento_caja  DECIMAL(10,2)  euros de descuento por cada caja
 *   promo_hasta           DATE           último día en que la oferta es válida
 *
 * Con cualquiera de las tres a null, el producto no tiene oferta. Eso es lo
 * que devuelve también cuando las columnas todavía no existen en la base, así
 * que el sitio funciona igual antes y después de la migración.
 *
 * El precio de Supabase NO se toca: `precio` sigue siendo el de la caja
 * suelta. El descuento exige un mínimo de cajas, así que ese es el único
 * precio sin condiciones y es el que debe publicar el feed de Shopping.
 */
(function (global) {
    'use strict';

    /**
     * Momento exacto en que caduca una oferta que termina el día `hasta`.
     *
     * La columna es un DATE y la oferta vale hasta el final de ese día. El
     * desfase es el de la España peninsular en invierno (CET, +01:00) para que
     * el servidor no la corte antes por estar en UTC. En una oferta que acabara
     * en verano esto la alarga una hora de más, que es el lado seguro del
     * error: nunca deja de aplicar un descuento que la web sigue anunciando.
     */
    function finDelDia(hasta) {
        return new Date(String(hasta).slice(0, 10) + 'T23:59:59+01:00');
    }

    function ahoraMismo(ahora) {
        return ahora instanceof Date ? ahora : new Date();
    }

    function redondear(euros) {
        return Math.round(euros * 100) / 100;
    }

    /**
     * Oferta vigente de un producto de Supabase, ya con todos los importes
     * calculados. Devuelve null si no tiene, si los datos no son válidos o si
     * ya caducó.
     *
     * Valida antes de calcular porque estas cifras las teclea el cliente en el
     * panel: un descuento mayor que el precio dejaría la caja a precio negativo
     * y Stripe rechazaría el cobro por importe fuera de rango.
     */
    function promocionDe(producto, ahora) {
        if (!producto) return null;

        var cajasMinimas = parseInt(producto.promo_cajas_minimas, 10);
        var descuentoPorCaja = parseFloat(producto.promo_descuento_caja);
        var hasta = producto.promo_hasta;
        var precio = parseFloat(producto.precio);

        if (!hasta) return null;
        if (!(cajasMinimas >= 1)) return null;
        if (!(descuentoPorCaja > 0)) return null;
        if (!(precio > 0) || descuentoPorCaja >= precio) return null;
        if (finDelDia(hasta).getTime() < ahoraMismo(ahora).getTime()) return null;

        var precioCajaPromo = redondear(precio - descuentoPorCaja);

        // Unidades por caja deducidas de los dos precios que ya hay, en vez de
        // leerlas de `presentacion`: ese campo es texto libre ("Caja de 20
        // bolos") y cualquier redacción distinta rompería el cálculo.
        var precioUnidadNormal = parseFloat(producto.precio_unitario);
        var unidadesPorCaja = precioUnidadNormal > 0
            ? Math.round(precio / precioUnidadNormal)
            : 0;

        return {
            productoId: producto.id,
            producto: producto.nombre,
            cajasMinimas: cajasMinimas,
            descuentoPorCaja: redondear(descuentoPorCaja),
            hasta: hasta,
            caduca: finDelDia(hasta).toISOString(),
            precioCajaNormal: redondear(precio),
            precioCajaPromo: precioCajaPromo,
            // Sin precio unitario en Supabase no se puede dar precio por unidad;
            // el resto de la oferta (precio de caja y ahorro) sigue funcionando.
            precioUnidadNormal: unidadesPorCaja ? redondear(precioUnidadNormal) : null,
            precioUnidadPromo: unidadesPorCaja ? redondear(precioCajaPromo / unidadesPorCaja) : null,
            unidadesPorCaja: unidadesPorCaja || null
        };
    }

    /* --------------------------------------------------------------------
       Cálculo del descuento
       -------------------------------------------------------------------- */

    /**
     * Descuento en euros de una línea del carrito. Devuelve 0 si el producto no
     * tiene oferta, si ya caducó o si no llega al mínimo de cajas.
     */
    function descuentoDeLinea(producto, cantidad, ahora) {
        var promo = promocionDe(producto, ahora);
        var cajas = parseInt(cantidad, 10) || 0;
        if (!promo || cajas < promo.cajasMinimas) return 0;
        return redondear(promo.descuentoPorCaja * cajas);
    }

    /**
     * Descuento total de un carrito. `lineas` son objetos con `producto` (el
     * registro de Supabase) y `cantidad`. Devuelve el total y el desglose, que
     * es lo que necesita el resumen del carrito para nombrar cada descuento.
     */
    function descuentoDeCarrito(lineas, ahora) {
        var detalle = [];
        var total = 0;

        (lineas || []).forEach(function (linea) {
            var descuento = descuentoDeLinea(linea.producto, linea.cantidad, ahora);
            if (descuento <= 0) return;
            var promo = promocionDe(linea.producto, ahora);
            detalle.push({
                productoId: promo.productoId,
                producto: promo.producto,
                cantidad: parseInt(linea.cantidad, 10),
                descuento: descuento
            });
            total += descuento;
        });

        return { total: redondear(total), lineas: detalle };
    }

    /**
     * Cajas que le faltan al cliente para entrar en la oferta y lo que se
     * ahorraría si las añade. Sirve para el empujón del carrito ("añade 1 caja
     * más y ahorra 24 €"). Devuelve null si no aplica o si ya la tiene.
     */
    function loQueFaltaParaLaPromo(producto, cantidad, ahora) {
        var promo = promocionDe(producto, ahora);
        if (!promo) return null;
        var cajas = parseInt(cantidad, 10) || 0;
        if (cajas >= promo.cajasMinimas) return null;
        return {
            promo: promo,
            cajasQueFaltan: promo.cajasMinimas - cajas,
            ahorroSiLasAnade: redondear(promo.descuentoPorCaja * promo.cajasMinimas)
        };
    }

    /**
     * Lo que queda de oferta, para el contador de la portada.
     *
     * Devuelve además `modo`, que decide cómo pintarlo: mientras falte más de un
     * día se cuenta en días y basta con calcularlo al cargar la página; en las
     * últimas 24 horas se pasa a horas/minutos/segundos y ahí sí tiene sentido
     * refrescarlo cada segundo. Un contador al segundo faltando meses parece un
     * reclamo falso y obliga a repintar sin motivo.
     *
     * El corte va en 24 horas y no más arriba para que el contador nunca pase
     * de 23:59:59: un "37:59:55" se lee como 37 minutos.
     *
     * Los días se redondean hacia arriba porque la oferta vale hasta el final
     * del último día: el 31 por la mañana todavía "queda 1 día".
     */
    function tiempoRestante(caduca, ahora) {
        if (!caduca) return null;
        var restante = new Date(caduca).getTime() - ahoraMismo(ahora).getTime();
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
       Presentación
       Los textos de la oferta se escriben aquí y no en cada página: aparecen
       en la portada, en el catálogo y en la ficha, y con tres copias acabarían
       diciendo tres cosas distintas en cuanto cambie una cifra.
       -------------------------------------------------------------------- */

    /** 2.9 -> "2,90 €"; 12 -> "12 €" (sin decimales muertos). */
    function formatoEuros(n) {
        var s = parseFloat(n).toFixed(2).replace('.', ',');
        if (s.slice(-3) === ',00') s = s.slice(0, -3);
        return s + ' €';
    }

    /**
     * 3 -> "3,00 €". Como formatoEuros pero sin comerse los céntimos.
     *
     * Es para los importes que se enseñan emparejados con otro: en el titular
     * de la oferta, «3 €» junto a «antes 3,60 €» parecen de dos monedas
     * distintas, y comparar de un vistazo es justo lo que se le pide a ese
     * titular. Donde el importe va solo —el ahorro, el sello del descuento—
     * sigue mandando formatoEuros, que se lee mejor sin el «,00».
     */
    function formatoEurosConCentimos(n) {
        return parseFloat(n).toFixed(2).replace('.', ',') + ' €';
    }

    /** "€70.00" — el formato que ya usan las tarjetas y la ficha del sitio. */
    function formatoPrecioSitio(n) {
        return '€' + parseFloat(n).toFixed(2);
    }

    /** "3,50€/U" — el formato del precio por unidad que ya usan las tarjetas. */
    function formatoUnidadSitio(n) {
        return parseFloat(n).toFixed(2).replace('.', ',') + '€/U';
    }

    /* --------------------------------------------------------------------
       Regalo de la gama Bolutech
       --------------------------------------------------------------------

       El aplicador no es un producto de la base ni una linea del pedido: es
       una promesa que el cliente cumple al empaquetar. Aqui solo se decide
       donde se anuncia, y se anuncia con la misma frase en las tres
       superficies para que no acabe redactado de tres maneras distintas.

       La gama se reconoce por el nombre porque es lo unico que hay: no existe
       columna que la marque. Acierta con los once Bolutech de hoy, y si
       manana se anade otro entra solo. Si algun dia hace falta un Bolutech
       fuera del regalo, esto tendra que pasar a ser una columna del panel. */

    // Dos redacciones, juntas aqui para que no se separen. La de la tira dice
    // "este aplicador" porque al lado esta la foto: senala a algo que se ve. La
    // otra va sin imagen y ademas aparece en los diez Bolutech que no tienen
    // oferta encima, donde un "Y consigue este..." se quedaria colgando sin
    // nada a lo que referirse.
    var FRASE_APLICADOR = 'Aplicador de regalo con tu primera compra de la gama Bolutech.';
    var FRASE_APLICADOR_CON_FOTO = 'Y consigue este aplicador de regalo con tu primera compra de la gama Bolutech.';

    function esDeLaGamaBolutech(producto) {
        return !!producto && /bolutech/i.test(String(producto.nombre || ''));
    }

    /** true si alguna linea del carrito da derecho al aplicador. */
    function elCarritoLlevaAplicador(lineas) {
        return (lineas || []).some(esDeLaGamaBolutech);
    }

    /**
     * El aviso del aplicador. Con `conFoto` deja de ser una linea y pasa a ser
     * una tira con la imagen del producto al lado, que es como se anuncia
     * dentro del bloque de oferta de la portada: alli sustituye a la seccion
     * suelta que habia antes, asi que tiene que enseñar lo mismo que ella.
     * En la ficha y en el carrito basta la linea, que van sobradas de imagenes.
     */
    function avisoAplicadorHTML(clase, opciones) {
        var conFoto = !!(opciones && opciones.conFoto);
        var abre = conFoto
            ? '<img class="aviso-aplicador-foto" src="assets/aplicador_bolutech.jpeg" ' +
              'alt="Aplicador Bolutech" loading="lazy" decoding="async">'
            : '<i class="fas fa-gift" aria-hidden="true"></i> ';
        return '<p class="aviso-aplicador ' + (conFoto ? 'aviso-aplicador--con-foto ' : '') +
            (clase || '') + '">' + abre + '<span>' +
            (conFoto ? FRASE_APLICADOR_CON_FOTO : FRASE_APLICADOR) + '</span></p>';
    }

    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    /**
     * "31 de diciembre" a partir del último día de la oferta.
     * Se lee de la propia cadena de la columna en vez de con toLocaleDateString
     * sobre un Date: la oferta acaba de noche, y a quien tenga el navegador en
     * un huso por delante el Date le daría ya el día siguiente.
     */
    function diaDeFin(promo) {
        var partes = String(promo.hasta).slice(0, 10).split('-');
        return parseInt(partes[2], 10) + ' de ' + MESES[parseInt(partes[1], 10) - 1];
    }

    /**
     * Precio por unidad con el normal tachado al lado.
     *
     * Sustituye al precio por unidad de siempre en vez de añadirse debajo: con
     * los dos a la vez la tarjeta enseñaba 3,50 €/U arriba y 2,90 €/U abajo sin
     * relacionarlos, y eso confunde más de lo que informa.
     */
    function precioUnidadTachadoHTML(promo) {
        if (!promo || !promo.precioUnidadPromo) return '';
        return '<span class="precio-unidad-antes">' + formatoUnidadSitio(promo.precioUnidadNormal) + '</span> ' +
            '<span class="precio-unidad-ahora">' + formatoUnidadSitio(promo.precioUnidadPromo) + '</span>';
    }

    /**
     * Precio de la caja con el normal tachado al lado.
     *
     * La condición viaja pegada al precio y no en una nota aparte: el importe
     * rebajado solo se paga desde N cajas, y enseñarlo suelto sería a la vez
     * engañoso para quien compre una sola y una discrepancia de precio frente
     * al feed de Google Shopping, que publica el de la caja suelta.
     */
    function precioConTachadoHTML(promo) {
        if (!promo) return '';
        return '<span class="producto-precio-antes">' + formatoPrecioSitio(promo.precioCajaNormal) + '</span>' +
            '<span class="producto-precio-ahora">' + formatoPrecioSitio(promo.precioCajaPromo) + '</span> ' +
            '<span class="precio-iva">IVA inc.</span>' +
            '<span class="producto-precio-condicion">mínimo ' + promo.cajasMinimas +
            ' cajas &middot; ahorras ' + formatoEuros(promo.descuentoPorCaja) + ' en cada caja</span>';
    }

    /** Recuadro completo para la ficha de producto, con las condiciones. */
    function cajaFichaHTML(promo) {
        if (!promo) return '';
        var porUnidad = promo.precioUnidadPromo
            ? ' (' + formatoEuros(promo.precioUnidadPromo) + ' por unidad)'
            : '';
        return '<div class="producto-promo-ficha">' +
            '<p class="producto-promo-ficha-titulo">' +
            '<i class="fas fa-tag" aria-hidden="true"></i> Oferta hasta el ' + diaDeFin(promo) +
            '</p>' +
            '<p class="producto-promo-ficha-cuerpo">' +
            'Los <strong>' + formatoEuros(promo.precioCajaPromo) + ' por caja</strong>' + porUnidad +
            ' se aplican llevando <strong>' + promo.cajasMinimas + ' cajas o más</strong>. ' +
            'Con una sola caja, ' + formatoEuros(promo.precioCajaNormal) + '.' +
            '</p>' +
            '<p class="producto-promo-ficha-ahorro">' +
            'Ahorras <strong>' + formatoEuros(promo.descuentoPorCaja) + ' en cada caja</strong>. ' +
            'El descuento se aplica en el carrito.' +
            '</p>' +
            '</div>';
    }

    var api = {
        promocionDe: promocionDe,
        descuentoDeLinea: descuentoDeLinea,
        descuentoDeCarrito: descuentoDeCarrito,
        loQueFaltaParaLaPromo: loQueFaltaParaLaPromo,
        tiempoRestante: tiempoRestante,
        formatoEuros: formatoEuros,
        formatoEurosConCentimos: formatoEurosConCentimos,
        formatoPrecioSitio: formatoPrecioSitio,
        formatoUnidadSitio: formatoUnidadSitio,
        esDeLaGamaBolutech: esDeLaGamaBolutech,
        elCarritoLlevaAplicador: elCarritoLlevaAplicador,
        avisoAplicadorHTML: avisoAplicadorHTML,
        diaDeFin: diaDeFin,
        precioUnidadTachadoHTML: precioUnidadTachadoHTML,
        precioConTachadoHTML: precioConTachadoHTML,
        cajaFichaHTML: cajaFichaHTML
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.NutriganPromos = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
