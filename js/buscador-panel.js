/* --------------------------------------------------------------------------
   Panel de búsqueda de móvil.

   Al tocar el recuadro de la cabecera se abre a pantalla completa: categorías,
   orden por precio y los productos debajo, filtrándose según se escribe. Antes
   había que escribir a ciegas y pulsar Enter para salir de la página y ver si
   había algo; ahora los resultados se ven mientras se teclea.

   Sin escribir nada enseña los destacados, que son los que el cliente marca
   desde el panel de administración: así la lista se mantiene sola.

   Solo en móvil. En escritorio la lupa ya abre la barra en un clic y hay sitio
   de sobra para el catálogo.
   -------------------------------------------------------------------------- */
(function () {
    'use strict';

    var MOVIL = 576;
    if (window.innerWidth > MOVIL) return;

    var buscador = document.querySelector('.nav-buscador');
    var input = buscador && buscador.querySelector('input[type="search"]');
    var nav = document.querySelector('.nav-principal');
    if (!buscador || !input || !nav) return;

    // El "Todos" primero: sin él, quien filtra por una categoría no tiene forma
    // evidente de volver al catálogo entero. Su slug vacío es el estado de
    // partida del panel, así que aparece marcado desde el principio.
    var CATEGORIAS = [
        ['', 'Todos'],
        ['bovinos', 'Bovinos'], ['ovinos', 'Ovinos'], ['caprinos', 'Caprinos'],
        ['porcinos', 'Porcinos'], ['equinos', 'Equinos'], ['perros', 'Perros']
    ];

    var CLAVE_CACHE = 'nutrigan_productos_panel';
    var VIDA_CACHE = 5 * 60 * 1000;

    var productos = null;
    var cargando = false;
    var orden = 'recomendados';
    var categoria = '';

    // ── Pintado ──────────────────────────────────────────────────────────

    var panel = document.createElement('div');
    panel.className = 'buscador-panel';
    panel.id = 'buscador-panel';
    panel.hidden = true;
    // Categorías y orden van juntos en un bloque que se queda pegado arriba: son
    // los mandos del panel, y al rodar la lista tienen que seguir a mano en vez
    // de irse por arriba y obligar a volver al principio para cambiar de filtro.
    panel.innerHTML =
        '<div class="buscador-panel__fijo">' +
            '<div class="buscador-panel__chips">' +
                CATEGORIAS.map(function (c) {
                    var destino = c[0] ? '/productos/' + c[0] : '/productos.html';
                    return '<a href="' + destino + '" class="categoria-movil-chip' +
                           (c[0] ? '' : ' activo') + '" data-categoria="' + c[0] + '">' + c[1] + '</a>';
                }).join('') +
            '</div>' +
            '<div class="buscador-panel__orden" role="group" aria-label="Ordenar">' +
                '<button type="button" class="buscador-panel__orden-btn activo" data-orden="recomendados">Destacados</button>' +
                '<button type="button" class="buscador-panel__orden-btn" data-orden="baratos">Más baratos</button>' +
                '<button type="button" class="buscador-panel__orden-btn" data-orden="caros">Más caros</button>' +
            '</div>' +
        '</div>' +
        '<p class="buscador-panel__titulo" id="buscador-panel-titulo">Destacados</p>' +
        '<ul class="buscador-panel__lista" id="buscador-panel-lista"></ul>' +
        '<div class="buscador-panel__pie" id="buscador-panel-pie" hidden></div>';

    nav.appendChild(panel);

    /**
     * La X para salir.
     *
     * El panel se cerraba con Escape, que en un movil no existe, o enviando la
     * busqueda: quien lo abria sin querer se quedaba dentro. La X del campo
     * `type=search` no vale para esto, porque solo aparece si hay texto escrito
     * y solo borra lo escrito; esta cierra el panel siempre.
     */
    var botonCerrar = document.createElement('button');
    botonCerrar.type = 'button';
    botonCerrar.className = 'buscador-cerrar';
    botonCerrar.setAttribute('aria-label', 'Cerrar el buscador');
    botonCerrar.hidden = true;
    botonCerrar.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
    (buscador.querySelector('.buscador-input-container') || buscador).appendChild(botonCerrar);

    var lista = panel.querySelector('#buscador-panel-lista');
    var titulo = panel.querySelector('#buscador-panel-titulo');
    var pie = panel.querySelector('#buscador-panel-pie');

    /**
     * Siempre con centimos, tambien los redondos: "3,00 €" y no "3 €".
     *
     * En una lista los precios se leen en columna y se comparan de un vistazo;
     * con unos a dos decimales y otros a ninguno, la columna queda dentada. Y
     * junto a su tachado, «3 €» al lado de «3,60 €» parecen de dos monedas
     * distintas. Es el motivo por el que promociones.js ya tenia una version
     * con centimos aparte de la corriente.
     */
    function euros(n) {
        if (window.NutriganPromos && window.NutriganPromos.formatoEurosConCentimos) {
            return window.NutriganPromos.formatoEurosConCentimos(n);
        }
        // El panel vive en las 12 páginas y promociones.js solo en cuatro, así
        // que aquí hace falta saber separar los miles por cuenta propia.
        var partes = Math.abs(parseFloat(n) || 0).toFixed(2).split('.');
        return partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + partes[1] + ' €';
    }

    /** Igual que el slug de productos.js y server.js: la URL de la ficha. */
    function slug(str) {
        return String(str || '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[®™©]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function escapar(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function filaHtml(p) {
        var promo = window.NutriganPromos && window.NutriganPromos.promocionDe
            ? window.NutriganPromos.promocionDe(p)
            : null;

        // El precio por unidad delante: es como compara el ganadero. El de la
        // caja detrás, que es lo que se paga. Con oferta viva, el rebajado
        // sustituye al normal y el normal se queda tachado al lado, igual que
        // en las tarjetas del catálogo.
        var unidad = '';
        if (promo && promo.precioUnidadPromo) {
            unidad = '<span class="buscador-panel__unidad">' + euros(promo.precioUnidadPromo) + '/u</span>' +
                     '<s class="buscador-panel__antes">' + euros(promo.precioUnidadNormal) + '/u</s>';
        } else if (p.precio_unitario) {
            unidad = '<span class="buscador-panel__unidad">' + euros(p.precio_unitario) + '/u</span>';
        }

        var caja = promo
            ? '<span class="buscador-panel__caja">' + euros(promo.precioCajaPromo) + '</span>' +
              '<s class="buscador-panel__antes">' + euros(promo.precioCajaNormal) + '</s>'
            : '<span class="buscador-panel__caja">' + euros(p.precio) + '</span>';

        // La condición va pegada al precio, nunca suelta: los 60 € solo se
        // pagan desde N cajas, y anunciarlos a secas engaña a quien compre una
        // sola y contradice al feed de Google Shopping, que publica el suelto.
        var condicion = promo
            ? '<span class="buscador-panel__condicion">Oferta desde ' + promo.cajasMinimas + ' cajas</span>'
            : '';

        return '<li class="buscador-panel__item' + (promo ? ' buscador-panel__item--oferta' : '') + '">' +
            '<a href="/producto/' + slug(p.nombre) + '">' +
                '<img src="' + escapar(p.imagen || 'assets/logo.png') + '" alt="" loading="lazy" decoding="async">' +
                '<span class="buscador-panel__texto">' +
                    '<span class="buscador-panel__nombre">' + escapar(p.nombre) + '</span>' +
                    '<span class="buscador-panel__precios">' + unidad + caja + '</span>' +
                    condicion +
                '</span>' +
            '</a>' +
        '</li>';
    }

    function mensaje(texto) {
        lista.innerHTML = '<li class="buscador-panel__vacio">' + escapar(texto) + '</li>';
        pie.hidden = true;
    }

    // ── Qué se enseña ────────────────────────────────────────────────────

    function ordenar(lst, consulta) {
        if (orden === 'baratos') return lst.slice().sort(function (a, b) { return a.precio - b.precio; });
        if (orden === 'caros')   return lst.slice().sort(function (a, b) { return b.precio - a.precio; });
        // "Recomendados": buscando manda el acierto, que ya viene ordenado;
        // sin buscar, los destacados primero.
        if (consulta) return lst;
        return lst.slice().sort(function (a, b) {
            return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0);
        });
    }

    function render() {
        if (!productos) {
            mensaje(cargando ? 'Cargando productos...' : 'No se pudieron cargar los productos.');
            return;
        }

        var consulta = input.value.trim();
        var lst = productos.filter(function (p) { return p.disponible !== false; });

        if (categoria) {
            lst = lst.filter(function (p) {
                return String(p.categoria || '').toLowerCase().split(',').some(function (c) {
                    c = c.trim();
                    return c === categoria || (c === 'caprino' && categoria === 'caprinos');
                });
            });
        }

        if (consulta) {
            var B = window.NutriganBusqueda;
            if (B) {
                lst = lst.map(function (p) { return { p: p, puntos: B.puntuar(p, consulta) }; })
                         .filter(function (x) { return x.puntos !== null; })
                         .sort(function (a, b) { return a.puntos - b.puntos; })
                         .map(function (x) { return x.p; });
            } else {
                var t = consulta.toLowerCase();
                lst = lst.filter(function (p) { return String(p.nombre).toLowerCase().indexOf(t) >= 0; });
            }
        }

        lst = ordenar(lst, consulta);

        titulo.textContent = consulta
            ? lst.length + (lst.length === 1 ? ' resultado' : ' resultados')
            : (categoria ? 'En esta categoría' : 'Destacados');

        if (!lst.length) {
            mensaje(consulta ? 'No hay productos para "' + consulta + '".' : 'No hay productos en esta categoría.');
            return;
        }

        // Sin buscar no se vuelca el catálogo entero: son los recomendados.
        var recorte = (!consulta && !categoria && orden === 'recomendados') ? lst.slice(0, 6) : lst;
        lista.innerHTML = recorte.map(filaHtml).join('');

        if (consulta) {
            pie.innerHTML = '<a href="/productos.html?buscar=' + encodeURIComponent(consulta) + '">' +
                'Ver todos los resultados en el catálogo</a>';
            pie.hidden = false;
        } else {
            pie.innerHTML = '<a href="/productos.html">Ver el catálogo completo</a>';
            pie.hidden = false;
        }
    }

    // ── Datos ────────────────────────────────────────────────────────────

    function deLaCache() {
        try {
            var crudo = sessionStorage.getItem(CLAVE_CACHE);
            if (!crudo) return null;
            var guardado = JSON.parse(crudo);
            if (!guardado || Date.now() > guardado.caduca) return null;
            return guardado.productos;
        } catch (e) {
            // Ventana privada o almacenamiento bloqueado: se pide a la red.
            return null;
        }
    }

    function cargar() {
        if (productos || cargando) return;

        var guardados = deLaCache();
        if (guardados) { productos = guardados; render(); return; }

        cargando = true;
        render();
        fetch('/api/productos')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d || !d.success || !d.productos) throw new Error('respuesta inesperada');
                productos = d.productos;
                try {
                    sessionStorage.setItem(CLAVE_CACHE, JSON.stringify({
                        productos: productos, caduca: Date.now() + VIDA_CACHE
                    }));
                } catch (e) { /* sin sitio o bloqueado: da igual, es un atajo */ }
            })
            .catch(function (e) {
                console.error('No se pudieron cargar los productos del buscador:', e.message);
            })
            .finally(function () { cargando = false; render(); });
    }

    // ── Abrir y cerrar ───────────────────────────────────────────────────

    function colocar() {
        // Justo debajo de la cabecera, que cambia de alto al abrirse el panel.
        panel.style.top = Math.round(nav.getBoundingClientRect().bottom) + 'px';
    }

    function abierto() { return !panel.hidden; }

    function abrir() {
        if (abierto()) return;
        panel.hidden = false;
        botonCerrar.hidden = false;
        document.body.classList.add('buscador-panel-abierto');
        colocar();
        cargar();
        render();
    }

    function cerrar() {
        if (!abierto()) return;
        panel.hidden = true;
        botonCerrar.hidden = true;
        document.body.classList.remove('buscador-panel-abierto');
        input.blur();
    }

    botonCerrar.addEventListener('click', function (e) {
        e.preventDefault();
        // Se limpia lo escrito: dejarlo puesto hace que al volver a tocar el
        // campo reaparezca una busqueda vieja que nadie pidio.
        input.value = '';
        categoria = '';
        marcarChips();
        cerrar();
    });

    input.addEventListener('focus', abrir);
    input.addEventListener('click', abrir);
    input.addEventListener('input', function () {
        // Escribir manda sobre la categoría: si no, se busca dentro de un
        // filtro que se puso hace tres pantallas y no se ve.
        categoria = '';
        marcarChips();
        render();
    });

    // Escape cierra, como cualquier capa a pantalla completa.
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && abierto()) cerrar();
    });

    // Enviar el formulario lleva al catálogo: el panel sobra ya.
    buscador.addEventListener('submit', cerrar);

    window.addEventListener('resize', function () {
        if (window.innerWidth > MOVIL) cerrar();
        else if (abierto()) colocar();
    });
    window.addEventListener('orientationchange', colocar);

    // ── Controles ────────────────────────────────────────────────────────

    function marcarChips() {
        panel.querySelectorAll('.categoria-movil-chip').forEach(function (chip) {
            chip.classList.toggle('activo', chip.getAttribute('data-categoria') === categoria);
        });
    }

    panel.querySelectorAll('.categoria-movil-chip').forEach(function (chip) {
        chip.addEventListener('click', function (e) {
            // Son enlaces de verdad a /productos/<categoria>, así funcionan sin
            // JavaScript y se pueden abrir en otra pestaña; con él, filtran aquí
            // mismo sin sacar a nadie de la página.
            e.preventDefault();
            var suya = chip.getAttribute('data-categoria');
            categoria = (categoria === suya) ? '' : suya;
            marcarChips();
            render();
        });
    });

    panel.querySelectorAll('.buscador-panel__orden-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            orden = btn.getAttribute('data-orden');
            panel.querySelectorAll('.buscador-panel__orden-btn').forEach(function (o) {
                o.classList.toggle('activo', o === btn);
            });
            render();
        });
    });
})();
