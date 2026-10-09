/**
 * DESCRIPCIONES — compartido por navegador y servidor, como promociones.js.
 *
 * En el panel solo hace falta escribir la descripción larga
 * (`descripcion_completa`). De ella sale todo lo demás:
 *
 *   - resumen(producto): la frase corta de las tarjetas del catálogo, la
 *     portada y el carrito. Es el arranque de la larga con «…», para que la
 *     tarjeta enganche con lo que el cliente encuentra en la ficha. Si un
 *     producto no tiene larga, se usa su `descripcion` corta de siempre.
 *
 *   - aHtml(texto): la larga pintada en la ficha. Admite un formato mínimo
 *     escrito en el propio texto: línea en blanco = párrafo nuevo, líneas que
 *     empiezan por «•» = lista, y una línea que acaba en «:» encima de una
 *     lista = su subtítulo. Con más de un párrafo, solo se ve el primero y el
 *     resto queda tras un botón «Ver más» (lo abre producto.js). Va en el HTML
 *     con hidden, así que Google lo sigue leyendo.
 *
 * Lo usan server.js (que pinta la ficha y las tarjetas antes del JavaScript)
 * y productos.js, producto.js y carrito.js. Al estar en un solo fichero, lo
 * que ve Google y lo que ve el cliente no pueden divergir.
 */
(function (global) {
    'use strict';

    // Lo que cabe en una tarjeta antes de que el CSS la corte a tres líneas.
    var MAX_RESUMEN = 140;

    function esc(t) {
        return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function limpiar(texto) {
        return String(texto || '').replace(/<[^>]*>/g, '').replace(/\r/g, '');
    }

    function bloques(texto) {
        return limpiar(texto).split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean);
    }

    function esItem(linea) {
        return /^[•\-]\s*/.test(linea);
    }

    // Frases enteras del primer párrafo mientras quepan. Si sobra sitio, la
    // siguiente se corta en la última pausa (dos puntos, coma, punto y coma)
    // o, si no hay, en el último espacio. Si queda texto por leer, acaba en «…».
    // Una frase acaba en punto seguido de espacio y mayúscula: así «169.000» o
    // «E.L.U.A. para…» no se parten por la mitad.
    function recortar(parrafo, max) {
        var frases = parrafo.replace(/([.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/g, '$1\u0000').split('\u0000');
        var salida = '';
        for (var i = 0; i < frases.length; i++) {
            var frase = frases[i].trim();
            var candidato = salida ? salida + ' ' + frase : frase;
            if (candidato.length <= max) { salida = candidato; continue; }
            var hueco = max - (salida ? salida.length + 1 : 0);
            if (hueco >= 40) {
                var trozo = frase.slice(0, hueco);
                var pausa = Math.max(trozo.lastIndexOf(':'), trozo.lastIndexOf(','), trozo.lastIndexOf(';'));
                var corte = pausa >= 30 ? pausa : trozo.lastIndexOf(' ');
                if (corte > 0) {
                    salida = (salida ? salida + ' ' : '') + trozo.slice(0, corte).replace(/[\s,;:]+$/, '');
                }
            }
            return salida.replace(/[.,;:]$/, '') + '…';
        }
        return salida;
    }

    function resumen(producto) {
        var completa = producto && producto.descripcion_completa;
        var primero = bloques(completa).filter(function (b) {
            return !b.split('\n').every(function (l) { return esItem(l.trim()); });
        })[0];
        if (!primero) {
            return limpiar(producto && producto.descripcion).replace(/\s+/g, ' ').trim();
        }
        var parrafo = primero.replace(/\s+/g, ' ').trim();
        var resto = bloques(completa).length > 1;
        var corto = recortar(parrafo, MAX_RESUMEN);
        // El párrafo cabía entero pero la ficha sigue: también lleva «…».
        if (resto && corto === parrafo) corto = corto.replace(/[.,;:]$/, '') + '…';
        return corto;
    }

    function aHtml(texto) {
        var html = bloques(texto).map(function (bloque) {
            var lineas = bloque.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
            var titulo = lineas.length > 1 && /:$/.test(lineas[0]) && lineas.slice(1).every(esItem)
                ? '<h3 class="descripcion-subtitulo">' + esc(lineas.shift()) + '</h3>' : '';
            if (lineas.every(esItem)) {
                return titulo + '<ul class="descripcion-lista">' + lineas.map(function (l) {
                    return '<li>' + esc(l.replace(/^[•\-]\s*/, '')) + '</li>';
                }).join('') + '</ul>';
            }
            return titulo + '<p>' + esc(lineas.join(' ')) + '</p>';
        });
        if (html.length < 2) return html.join('');
        return html[0] +
            '<div class="descripcion-mas" id="descripcion-mas" hidden>' + html.slice(1).join('') + '</div>' +
            '<button type="button" class="btn-ver-mas" aria-expanded="false" aria-controls="descripcion-mas">Ver más</button>';
    }

    var api = { resumen: resumen, aHtml: aHtml };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.NutriganDescripciones = api;

        // El botón «Ver más» lo pintan el servidor, la ficha y la ventana del
        // catálogo, que además se rehacen: por eso se escucha en el documento.
        document.addEventListener('click', function (e) {
            var boton = e.target.closest && e.target.closest('.btn-ver-mas');
            if (!boton) return;
            var resto = boton.parentNode.querySelector('.descripcion-mas');
            if (!resto) return;
            var abrir = resto.hidden;
            resto.hidden = !abrir;
            boton.setAttribute('aria-expanded', String(abrir));
            boton.textContent = abrir ? 'Ver menos' : 'Ver más';
        });
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
