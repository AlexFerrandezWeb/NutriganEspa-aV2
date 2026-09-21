document.addEventListener('DOMContentLoaded', function () {
    const btnHamburguesa = document.querySelector('.nav-hamburguesa');
    const menuIzquierdaMovil = document.getElementById('menu-izquierda-movil');
    const textoMenuContainer = document.querySelector('.texto-menu-container');
    const navHamburguesaContainer = document.querySelector('.nav-hamburguesa-container');

    if (btnHamburguesa && menuIzquierdaMovil) {
        btnHamburguesa.addEventListener('click', function (e) {
            e.stopPropagation();
            menuIzquierdaMovil.classList.toggle('activo');
            const expanded = btnHamburguesa.getAttribute('aria-expanded') === 'true';
            btnHamburguesa.setAttribute('aria-expanded', !expanded);
            btnHamburguesa.classList.toggle('activo');

            // Aplicar efecto de máquina sacaperras al texto
            if (textoMenuContainer) {
                if (menuIzquierdaMovil.classList.contains('activo')) {
                    textoMenuContainer.classList.add('activo');
                    // Posicionar el contenedor dentro del sidebar
                    if (navHamburguesaContainer && window.innerWidth > 576) {
                        navHamburguesaContainer.classList.add('en-sidebar');
                    }
                } else {
                    textoMenuContainer.classList.remove('activo');
                    // Quitar la clase del sidebar
                    if (navHamburguesaContainer) {
                        navHamburguesaContainer.classList.remove('en-sidebar');
                    }
                }
            }
        });

        // Cerrar el menú al pulsar un enlace
        menuIzquierdaMovil.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                menuIzquierdaMovil.classList.remove('activo');
                btnHamburguesa.setAttribute('aria-expanded', 'false');
                btnHamburguesa.classList.remove('activo');
                if (textoMenuContainer) {
                    textoMenuContainer.classList.remove('activo');
                }
                if (navHamburguesaContainer) {
                    navHamburguesaContainer.classList.remove('en-sidebar');
                }
            });
        });

        // Cerrar el menú al hacer click fuera (opcional)
        document.addEventListener('click', function (e) {
            if (
                menuIzquierdaMovil.classList.contains('activo') &&
                !menuIzquierdaMovil.contains(e.target) &&
                !btnHamburguesa.contains(e.target)
            ) {
                menuIzquierdaMovil.classList.remove('activo');
                btnHamburguesa.setAttribute('aria-expanded', 'false');
                btnHamburguesa.classList.remove('activo');
                if (textoMenuContainer) {
                    textoMenuContainer.classList.remove('activo');
                }
                if (navHamburguesaContainer) {
                    navHamburguesaContainer.classList.remove('en-sidebar');
                }
            }
        });
    }

    // Carrusel automático
    // Carrusel reutilizable
    class Carousel {
        constructor(element) {
            this.container = element;
            this.wrapper = element.querySelector('.carrusel-wrapper');
            this.slides = element.querySelectorAll('.carrusel-slide');
            this.indicatorsContainer = element.querySelector('.carrusel-indicadores');
            this.prevBtn = element.querySelector('.carrusel-prev');
            this.nextBtn = element.querySelector('.carrusel-next');

            this.itemsDesktop = parseInt(element.dataset.itemsDesktop) || 1;
            this.currentSlide = 0; // Se usará como índice de PÁGINA en modo slide
            this.interval = null;
            this.autoplayDelay = 4000;
            this.isSlideEffect = element.classList.contains('effect-slide');

            this.itemsPerView = 1;
            this.totalPages = 1;

            this.init();
        }

        init() {
            if (this.slides.length > 0) {
                this.updateConfig();
                this.bindEvents();
                this.startAutoPlay();

                if (this.isSlideEffect) {
                    this.updateSlidePosition();
                } else {
                    // Comportamiento normal (fade)
                    if (!this.container.querySelector('.carrusel-slide.active')) {
                        this.slides[0].classList.add('active');
                    }
                }

                this.updateIndicators();
                this.cargarVisiblesYSiguiente(this.currentSlide);

                // El resto se descarga cuando el navegador no tiene nada mejor
                // que hacer, para que ninguna diapositiva se quede en blanco si
                // el visitante salta directamente a ella.
                if (document.readyState === 'complete') {
                    this.cargarRestoEnReposo();
                } else {
                    window.addEventListener('load', () => this.cargarRestoEnReposo(), { once: true });
                }
            }
        }

        updateConfig() {
            // Determinar cuántos elementos se ven
            if (window.innerWidth > 768 && this.itemsDesktop > 1) {
                this.itemsPerView = this.itemsDesktop;
            } else {
                this.itemsPerView = 1;
            }

            // Calcular total de páginas
            this.totalPages = Math.ceil(this.slides.length / this.itemsPerView);

            // Ajustar índice actual si excede el nuevo total de páginas
            if (this.currentSlide >= this.totalPages) {
                this.currentSlide = 0;
            }

            this.updateIndicators();
            if (this.isSlideEffect) {
                this.updateSlidePosition();
            }
        }

        updateIndicators() {
            if (!this.indicatorsContainer) return;

            // Limpiar indicadores existentes
            this.indicatorsContainer.innerHTML = '';

            // Crear nuevos indicadores según totalPages
            for (let i = 0; i < this.totalPages; i++) {
                const span = document.createElement('span');
                span.classList.add('indicador');
                if (i === this.currentSlide) span.classList.add('active');
                span.dataset.slide = i;
                span.addEventListener('click', () => this.goToSlide(i));
                this.indicatorsContainer.appendChild(span);
            }
            this.indicators = this.indicatorsContainer.querySelectorAll('.indicador');
        }

        bindEvents() {
            // Botones de navegación
            if (this.prevBtn) {
                this.prevBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.prevSlide();
                });
            }

            if (this.nextBtn) {
                this.nextBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.nextSlide();
                });
            }

            // Pausar autoplay al hacer hover
            this.container.addEventListener('mouseenter', () => this.pauseAutoPlay());
            this.container.addEventListener('mouseleave', () => this.startAutoPlay());

            // Resize listener
            window.addEventListener('resize', () => {
                this.updateConfig();
            });
        }

        /**
         * Da src a las imagenes de una pagina del carrusel.
         *
         * Las diapositivas que no se ven se sirven con data-src en vez de src:
         * loading="lazy" no las frenaba porque el carrusel las apila todas
         * arriba del todo y el navegador las daba por visibles. Eran unos 900 KB
         * bajandose antes de que nadie los mirase.
         */
        cargarPagina(pagina) {
            const desde = pagina * this.itemsPerView;
            for (let i = desde; i < desde + this.itemsPerView && i < this.slides.length; i++) {
                this.slides[i].querySelectorAll('img[data-src]').forEach(img => {
                    if (img.dataset.srcset) {
                        img.srcset = img.dataset.srcset;
                        img.removeAttribute('data-srcset');
                    }
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                });
            }
        }

        /** La actual y la siguiente, para que al pasar ya este descargada. */
        cargarVisiblesYSiguiente(pagina) {
            this.cargarPagina(pagina);
            this.cargarPagina((pagina + 1) % Math.max(this.totalPages, 1));
        }

        /** Red de seguridad: lo que quede sin src, cuando la pagina ya esta ociosa. */
        cargarRestoEnReposo() {
            const pendientes = () => this.container.querySelectorAll('img[data-src]');
            const cargar = () => pendientes().forEach(img => {
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                    img.removeAttribute('data-srcset');
                }
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
            if ('requestIdleCallback' in window) {
                requestIdleCallback(cargar, { timeout: 6000 });
            } else {
                setTimeout(cargar, 3000);
            }
        }

        goToSlide(index) {
            // Validar índice cíclico
            let targetIndex = index;
            if (targetIndex >= this.totalPages) targetIndex = 0;
            if (targetIndex < 0) targetIndex = this.totalPages - 1;

            this.cargarVisiblesYSiguiente(targetIndex);

            if (this.isSlideEffect) {
                // Lógica para efecto Slide (por PÁGINA)
                if (this.indicators && this.indicators[this.currentSlide]) {
                    this.indicators[this.currentSlide].classList.remove('active');
                }
                this.currentSlide = targetIndex;
                this.updateSlidePosition();
                if (this.indicators && this.indicators[this.currentSlide]) {
                    this.indicators[this.currentSlide].classList.add('active');
                }
            } else {
                // Lógica original (Fade) - slide por slide
                // Nota: Fade no soporta groups, asume 1 por view
                if (this.slides[this.currentSlide]) {
                    this.slides[this.currentSlide].classList.remove('active');
                }
                if (this.indicators && this.indicators[this.currentSlide]) {
                    this.indicators[this.currentSlide].classList.remove('active');
                }

                this.currentSlide = targetIndex;

                if (this.slides[this.currentSlide]) {
                    this.slides[this.currentSlide].classList.add('active');
                }
                if (this.indicators && this.indicators[this.currentSlide]) {
                    this.indicators[this.currentSlide].classList.add('active');
                }
            }
        }

        updateSlidePosition() {
            if (this.wrapper) {
                // Desplazamiento = índice de página * 100%
                this.wrapper.style.transform = `translateX(-${this.currentSlide * 100}%)`;
            }
        }

        nextSlide() {
            this.goToSlide(this.currentSlide + 1);
        }

        prevSlide() {
            this.goToSlide(this.currentSlide - 1);
        }

        startAutoPlay() {
            // Limpiar intervalo existente por si acaso
            this.pauseAutoPlay();
            this.interval = setInterval(() => {
                this.nextSlide();
            }, this.autoplayDelay);
        }

        pauseAutoPlay() {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }
    }

    // Inicializar todos los carruseles presentes en la página
    document.querySelectorAll('.carrusel-container').forEach(container => {
        new Carousel(container);
    });

    // Los productos destacados usan enlaces nativos (<a href="/producto/<slug>">),
    // por lo que no se intercepta el click: la navegación la maneja el navegador.

    // Texto dinámico del buscador
    const buscadorTextoDinamico = document.querySelector('.buscador-texto-dinamico');
    if (buscadorTextoDinamico) {
        let estadoActual = 0;
        const estados = ['', 'estado-1', 'estado-2'];

        // Función para cambiar el estado
        function cambiarEstadoBuscador() {
            estadoActual = (estadoActual + 1) % 3;
            buscadorTextoDinamico.className = 'buscador-texto-dinamico ' + estados[estadoActual];
        }

        // Cambiar cada 3 segundos
        setInterval(cambiarEstadoBuscador, 3000);
    }

    // Funcionalidad del buscador en la página inicio
    inicializarBuscadorInicio();
});

// Función para inicializar el buscador en la página inicio
function inicializarBuscadorInicio() {
    // En productos.html, productos.js maneja la búsqueda inline sin recarga
    if (document.getElementById('productos-grid-catalogo')) return;

    const buscadorForm = document.querySelector('.nav-buscador');
    const buscadorInput = document.querySelector('.nav-buscador input[type="search"]');

    if (buscadorForm && buscadorInput) {
        // Manejar envío del formulario
        buscadorForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const termino = buscadorInput.value.trim();
            if (termino) {
                // Redirigir a productos.html con el término de búsqueda
                window.location.href = `productos.html?buscar=${encodeURIComponent(termino)}`;
            } else {
                // Si no hay término, ir a productos sin búsqueda
                window.location.href = 'productos.html';
            }
        });

        // Manejar tecla Enter
        buscadorInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const termino = this.value.trim();
                if (termino) {
                    window.location.href = `productos.html?buscar=${encodeURIComponent(termino)}`;
                } else {
                    window.location.href = 'productos.html';
                }
            }
        });
    }
}

/**
 * Contador de lo que queda de oferta en la portada.
 *
 * El bloque de oferta lo inyecta el servidor desde Supabase (renderPortadaHtml
 * en server.js), así que si está en la página es porque la oferta está vigente:
 * aquí no hay que decidir nada, sólo contar. La fecha de caducidad viaja en
 * data-promo-caduca, y así el navegador no necesita conocer la regla.
 *
 * El único caso que sigue haciendo falta cubrir es que caduque con la pestaña
 * abierta, que es cuando el bloque se retira solo.
 */
document.addEventListener('DOMContentLoaded', function () {
    var bloque = document.getElementById('promo-destacada');
    var contador = document.getElementById('promo-destacada-cuenta');
    if (!bloque || !contador || !window.NutriganPromos) return;

    var caduca = bloque.dataset.promoCaduca;

    function dosDigitos(n) {
        return n < 10 ? '0' + n : String(n);
    }

    // Mientras falten meses se cuenta en días y se calcula una sola vez al
    // cargar; sólo en las últimas 24 horas se pasa al segundero, que es cuando
    // la urgencia es real. Un contador al segundo faltando cuatro meses parece
    // un reclamo inventado y repinta la portada sin ganar nada.
    function pintar() {
        var queda = window.NutriganPromos.tiempoRestante(caduca);

        if (!queda) {
            bloque.remove();
            return false;
        }

        if (queda.modo === 'dias') {
            contador.textContent = queda.dias === 1
                ? 'Queda 1 día'
                : 'Quedan ' + queda.dias + ' días';
            contador.hidden = false;
            return false;
        }

        contador.textContent = 'Termina en ' + dosDigitos(queda.horas) + ':' +
            dosDigitos(queda.minutos) + ':' + dosDigitos(queda.segundos);
        contador.classList.add('promo-destacada-cuenta--final');
        contador.hidden = false;
        return true;
    }

    if (pintar()) {
        var tic = setInterval(function () {
            if (!pintar()) clearInterval(tic);
        }, 1000);
    }
});

/**
 * Confirmación de «añadido al carrito», compartida por la portada y el catálogo
 * (main.js se carga en las dos).
 *
 * Son tres señales a la vez a propósito, porque ninguna llega a todo el mundo:
 * la vibración solo existe en Android (Safari de iPhone no implementa
 * navigator.vibrate: en el iPhone el tacto de las apas nativas no está
 * disponible para una web), y quien tenga activado «reducir movimiento» no ve
 * volar nada. El pulso del contador siempre se ve.
 */
window.NutriganFeedback = (function () {
    function menosMovimiento() {
        return window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function vibrar() {
        // Un toque corto, no un zumbido. En iPhone no hace nada porque no existe.
        if (navigator.vibrate) {
            try { navigator.vibrate(18); } catch (e) { /* algunos navegadores lo bloquean */ }
        }
    }

    function pulsoCarrito() {
        var contador = document.getElementById('carrito-contador');
        if (!contador) return;
        contador.classList.remove('pulso-efecto');
        void contador.offsetHeight;          // reinicia la animación
        contador.classList.add('pulso-efecto');
        setTimeout(function () { contador.classList.remove('pulso-efecto'); }, 1500);
    }

    function volarAlCarrito(origen, imagen) {
        if (!origen || !imagen || menosMovimiento()) return;
        var destino = document.querySelector('.carrito-link');
        if (!destino) return;

        var desde = origen.getBoundingClientRect();
        var hasta = destino.getBoundingClientRect();

        var volador = document.createElement('div');
        volador.className = 'producto-volando';
        volador.innerHTML = '<img src="' + imagen + '" alt="" width="40" height="40" ' +
            'style="width:40px;height:40px;object-fit:cover;border-radius:6px;">';
        volador.style.left = (desde.left + desde.width / 2) + 'px';
        volador.style.top = (desde.top + desde.height / 2) + 'px';
        volador.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        document.body.appendChild(volador);

        requestAnimationFrame(function () {
            volador.style.left = (hasta.left + hasta.width / 2) + 'px';
            volador.style.top = (hasta.top + hasta.height / 2) + 'px';
            volador.style.transform = 'scale(0.3)';
            volador.style.opacity = '0.7';
        });

        setTimeout(function () {
            if (volador.parentNode) volador.parentNode.removeChild(volador);
        }, 1000);
    }

    /**
     * El boton pulsado pasa a «Añadido» y vuelve solo.
     *
     * Se congela su tamano antes de cambiar el texto: «Añadido» es mas corto
     * que «Añadir al carrito» —y de una linea en vez de dos en las tarjetas
     * estrechas—, asi que si no, el boton encoge de golpe al confirmar.
     */
    function confirmarEnBoton(boton) {
        if (!boton) return;

        if (!boton.dataset.textoOriginal) {
            boton.dataset.textoOriginal = boton.innerHTML;
        }
        if (!boton._volverTexto) {
            var caja = boton.getBoundingClientRect();
            boton.style.height = caja.height + 'px';
            boton.style.width = caja.width + 'px';
        }
        boton.innerHTML = '<i class="fas fa-check"></i> Añadido';

        clearTimeout(boton._volverTexto);
        boton._volverTexto = setTimeout(function () {
            boton.innerHTML = boton.dataset.textoOriginal;
            boton.style.height = '';
            boton.style.width = '';
            boton._volverTexto = null;
        }, 1600);
    }

    /** Todas las señales de golpe. `origen` es el botón pulsado. */
    function confirmarAnadido(origen, imagen) {
        vibrar();
        pulsoCarrito();
        volarAlCarrito(origen, imagen);
        confirmarEnBoton(origen);
    }

    return {
        vibrar: vibrar,
        pulsoCarrito: pulsoCarrito,
        volarAlCarrito: volarAlCarrito,
        confirmarEnBoton: confirmarEnBoton,
        confirmarAnadido: confirmarAnadido
    };
})();

/**
 * Botón «Añadir al carrito» de las tarjetas destacadas de la portada.
 *
 * La portada no carga carrito.js (es el guion de la página del carrito, con su
 * checkout y su Stripe), así que aquí solo se hace lo justo: escribir en la
 * misma clave de localStorage y con la misma forma que usa el catálogo, para
 * que un producto añadido desde la portada sea indistinguible de uno añadido
 * desde el listado.
 *
 * El botón vive dentro del <a> de la tarjeta, así que hay que cortar el enlace:
 * sin preventDefault, añadir al carrito te sacaba de la portada.
 */
document.addEventListener('click', function (evento) {
    var boton = evento.target.closest ? evento.target.closest('.js-anadir-carrito') : null;
    if (!boton) return;

    evento.preventDefault();
    evento.stopPropagation();

    var producto = {
        id: Number(boton.dataset.id),
        nombre: boton.dataset.nombre,
        descripcion: boton.dataset.descripcion || '',
        precio: Number(boton.dataset.precio),
        imagen: boton.dataset.imagen,
        cantidad: 1
    };

    var carrito;
    try {
        carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    } catch (e) {
        carrito = [];
    }
    if (!Array.isArray(carrito)) carrito = [];

    var yaEsta = carrito.find(function (p) { return p.id === producto.id; });
    if (yaEsta) {
        yaEsta.cantidad += 1;
    } else {
        carrito.push(producto);
    }
    localStorage.setItem('carrito', JSON.stringify(carrito));

    var contador = document.getElementById('carrito-contador');
    if (contador) {
        var total = carrito.reduce(function (suma, p) { return suma + (p.cantidad || 0); }, 0);
        contador.textContent = total;
        contador.setAttribute('data-count', total);
    }

    // El embudo de GA4 cuenta con este paso; sin él, las compras que empiezan
    // en la portada aparecerían sin su add_to_cart.
    if (window.NutriganGA) {
        window.NutriganGA.anadirAlCarrito(producto, 1);
    }

    // Vibración, vuelo al carrito, pulso del contador y «Añadido» en el botón.
    window.NutriganFeedback.confirmarAnadido(boton, producto.imagen);
});


/* --------------------------------------------------------------------------
   El botón de WhatsApp se aparta al pasar por el carrusel de la gama.

   El botón es fijo en la esquina inferior derecha y ahí tapaba una de las fotos
   de producto del carrusel «Conoce toda la gama Bolutech». En una pantalla de
   mano no hay sitio para los dos, y la foto es la que el visitante ha bajado a
   ver.

   Solo en móvil: en escritorio el carrusel no llega a esa esquina.
   -------------------------------------------------------------------------- */
(function () {
    var flotante = document.querySelector('.whatsapp-float');
    var gama = document.querySelector('.conoce-productos-section');
    if (!flotante || !gama || !('IntersectionObserver' in window)) return;

    var enPantalla = false;

    // El ancho se mira aquí y no una sola vez al arrancar: girar el móvil
    // cambia el ancho sin recargar, y el botón se quedaría escondido.
    function aplicar() {
        flotante.classList.toggle(
            'whatsapp-float--oculto',
            enPantalla && window.innerWidth <= 768
        );
    }

    // Sin margen ni umbral a propósito: el botón vive pegado al borde de abajo,
    // así que empieza a estorbar en cuanto el carrusel asoma por ahí, que es
    // justo cuando el observador lo da por visible.
    new IntersectionObserver(function (entradas) {
        enPantalla = entradas[0].isIntersecting;
        aplicar();
    }, { threshold: 0 }).observe(gama);

    window.addEventListener('resize', aplicar);
})();
