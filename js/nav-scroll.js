(function () {
    var nav = document.querySelector('.nav-principal');
    if (!nav) return;

    // Fixed-position heroes (otras páginas)
    var hero = document.querySelector(
        '.feria-hero, .sobre-nosotros-hero, .carrito-hero, .producto-hero, .productos-header'
    );
    // Carrusel de index.html (position: relative, usa margin-top)
    var carrusel = document.querySelector('.carrusel-container');

    var heroOverlay = carrusel ? carrusel.querySelector('.hero-overlay') : null;
    var menuSidebar = document.querySelector('.menu-izquierda');
    var banner = document.querySelector('.banner-envio-gratis');

    /**
     * Aparta el contenido que va detrás de la barra fija del título.
     *
     * La barra es position:fixed, así que no ocupa sitio: lo que dejaba hueco
     * para ella era un margin-top escrito a mano en la hoja de estilos, uno
     * distinto por página y por tamaño de pantalla (200px, 260px, 136px...).
     * Todos daban por hecho un alto de cabecera concreto, y en cuanto la
     * cabecera creció —el buscador de móvil— la barra pasó a comerse las
     * primeras líneas del contenido en las cinco páginas que la llevan.
     *
     * Aquí se mide en vez de suponer. El margen de la hoja de estilos sigue
     * mandando como mínimo, así que sin JavaScript la página se ve como
     * siempre y en escritorio no cambia nada.
     */
    function apartarContenido(suelo) {
        var siguiente = hero.nextElementSibling;
        if (!siguiente) return;

        // Se borra el margen puesto antes para volver a leer el de la hoja de
        // estilos: si no, al cambiar de tamaño se acumularía sobre sí mismo.
        siguiente.style.marginTop = '';
        var base = parseFloat(getComputedStyle(siguiente).marginTop) || 0;
        var sinMargen = siguiente.getBoundingClientRect().top + window.pageYOffset - base;

        siguiente.style.marginTop = Math.max(base, suelo - sinMargen) + 'px';
    }

    function applyPositions() {
        var h = nav.getBoundingClientRect().bottom;
        var bannerH = banner ? banner.offsetHeight : 0;
        if (banner) banner.style.top = h + 'px';
        if (hero && !nav.classList.contains('nav-oculta')) {
            var heroTop = h + bannerH - 1;
            hero.style.top = heroTop + 'px';
            apartarContenido(heroTop + hero.offsetHeight);
        }
        if (carrusel && !nav.classList.contains('nav-oculta')) {
            carrusel.style.marginTop = (h + bannerH - 1) + 'px';
            if (heroOverlay) {
                var visibleH = Math.min(carrusel.offsetHeight, window.innerHeight - h - bannerH);
                var pb = Math.max(0, carrusel.offsetHeight - visibleH);
                heroOverlay.style.paddingBottom = pb + 'px';
                heroOverlay.style.paddingTop = '0';
            }
        }
        if (menuSidebar) {
            menuSidebar.style.top = h + 'px';
            menuSidebar.style.height = 'calc(100vh - ' + h + 'px)';
        }
    }

    // Setup inicial
    if (hero) hero.style.transition = 'none';
    applyPositions();

    // El alto de la cabecera se medía una sola vez, al cargar, y de él cuelgan
    // el banner, el hero y el menú. Pero cambia después: cuando entra la
    // tipografía web (el recuadro del buscador crece unos píxeles y el banner
    // se metía por debajo de la cabecera), al girar el móvil y al cambiar el
    // tamaño de la ventana. Hay que volver a medir en esos tres momentos.
    window.addEventListener('resize', startTracking);
    window.addEventListener('orientationchange', startTracking);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(applyPositions).catch(function () {});
    }

    var rafId = null;
    var rafStart = 0;
    var RAF_DURATION = 400;

    function startTracking() {
        if (rafId) cancelAnimationFrame(rafId);
        rafStart = performance.now();
        function step(now) {
            applyPositions();
            if (now - rafStart < RAF_DURATION) {
                rafId = requestAnimationFrame(step);
            } else {
                applyPositions();
                rafId = null;
            }
        }
        rafId = requestAnimationFrame(step);
    }

    var menuMovil      = document.getElementById('menu-izquierda-movil');
    var btnHamburguesa = document.querySelector('.nav-hamburguesa');
    var textoMenu      = document.querySelector('.texto-menu-container');
    var containerHamb  = document.querySelector('.nav-hamburguesa-container');

    function cerrarMenuSiAbierto() {
        if (!menuMovil || !menuMovil.classList.contains('activo')) return;
        menuMovil.classList.remove('activo');
        btnHamburguesa.setAttribute('aria-expanded', 'false');
        btnHamburguesa.classList.remove('activo');
        if (textoMenu)     textoMenu.classList.remove('activo');
        if (containerHamb) containerHamb.classList.remove('en-sidebar');
    }

    var buscador = document.querySelector('.nav-buscador');
    var btnLupa  = document.querySelector('.btn-lupa-buscar');

    // En móvil el buscador se queda a la vista en la cabecera, bajo el logo.
    //
    // Estuvo dentro del menú hamburguesa, y llegar a él costaba tres gestos:
    // abrir el menú, bajar y pinchar el recuadro. Para lo que es la vía más
    // corta hasta un producto, era el camino más largo de la página.
    //
    // Las categorías y los resultados los pone buscador-panel.js al tocarlo.
    if (buscador && window.innerWidth <= 576) {
        var inputMovil = buscador.querySelector('input[type="search"]');
        if (inputMovil) {
            inputMovil.setAttribute('autocomplete', 'off');
            inputMovil.setAttribute('placeholder', 'Buscar en Nutrigan España...');
        }
    }

    // El aviso de envío gratis se queda al pie del menú hamburguesa.
    if (menuMovil && window.innerWidth <= 576) {
        var liEnvio = document.createElement('li');
        liEnvio.className = 'menu-li-envio';
        liEnvio.innerHTML = '<i class="fas fa-truck"></i> Envío gratis a toda la península';
        menuMovil.appendChild(liEnvio);
    }

    function cerrarBuscador() {
        if (!buscador || !buscador.classList.contains('buscador-abierto')) return;
        buscador.classList.remove('buscador-abierto');
        if (btnLupa) {
            btnLupa.classList.remove('activo');
            btnLupa.setAttribute('aria-expanded', 'false');
        }
        startTracking();
    }

    if (btnLupa && buscador) {
        var inputBuscador = buscador.querySelector('input[type="search"]');

        btnLupa.addEventListener('click', function (e) {
            e.stopPropagation();
            var abierto = buscador.classList.toggle('buscador-abierto');
            btnLupa.classList.toggle('activo', abierto);
            btnLupa.setAttribute('aria-expanded', abierto);

            // Quien pulsa la lupa quiere escribir, no ver aparecer un recuadro
            // vacio y tener que pincharlo aparte.
            //
            // preventScroll no es un adorno: al dar el foco, el navegador lleva
            // la vista al input, y ese desplazamiento dispara el listener de
            // scroll de aqui abajo, que cierra el buscador recien abierto.
            if (abierto && inputBuscador) inputBuscador.focus({ preventScroll: true });

            startTracking();
        });

        document.addEventListener('click', function (e) {
            if (!nav.contains(e.target)) cerrarBuscador();
        });
    }

    window.addEventListener('scroll', function () {
        // No cerrar si el foco está dentro del menú (evita cierre por zoom iOS en inputs)
        if (menuMovil && menuMovil.contains(document.activeElement)) return;
        cerrarMenuSiAbierto();
        cerrarBuscador();
    }, { passive: true });
})();
