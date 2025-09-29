document.addEventListener('DOMContentLoaded', function() {
    const btnHamburguesa = document.querySelector('.nav-hamburguesa');
    const menuIzquierdaMovil = document.getElementById('menu-izquierda-movil');
    const textoMenuContainer = document.querySelector('.texto-menu-container');
    const navHamburguesaContainer = document.querySelector('.nav-hamburguesa-container');

    if (btnHamburguesa && menuIzquierdaMovil) {
        btnHamburguesa.addEventListener('click', function(e) {
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
        menuIzquierdaMovil.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
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
        document.addEventListener('click', function(e) {
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
    const carrusel = {
        slides: document.querySelectorAll('.carrusel-slide'),
        indicators: document.querySelectorAll('.indicador'),
        prevBtn: document.querySelector('.carrusel-prev'),
        nextBtn: document.querySelector('.carrusel-next'),
        currentSlide: 0,
        interval: null,
        
        init() {
            if (this.slides.length > 0) {
                this.bindEvents();
                this.startAutoPlay();
                // Activar la primera slide
                this.slides[0].classList.add('active');
                if (this.indicators.length > 0) {
                    this.indicators[0].classList.add('active');
                }
            }
        },
        
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
            
            // Indicadores
            this.indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => this.goToSlide(index));
            });
            
            // Pausar autoplay al hacer hover
            const container = document.querySelector('.carrusel-container');
            if (container) {
                container.addEventListener('mouseenter', () => this.pauseAutoPlay());
                container.addEventListener('mouseleave', () => this.startAutoPlay());
            }
        },
        
        goToSlide(index) {
            // Remover clase active de la slide actual
            if (this.slides[this.currentSlide]) {
                this.slides[this.currentSlide].classList.remove('active');
            }
            if (this.indicators[this.currentSlide]) {
                this.indicators[this.currentSlide].classList.remove('active');
            }
            
            // Actualizar slide actual
            this.currentSlide = index;
            
            // Si llegamos al final, volver al principio
            if (this.currentSlide >= this.slides.length) {
                this.currentSlide = 0;
            }
            
            // Si vamos antes del principio, ir al final
            if (this.currentSlide < 0) {
                this.currentSlide = this.slides.length - 1;
            }
            
            // Activar nueva slide
            if (this.slides[this.currentSlide]) {
                this.slides[this.currentSlide].classList.add('active');
            }
            if (this.indicators[this.currentSlide]) {
                this.indicators[this.currentSlide].classList.add('active');
            }
        },
        
        nextSlide() {
            this.goToSlide(this.currentSlide + 1);
        },
        
        prevSlide() {
            this.goToSlide(this.currentSlide - 1);
        },
        
        startAutoPlay() {
            this.interval = setInterval(() => {
                this.nextSlide();
            }, 4000); // Cambiar cada 4 segundos
        },
        
        pauseAutoPlay() {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }
    };
    
    // Inicializar carrusel
    carrusel.init();
    
    // Manejar clicks en productos destacados
    const productoLinks = document.querySelectorAll('.producto-link');
    productoLinks.forEach(link => {
        link.addEventListener('click', function(e) {
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
        buscadorForm.addEventListener('submit', function(e) {
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
        buscadorInput.addEventListener('keypress', function(e) {
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
