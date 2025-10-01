// Variables globales
let productos = [];
let productosFiltrados = [];
let categoriaActiva = 'todos';
let terminoBusqueda = '';

// Elementos del DOM
const filtrosBotones = document.getElementById('filtros-botones');
const productosGrid = document.getElementById('productos-grid-catalogo');
const productosContador = document.getElementById('productos-contador-texto');

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
    actualizarContadorCarrito(); // Inicializar contador
    inicializarBuscador(); // Inicializar funcionalidad de búsqueda
});

// Función para cargar productos desde el JSON
async function cargarProductos() {
    try {
        const response = await fetch('productos.json');
        if (!response.ok) {
            throw new Error('Error al cargar los productos');
        }
        
        const data = await response.json();
        productos = data.productos;
        
        // Generar filtros dinámicamente
        generarFiltros(data.categorias);
        
        // Verificar si hay búsqueda en la URL después de cargar productos
        verificarBusquedaURL();
        
        // Si no hay búsqueda, mostrar todos los productos
        if (!terminoBusqueda) {
            mostrarProductos(productos);
            actualizarContador(productos.length);
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar los productos. Por favor, recarga la página.');
    }
}

// Función para generar los filtros dinámicamente
function generarFiltros(categorias) {
    // Botón "Todos"
    const botonTodos = document.createElement('button');
    botonTodos.className = 'filtro-btn activo';
    botonTodos.setAttribute('data-categoria', 'todos');
    botonTodos.textContent = 'Todos';
    botonTodos.addEventListener('click', () => filtrarProductos('todos'));
    filtrosBotones.appendChild(botonTodos);
    
    // Botones de categorías (excluye 'todas')
    categorias.forEach(categoria => {
        if (categoria.id === 'todas') return;
        const boton = document.createElement('button');
        boton.className = 'filtro-btn';
        boton.setAttribute('data-categoria', categoria.id);
        boton.textContent = categoria.nombre;
        boton.addEventListener('click', () => filtrarProductos(categoria.id));
        filtrosBotones.appendChild(boton);
    });
}

// Función para filtrar productos
function filtrarProductos(categoria) {
    categoriaActiva = categoria;
    
    // Actualizar botones activos
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('activo');
        if (btn.getAttribute('data-categoria') === categoria) {
            btn.classList.add('activo');
        }
    });
    
    // Aplicar filtros (categoría + búsqueda)
    aplicarFiltros();
}

// Función para mostrar productos
function mostrarProductos(productosAMostrar) {
    productosGrid.innerHTML = '';
    
    if (productosAMostrar.length === 0) {
        productosGrid.innerHTML = `
            <div class="productos-vacio">
                <i class="fas fa-search"></i>
                <h3>No se encontraron productos</h3>
                <p>No hay productos disponibles en esta categoría.</p>
            </div>
        `;
        productosGrid.classList.remove('pocos-productos');
        return;
    }
    
    productosAMostrar.forEach(producto => {
        const productoElement = crearElementoProducto(producto);
        productosGrid.appendChild(productoElement);
    });
    
    // Agregar clase para pocos productos (1-3 productos) solo si NO hay búsqueda activa
    if (productosAMostrar.length <= 3 && !terminoBusqueda) {
        productosGrid.classList.add('pocos-productos');
        productosGrid.setAttribute('data-count', productosAMostrar.length);
    } else {
        productosGrid.classList.remove('pocos-productos');
        productosGrid.removeAttribute('data-count');
    }
}

// Función para crear el elemento HTML de un producto
function crearElementoProducto(producto) {
    const productoLink = document.createElement('a');
    productoLink.className = 'producto-item producto-link';
    productoLink.href = `producto.html?id=${producto.id}`;
    productoLink.setAttribute('data-categoria', producto.categoria);
    
    // Badge de destacado si es necesario
    const badgeDestacado = producto.destacado ? '<span class="producto-badge-destacado">Destacado</span>' : '';
    
    // Badge de stock
    const badgeStock = producto.stock < 10 ? '<span class="producto-badge-stock">Stock bajo</span>' : '';
    
    productoLink.innerHTML = `
        <div class="producto-imagen-container">
            ${badgeDestacado}
            ${badgeStock}
            <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen">
        </div>
        <h3 class="producto-nombre">${producto.nombre}</h3>
        <p class="producto-descripcion">${producto.descripcion}</p>
        <div class="producto-detalles">
            <div class="producto-especie">
                <i class="fas fa-cow"></i>
                <span>${producto.especie}</span>
            </div>
            <div class="producto-etapa">
                <i class="fas fa-clock"></i>
                <span>${producto.etapa}</span>
            </div>
        </div>
        <div class="producto-precio">€${producto.precio.toFixed(2)}</div>
        <div class="producto-botones">
            <button class="producto-btn producto-btn-detalles" onclick="event.preventDefault(); verDetallesProducto(${producto.id})">
                Ver Detalles
            </button>
            <button class="producto-btn producto-btn-carrito" onclick="event.preventDefault(); añadirAlCarrito(${producto.id})">
                <i class="fas fa-shopping-cart"></i>
                Añadir al Carrito
            </button>
        </div>
    `;
    
    // Agregar event listener para manejar el click en toda la etiqueta
    productoLink.addEventListener('click', function(e) {
        // Si el click es en el botón, no hacer nada (el botón ya maneja su propio click)
        if (e.target.classList.contains('producto-btn') || e.target.closest('.producto-btn')) {
            return;
        }
        
        // Prevenir el comportamiento por defecto del enlace
        e.preventDefault();
        
        // Redirigir a la página del producto
        verDetallesProducto(producto.id);
    });
    
    return productoLink;
}

// Función para actualizar el contador de productos
function actualizarContador(cantidad) {
    let mensaje = '';
    
    if (terminoBusqueda) {
        if (categoriaActiva === 'todos') {
            mensaje = `Resultados para "${terminoBusqueda}" (${cantidad})`;
        } else {
            const categoriaNombre = obtenerNombreCategoria(categoriaActiva);
            mensaje = `Resultados para "${terminoBusqueda}" en ${categoriaNombre} (${cantidad})`;
        }
    } else {
        if (categoriaActiva === 'todos') {
            mensaje = `Mostrando todos los productos (${cantidad})`;
        } else {
            const categoriaNombre = obtenerNombreCategoria(categoriaActiva);
            mensaje = `Mostrando productos de ${categoriaNombre} (${cantidad})`;
        }
    }
    
    productosContador.textContent = mensaje;
}

// Función para obtener el nombre de la categoría
function obtenerNombreCategoria(categoriaId) {
    const categorias = {
        'bovinos': 'Bovinos',
        'ovinos': 'Ovinos',
        'caprinos': 'Caprinos',
        'porcinos': 'Porcinos',
        'equinos': 'Equinos',
        'perros': 'Perros',
        'todas': 'Todas las especies'
    };
    return categorias[categoriaId] || categoriaId;
}

// Función para obtener el nombre de la categoría de un producto (maneja múltiples categorías)
function obtenerNombreCategoriaProducto(categoriaString) {
    if (categoriaString.includes(',')) {
        const categorias = categoriaString.split(',').map(cat => cat.trim());
        return categorias.map(cat => obtenerNombreCategoria(cat)).join(', ');
    } else {
        return obtenerNombreCategoria(categoriaString);
    }
}

// Función para ver detalles del producto
function verDetallesProducto(productoId) {
    // Redirigir a la página individual del producto
    window.location.href = `producto.html?id=${productoId}`;
}

// Función para añadir producto al carrito
function añadirAlCarrito(id) {
    console.log('Añadiendo producto al carrito, ID:', id);
    
    // Buscar el producto en la lista
    const producto = productos.find(p => p.id == id);
    if (!producto) {
        console.error('Producto no encontrado');
        return;
    }
    
    console.log('Producto encontrado:', producto);
    
    // Crear efecto de vuelo hacia el carrito
    crearEfectoVueloCarrito(producto);
    
    // Crear objeto del producto para el carrito
    const productoCarrito = {
        id: producto.id,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        imagen: producto.imagen,
        cantidad: 1
    };
    
    // Obtener carrito actual
    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    console.log('Carrito actual antes de añadir:', carrito);
    
    // Buscar si el producto ya existe
    const productoExistente = carrito.find(p => p.id === producto.id);
    
    if (productoExistente) {
        // Si existe, aumentar cantidad
        productoExistente.cantidad += 1;
        console.log('Producto existente, cantidad aumentada a:', productoExistente.cantidad);
    } else {
        // Si no existe, añadir nuevo producto
        carrito.push(productoCarrito);
        console.log('Producto nuevo añadido al carrito');
    }
    
    console.log('Carrito después de añadir:', carrito);
    
    // Guardar carrito
    localStorage.setItem('carrito', JSON.stringify(carrito));
    console.log('Carrito guardado en localStorage');
    
    // Actualizar contador del carrito después de la animación
    setTimeout(() => {
        actualizarContadorCarrito();
        activarEfectoPulso(); // Activar el efecto de pulso
    }, 800);
}

// Función para crear efecto de vuelo hacia el carrito
function crearEfectoVueloCarrito(producto) {
    // Crear elemento flotante
    const elementoFlotante = document.createElement('div');
    elementoFlotante.className = 'producto-volando';
    elementoFlotante.innerHTML = `
        <img src="${producto.imagen}" alt="${producto.nombre}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;">
    `;
    
    // Estilos del elemento flotante
    elementoFlotante.style.cssText = `
        position: fixed;
        z-index: 10000;
        pointer-events: none;
        transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        opacity: 1;
        transform: scale(1);
    `;
    
    // Obtener posición del botón clickeado
    const boton = event.target.closest('.producto-btn-carrito');
    const rect = boton.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    
    // Posición inicial
    elementoFlotante.style.left = startX + 'px';
    elementoFlotante.style.top = startY + 'px';
    
    // Añadir al DOM
    document.body.appendChild(elementoFlotante);
    
    // Obtener posición del carrito en el navbar
    const carritoIcon = document.querySelector('.carrito-link');
    if (carritoIcon) {
        const carritoRect = carritoIcon.getBoundingClientRect();
        const endX = carritoRect.left + carritoRect.width / 2;
        const endY = carritoRect.top + carritoRect.height / 2;
        
        // Animar hacia el carrito
        setTimeout(() => {
            elementoFlotante.style.left = endX + 'px';
            elementoFlotante.style.top = endY + 'px';
            elementoFlotante.style.transform = 'scale(0.3)';
            elementoFlotante.style.opacity = '0.7';
        }, 50);
        
        // Sin efecto de rebote - mantener estático
    }
    
    // Remover elemento después de la animación
    setTimeout(() => {
        if (elementoFlotante.parentNode) {
            elementoFlotante.parentNode.removeChild(elementoFlotante);
        }
    }, 1000);
}

// Función para actualizar el contador del carrito
function actualizarContadorCarrito() {
    const contador = document.getElementById('carrito-contador');
    if (contador) {
        const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
        const cantidadTotal = carrito.reduce((total, producto) => total + producto.cantidad, 0);
        contador.textContent = cantidadTotal;
        contador.setAttribute('data-count', cantidadTotal);
    }
}

// Función para activar el efecto de pulso en el contador
function activarEfectoPulso() {
    const contador = document.getElementById('carrito-contador');
    if (contador) {
        // Remover la clase si ya existe
        contador.classList.remove('pulso-efecto');
        
        // Forzar un reflow para que la animación se reinicie
        contador.offsetHeight;
        
        // Añadir la clase para activar la animación
        contador.classList.add('pulso-efecto');
        
        // Remover la clase después de la animación
        setTimeout(() => {
            contador.classList.remove('pulso-efecto');
        }, 1500);
    }
}

// Función para mostrar el efecto de texto "Producto añadido al carrito"
function mostrarEfectoTextoCarrito(boton) {
    // Crear elemento de texto
    const textoEfecto = document.createElement('div');
    textoEfecto.className = 'texto-efecto-carrito';
    textoEfecto.textContent = 'Producto añadido al carrito';
    
    // Asegurar que el botón tenga posición relativa
    const originalPosition = boton.style.position;
    if (getComputedStyle(boton).position === 'static') {
        boton.style.position = 'relative';
    }
    
    // Añadir el texto directamente al botón
    boton.appendChild(textoEfecto);
    
    // Remover el elemento después de la animación
    setTimeout(() => {
        if (textoEfecto.parentNode) {
            textoEfecto.parentNode.removeChild(textoEfecto);
        }
        // Restaurar posición original si era necesario
        if (originalPosition !== '') {
            boton.style.position = originalPosition;
        } else {
            boton.style.position = '';
        }
    }, 2000);
}

// Función para mostrar notificación
function mostrarNotificacionCarrito(mensaje) {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion-carrito';
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas fa-check-circle"></i>
            <span>${mensaje}</span>
        </div>
    `;
    
    // Añadir estilos
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    // Añadir al DOM
    document.body.appendChild(notificacion);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 3000);
}

// Función para mostrar modal de detalles
function mostrarModalDetalles(producto) {
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'modal-producto';
    modal.innerHTML = `
        <div class="modal-contenido">
            <div class="modal-header">
                <h2>${producto.nombre}</h2>
                <button class="modal-cerrar" onclick="cerrarModal()">
                    ×
                </button>
            </div>
            <div class="modal-body">
                <div class="modal-imagen">
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                </div>
                <div class="modal-info">
                    <div class="modal-precio">€${producto.precio.toFixed(2)}</div>
                    <p class="modal-descripcion">${producto.descripcionCompleta}</p>
                    
                    <div class="modal-detalles">
                        <div class="detalle-item">
                            <strong>Especie:</strong> ${producto.especie}
                        </div>
                        <div class="detalle-item">
                            <strong>Etapa:</strong> ${producto.etapa}
                        </div>
                        <div class="detalle-item">
                            <strong>Tiempo de liberación:</strong> ${producto.tiempoLiberacion}
                        </div>
                        <div class="detalle-item">
                            <strong>Presentación:</strong> ${producto.presentacion}
                        </div>
                        <div class="detalle-item">
                            <strong>Peso:</strong> ${producto.peso}
                        </div>
                    </div>
                    
                    <div class="modal-ingredientes">
                        <h4>Ingredientes principales:</h4>
                        <div class="ingredientes-lista">
                            ${producto.ingredientes.map(ing => `<span class="ingrediente-tag">${ing}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="modal-beneficios">
                        <h4>Beneficios:</h4>
                        <ul>
                            ${producto.beneficios.map(beneficio => `<li>${beneficio}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="modal-stock">
                        <strong>Stock disponible:</strong> ${producto.stock} unidades
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-btn-contactar" onclick="contactarWhatsApp('${producto.nombre}')">
                    <i class="fab fa-whatsapp"></i>
                    Consultar por WhatsApp
                </button>
            </div>
        </div>
    `;
    
    // Agregar modal al body
    document.body.appendChild(modal);
    
    // Mostrar modal con animación
    setTimeout(() => modal.classList.add('activo'), 10);
}

// Función para cerrar modal
function cerrarModal() {
    const modal = document.querySelector('.modal-producto');
    if (modal) {
        modal.classList.remove('activo');
        setTimeout(() => modal.remove(), 300);
    }
}

// Función para contactar por WhatsApp
function contactarWhatsApp(nombreProducto) {
    const mensaje = `Hola, me interesa el producto ${nombreProducto}. ¿Podrían darme más información?`;
    const url = `https://wa.me/34626983042?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// Función para mostrar error
function mostrarError(mensaje) {
    productosGrid.innerHTML = `
        <div class="productos-error">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>${mensaje}</p>
            <button onclick="location.reload()" class="btn-reload">
                <i class="fas fa-redo"></i>
                Recargar página
            </button>
        </div>
    `;
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', function(event) {
    const modal = document.querySelector('.modal-producto');
    if (modal && event.target === modal) {
        cerrarModal();
    }
});

// Cerrar modal con ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        cerrarModal();
    }
});

// Función para inicializar el buscador
function inicializarBuscador() {
    const buscadorForm = document.querySelector('.nav-buscador');
    const buscadorInput = document.querySelector('.nav-buscador input[type="search"]');
    
    if (buscadorForm && buscadorInput) {
        // Manejar envío del formulario
        buscadorForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const termino = buscadorInput.value.trim();
            buscarProductos(termino);
        });
        
        // Manejar búsqueda en tiempo real mientras se escribe
        buscadorInput.addEventListener('input', function() {
            const termino = this.value.trim();
            
            if (termino.length >= 2) {
                buscarProductos(termino);
            } else if (termino.length === 0) {
                // Si se borra todo, mostrar todos los productos
                terminoBusqueda = '';
                aplicarFiltros();
            }
        });
        
        // Manejar tecla Enter
        buscadorInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const termino = this.value.trim();
                buscarProductos(termino);
            }
        });
    }
}

// Función para buscar productos
function buscarProductos(termino) {
    terminoBusqueda = termino.toLowerCase();
    aplicarFiltros();
}

// Función para aplicar filtros (categoría + búsqueda)
function aplicarFiltros() {
    let productosFiltradosTemp = productos;
    
    // Aplicar filtro de categoría
    if (categoriaActiva !== 'todos') {
        productosFiltradosTemp = productos.filter(producto => {
            if (producto.categoria.includes(',')) {
                const categoriasProducto = producto.categoria.split(',').map(cat => cat.trim());
                return categoriasProducto.includes(categoriaActiva);
            } else {
                return producto.categoria === categoriaActiva;
            }
        });
    }
    
    // Aplicar filtro de búsqueda
    if (terminoBusqueda) {
        productosFiltradosTemp = productosFiltradosTemp.filter(producto => {
            return (
                producto.nombre.toLowerCase().includes(terminoBusqueda) ||
                producto.descripcion.toLowerCase().includes(terminoBusqueda) ||
                producto.especie.toLowerCase().includes(terminoBusqueda) ||
                producto.etapa.toLowerCase().includes(terminoBusqueda) ||
                producto.categoria.toLowerCase().includes(terminoBusqueda)
            );
        });
    }
    
    productosFiltrados = productosFiltradosTemp;
    
    // Mostrar productos filtrados
    mostrarProductos(productosFiltrados);
    
    // Actualizar contador
    actualizarContador(productosFiltrados.length);
}


// Función para verificar si hay búsqueda en la URL
function verificarBusquedaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const terminoBusquedaURL = urlParams.get('buscar');
    
    if (terminoBusquedaURL) {
        console.log('Término de búsqueda encontrado en URL:', terminoBusquedaURL);
        
        // Establecer el término de búsqueda
        terminoBusqueda = terminoBusquedaURL.toLowerCase();
        
        // Rellenar el campo de búsqueda
        const buscadorInput = document.querySelector('.nav-buscador input[type="search"]');
        if (buscadorInput) {
            buscadorInput.value = terminoBusquedaURL;
        }
        
        // Aplicar la búsqueda
        aplicarFiltros();
        
        console.log('Búsqueda aplicada. Productos encontrados:', productosFiltrados.length);
    }
}

// Exportar funciones para uso global
window.activarEfectoPulso = activarEfectoPulso;
window.mostrarEfectoTextoCarrito = mostrarEfectoTextoCarrito;

