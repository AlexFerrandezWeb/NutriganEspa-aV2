// Función para obtener la URL correcta de la API
function getApiUrl(endpoint) {
    console.log('🔍 [CONFIG] Detectando entorno:', {
        hostname: window.location.hostname,
        port: window.location.port,
        href: window.location.href
    });
    
    // Siempre usar Render para la API (tanto en desarrollo como en producción)
    console.log('🌐 [CONFIG] Usando nutrigan-web.onrender.com para la API');
    return `https://nutrigan-web.onrender.com${endpoint}`;
}

// Configuración de Stripe
// Este archivo se carga antes que otros scripts para configurar las claves
window.STRIPE_CONFIG = {
    // Las claves se cargarán desde el servidor para mayor seguridad
    publicKey: null,
    isProduction: false
};

// Función para cargar la configuración desde el servidor
async function loadStripeConfig() {
    try {
        const response = await fetch(getApiUrl('/api/stripe-config'));
        const config = await response.json();
        window.STRIPE_CONFIG = config;
        console.log('Configuración de Stripe cargada:', config);
    } catch (error) {
        console.error('Error al cargar configuración de Stripe:', error);
        // Fallback a claves de prueba si hay error
        window.STRIPE_CONFIG = {
            publicKey: 'pk_test_51QATRLCliuoc4d4YBAwi0Ey0ckFiXDoR23g3bHZ1OtgTuhkPEFwdyceMu2V1JkSwe55FFmmjzTcbVeYbKsiYerHe00BrJJykki',
            isProduction: false
        };
    }
}

// Cargar configuración al cargar la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStripeConfig);
} else {
    loadStripeConfig();
}
