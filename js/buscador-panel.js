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

    var CATEGORIAS = [
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
    panel.innerHTML =
        '<div class="buscador-panel__chips">' +
            CATEGORIAS.map(function (c) {
                return '<a href="/productos/' + c[0] + '" class="categoria-movil-chip" data-categoria="' + c[0] + '">' + c[1] + '</a>';
            }).join('') +
        '</div>' +
        '<div class="buscador-panel__orden" role="group" aria-label="Ordenar">' +
            '<button type="button" class="buscador-panel__orden-btn activo" data-orden="recomendados">Destacados</button>' +
            '<button type="button" class="buscador-panel__orden-btn" data-orden="baratos">Más baratos</button>' +
            '<button type="button" class="buscador-panel__orden-btn" data-orden="caros">Más caros</button>' +
        '</div>' +
        '<p class="buscador-panel__titulo" id="buscador-panel-titulo">Destacados</p>' +
        '<ul class="buscador-panel__lista" id="buscador-panel-lista"></ul>' +
        '<div class="buscador-panel__pie" id="buscador-panel-pie" hidden></div>';

    nav.appendChild(panel);

    var lista = panel.querySelector('#buscador-panel-lista');
    var titulo = panel.querySelector('#buscador-panel-titulo');
    var pie = panel.querySelector('#buscador-panel-pie');

    function euros(n) {
        if (window.NutriganPromos && window.NutriganPromos.formatoEuros) {
            return window.NutriganPromos.formatoEuros(n);
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
        // El precio por unidad delante: es como compara el ganadero. El de la
        // caja debajo, que es lo que se paga.
        var unidad = p.precio_unitario
            ? '<span class="buscador-panel__unidad">' + euros(p.precio_unitario) + '/u</span>'
            : '';
        return '<li class="buscador-panel__item">' +
            '<a href="/producto/' + slug(p.nombre) + '">' +
                '<img src="' + escapar(p.imagen || 'assets/logo.png') + '" alt="" loading="lazy" decoding="async">' +
                '<span class="buscador-panel__texto">' +
                    '<span class="buscador-panel__nombre">' + escapar(p.nombre) + '</span>' +
                    '<span class="buscador-panel__precios">' + unidad +
                        '<span class="buscador-panel__caja">' + euros(p.precio) + '</span>' +
                    '</span>' +
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
        document.body.classList.add('buscador-panel-abierto');
        colocar();
        cargar();
        render();
    }

    function cerrar() {
        if (!abierto()) return;
        panel.hidden = true;
        document.body.classList.remove('buscador-panel-abierto');
        input.blur();
    }

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
