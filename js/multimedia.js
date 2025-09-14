document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/multimedia.json');
        const data = await response.json();
        const container = document.getElementById('multimedia-container');
        
        data.secciones.forEach(seccion => {
            const seccionElement = document.createElement('div');
            seccionElement.className = 'multimedia-seccion';
            seccionElement.id = seccion.id;
            
            const titulo = document.createElement('h3');
            titulo.className = 'multimedia-seccion-titulo';
            titulo.textContent = seccion.titulo;
            seccionElement.appendChild(titulo);
            
            const contenidoContainer = document.createElement('div');
            contenidoContainer.className = 'multimedia-contenido';
            
            seccion.contenido.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'multimedia-item';
                
                if (seccion.tipo === 'imagen') {
                    const img = document.createElement('img');
                    img.src = item.archivo;
                    img.alt = item.alt;
                    img.loading = 'lazy';
                    img.className = 'multimedia-img';
                    itemElement.appendChild(img);
                } else if (seccion.tipo === 'youtube') {
                    const videoContainer = document.createElement('div');
                    videoContainer.className = 'youtube-container';
                    
                    const thumbnail = document.createElement('img');
                    thumbnail.src = item.thumbnail;
                    thumbnail.alt = item.titulo;
                    thumbnail.className = 'youtube-thumbnail';
                    
                    const playButton = document.createElement('div');
                    playButton.className = 'youtube-play-button';
                    playButton.innerHTML = '<svg viewBox="0 0 68 48"><path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>';
                    
                    videoContainer.appendChild(thumbnail);
                    videoContainer.appendChild(playButton);
                    
                    videoContainer.addEventListener('click', () => {
                        const iframe = document.createElement('iframe');
                        iframe.src = `https://www.youtube.com/embed/${item.videoId}?autoplay=1`;
                        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                        iframe.allowFullscreen = true;
                        iframe.className = 'youtube-iframe';
                        videoContainer.innerHTML = '';
                        videoContainer.appendChild(iframe);
                    });
                    
                    itemElement.appendChild(videoContainer);
                }
                
                const tituloItem = document.createElement('h4');
                tituloItem.className = 'multimedia-item-titulo';
                tituloItem.textContent = item.titulo;
                itemElement.appendChild(tituloItem);
                
                const descripcion = document.createElement('p');
                descripcion.className = 'multimedia-item-descripcion';
                descripcion.textContent = item.descripcion;
                itemElement.appendChild(descripcion);
                
                contenidoContainer.appendChild(itemElement);
            });
            
            seccionElement.appendChild(contenidoContainer);
            container.appendChild(seccionElement);
        });
    } catch (error) {
        console.error('Error al cargar el contenido multimedia:', error);
    }
}); 