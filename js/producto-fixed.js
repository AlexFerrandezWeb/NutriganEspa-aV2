async function cargarProductos() {
    try {
        const res = await fetch("productos.json");
        const productos = await res.json();
        const container = document.getElementById("productos-container");
        
        if (container) {
            productos.forEach(p => {
                const div = document.createElement("div");
                div.classList.add("producto");
                const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
                const isInCart = carrito.some(item => item.nombre === p.nombre);
                
                div.innerHTML = `
                    <img src="${p.imagen}" alt="${p.nombre}">
                    <h3>${p.nombre}</h3>
                    <p>€${p.precio.toFixed(2)}</p>
                    <button onclick="addToCart('${p.nombre}', ${p.precio}, ${p.iva}, '${p.imagen}')" ${isInCart ? "disabled" : ""}>
                        ${isInCart ? "Añadido" : "Añadir al carrito"}
                    </button>
                `;
                container.appendChild(div);
            });
        }
        updateCartCounter();
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

function addToCart(nombre, precio, iva, imagen) {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const precioFinal = precio * (1 + iva / 100);
    
    const index = carrito.findIndex(item => item.nombre === nombre);
    if (index !== -1) {
        carrito[index].cantidad += 1;
    } else {
        carrito.push({
            nombre: nombre,
            precio: precio,
            precioFinal: precioFinal,
            cantidad: 1,
            imagen: imagen
        });
    }
    
    localStorage.setItem("carrito", JSON.stringify(carrito));
    alert(`"${nombre}" añadido al carrito`);
    updateCartCounter();
}

function updateCartCounter() {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const carritoContador = document.getElementById("carrito-contador");
    let totalCantidad = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    carritoContador.textContent = totalCantidad;
}

// Cargar productos cuando se carga la página
window.onload = cargarProductos;

// Código para la página de producto individual
document.addEventListener("DOMContentLoaded", async function() {
    try {
        const params = new URLSearchParams(window.location.search);
        const productoId = params.get("id");
        
        if (!productoId) {
            window.location.href = "index.html";
            return;
        }
        
        const response = await fetch("productos.json");
        const productos = await response.json();
        const producto = productos.find(p => p.id == productoId);
        
        if (!producto) {
            window.location.href = "index.html";
            return;
        }
        
        // Actualizar elementos de la página
        document.getElementById("producto-img").src = producto.imagen;
        document.getElementById("producto-wpp").href = producto.wpp;
        document.getElementById("producto-name").textContent = producto.nombre;
        document.getElementById("producto-descripcion").textContent = producto.descripcion;
        document.getElementById("producto-bolos").textContent = producto.bolos;
        document.getElementById("producto-precio").textContent = `${producto.precio.toFixed(2)}€`;
        document.getElementById("producto-iva").textContent = `+${producto.iva}% IVA`;
        
        const precioFinal = producto.precio * (1 + producto.iva / 100);
        document.getElementById("producto-precioFinal").textContent = `${precioFinal.toFixed(2)}€`;
        
        const pdfLink = document.getElementById("producto-pdf");
        if (producto.pdf) {
            pdfLink.href = producto.pdf;
        } else {
            pdfLink.style.display = "none";
        }
        
        const btnAnadir = document.querySelector(".añadir-carrito");
        if (btnAnadir) {
            btnAnadir.onclick = function() {
                try {
                    const precioTexto = document.getElementById("producto-precio").textContent;
                    const precio = parseFloat(precioTexto.replace("€", "").trim());
                    const precioFinal = precio * (1 + producto.iva / 100);
                    
                    if (isNaN(precio)) {
                        console.error("Error: El precio no es válido", precioTexto);
                        return;
                    }
                    
                    const nuevaCantidad = parseInt(document.getElementById("contador").value) || 1;
                    
                    const productoParaCarrito = {
                        id: productoId,
                        nombre: producto.nombre,
                        precio: precio,
                        precioFinal: precioFinal,
                        cantidad: nuevaCantidad,
                        imagen: producto.imagen
                    };
                    
                    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
                    const index = carrito.findIndex(item => item.id === productoId);
                    
                    if (index !== -1) {
                        carrito[index].cantidad = nuevaCantidad;
                    } else {
                        carrito.push(productoParaCarrito);
                    }
                    
                    localStorage.setItem("carrito", JSON.stringify(carrito));
                    actualizarContadorCarrito();
                    
                    btnAnadir.textContent = "¡Añadido!";
                    btnAnadir.style.backgroundColor = "#E67E22";
                    btnAnadir.style.color = "white";
                    btnAnadir.disabled = true;
                    
                } catch (error) {
                    console.error("Error al añadir al carrito:", error);
                    alert("Hubo un error al añadir el producto al carrito");
                }
            };
        }
        
        // Configurar botones de cantidad
        const contador = document.getElementById("contador");
        if (contador) {
            document.querySelector(".boton:first-of-type")?.addEventListener("click", () => {
                let valor = parseInt(contador.value) || 1;
                if (valor > 1) contador.value = valor - 1;
            });
            
            document.querySelector(".boton:last-of-type")?.addEventListener("click", () => {
                let valor = parseInt(contador.value) || 1;
                if (valor < 99) contador.value = valor + 1;
            });
        }
        
    } catch (error) {
        console.error("Error:", error);
        window.location.href = "index.html";
    }
});

function actualizarContadorCarrito() {
    const contador = document.getElementById("carrito-contador");
    if (contador) {
        const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        contador.textContent = totalItems;
    }
}
