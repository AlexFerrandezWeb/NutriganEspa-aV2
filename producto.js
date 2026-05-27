// Supabase
const SUPABASE_URL = 'https://sajxwtxafdtcrlynegqp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_J5S8W6Ume00gCtaKcUInZw_SoJnyKb1';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// JavaScript para la página individual del producto
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');

    if (productoId) {
        cargarProducto(productoId);
    } else {
        mostrarError('No se ha especificado un producto');
    }

    configurarEventListeners();
});

// Recargar si el navegador restaura la página desde bfcache (botón atrás)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        const urlParams = new URLSearchParams(window.location.search);
        const productoId = urlParams.get('id');
        if (productoId) cargarProducto(productoId);
    }
});

// Variables globales
let productoActual = null;
let cantidadActual = 1;

// Función para cargar el producto
async function cargarProducto(id) {
    try {
        const { data: producto, error } = await sb
            .from('productos')
            .select('*')
            .eq('id', parseInt(id))
            .single();

        if (error) throw error;

        if (producto) {
            productoActual = producto;
            mostrarProducto(producto);
            inyectarSchemaProducto(producto);
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

    // Informar a Google Analytics del producto específico visitado
    if (typeof gtag === 'function') {
        gtag('event', 'page_view', {
            page_title: `${producto.nombre} | Nutrigan España`,
            page_location: window.location.href,
            page_path: window.location.pathname + window.location.search
        });
    }
    
    // Actualizar breadcrumb
    document.getElementById('breadcrumb-nombre').textContent = producto.nombre;
    
    // Actualizar hero
    document.getElementById('producto-nombre').textContent = producto.nombre;
    
    // Actualizar información principal
    document.getElementById('producto-titulo-detalle').textContent = producto.nombre;
    
    // Manejar precio unitario y cantidad mínima
    if (producto.cantidad_minima && producto.cantidad_minima > 1) {
        document.getElementById('producto-precio').innerHTML = `
            <span class="precio-unitario">€${producto.precio_unitario.toFixed(2)} <small>/unidad</small></span>
            <div class="precio-info">
                <small>Mínimo: ${producto.cantidad_minima} unidades</small>
            </div>
            <span class="precio-iva">IVA inc.</span>
        `;
        // Establecer cantidad inicial al mínimo
        document.getElementById('cantidad-producto').value = producto.cantidad_minima;
        cantidadActual = producto.cantidad_minima;
    } else {
        document.getElementById('producto-precio').innerHTML = `€${producto.precio.toFixed(2)} <span class="precio-iva">IVA inc.</span>`;
    }
    
    document.getElementById('producto-descripcion').innerHTML = `<p>${producto.descripcion}</p>`;
    
    // Actualizar características
    document.getElementById('producto-especie').textContent = producto.especie;
    document.getElementById('producto-tiempo-liberacion').textContent = producto.tiempo_liberacion;
    
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
        const { data, error } = await sb
            .from('productos')
            .select('id, nombre, descripcion, precio, imagen, categoria, especie, etapa, stock, destacado')
            .eq('categoria', categoria)
            .neq('id', parseInt(productoId))
            .limit(4);

        if (error) throw error;

        mostrarProductosRelacionados(data || []);

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
    
    // Obtener cantidad mínima del producto actual
    const cantidadMinima = productoActual?.cantidadMinima || 1;
    const cantidadMaxima = productoActual?.stock || 99;
    
    if (nuevaCantidad >= cantidadMinima && nuevaCantidad <= cantidadMaxima) {
        input.value = nuevaCantidad;
        // No llamar a actualizarCantidad aquí, el event listener 'input' lo hará automáticamente
    }
}

// Función para actualizar cantidad desde input
function actualizarCantidad() {
    const input = document.getElementById('cantidad-producto');
    const cantidad = parseInt(input.value);
    
    // Obtener cantidad mínima del producto actual
    const cantidadMinima = productoActual?.cantidadMinima || 1;
    const cantidadMaxima = productoActual?.stock || 99;
    
    if (cantidad >= cantidadMinima && cantidad <= cantidadMaxima) {
        cantidadActual = cantidad;
        actualizarBotonesCantidad();
    } else {
        // Si la cantidad es menor al mínimo, establecer al mínimo
        if (cantidad < cantidadMinima) {
            input.value = cantidadMinima;
            cantidadActual = cantidadMinima;
        } else {
            input.value = cantidadActual;
        }
        actualizarBotonesCantidad();
    }
}

// Función para actualizar botones de cantidad
function actualizarBotonesCantidad() {
    const cantidadMenos = document.getElementById('cantidad-menos');
    const cantidadMas = document.getElementById('cantidad-mas');
    
    const cantidadMinima = productoActual?.cantidadMinima || 1;
    const cantidadMaxima = productoActual?.stock || 99;
    
    cantidadMenos.disabled = cantidadActual <= cantidadMinima;
    cantidadMas.disabled = cantidadActual >= cantidadMaxima;
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
    
    // Calcular precio total basado en precio unitario si existe
    let precioTotal = productoActual.precio;
    if (productoActual.precio_unitario && productoActual.cantidad_minima) {
        precioTotal = productoActual.precio_unitario * cantidadActual;
    }
    
    const productoCarrito = {
        id: productoActual.id,
        nombre: productoActual.nombre,
        descripcion: productoActual.descripcion,
        precio: precioTotal,
        precioUnitario: productoActual.precio_unitario || productoActual.precio,
        cantidadMinima: productoActual.cantidad_minima || 1,
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
            // Cargar el producto para obtener la ficha técnica
            const { data: producto, error: fichaError } = await sb
                .from('productos')
                .select('ficha_tecnica')
                .eq('id', parseInt(productoId))
                .single();
            if (fichaError) throw fichaError;
            console.log('Producto encontrado:', producto);

            if (producto && producto.ficha_tecnica) {
                try {
                    // Verificar que el recurso exista antes de abrir
                    const headResp = await fetch(producto.ficha_tecnica, { method: 'HEAD' });
                    if (headResp.ok) {
                        console.log('Abriendo ficha técnica:', producto.ficha_tecnica);
                        window.open(producto.ficha_tecnica, '_blank');
                    } else {
                        console.warn('Ficha técnica no encontrada (HEAD no OK):', producto.ficha_tecnica);
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

function inyectarSchemaProducto(producto) {
    const existente = document.getElementById('schema-producto');
    if (existente) existente.remove();

    const disponibilidad = producto.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock';

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': producto.nombre,
        'description': producto.descripcion,
        'image': producto.imagen,
        'url': window.location.href,
        'brand': { '@type': 'Brand', 'name': 'Nutrigan España' },
        'offers': {
            '@type': 'Offer',
            'priceCurrency': 'EUR',
            'price': parseFloat(producto.precio).toFixed(2),
            'priceValidUntil': '2027-12-31',
            'itemCondition': 'https://schema.org/NewCondition',
            'availability': disponibilidad,
            'url': window.location.href,
            'seller': { '@type': 'Organization', 'name': 'Nutrigan España' },
            'shippingDetails': {
                '@type': 'OfferShippingDetails',
                'shippingRate': { '@type': 'MonetaryAmount', 'value': '0', 'currency': 'EUR' },
                'shippingDestination': { '@type': 'DefinedRegion', 'addressCountry': 'ES' },
                'deliveryTime': {
                    '@type': 'ShippingDeliveryTime',
                    'handlingTime': { '@type': 'QuantitativeValue', 'minValue': 0, 'maxValue': 1, 'unitCode': 'DAY' },
                    'transitTime': { '@type': 'QuantitativeValue', 'minValue': 5, 'maxValue': 10, 'unitCode': 'DAY' }
                }
            },
            'hasMerchantReturnPolicy': {
                '@type': 'MerchantReturnPolicy',
                'applicableCountry': 'ES',
                'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
                'merchantReturnDays': 14,
                'returnMethod': 'https://schema.org/ReturnByMail',
                'returnFees': 'https://schema.org/ReturnFeesCustomerResponsibility',
                'merchantReturnLink': 'https://www.xn--nutriganespaa-tkb.com/politica-devoluciones.html'
            }
        }
    };

    const script = document.createElement('script');
    script.id = 'schema-producto';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
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
