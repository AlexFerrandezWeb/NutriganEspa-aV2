/* Nombres descriptivos de las imágenes. Las rutas antiguas se mantienen como
 * alias para el catálogo compartido y los carritos guardados antes del cambio. */
(function (root) {
    'use strict';
    const aliases = {
    "producto1.webp": "bolutech-flash.webp",
    "producto2.webp": "bolutech-activ.webp",
    "producto3.webp": "bolutech-heel.webp",
    "producto4.webp": "bolutech-prepalac.webp",
    "producto6.webp": "bolutech-repro.webp",
    "producto8.webp": "bolutech-vitality.webp",
    "producto9.webp": "bolutech-start.webp",
    "producto10.webp": "bolutech-tonic.webp",
    "producto11.webp": "lactibiose-effervescent.webp",
    "producto14.webp": "bolutech-junior.webp",
    "producto15.webp": "bolutech-excell.webp",
    "producto16.webp": "bolutech-dietevit-equilibre.webp",
    "producto17.webp": "blue-spray.webp",
    "producto19.webp": "globigen-dia-stop-2kg.webp",
    "producto20.webp": "calz-o-phos-liquid-0-5l.webp",
    "producto21.webp": "gav-allfeed-enterogav-1l.webp",
    "producto22.webp": "gav-allfeed-enterogav-5l.webp",
    "producto23.webp": "gav-allfeed-replyn-defense-ws250ml.webp",
    "producto24.webp": "gav-allfeed-replyn-dune-10kg.webp",
    "producto25.webp": "snap-detector.webp",
    "producto26.webp": "gav-allfeed-dipp-forte-250ml.webp",
    "producto27.webp": "gav-allfeed-lactomint-care-5l.webp",
    "producto28.webp": "gav-allfeed-lactomint-care-5l-dipp-forte-250ml.webp",
    "producto29.webp": "gav-allfeed-lactomint-care-500ml.webp",
    "producto30.webp": "gav-allfeed-lactomint-uter-40ml.webp",
    "producto31.webp": "gav-allfeed-lactomint-imm.webp",
    "producto32.webp": "globigen-calf-paste.webp",
    "producto33.webp": "activador-microorganismos-bioprana-20l.webp",
    "producto34.webp": "gav-allfeed-bronkub-plus-20kg.webp",
    "producto35.webp": "gav-allfeed-delicious-4kg.webp",
    "producto36.webp": "gav-allfeed-calostrum-500g.webp",
    "producto37.webp": "eurodog-bocaditos-repelent-alta-calidad-20kg.webp",
    "producto38.webp": "eurodog-galletas-repelent-alta-calidad-20kg.webp",
    "producto39.webp": "bactercip-n100-24kg.webp",
    "producto40.webp": "bacterclor-s100-24kg.webp",
    "producto41.webp": "bacterclor-s100-60kg.webp",
    "producto42.webp": "dry-part-25kg.webp",
    "producto43.webp": "filmaderm-20kg.webp",
    "producto44.webp": "filmavit-20kg.webp",
    "producto45.webp": "lactox-a-b-10kg.webp",
    "producto46.webp": "optiderm-20kg.webp",
    "producto47.webp": "optilactol-20kg.webp",
    "producto48.webp": "secuestrante-detox-azove-30kg.webp"
};
    function resolve(value) {
        if (typeof value !== 'string') return value;
        // Solo imágenes locales o del dominio de Nutrigan; respetar URLs externas.
        const match = value.match(/^(?:(https?:\/\/(?:www\.)?xn--nutriganespaa-tkb\.com))?\/?assets\/(producto\d+\.webp)([?#].*)?$/i);
        if (!match || !aliases[match[2]]) return value;
        return (match[1] || '') + '/assets/' + aliases[match[2]] + (match[3] || '');
    }
    function product(value) {
        return value ? { ...value, imagen: resolve(value.imagen) } : value;
    }
    const api = { aliases, resolve, product };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.NutriganImages = api;
})(typeof window === 'object' ? window : globalThis);
