/**
 * Genera el juego de iconos del sitio a partir del logotipo circular.
 *
 * El arte maestro (assets/logo-nutrigan-circulo.png, 480x480) es un círculo
 * blanco con el logotipo ocupando el 78 % del diámetro y un aro gris de 1 px.
 * A tamaño de pestaña (16-32 px) eso se ve como una mancha rectangular: la
 * palabra llega casi al borde y el aro desaparece, así que el icono pierde la
 * forma redonda — y sobre una barra de pestañas clara no se ve nada, porque es
 * blanco sobre blanco.
 *
 * Aquí se recorta solo el logotipo (sin el círculo del maestro) y se centra al
 * 62 % dentro de un círculo blanco, con el mismo filo gris tenue del maestro.
 * Ese margen es lo que devuelve la forma redonda: con el logotipo a sangre, el
 * bloque oscuro del texto llega a los bordes y el icono se lee como un
 * rectángulo.
 *
 * El maestro nunca se sobrescribe: se lee de un fichero y se escribe en otros,
 * de modo que el script se puede volver a ejecutar tantas veces como haga
 * falta (por ejemplo para cambiar el grosor del aro).
 *
 * Uso:  node scripts/generar-favicon.js
 * Salida: favicon.ico, assets/favicon-nutrigan.png, assets/apple-touch-icon.png
 *
 * Usa Playwright (ya está en devDependencies) como motor de dibujo: canvas del
 * navegador, sin añadir dependencias nativas de imagen al proyecto.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const MAESTRO = path.join(RAIZ, 'assets', 'logo-nutrigan-circulo.png');

const ARO = '#d8ded8';                // el mismo filo gris que trae el maestro
const LOGO = { x: 53, y: 182, w: 374, h: 117 };  // caja del logotipo en el maestro
const TAMANOS_ICO = [16, 32, 48, 64, 128];

/** Empaqueta varios PNG en un .ico (cada entrada guarda el PNG tal cual). */
function construirIco(imagenes) {
    const cabecera = Buffer.alloc(6);
    cabecera.writeUInt16LE(0, 0);
    cabecera.writeUInt16LE(1, 2);
    cabecera.writeUInt16LE(imagenes.length, 4);

    const entradas = [];
    let offset = 6 + imagenes.length * 16;
    for (const { tam, datos } of imagenes) {
        const e = Buffer.alloc(16);
        e.writeUInt8(tam >= 256 ? 0 : tam, 0);
        e.writeUInt8(tam >= 256 ? 0 : tam, 1);
        e.writeUInt8(0, 2);
        e.writeUInt8(0, 3);
        e.writeUInt16LE(1, 4);
        e.writeUInt16LE(32, 6);
        e.writeUInt32LE(datos.length, 8);
        e.writeUInt32LE(offset, 12);
        entradas.push(e);
        offset += datos.length;
    }
    return Buffer.concat([cabecera, ...entradas, ...imagenes.map(i => i.datos)]);
}

(async () => {
    const origenB64 = 'data:image/png;base64,' + fs.readFileSync(MAESTRO).toString('base64');
    const navegador = await chromium.launch();
    const pagina = await navegador.newPage();

    const salida = await pagina.evaluate(async ({ origenB64, ARO, LOGO, TAMANOS_ICO }) => {
        const img = new Image();
        img.src = origenB64;
        await img.decode();

        /**
         * @param n        lado en px
         * @param cuadrado true = fondo blanco a sangre (apple-touch-icon: iOS
         *                 aplica su propia máscara y no respeta transparencia)
         */
        function dibujar(n, cuadrado) {
            const c = document.createElement('canvas');
            c.width = n;
            c.height = n;
            const g = c.getContext('2d');
            g.imageSmoothingEnabled = true;
            g.imageSmoothingQuality = 'high';

            if (cuadrado) {
                g.fillStyle = '#ffffff';
                g.fillRect(0, 0, n, n);
            }
            g.save();
            g.beginPath();
            g.arc(n / 2, n / 2, n / 2, 0, Math.PI * 2);
            g.clip();
            g.fillStyle = '#ffffff';
            g.fillRect(0, 0, n, n);
            // Solo el logotipo del original: su círculo se descarta y lo
            // volvemos a trazar aquí con margen.
            const ancho = n * 0.62;
            const alto = ancho * LOGO.h / LOGO.w;
            g.drawImage(img, LOGO.x, LOGO.y, LOGO.w, LOGO.h,
                        (n - ancho) / 2, (n - alto) / 2, ancho, alto);
            g.restore();

            // Filo del círculo, tan discreto como en el maestro: 1 px mínimo
            // para que no lo borre el antialias en los tamaños pequeños.
            const grosor = Math.max(1, n * 0.006);
            g.beginPath();
            g.arc(n / 2, n / 2, n / 2 - grosor / 2, 0, Math.PI * 2);
            g.lineWidth = grosor;
            g.strokeStyle = ARO;
            g.stroke();

            return c.toDataURL('image/png');
        }

        const res = { ico: {}, };
        for (const n of TAMANOS_ICO) res.ico[n] = dibujar(n, false);
        res.png480 = dibujar(480, false);
        res.apple180 = dibujar(180, true);
        return res;
    }, { origenB64, ARO, LOGO, TAMANOS_ICO });

    await navegador.close();

    const aBuffer = url => Buffer.from(url.split(',')[1], 'base64');

    fs.writeFileSync(path.join(RAIZ, 'favicon.ico'),
        construirIco(TAMANOS_ICO.map(tam => ({ tam, datos: aBuffer(salida.ico[tam]) }))));
    fs.writeFileSync(path.join(RAIZ, 'assets', 'favicon-nutrigan.png'), aBuffer(salida.png480));
    fs.writeFileSync(path.join(RAIZ, 'assets', 'apple-touch-icon.png'), aBuffer(salida.apple180));

    console.log('favicon.ico            ', TAMANOS_ICO.join('/'), 'px');
    console.log('favicon-nutrigan.png    480 px');
    console.log('apple-touch-icon.png    180 px');
})().catch(e => {
    console.error('Error generando los iconos:', e.message);
    process.exit(1);
});
