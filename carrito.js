// Supabase
const SUPABASE_URL = 'https://sajxwtxafdtcrlynegqp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_J5S8W6Ume00gCtaKcUInZw_SoJnyKb1';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function escHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Disponibilidad de cara al cliente (misma regla que estaDisponible() en server.js).
// El !== false es deliberado: un dato ausente o nulo cuenta como disponible, para
// no esconder productos por un problema de datos. Quien de verdad impide cobrar un
// agotado es verificarStock() en el servidor, no esto.
function estaDisponible(producto) {
    return producto && producto.disponible !== false;
}

// Genera el slug de una URL limpia a partir del nombre (igual que server.js)
function slugify(str) {
    return String(str || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[®™©]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// JavaScript para la página del Carrito
document.addEventListener('DOMContentLoaded', async function() {
    inicializarCarrito();
    await sincronizarPreciosCarrito();
    cargarCarrito();
    actualizarInterfazCarrito();
    configurarEventListeners();
    observarBotonResumen();
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

// Sincroniza precio, nombre e imagen de cada item del carrito con Supabase
async function sincronizarPreciosCarrito() {
    if (carrito.length === 0) return;

    const ids = carrito.map(p => p.id);
    const { data, error } = await sb
        .from('productos')
        .select('id, nombre, precio, precio_unitario, imagen, stock, disponible')
        .in('id', ids);

    if (error || !data) return;

    let actualizado = false;
    carrito.forEach(item => {
        const actual = data.find(p => p.id === item.id);
        if (!actual) return;
        if (item.precio !== parseFloat(actual.precio)) {
            item.precio = parseFloat(actual.precio);
            actualizado = true;
        }
        if (item.nombre !== actual.nombre) { item.nombre = actual.nombre; actualizado = true; }
        if (item.imagen !== actual.imagen) { item.imagen = actual.imagen; actualizado = true; }
        // Un producto puede haberse marcado como agotado despues de anadirlo al
        // carrito. Lo reflejamos aqui para avisar antes de que llegue al pago.
        const disponibleAhora = estaDisponible(actual);
        if (item.disponible !== disponibleAhora) { item.disponible = disponibleAhora; actualizado = true; }
    });

    if (actualizado) localStorage.setItem('carrito', JSON.stringify(carrito));
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
        // Actualizar contador cuando el carrito está vacío
        console.log('Llamando a actualizarResumenCarrito desde carrito vacío');
        actualizarResumenCarrito();
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
    
    const precioUnitario = producto.precio;
    const precioTotal = producto.precio * producto.cantidad;
    const cantidadMinima = producto.cantidadMinima || 1;
    
    itemDiv.innerHTML = `
        <a href="/producto/${slugify(producto.nombre)}" class="carrito-item-enlace-completo">
            <div class="carrito-item-imagen">
                <img src="${escHTML(producto.imagen)}" alt="${escHTML(producto.nombre)}" loading="lazy">
            </div>
            <div class="carrito-item-info">
                <h3 class="carrito-item-nombre">${escHTML(producto.nombre)}</h3>
                <p class="carrito-item-descripcion">${escHTML(producto.descripcion || 'Producto de nutrición animal')}</p>
                ${cantidadMinima > 1 ? `<small class="cantidad-minima-info">Mínimo: ${cantidadMinima} unidades</small>` : ''}
                ${!estaDisponible(producto) ? '<small class="carrito-item-agotado">Agotado temporalmente — retíralo para continuar</small>' : ''}
            </div>
        </a>
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
        guardarCarrito();
        cargarCarrito();
    } else {
        const input = document.querySelector(`[data-index="${index}"] .cantidad-input`);
        if (input) input.value = producto.cantidad;
        if (cantidad < cantidadMinima) {
            producto.cantidad = cantidadMinima;
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
        // Actualizar contador inmediatamente después de eliminar
        actualizarContadorCarrito();
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

// Los dos botones que disparan el pago: el del resumen lateral (escritorio) y el
// de la barra fija (móvil). Se devuelven juntos para que el estado -deshabilitado,
// spinner de "Procesando..."- se aplique siempre a los dos y no haya uno que se
// quede desincronizado segun el tamano de pantalla.
function botonesPago() {
    return [
        document.getElementById('btn-proceder-pago'),
        document.getElementById('btn-pagar-movil'),
    ].filter(Boolean);
}

// Función para actualizar resumen del carrito
function actualizarResumenCarrito() {
    const subtotalElement = document.getElementById('subtotal');
    const envioElement = document.getElementById('envio');
    const totalElement = document.getElementById('total');
    const cantidadTotalElement = document.getElementById('carrito-cantidad-total');

    const subtotal = carrito.reduce((total, producto) => {
        return total + (producto.precio * producto.cantidad);
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
    
    // Habilitar/deshabilitar botón de proceder al pago. Se bloquea tambien si
    // algun producto se marco como agotado mientras estaba en el carrito; el
    // servidor lo rechazaria igualmente, pero asi el aviso llega antes.
    const hayAgotados = carrito.some(p => !estaDisponible(p));
    const bloqueado = carrito.length === 0 || hayAgotados;
    const aviso = hayAgotados
        ? 'Hay productos agotados en tu carrito. Retíralos para continuar.'
        : '';

    botonesPago().forEach(btn => {
        btn.disabled = bloqueado;
        btn.title = aviso;
    });

    actualizarBarraMovil(total, hayAgotados);

    // Actualizar contador en el nav
    actualizarContadorCarrito();
}

// Repliega la barra fija cuando el botón de pago del resumen ya está a la vista,
// para no enseñar dos botones idénticos a la vez.
//
// El rootMargin recorta la franja inferior de la pantalla con la altura de la propia
// barra: así el botón del resumen solo cuenta como "visible" cuando ha subido por
// encima de la barra, y no en el momento en que asoma justo por detrás de ella.
// Marca en el body si la barra está ocupando de verdad el borde inferior, que no
// es lo mismo que "hay productos en el carrito": con .replegada la barra sale de
// pantalla. De aquí cuelga la posición del botón de WhatsApp, que solo debe
// apartarse mientras la barra se vea; el resto del tiempo vuelve a donde está en
// las demás páginas.
function sincronizarBarraALaVista() {
    const barra = document.getElementById('carrito-barra-movil');
    if (!barra) return;

    const aLaVista = barra.classList.contains('visible') && !barra.classList.contains('replegada');
    document.body.classList.toggle('barra-pago-a-la-vista', aLaVista);
}

function observarBotonResumen() {
    const barra = document.getElementById('carrito-barra-movil');
    const btnResumen = document.getElementById('btn-proceder-pago');
    if (!barra || !btnResumen || !('IntersectionObserver' in window)) return;

    const alturaBarra = 90; // alto de la barra (70px) + un margen de respeto

    const observador = new IntersectionObserver(([entrada]) => {
        barra.classList.toggle('replegada', entrada.isIntersecting);
        sincronizarBarraALaVista();
    }, {
        root: null,
        rootMargin: `0px 0px -${alturaBarra}px 0px`,
        threshold: 0,
    });

    observador.observe(btnResumen);
}

// Refleja el estado del carrito en la barra fija de móvil. La barra solo se muestra
// si hay algo que pagar; el CSS se encarga de que ademas nunca aparezca en escritorio.
function actualizarBarraMovil(total, hayAgotados) {
    const barra = document.getElementById('carrito-barra-movil');
    if (!barra) return;

    const visible = carrito.length > 0;
    barra.classList.toggle('visible', visible);
    barra.classList.toggle('tiene-agotados', hayAgotados);
    // Esta clase reserva el hueco del footer mientras haya algo que pagar. El
    // botón de WhatsApp no cuelga de aquí, sino de .barra-pago-a-la-vista.
    document.body.classList.toggle('con-barra-pago', visible);
    sincronizarBarraALaVista();

    const etiqueta = document.getElementById('barra-movil-etiqueta');
    const importe = document.getElementById('barra-movil-importe');
    if (!etiqueta || !importe) return;

    if (hayAgotados) {
        // Texto corto a propósito: en pantallas de 360-390px el hueco de la barra
        // deja unos 120px, y un mensaje más largo se parte en tres líneas.
        etiqueta.textContent = 'Agotado';
        importe.textContent = 'Revisa tu carrito';
    } else {
        etiqueta.textContent = 'Total';
        importe.textContent = `€${total.toFixed(2)}`;
    }
}

// Función para actualizar contador del carrito en el nav
function actualizarContadorCarrito() {
    const contador = document.getElementById('carrito-contador');
    if (!contador) {
        console.warn('Contador del carrito no encontrado');
        return;
    }
    
    const cantidadTotal = carrito.reduce((total, producto) => total + producto.cantidad, 0);
    console.log('Actualizando contador del carrito:', cantidadTotal);
    
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
    
    // Botón de proceder al pago → checkout de Stripe
    const btnProcederPago = document.getElementById('btn-proceder-pago');
    if (btnProcederPago) {
        btnProcederPago.addEventListener('click', function() {
            if (carrito.length > 0) {
                // Enviar datos del carrito a tu backend de Render
                enviarCarritoARender();
            }
        });
    }

    // El botón de la barra móvil reenvía al de escritorio en lugar de repetir la
    // llamada: así la lógica de pago sigue viviendo en un único sitio. Si el botón
    // está deshabilitado (carrito vacío o con agotados), .click() no hace nada.
    const btnPagarMovil = document.getElementById('btn-pagar-movil');
    if (btnPagarMovil && btnProcederPago) {
        btnPagarMovil.addEventListener('click', function() {
            btnProcederPago.click();
        });
    }
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

    if (window.NutriganGA) {
        NutriganGA.anadirAlCarrito(producto, producto.cantidad || 1);
    }

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

// Función para obtener la URL correcta de la API
function getApiUrl(endpoint) {
    // Siempre usar Render para la API (tanto en desarrollo como en producción)
    return `https://nutrigan-web.onrender.com${endpoint}`;
}

// Función para enviar carrito a Render
async function enviarCarritoARender() {
    // El estado se aplica a los dos botones (resumen de escritorio y barra móvil).
    // Antes iba solo al de escritorio, que en móvil está oculto: el usuario tocaba
    // "Proceder al Pago" y no veía ninguna reacción mientras se llamaba a Stripe.
    const botones = botonesPago();
    const textosOriginales = botones.map(b => b.innerHTML);

    botones.forEach(b => {
        b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        b.disabled = true;
    });

    try {
        // Preparar datos del carrito
        const datosCarrito = {
            productos: carrito,
            total: carrito.reduce((total, producto) => {
                const precioUnitario = producto.precioUnitario || producto.precio;
                return total + (precioUnitario * producto.cantidad);
            }, 0),
            cantidadTotal: carrito.reduce((total, producto) => total + producto.cantidad, 0),
            timestamp: new Date().toISOString()
        };
        
        console.log('🛒 Enviando datos del carrito:', datosCarrito);
        console.log('🌐 URL de la API:', getApiUrl('/api/create-checkout-session'));
        
        // Enviar datos a Render usando getApiUrl
        const response = await fetch(getApiUrl('/api/create-checkout-session'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosCarrito)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.productosSinStock) {
                // Manejar error de stock insuficiente
                mostrarErrorStock(errorData.productosSinStock);
                // Restaurar los botones antes de salir: sin esto se quedaban
                // clavados en "Procesando..." y deshabilitados para siempre, con
                // lo que el usuario ya no podía reintentar sin recargar.
                botones.forEach((b, i) => {
                    b.innerHTML = textosOriginales[i];
                    b.disabled = false;
                });
                return;
            }
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Redirigir a la URL de checkout de Stripe
        if (data.url) {
            if (window.NutriganGA) {
                NutriganGA.iniciarCheckout(datosCarrito.productos, datosCarrito.total);
            }
            window.location.href = data.url;
        } else {
            throw new Error('No se recibió URL de checkout');
        }
        
    } catch (error) {
        console.error('Error al procesar el pago:', error);
        
        // Mostrar error al usuario
        mostrarErrorPago('Error al procesar el pago. Por favor, inténtalo de nuevo.');
        
        // Restaurar ambos botones a su texto y estado previos
        botones.forEach((b, i) => {
            b.innerHTML = textosOriginales[i];
            b.disabled = false;
        });
    }
}

// Función para mostrar error de stock insuficiente
function mostrarErrorStock(productosSinStock) {
    let mensaje = '❌ Stock insuficiente para los siguientes productos:\n\n';
    
    productosSinStock.forEach(producto => {
        if (producto.error) {
            mensaje += `• ${producto.nombre}: ${producto.error}\n`;
        } else {
            mensaje += `• ${producto.nombre}: Solo quedan ${producto.stockDisponible} unidades (solicitadas: ${producto.cantidadSolicitada})\n`;
        }
    });
    
    mensaje += '\nPor favor, ajusta las cantidades o elimina los productos sin stock.';
    
    // Mostrar alerta con el error
    alert(mensaje);
    
    // Crear notificación visual adicional
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion-error';
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Stock insuficiente para algunos productos</span>
        </div>
    `;
    
    document.body.appendChild(notificacion);
    
    // Mostrar notificación
    setTimeout(() => {
        notificacion.style.transform = 'translateX(0)';
    }, 100);
    
    // Ocultar notificación después de 5 segundos
    setTimeout(() => {
        notificacion.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 5000);
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
