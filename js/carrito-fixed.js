// Función para actualizar cantidad de producto
function actualizarCantidad(index, valor) {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const cantidad = Math.min(Math.max(1, parseInt(valor) || 1), 99);
    carrito[index].cantidad = cantidad;
    localStorage.setItem("carrito", JSON.stringify(carrito));
    mostrarCarrito();
    actualizarContadorCarrito();
}

// Función para eliminar producto del carrito
function eliminarProducto(index) {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        carrito.splice(index, 1);
        localStorage.setItem("carrito", JSON.stringify(carrito));
        mostrarCarrito();
        actualizarContadorCarrito();
    }
}

// Función para mostrar el carrito en la tabla
function mostrarCarrito() {
    const tbody = document.getElementById("cart-body");
    if (!tbody) {
        console.error("No se encontró el elemento cart-body");
        return;
    }
    
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    console.log("Mostrando carrito:", carrito);
    
    carrito = consolidarCarrito(carrito);
    
    if (carrito.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="carrito-vacio">
                    <p>El carrito está vacío</p>
                    <a href="index.html">Ir a comprar</a>
                </td>
            </tr>`;
        actualizarTotal();
        return;
    }
    
    tbody.innerHTML = carrito.map((item, index) => `
        <tr>
            <td data-label="Producto">
                <div class="producto-info">
                    <img src="${item.imagen || '/assets/img-fav.webp'}" 
                         alt="${item.nombre}" 
                         class="producto-miniatura"
                         onerror="this.src='/assets/img-fav.webp'">
                    <span>${item.nombre}</span>
                </div>
            </td>
            <td data-label="Precio">${parseFloat(item.precioFinal || item.precio).toFixed(2)}€</td>
            <td data-label="Cantidad">
                <div class="cantidad-control">
                    <button onclick="cambiarCantidad(${index}, -1)">-</button>
                    <input type="number" 
                           value="${item.cantidad}" 
                           min="1" 
                           max="99" 
                           onchange="actualizarCantidad(${index}, this.value)">
                    <button onclick="cambiarCantidad(${index}, 1)">+</button>
                </div>
            </td>
            <td data-label="Subtotal">${(parseFloat(item.precioFinal || item.precio) * parseInt(item.cantidad)).toFixed(2)}€</td>
            <td data-label="Acciones">
                <button class="btn-eliminar" onclick="eliminarProducto(${index})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join("");
    
    actualizarTotal();
}

// Función para actualizar el total del carrito
function actualizarTotal() {
    const totalElement = document.getElementById("total");
    if (!totalElement) {
        console.error("No se encontró el elemento total");
        return;
    }
    
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    console.log("Carrito actual:", carrito);
    
    const total = carrito.reduce((sum, item) => {
        const precio = parseFloat(item.precioFinal || item.precio);
        const cantidad = parseInt(item.cantidad);
        console.log(`Producto: ${item.nombre}, Precio: ${precio}, Cantidad: ${cantidad}`);
        return sum + (precio * cantidad);
    }, 0);
    
    console.log("Total calculado:", total);
    totalElement.textContent = total.toFixed(2);
}

// Función para cambiar cantidad con botones +/-
function cambiarCantidad(index, cambio) {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const nuevaCantidad = parseInt(carrito[index].cantidad) + cambio;
    
    if (nuevaCantidad >= 1 && nuevaCantidad <= 99) {
        carrito[index].cantidad = nuevaCantidad;
        localStorage.setItem("carrito", JSON.stringify(carrito));
        mostrarCarrito();
        actualizarContadorCarrito();
    }
}

// Función para actualizar contador del carrito
function actualizarContadorCarrito() {
    const contador = document.getElementById("carrito-contador");
    if (contador) {
        const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        const totalItems = carrito.reduce((sum, item) => sum + parseInt(item.cantidad), 0);
        contador.textContent = totalItems;
    }
}

// Función para vaciar carrito
function vaciarCarrito() {
    if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
        localStorage.setItem("carrito", JSON.stringify([]));
        mostrarCarrito();
        actualizarContadorCarrito();
    }
}

// Función para consolidar productos duplicados
function consolidarCarrito(carrito) {
    const carritoConsolidado = [];
    const productosVistos = {};
    
    carrito.forEach(item => {
        const precio = parseFloat(item.precio);
        const cantidad = parseInt(item.cantidad);
        
        if (productosVistos[item.id]) {
            const index = carritoConsolidado.findIndex(p => p.id === item.id);
            carritoConsolidado[index].cantidad = Math.min(carritoConsolidado[index].cantidad + cantidad, 99);
        } else {
            productosVistos[item.id] = true;
            carritoConsolidado.push({
                ...item,
                precio: precio,
                cantidad: cantidad
            });
        }
    });
    
    return carritoConsolidado;
}

// Event listeners cuando se carga la página
document.addEventListener("DOMContentLoaded", function() {
    console.log("Cargando carrito...");
    mostrarCarrito();
    actualizarContadorCarrito();
    
    const btnFinalizar = document.getElementById("finalizar-compra");
    if (btnFinalizar) {
        btnFinalizar.disabled = false;
        btnFinalizar.textContent = "Finalizar compra";
        
        btnFinalizar.addEventListener("click", async () => {
            const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
            
            if (carrito.length === 0) {
                alert("El carrito está vacío");
                return;
            }
            
            try {
                btnFinalizar.disabled = true;
                btnFinalizar.textContent = "Procesando...";
                
                const total = carrito.reduce((sum, item) => sum + (parseFloat(item.precioFinal || item.precio) * parseInt(item.cantidad)), 0);
                
                const response = await fetch("http://localhost:3000/api/crear-sesion-stripe", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        productos: carrito,
                        total: total,
                        moneda: "eur"
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    window.location.href = data.url;
                } else {
                    alert("Error al procesar el pago: " + data.message);
                    btnFinalizar.disabled = false;
                    btnFinalizar.textContent = "Finalizar compra";
                }
            } catch (error) {
                console.error("Error detallado:", error);
                alert("Error al conectar con el servidor de pagos: " + error.message);
                btnFinalizar.disabled = false;
                btnFinalizar.textContent = "Finalizar compra";
            }
        });
    }
    
    // Event listener para el botón vaciar carrito
    const btnVaciar = document.getElementById("vaciar-carrito");
    if (btnVaciar) {
        btnVaciar.addEventListener("click", vaciarCarrito);
    }
});

// Event listener para detectar cuando el usuario vuelve atrás
window.addEventListener("pageshow", function(event) {
    if (event.persisted || window.performance.navigation.type == 2) {
        const btnFinalizar = document.getElementById("finalizar-compra");
        if (btnFinalizar) {
            btnFinalizar.disabled = false;
            btnFinalizar.textContent = "Finalizar compra";
        }
    }
});
