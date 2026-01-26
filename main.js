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

        goToSlide(index) {
            // Validar índice cíclico
            let targetIndex = index;
            if (targetIndex >= this.totalPages) targetIndex = 0;
            if (targetIndex < 0) targetIndex = this.totalPages - 1;

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

    // Manejar clicks en productos destacados
    const productoLinks = document.querySelectorAll('.producto-link');
    productoLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            // Prevenir el comportamiento por defecto del enlace
            e.preventDefault();

            // Obtener el ID del producto desde la URL
            const href = this.getAttribute('href');
            const urlParams = new URLSearchParams(href.split('?')[1]);
            const productId = urlParams.get('id');

            // Redirigir a la página del producto con el ID
            if (productId) {
                window.location.href = `producto.html?id=${productId}`;
            }
        });
    });

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
