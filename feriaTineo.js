// JavaScript para la página de Feria de Tineo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades de la galería
    inicializarFiltrosGaleria();
    inicializarModalGaleria();
    
    // Configurar datos de la galería
    const datosGaleria = {
        'feria1': {
            titulo: 'Feria de Tineo 2025',
            descripcion: 'Stand principal de Nutrigan España con todos nuestros productos de nutrición animal expuestos para los visitantes.',
            imagen: 'assets/feria1.webp'
        },
        'feria2': {
            titulo: 'Productos en Exposición',
            descripcion: 'Gama completa de suplementos nutricionales Bolutech, incluyendo Flash, Activ y Heel, presentados en nuestro stand.',
            imagen: 'assets/feria2.webp'
        },
        'feria3': {
            titulo: 'Visitantes en el Stand',
            descripcion: 'Ganaderos y profesionales del sector visitando nuestro stand para conocer nuestros productos y recibir asesoramiento técnico.',
            imagen: 'assets/feria3.webp'
        },
        'feria4': {
            titulo: 'Demostración de Productos',
            descripcion: 'Nuestro equipo técnico explicando las características y beneficios de nuestros suplementos nutricionales a los visitantes.',
            imagen: 'assets/feria4.webp'
        },
        'feria5': {
            titulo: 'Equipo Nutrigan en la Feria',
            descripcion: 'Todo nuestro equipo de profesionales participando activamente en la Feria de Tineo 2025.',
            imagen: 'assets/feria5.webp'
        },
        'feria6': {
            titulo: 'Certificados y Premios',
            descripcion: 'Exposición de nuestros certificados de calidad y premios obtenidos por la excelencia en nutrición animal.',
            imagen: 'assets/feria6.webp'
        },
        'feria7': {
            titulo: 'Feria de Tineo 2025',
            descripcion: 'Momentos destacados de nuestra participación en la feria, mostrando la actividad y el interés de los visitantes.',
            imagen: 'assets/feria7.webp'
        },
        'feria8': {
            titulo: 'Productos Nutrigan',
            descripcion: 'Exposición detallada de nuestra gama completa de productos de nutrición animal en el stand.',
            imagen: 'assets/feria8.webp'
        },
        'feria9': {
            titulo: 'Stand Nutrigan',
            descripcion: 'Nuestro espacio en la Feria de Tineo, diseñado para ofrecer la mejor experiencia a nuestros visitantes.',
            imagen: 'assets/feria9.webp'
        }
    };
    
    // Función para inicializar los filtros de la galería
    function inicializarFiltrosGaleria() {
        const botonesFiltro = document.querySelectorAll('.filtro-galeria-btn');
        const itemsGaleria = document.querySelectorAll('.galeria-item');
        
        botonesFiltro.forEach(boton => {
            boton.addEventListener('click', function() {
                // Remover clase activa de todos los botones
                botonesFiltro.forEach(btn => btn.classList.remove('activo'));
                // Añadir clase activa al botón clickeado
                this.classList.add('activo');
                
                const filtro = this.getAttribute('data-filtro');
                
                // Filtrar elementos de la galería
                itemsGaleria.forEach(item => {
                    const categoria = item.getAttribute('data-categoria');
                    
                    if (filtro === 'todos' || categoria.includes(filtro)) {
                        item.style.display = 'block';
                        // Añadir animación de entrada
                        item.style.animation = 'fadeInUp 0.6s ease-out';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }
    
    // Función para inicializar el modal de la galería
    function inicializarModalGaleria() {
        const modal = document.getElementById('modalGaleria');
        const modalImagen = document.getElementById('modalImagen');
        const modalTitulo = document.getElementById('modalTitulo');
        const modalDescripcion = document.getElementById('modalDescripcion');
        
        // Cerrar modal al hacer clic fuera del contenido
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModal();
            }
        });
        
        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('activo')) {
                cerrarModal();
            }
        });
    }
    
    // Función para abrir el modal con la imagen seleccionada
    window.abrirModal = function(idImagen) {
        const modal = document.getElementById('modalGaleria');
        const modalImagen = document.getElementById('modalImagen');
        const modalTitulo = document.getElementById('modalTitulo');
        const modalDescripcion = document.getElementById('modalDescripcion');
        
        // Obtener datos de la imagen
        const datos = datosGaleria[idImagen];
        if (datos) {
            modalImagen.src = datos.imagen;
            modalImagen.alt = datos.titulo;
            modalTitulo.textContent = datos.titulo;
            modalDescripcion.textContent = datos.descripcion;
            
            // Mostrar modal
            modal.classList.add('activo');
            document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        }
    };
    
    // Función para cerrar el modal
    window.cerrarModal = function() {
        const modal = document.getElementById('modalGaleria');
        modal.classList.remove('activo');
        document.body.style.overflow = 'auto'; // Restaurar scroll del body
    };
    
    // Hero fijo - sin efecto parallax para mantener position: fixed
    
    // Animación de entrada para los elementos de la galería
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
    
    // Observar todos los elementos de la galería
    const galeriaItems = document.querySelectorAll('.galeria-item');
    galeriaItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(item);
    });
    
    // Efecto de hover mejorado para los botones de filtro
    const filtrosBotones = document.querySelectorAll('.filtro-galeria-btn');
    filtrosBotones.forEach(boton => {
        boton.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.05)';
        });
        
        boton.addEventListener('mouseleave', function() {
            if (!this.classList.contains('activo')) {
                this.style.transform = 'translateY(0) scale(1)';
            }
        });
    });
    
    // Lazy loading para las imágenes de la galería (mejorado)
    const imagenesGaleria = document.querySelectorAll('.galeria-imagen');
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
    
    imagenesGaleria.forEach(img => {
        // Solo observar imágenes que no estén ya cargadas
        if (!img.complete) {
            imageObserver.observe(img);
        } else {
            // Si ya está cargada, mostrarla inmediatamente
            img.style.opacity = '1';
        }
    });
    
    // Efecto de zoom suave en las imágenes al hacer hover
    const contenedoresImagen = document.querySelectorAll('.galeria-imagen-container');
    contenedoresImagen.forEach(contenedor => {
        const imagen = contenedor.querySelector('.galeria-imagen');
        
        contenedor.addEventListener('mouseenter', function() {
            imagen.style.transform = 'scale(1.1)';
        });
        
        contenedor.addEventListener('mouseleave', function() {
            imagen.style.transform = 'scale(1)';
        });
    });
    
    // Contador de elementos visibles en la galería
    function actualizarContadorGaleria() {
        const itemsVisibles = document.querySelectorAll('.galeria-item[style*="display: block"], .galeria-item:not([style*="display: none"])');
        const contador = document.querySelector('.galeria-contador');
        
        if (contador) {
            contador.textContent = `${itemsVisibles.length} elementos mostrados`;
        }
    }
    
    // Actualizar contador cuando cambien los filtros
    const botonesFiltro = document.querySelectorAll('.filtro-galeria-btn');
    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', function() {
            setTimeout(actualizarContadorGaleria, 100);
        });
    });
    
    // Inicializar contador
    actualizarContadorGaleria();
    
    // Título principal sin efectos especiales
    const tituloHero = document.querySelector('.feria-hero-titulo');
    if (tituloHero) {
        // El título se muestra normalmente sin efectos de typing
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
    
    console.log('Galería de Feria de Tineo inicializada correctamente');
});
