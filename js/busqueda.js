/* --------------------------------------------------------------------------
   Búsqueda tolerante del catálogo.

   El buscador comparaba la cadena tal cual, así que "Bronkus" o "Broncus" no
   encontraban el Bronkub PLUS: quien no conoce el producto escribe lo que le
   suena, ve "No se encontraron productos" y se va creyendo que no lo vendemos.
   Con 44 productos y nombres como "gav-ALLFEED® Replyn DEFENSE WS250ml", eso
   pasa constantemente.

   Se compara en escalones, del más exacto al más permisivo, y cada escalón
   puntúa peor que el anterior. La puntuación no se enseña: sirve para ordenar
   los resultados, de modo que lo que se escribió entero salga por delante de
   lo que solo se parece.

   Todo ocurre en el navegador sobre la lista ya cargada; no hay consultas de
   más ni índice que mantener.
   -------------------------------------------------------------------------- */
(function () {
    'use strict';

    /** Minúsculas, sin tildes, sin símbolos: "gav-ALLFEED®" -> "gav allfeed". */
    function normalizar(texto) {
        return String(texto || '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    /**
     * Clave fonética castellana: acerca las letras que suenan igual.
     *
     * "broncus" y "bronkus" caen las dos en "bronkus", que es justo lo que
     * escribe quien ha oído el nombre pero no lo ha visto escrito. La 'ch' se
     * aparta antes de tocar la 'c' porque suena distinto de la c sola, y por
     * eso viaja como mayúscula: las reglas de debajo solo miran minúsculas.
     */
    function fonetica(palabra) {
        return palabra
            .replace(/ch/g, 'C')
            .replace(/ll/g, 'y')
            .replace(/qu/g, 'k')
            .replace(/gu([ei])/g, 'g$1')
            .replace(/[ckq]/g, 'k')
            .replace(/[vb]/g, 'b')
            .replace(/[zs]/g, 's')
            .replace(/h/g, '')
            .replace(/(.)\1+/g, '$1');
    }

    /**
     * Distancia de edición: cuántas letras hay que cambiar para pasar de una
     * palabra a otra. Corta en cuanto se pasa del máximo, que con 44 productos
     * y un teclado delante importa poco, pero evita recorrer la tabla entera
     * para descartar lo que ya no puede encajar.
     */
    function distancia(a, b, maximo) {
        if (a === b) return 0;
        if (Math.abs(a.length - b.length) > maximo) return maximo + 1;

        var fila = [];
        for (var j = 0; j <= b.length; j++) fila[j] = j;

        for (var i = 1; i <= a.length; i++) {
            var anterior = fila[0];
            fila[0] = i;
            var mejorDeLaFila = i;

            for (var k = 1; k <= b.length; k++) {
                var guardado = fila[k];
                fila[k] = Math.min(
                    fila[k] + 1,
                    fila[k - 1] + 1,
                    anterior + (a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1)
                );
                anterior = guardado;
                if (fila[k] < mejorDeLaFila) mejorDeLaFila = fila[k];
            }

            if (mejorDeLaFila > maximo) return maximo + 1;
        }
        return fila[b.length];
    }

    /**
     * Cuántas letras se le perdonan a una palabra.
     *
     * Las de tres letras o menos no perdonan ninguna: con margen, "5l" o "imm"
     * pescarían media tienda. A partir de siete hay contexto de sobra para que
     * dos fallos sigan señalando a un solo producto.
     */
    function tolerancia(palabra) {
        if (palabra.length <= 3) return 0;
        if (palabra.length <= 6) return 1;
        return 2;
    }

    /**
     * Puntúa una palabra escrita contra las palabras de un producto.
     *
     * `minimoParaErratas` es la longitud a partir de la cual se perdonan
     * erratas. Contra los nombres se perdona desde el principio, porque son 44
     * y bien distintos: "Heal" tiene que encontrar el Heel. Contra las
     * descripciones hace falta más letra, porque ahí vive el castellano
     * corriente: "part" a una errata de margen alcanza "para", que sale en casi
     * todas, y devolvía 33 de los 44 productos.
     */
    function puntuarPalabra(consulta, palabras, minimoParaErratas) {
        var maximo = tolerancia(consulta);
        var consultaFon = fonetica(consulta);
        var mejor = null;

        function proponer(puntos) {
            if (mejor === null || puntos < mejor) mejor = puntos;
        }

        for (var i = 0; i < palabras.length; i++) {
            var palabra = palabras[i];

            if (palabra === consulta) return 0;                       // exacta
            if (palabra.indexOf(consulta) === 0) { proponer(0.5); continue; }  // la empieza
            if (palabra.indexOf(consulta) > 0)   { proponer(1);   continue; }  // la contiene

            var palabraFon = fonetica(palabra);
            if (palabraFon === consultaFon) { proponer(1.5); continue; }       // suena igual

            // La palabra del producto también tiene que dar la talla: "flash"
            // suena "flas", y "las" —que sale en cualquier descripción— está a
            // una sola letra. Las cortas solo valen si se escribieron tal cual,
            // que para eso están los escalones de arriba.
            if (maximo > 0 && consulta.length >= minimoParaErratas && palabra.length >= 4) {
                var d = distancia(consulta, palabra, maximo);
                if (d <= maximo) { proponer(2 + d); continue; }                // se escribe casi igual
                var dFon = distancia(consultaFon, palabraFon, maximo);
                if (dFon <= maximo) proponer(2.5 + dFon);                      // suena casi igual
            }
        }
        return mejor;
    }

    /**
     * Puntúa un producto contra lo escrito. Devuelve null si no encaja, y si
     * encaja, cuanto más bajo mejor.
     *
     * Hay que encontrar todas las palabras escritas, no una cualquiera: quien
     * busca "bronkub cubo" quiere los dos, y con una sola le saldría medio
     * catálogo. El nombre pesa más que el resto de campos, así que un acierto
     * en la descripción se penaliza: "calostro" aparece en varias fichas, pero
     * quien escribe "Calostrum" busca el producto que se llama así.
     */
    function puntuar(producto, consulta) {
        var texto = normalizar(consulta);
        if (!texto) return 0;

        var escritas = texto.split(' ');
        var enNombre = normalizar(producto.nombre).split(' ');
        var enResto  = normalizar([
            producto.descripcion,
            producto.especie,
            producto.etapa,
            producto.categoria,
            producto.presentacion
        ].join(' ')).split(' ');

        var total = 0;
        for (var i = 0; i < escritas.length; i++) {
            var puntosNombre = puntuarPalabra(escritas[i], enNombre, 1);
            var puntosResto  = puntuarPalabra(escritas[i], enResto, 5);
            if (puntosResto !== null) puntosResto += 1;

            var puntos = puntosNombre === null ? puntosResto
                       : puntosResto  === null ? puntosNombre
                       : Math.min(puntosNombre, puntosResto);

            if (puntos === null) return null;   // esta palabra no está: fuera
            total += puntos;
        }
        return total;
    }

    window.NutriganBusqueda = {
        normalizar: normalizar,
        fonetica: fonetica,
        distancia: distancia,
        puntuar: puntuar
    };
})();
