/* --------------------------------------------------------------------------
   El plazo de entrega, en un solo sitio.

   Vivía en tres y decía tres cosas distintas: los Términos prometían 2-5 días
   laborables en península, Stripe le anunciaba 5-10 días hábiles a quien iba a
   pagar, y el código que programa la encuesta de Google daba por hecho 7. El
   plazo bueno es el de Stripe, que es el que ve el comprador.

   No es un detalle de redacción: los Términos son el contrato, así que prometer
   2-5 y entregar en 10 es incumplirlo por escrito en cada pedido.

   De aquí beben el checkout de Stripe (servidor), la ficha, el carrito y la
   fecha con la que se programa la encuesta de Google Customer Reviews. Los
   textos de los Términos y de esta web que no pasan por JavaScript llevan el
   mismo dato escrito; para que no se separen, van dentro de un
   [data-envio-plazo] que este módulo reescribe al cargar.
   -------------------------------------------------------------------------- */
(function (global) {
    'use strict';

    /** Días hábiles que tarda un pedido en llegar a península. */
    var PLAZO = { minimo: 5, maximo: 10 };

    /** "5-10 días hábiles" */
    function textoPlazo() {
        return PLAZO.minimo + '-' + PLAZO.maximo + ' días hábiles';
    }

    /** "Entrega en 5-10 días hábiles" */
    function frasePlazo() {
        return 'Entrega en ' + textoPlazo();
    }

    /**
     * Días naturales que hay que esperar para dar el pedido por entregado.
     *
     * Los días hábiles no cuentan fines de semana, así que diez hábiles son unas
     * dos semanas de calendario. Sirve para programar la encuesta de Google
     * Customer Reviews: pedirle su opinión a alguien que aún no ha recibido el
     * producto no solo no sirve, sino que se lleva una mala valoración de un
     * pedido que iba bien.
     */
    function diasNaturalesHastaEntrega() {
        return Math.ceil(PLAZO.maximo * 7 / 5);
    }

    /** Rellena los [data-envio-plazo] de la página. */
    function pintarPlazo() {
        if (typeof document === 'undefined') return;
        var nodos = document.querySelectorAll('[data-envio-plazo]');
        for (var i = 0; i < nodos.length; i++) {
            nodos[i].textContent = nodos[i].hasAttribute('data-envio-frase')
                ? frasePlazo()
                : textoPlazo();
        }
    }

    var api = {
        PLAZO: PLAZO,
        textoPlazo: textoPlazo,
        frasePlazo: frasePlazo,
        diasNaturalesHastaEntrega: diasNaturalesHastaEntrega,
        pintarPlazo: pintarPlazo
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.NutriganEnvio = api;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', pintarPlazo);
        } else {
            pintarPlazo();
        }
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
