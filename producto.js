// JavaScript para la página individual del producto
document.addEventListener('DOMContentLoaded', function() {
    // Obtener ID del producto de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');
    
    if (productoId) {
        cargarProducto(productoId);
    } else {
        mostrarError('No se ha especificado un producto');
    }
    
    // Configurar event listeners
    configurarEventListeners();
});

// Variables globales
let productoActual = null;
let cantidadActual = 1;

// Función para cargar el producto
async function cargarProducto(id) {
    try {
        const response = await fetch('productos.json');
        if (!response.ok) {
            throw new Error('Error al cargar los productos');
        }
        
        const data = await response.json();
        const producto = data.productos.find(p => p.id == id);
        
        if (producto) {
            productoActual = producto;
            mostrarProducto(producto);
            cargarProductosRelacionados(producto.categoria, id);
        } else {
            mostrarError('Producto no encontrado');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar el producto. Por favor, recarga la página.');
    }
}

// Función para mostrar el producto
function mostrarProducto(producto) {
    // Actualizar título de la página
    document.title = `${producto.nombre} | Nutrigan España`;
    document.getElementById('producto-titulo').textContent = `${producto.nombre} | Nutrigan España`;
    
    // Actualizar breadcrumb
    document.getElementById('breadcrumb-nombre').textContent = producto.nombre;
    
    // Actualizar hero
    document.getElementById('producto-nombre').textContent = producto.nombre;
    
    // Actualizar información principal
    document.getElementById('producto-titulo-detalle').textContent = producto.nombre;
    document.getElementById('producto-precio').textContent = `€${producto.precio.toFixed(2)}`;
    document.getElementById('producto-descripcion').innerHTML = `<p>${producto.descripcion}</p>`;
    
    // Actualizar características
    document.getElementById('producto-especie').textContent = producto.especie;
    document.getElementById('producto-tiempo-liberacion').textContent = producto.tiempoLiberacion;
    
    // Actualizar presentación
    document.getElementById('producto-presentacion-texto').textContent = producto.presentacion || '-';
    
    // Actualizar imagen principal
    const imagenPrincipal = document.getElementById('producto-imagen-principal');
    imagenPrincipal.src = producto.imagen;
    imagenPrincipal.alt = producto.nombre;
    
    // Actualizar badges
    actualizarBadges(producto);
    
    // Actualizar miniaturas
    actualizarMiniaturas(producto);
    
    
    
    // Actualizar estado de botones
    actualizarEstadoBotones(producto);
}

// Función para actualizar badges
function actualizarBadges(producto) {
    const badgesContainer = document.getElementById('producto-badges');
    badgesContainer.innerHTML = '';
    
    if (producto.destacado) {
        const badge = document.createElement('span');
        badge.className = 'producto-badge producto-badge-destacado';
        badge.textContent = 'Destacado';
        badgesContainer.appendChild(badge);
    }
    
    if (producto.stock < 10) {
        const badge = document.createElement('span');
        badge.className = 'producto-badge producto-badge-stock';
        badge.textContent = 'Stock bajo';
        badgesContainer.appendChild(badge);
    }
}

// Función para actualizar miniaturas
function actualizarMiniaturas(producto) {
    const miniaturasContainer = document.getElementById('producto-miniaturas');
    miniaturasContainer.innerHTML = '';
    
    // Crear miniatura para la imagen principal
    const miniaturaPrincipal = crearMiniatura(producto.imagen, producto.nombre, true);
    miniaturasContainer.appendChild(miniaturaPrincipal);
    
    // Si hay imágenes adicionales, añadirlas
    if (producto.imagenes && producto.imagenes.length > 0) {
        producto.imagenes.forEach((imagen, index) => {
            const miniatura = crearMiniatura(imagen, `${producto.nombre} - Imagen ${index + 2}`, false);
            miniaturasContainer.appendChild(miniatura);
        });
    }
}

// Función para crear una miniatura
function crearMiniatura(src, alt, activa = false) {
    const miniatura = document.createElement('div');
    miniatura.className = `miniatura ${activa ? 'activa' : ''}`;
    miniatura.onclick = () => cambiarImagenPrincipal(src);
    
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    
    miniatura.appendChild(img);
    return miniatura;
}

// Función para cambiar imagen principal
function cambiarImagenPrincipal(src) {
    const imagenPrincipal = document.getElementById('producto-imagen-principal');
    imagenPrincipal.src = src;
    
    // Actualizar miniaturas activas
    document.querySelectorAll('.miniatura').forEach(min => {
        min.classList.remove('activa');
    });
    event.currentTarget.classList.add('activa');
}



// Función para cargar productos relacionados
async function cargarProductosRelacionados(categoria, productoId) {
    try {
        const response = await fetch('productos.json');
        if (!response.ok) {
            throw new Error('Error al cargar los productos');
        }
        
        const data = await response.json();
        const productosRelacionados = data.productos
            .filter(p => p.categoria === categoria && p.id != productoId)
            .slice(0, 4);
        
        mostrarProductosRelacionados(productosRelacionados);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Función para mostrar productos relacionados
function mostrarProductosRelacionados(productos) {
    const relacionadosGrid = document.getElementById('relacionados-grid');
    relacionadosGrid.innerHTML = '';
    
    if (productos.length === 0) {
        relacionadosGrid.innerHTML = '<p>No hay productos relacionados disponibles.</p>';
        return;
    }
    
    productos.forEach(producto => {
        const item = document.createElement('div');
        item.className = 'relacionado-item';
        item.onclick = () => window.location.href = `producto.html?id=${producto.id}`;
        
        item.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}" class="relacionado-imagen">
            <div class="relacionado-info">
                <h4 class="relacionado-nombre">${producto.nombre}</h4>
                <p class="relacionado-precio">€${producto.precio.toFixed(2)}</p>
            </div>
        `;
        
        relacionadosGrid.appendChild(item);
    });
}

// Función para actualizar estado de botones
function actualizarEstadoBotones(producto) {
    const btnAñadir = document.getElementById('btn-añadir-carrito');
    const btnComprar = document.getElementById('btn-comprar-ahora');
    const cantidadMenos = document.getElementById('cantidad-menos');
    const cantidadMas = document.getElementById('cantidad-mas');
    
    const sinStock = producto.stock <= 0;
    
    btnAñadir.disabled = sinStock;
    btnComprar.disabled = false; // El botón "Ver Carrito" siempre está disponible
    cantidadMenos.disabled = sinStock;
    cantidadMas.disabled = sinStock;
    
    if (sinStock) {
        btnAñadir.textContent = 'Sin Stock';
        // No cambiar el texto del botón "Ver Carrito"
    }
}

// Función para cambiar cantidad
function cambiarCantidad(cambio) {
    const input = document.getElementById('cantidad-producto');
    const valorActual = parseInt(input.value);
    const nuevaCantidad = valorActual + cambio;
    
    if (nuevaCantidad >= 1 && nuevaCantidad <= 99) {
        input.value = nuevaCantidad;
        // No llamar a actualizarCantidad aquí, el event listener 'input' lo hará automáticamente
    }
}

// Función para actualizar cantidad desde input
function actualizarCantidad() {
    const input = document.getElementById('cantidad-producto');
    const cantidad = parseInt(input.value);
    
    if (cantidad >= 1 && cantidad <= 99) {
        cantidadActual = cantidad;
        actualizarBotonesCantidad();
    } else {
        input.value = cantidadActual;
    }
}

// Función para actualizar botones de cantidad
function actualizarBotonesCantidad() {
    const cantidadMenos = document.getElementById('cantidad-menos');
    const cantidadMas = document.getElementById('cantidad-mas');
    
    cantidadMenos.disabled = cantidadActual <= 1;
    cantidadMas.disabled = cantidadActual >= 99;
}

// Función para añadir al carrito
function añadirAlCarrito() {
    if (!productoActual || productoActual.stock <= 0) {
        mostrarNotificacion('Producto no disponible', 'error');
        return;
    }
    
    // Actualizar la cantidad actual desde el input
    actualizarCantidad();
    
    // Obtener el botón que se clickeó para mostrar el efecto de texto
    const boton = event.target.closest('.btn-añadir-carrito');
    
    // Mostrar efecto de texto
    if (boton) {
        mostrarEfectoTextoCarrito(boton);
    }
    
    const productoCarrito = {
        id: productoActual.id,
        nombre: productoActual.nombre,
        descripcion: productoActual.descripcion,
        precio: productoActual.precio,
        imagen: productoActual.imagen,
        cantidad: cantidadActual
    };
    
    // Obtener carrito actual
    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    
    // Buscar si el producto ya existe
    const productoExistente = carrito.find(p => p.id === productoActual.id);
    
    if (productoExistente) {
        productoExistente.cantidad += cantidadActual;
    } else {
        carrito.push(productoCarrito);
    }
    
    // Guardar carrito
    localStorage.setItem('carrito', JSON.stringify(carrito));
    
    // Actualizar contador del carrito
    actualizarContadorCarrito();
    
    // Activar efecto de pulso
    activarEfectoPulso();
}

// Función para ver carrito
function comprarAhora() {
    // Redirigir directamente al carrito
    window.location.href = 'carrito.html';
}

// Función para actualizar contador del carrito
function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    const cantidadTotal = carrito.reduce((total, producto) => total + producto.cantidad, 0);
    
    // Actualizar en todas las páginas
    const contador = document.getElementById('carrito-contador');
    if (contador) {
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
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion-producto notificacion-${tipo}`;
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${mensaje}</span>
        </div>
    `;
    
    // Añadir estilos
    const bgColor = tipo === 'success' ? 'var(--color-acento)' : '#ff6b6b';
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 4000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Añadir al DOM
    document.body.appendChild(notificacion);
    
    // Animar entrada
    setTimeout(() => {
        notificacion.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notificacion.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notificacion)) {
                document.body.removeChild(notificacion);
            }
        }, 300);
    }, 3000);
}

// Función para mostrar error
function mostrarError(mensaje) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-producto';
    errorDiv.innerHTML = `
        <div class="error-contenido">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Error</h2>
            <p>${mensaje}</p>
            <a href="productos.html" class="btn-volver">Volver a Productos</a>
        </div>
    `;
    
    // Añadir estilos
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5000;
    `;
    
    document.body.appendChild(errorDiv);
}


// Función para configurar event listeners
function configurarEventListeners() {
    // Event listeners para cantidad
    document.getElementById('cantidad-menos').addEventListener('click', () => cambiarCantidad(-1));
    document.getElementById('cantidad-mas').addEventListener('click', () => cambiarCantidad(1));
    document.getElementById('cantidad-producto').addEventListener('input', actualizarCantidad);
    document.getElementById('cantidad-producto').addEventListener('change', actualizarCantidad);
    
    // Event listeners para botones
    document.getElementById('btn-añadir-carrito').addEventListener('click', añadirAlCarrito);
    document.getElementById('btn-comprar-ahora').addEventListener('click', comprarAhora);
    document.getElementById('btn-ficha-tecnica').addEventListener('click', verFichaTecnica);
}

// Función para ver ficha técnica
async function verFichaTecnica() {
    console.log('Función verFichaTecnica llamada');
    
    // Obtener ID del producto de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');
    console.log('Producto ID:', productoId);
    
    if (productoId) {
        try {
            // Cargar el JSON para obtener la ficha técnica
            const response = await fetch('productos.json');
            if (!response.ok) {
                throw new Error('Error al cargar los productos');
            }
            
            const data = await response.json();
            const producto = data.productos.find(p => p.id == productoId);
            console.log('Producto encontrado:', producto);
            
            if (producto && producto.fichaTecnica) {
                try {
                    // Verificar que el recurso exista antes de abrir
                    const headResp = await fetch(producto.fichaTecnica, { method: 'HEAD' });
                    if (headResp.ok) {
                        console.log('Abriendo ficha técnica:', producto.fichaTecnica);
                        window.open(producto.fichaTecnica, '_blank');
                    } else {
                        console.warn('Ficha técnica no encontrada (HEAD no OK):', producto.fichaTecnica);
                        mostrarNotificacion('Ficha técnica no disponible', 'error');
                    }
                } catch (e) {
                    console.error('Error verificando la ficha técnica:', e);
                    mostrarNotificacion('Ficha técnica no disponible', 'error');
                }
            } else {
                console.log('No se encontró ficha técnica');
                // Mostrar mensaje de que no está disponible
                mostrarNotificacion('Ficha técnica no disponible', 'error');
            }
        } catch (error) {
            console.error('Error al cargar la ficha técnica:', error);
            // Mostrar mensaje de que no está disponible
            mostrarNotificacion('Ficha técnica no disponible', 'error');
        }
    } else {
        console.error('No se pudo obtener el ID del producto');
        alert('No se pudo cargar la ficha técnica. Por favor, inténtelo de nuevo.');
    }
}

// Función para volver a la página de productos
function volverAProductos() {
    window.location.href = 'productos.html';
}

// Exportar funciones para uso global
window.cambiarCantidad = cambiarCantidad;
window.actualizarCantidad = actualizarCantidad;
window.añadirAlCarrito = añadirAlCarrito;
window.comprarAhora = comprarAhora;
window.verFichaTecnica = verFichaTecnica;
window.volverAProductos = volverAProductos;
window.activarEfectoPulso = activarEfectoPulso;
window.mostrarEfectoTextoCarrito = mostrarEfectoTextoCarrito;
