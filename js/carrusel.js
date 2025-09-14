document.addEventListener('DOMContentLoaded', function() {
    const imagenes = [
        document.getElementById('img-carrusel'),
        document.getElementById('img-carrusel2'),
        document.getElementById('img-carrusel3'),
        document.getElementById('img-carrusel4'),
        document.getElementById('img-carrusel5')
    ];
    
    const puntos = document.querySelectorAll('.punto');
    const btnPrev = document.querySelector('.carrusel-btn.prev');
    const btnNext = document.querySelector('.carrusel-btn.next');
    
    let indiceActual = 0;
    let intervalo;
    
    // Mostrar la primera imagen y punto
    imagenes[0].classList.add('active');
    puntos[0].classList.add('active');
    
    // Función para cambiar de imagen
    function cambiarImagen(nuevoIndice) {
        // Remover clases activas
        imagenes[indiceActual].classList.remove('active');
        puntos[indiceActual].classList.remove('active');
        
        // Actualizar índice
        indiceActual = nuevoIndice;
        
        // Añadir clases activas
        imagenes[indiceActual].classList.add('active');
        puntos[indiceActual].classList.add('active');
    }
    
    // Función para la siguiente imagen
    function siguienteImagen() {
        const nuevoIndice = (indiceActual + 1) % imagenes.length;
        cambiarImagen(nuevoIndice);
    }
    
    // Función para la imagen anterior
    function anteriorImagen() {
        const nuevoIndice = (indiceActual - 1 + imagenes.length) % imagenes.length;
        cambiarImagen(nuevoIndice);
    }
    
    // Event listeners para los botones con soporte táctil
    btnPrev.addEventListener('click', function(e) {
        e.preventDefault();
        clearInterval(intervalo);
        anteriorImagen();
        reiniciarIntervalo();
    });
    
    btnNext.addEventListener('click', function(e) {
        e.preventDefault();
        clearInterval(intervalo);
        siguienteImagen();
        reiniciarIntervalo();
    });
    
    // Event listeners táctiles adicionales
    btnPrev.addEventListener('touchstart', function(e) {
        e.preventDefault();
        clearInterval(intervalo);
        anteriorImagen();
        reiniciarIntervalo();
    });
    
    btnNext.addEventListener('touchstart', function(e) {
        e.preventDefault();
        clearInterval(intervalo);
        siguienteImagen();
        reiniciarIntervalo();
    });
    
    // Event listeners para los puntos
    puntos.forEach((punto, index) => {
        punto.addEventListener('click', function(e) {
            e.preventDefault();
            clearInterval(intervalo);
            cambiarImagen(index);
            reiniciarIntervalo();
        });
        
        punto.addEventListener('touchstart', function(e) {
            e.preventDefault();
            clearInterval(intervalo);
            cambiarImagen(index);
            reiniciarIntervalo();
        });
    });
    
    // Función para reiniciar el intervalo
    function reiniciarIntervalo() {
        clearInterval(intervalo);
        intervalo = setInterval(siguienteImagen, 7000);
    }
    
    // Iniciar el intervalo
    reiniciarIntervalo();
}); 