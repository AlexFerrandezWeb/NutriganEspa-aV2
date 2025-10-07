// JavaScript para la página del Carrito
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el carrito
    inicializarCarrito();
    
    // Cargar productos del carrito desde localStorage
    cargarCarrito();
    
    // Actualizar la interfaz
    actualizarInterfazCarrito();
    
    // Configurar event listeners
    configurarEventListeners();
});

// Variables globales
let carrito = [];
let productoAEliminar = null;

// Función para inicializar el carrito
function inicializarCarrito() {
    // Obtener carrito del localStorage o inicializar vacío
    const carritoGuardado = localStorage.getItem('carrito');
    console.log('Carrito guardado en localStorage:', carritoGuardado);
    
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        console.log('Carrito cargado desde localStorage:', carrito);
    } else {
        carrito = [];
        console.log('Carrito inicializado vacío');
    }
    
    // Actualizar contador en el nav
    actualizarContadorCarrito();
}

// Función para cargar productos del carrito
function cargarCarrito() {
    console.log('Cargando carrito...', carrito);
    
    const carritoLista = document.getElementById('carrito-lista');
    const carritoVacio = document.getElementById('carrito-vacio');
    const carritoContenido = document.getElementById('carrito-contenido');
    
    if (!carritoLista || !carritoVacio || !carritoContenido) {
        console.error('Elementos del carrito no encontrados');
        return;
    }
    
    if (carrito.length === 0) {
        console.log('Carrito vacío, mostrando mensaje');
        carritoVacio.style.display = 'block';
        carritoContenido.style.display = 'none';
        return;
    }
    
    console.log('Carrito tiene productos, mostrando lista');
    carritoVacio.style.display = 'none';
    carritoContenido.style.display = 'block';
    
    // Limpiar lista actual
    carritoLista.innerHTML = '';
    
    // Crear elementos para cada producto
    carrito.forEach((producto, index) => {
        const itemElement = crearItemCarrito(producto, index);
        carritoLista.appendChild(itemElement);
    });
    
    // Actualizar resumen
    actualizarResumenCarrito();
}

// Función para crear un item del carrito
function crearItemCarrito(producto, index) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'carrito-item';
    itemDiv.setAttribute('data-index', index);
    
    // Usar precioUnitario si existe, sino usar precio
    const precioUnitario = producto.precioUnitario || producto.precio;
    const precioTotal = precioUnitario * producto.cantidad;
    const cantidadMinima = producto.cantidadMinima || 1;
    
    itemDiv.innerHTML = `
        <div class="carrito-item-imagen">
            <img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy">
        </div>
        <div class="carrito-item-info">
            <h3 class="carrito-item-nombre">${producto.nombre}</h3>
            <p class="carrito-item-descripcion">${producto.descripcion || 'Producto de nutrición animal'}</p>
            ${cantidadMinima > 1 ? `<small class="cantidad-minima-info">Mínimo: ${cantidadMinima} unidades</small>` : ''}
        </div>
        <div class="carrito-item-precios">
            <div class="carrito-item-precio-unitario">€${precioUnitario.toFixed(2)} c/u</div>
            <div class="carrito-item-precio-total">€${precioTotal.toFixed(2)}</div>
        </div>
        <div class="carrito-item-controls">
            <div class="carrito-item-cantidad">
                <button class="cantidad-btn" onclick="cambiarCantidad(${index}, -1)" ${producto.cantidad <= cantidadMinima ? 'disabled' : ''}>
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" class="cantidad-input" value="${producto.cantidad}" min="${cantidadMinima}" max="99" 
                       onchange="actualizarCantidad(${index}, this.value)">
                <button class="cantidad-btn" onclick="cambiarCantidad(${index}, 1)" ${producto.cantidad >= 99 ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <button class="carrito-item-eliminar" onclick="mostrarModalEliminar(${index})" title="Eliminar producto">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return itemDiv;
}

// Función para cambiar cantidad de un producto
function cambiarCantidad(index, cambio) {
    if (carrito[index]) {
        const producto = carrito[index];
        const cantidadMinima = producto.cantidadMinima || 1;
        const nuevaCantidad = producto.cantidad + cambio;
        
        if (nuevaCantidad >= cantidadMinima && nuevaCantidad <= 99) {
            producto.cantidad = nuevaCantidad;
            // Recalcular precio total si tiene precio unitario
            if (producto.precioUnitario) {
                producto.precio = producto.precioUnitario * nuevaCantidad;
            }
            guardarCarrito();
            cargarCarrito();
        }
    }
}

// Función para actualizar cantidad desde input
function actualizarCantidad(index, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad);
    const producto = carrito[index];
    
    if (!producto) return;
    
    const cantidadMinima = producto.cantidadMinima || 1;
    
    if (cantidad >= cantidadMinima && cantidad <= 99) {
        producto.cantidad = cantidad;
        // Recalcular precio total si tiene precio unitario
        if (producto.precioUnitario) {
            producto.precio = producto.precioUnitario * cantidad;
        }
        guardarCarrito();
        cargarCarrito();
    } else {
        // Si la cantidad no es válida, restaurar el valor anterior
        const input = document.querySelector(`[data-index="${index}"] .cantidad-input`);
        if (input) {
            input.value = producto.cantidad;
        }
        
        // Si es menor al mínimo, establecer al mínimo
        if (cantidad < cantidadMinima) {
            producto.cantidad = cantidadMinima;
            if (producto.precioUnitario) {
                producto.precio = producto.precioUnitario * cantidadMinima;
            }
            guardarCarrito();
            cargarCarrito();
        }
    }
}

// Función para mostrar modal de confirmación de eliminación
function mostrarModalEliminar(index) {
    productoAEliminar = index;
    const modal = document.getElementById('modal-confirmacion');
    const productoNombre = document.getElementById('producto-nombre-eliminar');
    const productoCantidad = document.getElementById('producto-cantidad-eliminar');
    
    // Mostrar el nombre y cantidad del producto en el modal
    if (carrito[index] && productoNombre && productoCantidad) {
        productoNombre.textContent = carrito[index].nombre;
        productoCantidad.textContent = `x${carrito[index].cantidad}`;
    }
    
    modal.classList.add('activo');
}

// Función para eliminar producto del carrito
function eliminarProducto() {
    if (productoAEliminar !== null && carrito[productoAEliminar]) {
        carrito.splice(productoAEliminar, 1);
        guardarCarrito();
        cargarCarrito();
        cerrarModalConfirmacion();
        productoAEliminar = null;
    }
}

// Función para cerrar modal de confirmación
function cerrarModalConfirmacion() {
    const modal = document.getElementById('modal-confirmacion');
    modal.classList.remove('activo');
    productoAEliminar = null;
}

// Función para actualizar resumen del carrito
function actualizarResumenCarrito() {
    const subtotalElement = document.getElementById('subtotal');
    const envioElement = document.getElementById('envio');
    const totalElement = document.getElementById('total');
    const cantidadTotalElement = document.getElementById('carrito-cantidad-total');
    const btnProcederPago = document.getElementById('btn-proceder-pago');
    
    // Calcular subtotal usando precio unitario si existe
    const subtotal = carrito.reduce((total, producto) => {
        const precioUnitario = producto.precioUnitario || producto.precio;
        return total + (precioUnitario * producto.cantidad);
    }, 0);
    
    // Calcular envío (siempre gratuito)
    const envio = 0;
    
    // Calcular total
    const total = subtotal + envio;
    
    // Calcular cantidad total de productos
    const cantidadTotal = carrito.reduce((total, producto) => total + producto.cantidad, 0);
    
    // Actualizar elementos
    subtotalElement.textContent = `€${subtotal.toFixed(2)}`;
    envioElement.textContent = envio === 0 ? 'Gratis' : `€${envio.toFixed(2)}`;
    totalElement.textContent = `€${total.toFixed(2)}`;
    cantidadTotalElement.textContent = `${cantidadTotal} producto${cantidadTotal !== 1 ? 's' : ''}`;
    
    // Habilitar/deshabilitar botón de proceder al pago
    btnProcederPago.disabled = carrito.length === 0;
    
    // Actualizar contador en el nav
    actualizarContadorCarrito();
}

// Función para actualizar contador del carrito en el nav
function actualizarContadorCarrito() {
    const contador = document.getElementById('carrito-contador');
    const cantidadTotal = carrito.reduce((total, producto) => total + producto.cantidad, 0);
    contador.textContent = cantidadTotal;
    contador.setAttribute('data-count', cantidadTotal);
    
    // Guardar en localStorage para otras páginas
    localStorage.setItem('carrito-contador', cantidadTotal.toString());
}

// Función para guardar carrito en localStorage
function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

// Función para actualizar interfaz del carrito
function actualizarInterfazCarrito() {
    cargarCarrito();
}

// Función para configurar event listeners
function configurarEventListeners() {
    // Modal de confirmación
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    const btnCancelar = document.getElementById('btn-cancelar');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const modalCerrar = document.getElementById('modal-cerrar');
    
    btnCancelar.addEventListener('click', cerrarModalConfirmacion);
    btnConfirmar.addEventListener('click', eliminarProducto);
    modalCerrar.addEventListener('click', cerrarModalConfirmacion);
    
    // Cerrar modal al hacer click fuera
    modalConfirmacion.addEventListener('click', function(e) {
        if (e.target === modalConfirmacion) {
            cerrarModalConfirmacion();
        }
    });
    
    // Modal de checkout
    const modalCheckout = document.getElementById('modal-checkout');
    const btnProcederPago = document.getElementById('btn-proceder-pago');
    const btnCancelarCheckout = document.getElementById('btn-cancelar-checkout');
    const btnFinalizarPedido = document.getElementById('btn-finalizar-pedido');
    const modalCheckoutCerrar = document.getElementById('modal-checkout-cerrar');
    
    btnProcederPago.addEventListener('click', function() {
        if (carrito.length > 0) {
            // Enviar datos del carrito a tu backend de Render
            enviarCarritoARender();
        }
    });
    
    // Solo agregar event listeners si los elementos existen
    if (btnCancelarCheckout) {
        btnCancelarCheckout.addEventListener('click', cerrarModalCheckout);
    }
    if (btnFinalizarPedido) {
        btnFinalizarPedido.addEventListener('click', procesarPedido);
    }
    if (modalCheckoutCerrar) {
        modalCheckoutCerrar.addEventListener('click', cerrarModalCheckout);
    }
    
    // Cerrar modal de checkout al hacer click fuera
    modalCheckout.addEventListener('click', function(e) {
        if (e.target === modalCheckout) {
            cerrarModalCheckout();
        }
    });
    
    // Validación del formulario de checkout
    const formularioCheckout = document.getElementById('formulario-checkout');
    formularioCheckout.addEventListener('submit', function(e) {
        e.preventDefault();
        procesarPedido();
    });
}

// Función para cerrar modal de checkout
function cerrarModalCheckout() {
    const modal = document.getElementById('modal-checkout');
    modal.classList.remove('activo');
}

// Función para procesar el pedido
function procesarPedido() {
    const formulario = document.getElementById('formulario-checkout');
    const datosFormulario = new FormData(formulario);
    
    // Validar formulario
    const nombre = datosFormulario.get('nombre');
    const email = datosFormulario.get('email');
    const telefono = datosFormulario.get('telefono');
    const direccion = datosFormulario.get('direccion');
    const ciudad = datosFormulario.get('ciudad');
    const codigoPostal = datosFormulario.get('codigo-postal');
    
    if (!nombre || !email || !telefono || !direccion || !ciudad || !codigoPostal) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Por favor, introduce un email válido.');
        return;
    }
    
    // Simular procesamiento del pedido
    mostrarMensajeProcesamiento();
    
    // Simular delay de procesamiento
    setTimeout(() => {
        // Crear resumen del pedido
        const resumenPedido = {
            cliente: {
                nombre,
                email,
                telefono,
                direccion,
                ciudad,
                codigoPostal,
                comentarios: datosFormulario.get('comentarios') || ''
            },
            productos: carrito.map(producto => ({
                nombre: producto.nombre,
                cantidad: producto.cantidad,
                precio: producto.precio,
                subtotal: producto.precio * producto.cantidad
            })),
            resumen: {
                subtotal: carrito.reduce((total, producto) => total + (producto.precio * producto.cantidad), 0),
                envio: 0,
                total: carrito.reduce((total, producto) => total + (producto.precio * producto.cantidad), 0)
            },
            fecha: new Date().toISOString(),
            numeroPedido: 'NUT' + Date.now()
        };
        
        // Guardar pedido en localStorage (en una aplicación real se enviaría al servidor)
        const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
        pedidos.push(resumenPedido);
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
        
        // Limpiar carrito
        carrito = [];
        guardarCarrito();
        
        // Mostrar confirmación
        mostrarConfirmacionPedido(resumenPedido);
        
        // Cerrar modal
        cerrarModalCheckout();
        
    }, 2000);
}

// Función para mostrar mensaje de procesamiento
function mostrarMensajeProcesamiento() {
    const btnFinalizar = document.getElementById('btn-finalizar-pedido');
    const textoOriginal = btnFinalizar.innerHTML;
    
    btnFinalizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btnFinalizar.disabled = true;
    
    // Restaurar botón después de 2 segundos
    setTimeout(() => {
        btnFinalizar.innerHTML = textoOriginal;
        btnFinalizar.disabled = false;
    }, 2000);
}

// Función para mostrar confirmación del pedido
function mostrarConfirmacionPedido(pedido) {
    const mensaje = `
        ¡Pedido realizado con éxito!
        
        Número de pedido: ${pedido.numeroPedido}
        Total: €${pedido.resumen.total.toFixed(2)}
        
        Te hemos enviado un email de confirmación a ${pedido.cliente.email}
        
        Gracias por confiar en Nutrigan España.
    `;
    
    // Guardar información del pedido para la página de agradecimiento
    const pedidoId = `NUT-2025-${String(Date.now()).slice(-6)}`;
    const pedidoInfo = {
        numero: `#${pedidoId}`,
        pedidoId: pedidoId,
        fecha: new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        total: total.toFixed(2),
        productos: carrito.length,
        email: pedido.cliente.email,
        productos: carrito.map(producto => ({
            nombre: producto.nombre,
            gtin: producto.gtin || '',
            precio: producto.precio,
            cantidad: producto.cantidad
        }))
    };
    
    localStorage.setItem('ultimoPedido', JSON.stringify(pedidoInfo));
    
    // Limpiar carrito
    carrito = [];
    localStorage.setItem('carrito', JSON.stringify(carrito));
    
    // Redirigir a página de agradecimiento
    window.location.href = 'gracias-compra.html';
}

// Función para añadir producto al carrito (llamada desde otras páginas)
function añadirAlCarrito(producto) {
    // Buscar si el producto ya existe en el carrito
    const productoExistente = carrito.find(p => p.id === producto.id);
    
    if (productoExistente) {
        // Si existe, aumentar cantidad
        productoExistente.cantidad += producto.cantidad || 1;
    } else {
        // Si no existe, añadir nuevo producto
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            precio: producto.precio,
            imagen: producto.imagen,
            cantidad: producto.cantidad || 1
        });
    }
    
    // Guardar y actualizar
    guardarCarrito();
    actualizarContadorCarrito();
    
    // Mostrar notificación
    mostrarNotificacion('Producto añadido al carrito');
}

// Función para mostrar notificación
function mostrarNotificacion(mensaje) {
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
        background: linear-gradient(45deg, var(--color-acento), var(--color-contador));
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
            document.body.removeChild(notificacion);
        }, 300);
    }, 3000);
}

// Función para limpiar carrito (útil para testing)
function limpiarCarrito() {
    carrito = [];
    guardarCarrito();
    cargarCarrito();
}

// Función para enviar carrito a Render
async function enviarCarritoARender() {
    const btnProcederPago = document.getElementById('btn-proceder-pago');
    const btnPagarTexto = btnProcederPago.querySelector('span') || btnProcederPago;
    
    // Mostrar estado de procesamiento
    const textoOriginal = btnProcederPago.innerHTML;
    btnProcederPago.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btnProcederPago.disabled = true;
    
    try {
        // Preparar datos del carrito
        const datosCarrito = {
            productos: carrito,
            total: carrito.reduce((total, producto) => total + (producto.precio * producto.cantidad), 0),
            cantidadTotal: carrito.reduce((total, producto) => total + producto.cantidad, 0),
            timestamp: new Date().toISOString()
        };
        
        // URL de tu backend en Render
        const RENDER_URL = 'https://www.xn--nutriganespaa-tkb.com';
        
        // Enviar datos a Render
        const response = await fetch(`${RENDER_URL}/api/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosCarrito)
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Redirigir a la URL de checkout de Stripe
        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error('No se recibió URL de checkout');
        }
        
    } catch (error) {
        console.error('Error al procesar el pago:', error);
        
        // Mostrar error al usuario
        mostrarErrorPago('Error al procesar el pago. Por favor, inténtalo de nuevo.');
        
        // Restaurar botón
        btnProcederPago.innerHTML = textoOriginal;
        btnProcederPago.disabled = false;
    }
}

// Función para mostrar error de pago
function mostrarErrorPago(mensaje) {
    // Crear elemento de notificación de error
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion-error-pago';
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${mensaje}</span>
        </div>
    `;
    
    // Añadir estilos
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Añadir al DOM
    document.body.appendChild(notificacion);
    
    // Animar entrada
    setTimeout(() => {
        notificacion.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        notificacion.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 5000);
}

// Exportar funciones para uso global
window.cambiarCantidad = cambiarCantidad;
window.actualizarCantidad = actualizarCantidad;
window.mostrarModalEliminar = mostrarModalEliminar;
window.eliminarProducto = eliminarProducto;
window.cerrarModalConfirmacion = cerrarModalConfirmacion;
window.añadirAlCarrito = añadirAlCarrito;
window.limpiarCarrito = limpiarCarrito;
window.enviarCarritoARender = enviarCarritoARender;
