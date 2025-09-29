// JavaScript para la página de Sobre Nosotros
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades de la página
    inicializarAnimaciones();
    inicializarTimeline();
    inicializarEfectosHover();
    inicializarScrollAnimations();
    
    // Efecto de parallax suave en el hero (deshabilitado temporalmente)
    // const hero = document.querySelector('.sobre-nosotros-hero');
    // if (hero) {
    //     window.addEventListener('scroll', function() {
    //         const scrolled = window.pageYOffset;
    //         const rate = scrolled * -0.1; // Reducido el efecto
    //         // Solo aplicar el efecto al contenido del hero, no a todo el hero
    //         const heroContent = hero.querySelector('.sobre-nosotros-hero-container');
    //         if (heroContent) {
    //             heroContent.style.transform = `translateY(${rate}px)`;
    //         }
    //     });
    // }
    
    // Función para inicializar animaciones
    function inicializarAnimaciones() {
        // Animación de entrada para los elementos
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observar todos los elementos de las secciones
        const elementosAnimables = document.querySelectorAll('.valor-card, .equipo-card, .instalacion-item, .video-item, .certificado-item, .timeline-item');
        elementosAnimables.forEach(elemento => {
            elemento.style.opacity = '0';
            elemento.style.transform = 'translateY(30px)';
            elemento.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            observer.observe(elemento);
        });
    }
    
    // Función para inicializar la timeline
    function inicializarTimeline() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        
        timelineItems.forEach((item, index) => {
            // Añadir delay escalonado para la animación
            item.style.animationDelay = `${index * 0.2}s`;
            
            // Efecto hover para los elementos de timeline
            item.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(10px)';
                this.style.transition = 'transform 0.3s ease';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.transform = 'translateX(0)';
            });
        });
    }
    
    // Función para inicializar efectos hover
    function inicializarEfectosHover() {
        // Efectos hover para las tarjetas de valores
        const valorCards = document.querySelectorAll('.valor-card');
        valorCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px) scale(1.02)';
                this.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
                this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            });
        });
        
        // Efectos hover para las tarjetas de equipo
        const equipoCards = document.querySelectorAll('.equipo-card');
        equipoCards.forEach(card => {
            const imagen = card.querySelector('.equipo-img');
            
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
                if (imagen) {
                    imagen.style.transform = 'scale(1.05)';
                }
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                if (imagen) {
                    imagen.style.transform = 'scale(1)';
                }
            });
        });
        
        // Efectos hover para las instalaciones
        const instalacionesItems = document.querySelectorAll('.instalacion-item');
        instalacionesItems.forEach(item => {
            const imagen = item.querySelector('.instalacion-img');
            const overlay = item.querySelector('.instalacion-overlay');
            
            item.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
                if (imagen) {
                    imagen.style.transform = 'scale(1.05)';
                }
                if (overlay) {
                    overlay.style.opacity = '1';
                }
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                if (imagen) {
                    imagen.style.transform = 'scale(1)';
                }
                if (overlay) {
                    overlay.style.opacity = '0';
                }
            });
        });
    }
    
    // Función para inicializar animaciones de scroll
    function inicializarScrollAnimations() {
        // Contador animado para estadísticas (si las hay)
        const contadores = document.querySelectorAll('.contador');
        contadores.forEach(contador => {
            const objetivo = parseInt(contador.getAttribute('data-objetivo'));
            const duracion = 2000; // 2 segundos
            const incremento = objetivo / (duracion / 16); // 60 FPS
            let actual = 0;
            
            const animarContador = setInterval(() => {
                actual += incremento;
                if (actual >= objetivo) {
                    contador.textContent = objetivo;
                    clearInterval(animarContador);
                } else {
                    contador.textContent = Math.floor(actual);
                }
            }, 16);
        });
    }
    
    // Efecto de typing para el título principal (opcional)
    const tituloHero = document.querySelector('.sobre-nosotros-hero-titulo');
    if (tituloHero) {
        // El título se muestra normalmente sin efectos especiales
        tituloHero.style.opacity = '1';
    }
    
    // Smooth scroll para enlaces internos
    const enlacesInternos = document.querySelectorAll('a[href^="#"]');
    enlacesInternos.forEach(enlace => {
        enlace.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Lazy loading para las imágenes (mejorado)
    const imagenes = document.querySelectorAll('img');
    const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                
                // Solo aplicar el efecto si la imagen no se ha cargado
                if (!img.complete) {
                    img.style.opacity = '0';
                    img.style.transition = 'opacity 0.5s ease-in-out';
                    
                    img.onload = function() {
                        img.style.opacity = '1';
                    };
                } else {
                    // Si la imagen ya está cargada, mostrarla inmediatamente
                    img.style.opacity = '1';
                }
                
                imageObserver.unobserve(img);
            }
        });
    });
    
    imagenes.forEach(img => {
        // Solo observar imágenes que no estén ya cargadas
        if (!img.complete) {
            imageObserver.observe(img);
        } else {
            // Si ya está cargada, mostrarla inmediatamente
            img.style.opacity = '1';
        }
    });
    
    // Efecto de parallax para las secciones con fondo
    const seccionesParallax = document.querySelectorAll('.valores-section, .instalaciones-section, .certificaciones-section');
    
    seccionesParallax.forEach(seccion => {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.1;
            seccion.style.backgroundPosition = `center ${rate}px`;
        });
    });
    
    // Optimización de rendimiento: throttling para eventos de scroll
    let ticking = false;
    
    function updateOnScroll() {
        // Aquí se pueden añadir efectos que dependan del scroll
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateOnScroll);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
    
    // Efecto de aparición gradual para el contenido
    const secciones = document.querySelectorAll('section');
    const seccionObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    secciones.forEach(seccion => {
        seccionObserver.observe(seccion);
    });
    
    // Preloader para la página
    window.addEventListener('load', function() {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(function() {
                preloader.style.display = 'none';
            }, 500);
        }
    });
    
    // Efecto de hover mejorado para los iconos de valores
    const iconosValores = document.querySelectorAll('.valor-icono');
    iconosValores.forEach(icono => {
        icono.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1) rotate(5deg)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        icono.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1) rotate(0deg)';
        });
    });
    
    // Animación de números en las estadísticas (si existen)
    function animarNumeros() {
        const numeros = document.querySelectorAll('.numero-estadistica');
        numeros.forEach(numero => {
            const valorFinal = parseInt(numero.textContent);
            let valorActual = 0;
            const incremento = valorFinal / 50; // 50 pasos
            
            const animacion = setInterval(() => {
                valorActual += incremento;
                if (valorActual >= valorFinal) {
                    numero.textContent = valorFinal;
                    clearInterval(animacion);
                } else {
                    numero.textContent = Math.floor(valorActual);
                }
            }, 40);
        });
    }
    
    // Llamar a la animación de números cuando sea visible
    const estadisticasSection = document.querySelector('.estadisticas-section');
    if (estadisticasSection) {
        const statsObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animarNumeros();
                    statsObserver.unobserve(entry.target);
                }
            });
        });
        
        statsObserver.observe(estadisticasSection);
    }
    
    console.log('Página Sobre Nosotros inicializada correctamente');
});
