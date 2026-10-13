/*
 * Modo táctil para cuando esta web se enseña dentro de alexweb.es/proyectos,
 * metida en un iPhone o un iPad de muestra.
 *
 * No hace nada por sí solo: se activa únicamente cuando alexweb.es (o
 * localhost, para probar) se lo pide con un mensaje. Entonces la web se maneja
 * como en una pantalla táctil, igual que el modo responsive de Chrome:
 *   - arrastrar con el ratón desplaza la página, con inercia al soltar;
 *   - el cursor es un círculo, como la yema de un dedo;
 *   - no hay barra de desplazamiento, como en un móvil;
 *   - la rueda del ratón no mueve esta web (un móvil no tiene rueda): se le
 *     pasa a alexweb.es, que mueve su propia página, como si el aparato
 *     fuera un objeto más de ella.
 * Los clics siguen funcionando; solo se anula el que llega justo después de
 * arrastrar, para no abrir nada sin querer.
 *
 * Fuera de alexweb.es este fichero no cambia nada.
 */
(function () {
    var ORIGENES = /^https?:\/\/((www\.)?alexweb\.es|localhost(:\d+)?)$/;
    var CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Ccircle cx='15' cy='15' r='12' fill='rgba(70,70,80,0.32)' stroke='rgba(255,255,255,0.9)' stroke-width='2'/%3E%3C/svg%3E\") 15 15, pointer";
    var UMBRAL = 6; // px antes de considerar que es un arrastre y no un clic

    var activo = false;
    var estilo = null;
    var toque = null; // { x, y, el } donde empezo a pulsar
    var arrastrando = false;
    var objetivo = null; // lo que se esta desplazando
    var ultX, ultY, ultT, vx, vy;
    var inercia = 0;
    var anularClic = false;
    var guardado = null; // estilos del objetivo que se tocan mientras se arrastra

    window.addEventListener('message', function (e) {
        if (!ORIGENES.test(e.origin) || !e.data || e.data.alexweb !== 'modo-tactil') return;
        activar(!!e.data.activo);
    });

    function activar(si) {
        activo = si;
        if (si && !estilo) {
            estilo = document.createElement('style');
            estilo.textContent =
                'html{scrollbar-width:none}' +
                'html::-webkit-scrollbar{display:none}' +
                // El desplazamiento suave de la web haria que el dedo fuera a
                // remolque: se mueve al instante, como en un movil.
                'html,body{scroll-behavior:auto!important}' +
                '*{cursor:' + CURSOR + '!important}';
            document.head.appendChild(estilo);
        } else if (!si && estilo) {
            estilo.parentNode.removeChild(estilo);
            estilo = null;
        }
    }

    // Lo que hay que mover: el primer contenedor con scroll en la direccion del
    // gesto (un carrusel, un menu) o, si no hay ninguno, la pagina.
    function contenedor(el, horizontal) {
        while (el && el !== document.body && el !== document.documentElement) {
            var cs = getComputedStyle(el);
            var overflow = horizontal ? cs.overflowX : cs.overflowY;
            var sobra = horizontal ? el.scrollWidth > el.clientWidth : el.scrollHeight > el.clientHeight;
            if (/(auto|scroll)/.test(overflow) && sobra) return el;
            el = el.parentElement;
        }
        return document.scrollingElement || document.documentElement;
    }

    // Mientras el dedo arrastra, el ajuste a cada tarjeta (scroll-snap) y el
    // desplazamiento suave frenarian el gesto: se quitan y se devuelven al
    // soltar. Al devolver el ajuste, el carrusel encaja solo en la tarjeta
    // mas cercana, como en un movil.
    function tomar(el) {
        var cs = getComputedStyle(el);
        guardado = {
            el: el,
            ajuste: cs.scrollSnapType && cs.scrollSnapType !== 'none',
            snap: el.style.scrollSnapType,
            suave: el.style.scrollBehavior,
        };
        el.style.scrollSnapType = 'none';
        el.style.scrollBehavior = 'auto';
    }

    function liberar() {
        if (!guardado) return;
        guardado.el.style.scrollBehavior = guardado.suave;
        guardado.el.style.scrollSnapType = guardado.snap;
        guardado = null;
    }

    function mover(dx, dy) {
        objetivo.scrollLeft -= dx;
        objetivo.scrollTop -= dy;
    }

    function soltarConInercia() {
        // Tope de velocidad: un tiron fuerte no manda la pagina al final.
        var tope = 3;
        vx = Math.max(-tope, Math.min(tope, vx));
        vy = Math.max(-tope, Math.min(tope, vy));
        var anterior = performance.now();
        function paso(ahora) {
            var dt = Math.min(32, ahora - anterior);
            anterior = ahora;
            mover(vx * dt, vy * dt);
            var friccion = Math.pow(0.994, dt);
            vx *= friccion;
            vy *= friccion;
            if (Math.abs(vx) + Math.abs(vy) > 0.02) inercia = requestAnimationFrame(paso);
            else liberar();
        }
        inercia = requestAnimationFrame(paso);
    }

    document.addEventListener('pointerdown', function (e) {
        if (!activo || e.pointerType !== 'mouse' || e.button !== 0) return;
        cancelAnimationFrame(inercia);
        liberar();
        toque = { x: e.clientX, y: e.clientY, el: e.target };
        arrastrando = false;
        ultX = e.clientX;
        ultY = e.clientY;
        ultT = performance.now();
        vx = vy = 0;
    }, true);

    document.addEventListener('pointermove', function (e) {
        if (!toque) return;
        if (!(e.buttons & 1)) { toque = null; return; }
        if (!arrastrando) {
            var totalX = e.clientX - toque.x;
            var totalY = e.clientY - toque.y;
            if (Math.abs(totalX) < UMBRAL && Math.abs(totalY) < UMBRAL) return;
            arrastrando = true;
            objetivo = contenedor(toque.el, Math.abs(totalX) > Math.abs(totalY));
            tomar(objetivo);
            document.documentElement.style.userSelect = 'none';
            if (window.getSelection) window.getSelection().removeAllRanges();
        }
        var dx = e.clientX - ultX;
        var dy = e.clientY - ultY;
        mover(dx, dy);
        var ahora = performance.now();
        var dt = Math.max(1, ahora - ultT);
        vx = 0.8 * (dx / dt) + 0.2 * vx;
        vy = 0.8 * (dy / dt) + 0.2 * vy;
        ultX = e.clientX;
        ultY = e.clientY;
        ultT = ahora;
        e.preventDefault();
    }, true);

    function terminar() {
        if (!toque) return;
        if (arrastrando) {
            anularClic = true;
            setTimeout(function () { anularClic = false; }, 50);
            document.documentElement.style.userSelect = '';
            // Un carrusel que encaja por tarjetas no lleva inercia: encaja. Y
            // si el dedo se paro antes de soltar, tampoco hay inercia.
            if (guardado && !guardado.ajuste && performance.now() - ultT < 80) soltarConInercia();
            else liberar();
        }
        toque = null;
        arrastrando = false;
    }
    document.addEventListener('pointerup', terminar, true);
    document.addEventListener('pointercancel', terminar, true);

    document.addEventListener('click', function (e) {
        if (!anularClic) return;
        anularClic = false;
        e.preventDefault();
        e.stopPropagation();
    }, true);

    window.addEventListener('wheel', function (e) {
        // Con Ctrl la rueda es el zoom del navegador: se deja en paz.
        if (!activo || e.ctrlKey) return;
        e.preventDefault();
        if (window.parent !== window) {
            window.parent.postMessage(
                { alexweb: 'rueda', dx: e.deltaX, dy: e.deltaY, modo: e.deltaMode },
                '*'
            );
        }
    }, { passive: false, capture: true });

    // El arrastre nativo de imagenes y enlaces se comeria el gesto.
    document.addEventListener('dragstart', function (e) {
        if (activo) e.preventDefault();
    }, true);
})();
