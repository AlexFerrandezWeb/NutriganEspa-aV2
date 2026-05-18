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

    function applyPositions() {
        var h = nav.getBoundingClientRect().bottom;
        var bannerH = banner ? banner.offsetHeight : 0;
        if (banner) banner.style.top = h + 'px';
        if (hero && !nav.classList.contains('nav-oculta')) {
            hero.style.top = (h + bannerH - 1) + 'px';
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

    // En móvil, mover el buscador dentro del menú hamburguesa
    if (menuMovil && buscador && window.innerWidth <= 576) {
        var liBuscador = document.createElement('li');
        liBuscador.className = 'menu-li-buscador';
        liBuscador.appendChild(buscador);

        var categoriasMov = document.createElement('div');
        categoriasMov.className = 'buscador-categorias-movil';
        categoriasMov.innerHTML =
            '<div class="categorias-movil-chips">' +
            '<a href="productos.html?categoria=bovinos" class="categoria-movil-chip">Bovinos</a>' +
            '<a href="productos.html?categoria=ovinos" class="categoria-movil-chip">Ovinos</a>' +
            '<a href="productos.html?categoria=caprinos" class="categoria-movil-chip">Caprinos</a>' +
            '<a href="productos.html?categoria=porcinos" class="categoria-movil-chip">Porcinos</a>' +
            '<a href="productos.html?categoria=equinos" class="categoria-movil-chip">Equinos</a>' +
            '<a href="productos.html?categoria=perros" class="categoria-movil-chip">Perros</a>' +
            '</div>';
        liBuscador.appendChild(categoriasMov);

        menuMovil.insertBefore(liBuscador, menuMovil.firstChild);

        var liEnvio = document.createElement('li');
        liEnvio.className = 'menu-li-envio';
        liEnvio.innerHTML = '<i class="fas fa-truck"></i> Envío gratis a toda la península';
        menuMovil.appendChild(liEnvio);

        var inputMovil = buscador.querySelector('input[type="search"]');
        if (inputMovil) {
            inputMovil.setAttribute('autocomplete', 'off');
            inputMovil.setAttribute('placeholder', 'Buscar en Nutrigan España...');
            inputMovil.addEventListener('focus', function () {
                categoriasMov.classList.add('visible');
            });
            inputMovil.addEventListener('blur', function () {
                setTimeout(function () {
                    categoriasMov.classList.remove('visible');
                }, 200);
            });
        }
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
        btnLupa.addEventListener('click', function (e) {
            e.stopPropagation();
            var abierto = buscador.classList.toggle('buscador-abierto');
            btnLupa.classList.toggle('activo', abierto);
            btnLupa.setAttribute('aria-expanded', abierto);
            startTracking();
        });

        document.addEventListener('click', function (e) {
            if (!nav.contains(e.target)) cerrarBuscador();
        });
    }

    window.addEventListener('scroll', function () {
        cerrarMenuSiAbierto();
        cerrarBuscador();
    }, { passive: true });
})();
