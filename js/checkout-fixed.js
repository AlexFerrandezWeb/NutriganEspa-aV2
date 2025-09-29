// Función para obtener la URL correcta de la API
function getApiUrl(endpoint) {
    console.log('🔍 [CHECKOUT] Detectando entorno:', {
        hostname: window.location.hostname,
        port: window.location.port,
        href: window.location.href
    });
    
    // Siempre usar Render para la API (tanto en desarrollo como en producción)
    console.log('🌐 [CHECKOUT] Usando nutrigan-web.onrender.com para la API');
    return `https://nutrigan-web.onrender.com${endpoint}`;
}

// Función para actualizar la barra de progreso
function actualizarProgreso(paso) {
    const progreso = document.getElementById('progreso');
    const porcentaje = (paso / 3) * 100;
    progreso.style.width = porcentaje + '%';
}

// Función para validar formulario
function validarFormulario() {
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value;
    
    if (!nombre || !email || !direccion || !metodoPago) {
        alert('Por favor, completa todos los campos obligatorios.');
        return false;
    }
    
    if (metodoPago === 'tarjeta') {
        const numeroTarjeta = document.getElementById('numeroTarjeta').value.trim();
        const fechaExpiracion = document.getElementById('fechaExpiracion').value.trim();
        const cvv = document.getElementById('cvv').value.trim();
        
        if (!numeroTarjeta || !fechaExpiracion || !cvv) {
            alert('Por favor, completa todos los datos de la tarjeta.');
            return false;
        }
    }
    
    return true;
}

// Función para procesar el pago
async function procesarPago() {
    if (!validarFormulario()) {
        return;
    }
    
    const btnProcesar = document.getElementById('procesar-pago');
    if (btnProcesar) {
        btnProcesar.disabled = true;
        btnProcesar.textContent = 'Procesando...';
    }
    
    try {
        // Recopilar datos del formulario
        const formData = {
            nombre: document.getElementById('nombre').value,
            email: document.getElementById('email').value,
            direccion: document.getElementById('direccion').value,
            metodoPago: document.querySelector('input[name="metodoPago"]:checked').value,
            numeroTarjeta: document.getElementById('numeroTarjeta').value,
            fechaExpiracion: document.getElementById('fechaExpiracion').value,
            cvv: document.getElementById('cvv').value
        };
        
        // Enviar datos al servidor
        const response = await fetch(getApiUrl('/api/procesar-pago'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Redirigir a página de éxito
            window.location.href = '/pago-exitoso.html';
        } else {
            alert('Error al procesar el pago: ' + result.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar el pago: ' + error.message);
    } finally {
        if (btnProcesar) {
            btnProcesar.disabled = false;
            btnProcesar.textContent = 'Procesar Pago';
        }
    }
}

// Integración con Stripe (usando configuración dinámica)
document.addEventListener('DOMContentLoaded', async function() {
    // Esperar a que se cargue la configuración de Stripe
    while (!window.STRIPE_CONFIG || !window.STRIPE_CONFIG.publicKey) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('Inicializando Stripe con configuración:', window.STRIPE_CONFIG);
    
    // Inicializar Stripe con la clave pública dinámica
    const stripe = Stripe(window.STRIPE_CONFIG.publicKey, {
        apiVersion: '2023-10-16',
        locale: 'es'
    });
    
    const elements = stripe.elements();
    
    // Crear el elemento de tarjeta
    const card = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
            invalid: {
                color: '#9e2146',
            },
        },
    });
    
    // Montar el elemento de tarjeta
    const cardElement = document.getElementById('card-element');
    if (cardElement) {
        card.mount(cardElement);
        
        // Manejar errores de validación en tiempo real
        card.addEventListener('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });
    }
    
    // Manejar el envío del formulario
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!validarFormulario()) {
                return;
            }
            
            const btnProcesar = document.getElementById('procesar-pago');
            if (btnProcesar) {
                btnProcesar.disabled = true;
                btnProcesar.textContent = 'Procesando...';
            }
            
            try {
                // Crear token de pago con Stripe
                const {token, error} = await stripe.createToken(card);
                
                if (error) {
                    throw new Error(error.message);
                }
                
                // Enviar token al servidor
                const response = await fetch(getApiUrl('/api/procesar-pago-stripe'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: token.id,
                        nombre: document.getElementById('nombre').value,
                        email: document.getElementById('email').value,
                        direccion: document.getElementById('direccion').value
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Error del servidor: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    window.location.href = '/pago-exitoso.html';
                } else {
                    throw new Error(result.message);
                }
                
            } catch (error) {
                console.error('Error:', error);
                alert('Error al procesar el pago: ' + error.message);
            } finally {
                if (btnProcesar) {
                    btnProcesar.disabled = false;
                    btnProcesar.textContent = 'Procesar Pago';
                }
            }
        });
    }
});

// Event listeners para actualizar progreso
document.getElementById("checkoutForm")?.addEventListener("input", function() {
    const nombre = document.getElementById("nombre").value;
    const email = document.getElementById("email").value;
    const direccion = document.getElementById("direccion").value;
    
    if (nombre && email && direccion) {
        actualizarProgreso(1);
    }
});

document.querySelectorAll('input[name="metodoPago"]').forEach(input => {
    input.addEventListener("change", function() {
        if (this.value === "tarjeta") {
            const numeroTarjeta = document.getElementById("numeroTarjeta").value;
            const fechaExpiracion = document.getElementById("fechaExpiracion").value;
            const cvv = document.getElementById("cvv").value;
            
            if (numeroTarjeta && fechaExpiracion && cvv) {
                actualizarProgreso(2);
            }
        } else {
            actualizarProgreso(2);
        }
    });
});
