require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const descriptions = [
    {
        id: 1,
        descripcion_completa: "Bolo de calcio de liberación controlada (90 minutos) para vacas en periparto. Previene la hipocalcemia y fiebre de la leche en el período de transición. Aporta calcio, fósforo, magnesio y vitaminas D3 y E para una óptima recuperación post-parto y mejora de la producción láctea en los primeros días. Caja de 20 bolos de 150g. Certificado ISO 9001 y GMP."
    },
    {
        id: 2,
        descripcion_completa: "Bolo fosfocálcico de liberación rápida (60 minutos) para vacas en lactación. Previene y trata la hipofosfatemia con fósforo soluble y flushing fosfórico de alta biodisponibilidad. Mejora la fertilidad, fortalece los huesos y optimiza la producción láctea. Terapia de elección en hipocalcemia subclínica. Caja de 10 bolos de 120g. Sin tiempo de espera en leche."
    },
    {
        id: 3,
        descripcion_completa: "Bolo de larga duración (150 días) para la salud podal en bovinos. Mejora la calidad del casco blando y refuerza su cimiento previniendo cojeras y problemas de aplomo. Fórmula con zinc, biotina, aminoácidos y vitaminas del grupo B que optimiza el crecimiento podal y la conversión alimenticia. Indicado para vacas con problemas recurrentes de pezuñas. Caja de 10 bolos de 200g."
    },
    {
        id: 4,
        descripcion_completa: "Bolo de liberación sostenida (8 días) para vacas en preparto. Control y profilaxis de acetonemias y cetosis con suplementación energética postparto inmediata. Aporta proteínas, energía, vitaminas A, D y E y minerales esenciales para optimizar la producción láctea y mejorar la condición corporal en la vaca en transición. Caja de 10 bolos de 180g."
    },
    {
        id: 5,
        descripcion_completa: "Bolo de magnesio de liberación rápida para vacas en periparto. Previene la hipomagnesemia y la tetania de los pastos aportando magnesio de alta biodisponibilidad para una absorción óptima. Indicado especialmente en épocas de riesgo como primavera y otoño. Esencial en rebaños pastoreantes bovinos y ovinos."
    },
    {
        id: 6,
        descripcion_completa: "Bolo de liberación controlada (10 días) para la preparación al celo e inseminación en vacas. Mejora la fertilidad y fecundidad optimizando la expresión del celo, aumentando la tasa de concepción y reduciendo los intervalos entre partos. Formulado con vitaminas, minerales y aminoácidos reproductivos esenciales. Caja de 10 bolos de 150g."
    },
    {
        id: 7,
        descripcion_completa: "Suplemento nutricional en polvo (2,5 kg) para terneros, corderos y lechones. Fortalece el sistema inmune, estimula el crecimiento y previene enfermedades digestivas en animales jóvenes. Fórmula rica en proteínas, vitaminas y minerales esenciales para las primeras etapas de vida. Reduce la mortalidad neonatal y mejora el desarrollo. Bote de 2,5 kg."
    },
    {
        id: 8,
        descripcion_completa: "Bolo de liberación controlada (40 días) para vacas en lactación. Profilaxis y control del recuento de células somáticas: reduce en media más de 169.000 células, mejorando significativamente la calidad de la leche y el bienestar animal. Fórmula con proteínas, energía, vitaminas y minerales. Caja de 10 bolos de 70g."
    },
    {
        id: 9,
        descripcion_completa: "Bolo de liberación rápida (3 días) para vacas en periparto. Prevención y profilaxis de acetonemias postparto con suplementación energética inmediata. Aporta calcio, fósforo y aminoácidos para una recuperación eficaz tras el parto y reduce el balance energético negativo en las primeras horas post-parto. Caja de 10 bolos de 160g. Sin tiempo de espera."
    },
    {
        id: 10,
        descripcion_completa: "Bolo de liberación prolongada (42 días) para vacas en preparto. Facilita la correcta expulsión de las placentas y previene las retenciones placentarias, incluso en partos gemelares. Fórmula con zinc, selenio, vitaminas E y B12 y antioxidantes que mejoran la salud reproductiva. Caja de 10 bolos de 220g."
    },
    {
        id: 11,
        descripcion_completa: "Polvo rehidratante efervescente antidiarreico para terneros con excelente palatibilidad gracias al aporte de vainilla. Repone electrolitos y combate la deshidratación causada por diarreas neonatales de forma eficaz y rápida. Sin tiempo de espera. Indicado desde el nacimiento. Caja de 24 sobres de 140g. Fácil dilución en agua o leche."
    },
    {
        id: 12,
        descripcion_completa: "Solución energética oral líquida de alta concentración para bovinos, ovinos, caprinos y porcinos. Aporta energía inmediata en situaciones de estrés, parto, destete o enfermedad. Rico en azúcares de rápida absorción, vitaminas y electrolitos. Estimula el apetito y favorece la recuperación metabólica rápida del animal. Garrafa de 5L."
    },
    {
        id: 13,
        descripcion_completa: "Complejo energético y vitamínico líquido para vacas, ovejas y cabras en periparto. Previene y trata la hipoglucemia y el balance energético negativo. Estimula la producción láctea y mejora la condición corporal de la madre. Fórmula con propilenglicol, vitaminas del grupo B y electrolitos de rápida asimilación. Garrafa de 5L."
    },
    {
        id: 14,
        descripcion_completa: "Bolo vitamínico-mineral de larga duración (250 días) para terneras recién destetadas y novillas. Mejora el crecimiento y el desarrollo corporal, resulta eficaz tras convalecencias y favorece la aparición del primer celo y los aplomos. Esencial en programas de recría bovina de calidad. Caja de 20 bolos de 110g."
    },
    {
        id: 15,
        descripcion_completa: "Bolo vitamínico-mineral de liberación prolongada (8 meses) para novillas en crecimiento. Favorece la aparición del celo, mejora los aplomos y optimiza el desarrollo corporal de las novillas de reposición. Fórmula completa con proteínas, aminoácidos, vitaminas y minerales esenciales. Caja de 10 bolos de 130g."
    },
    {
        id: 16,
        descripcion_completa: "Bolo vitamínico-mineral de liberación prolongada (170 días) para vacas y novillas en granjas convencionales y ecológicas. Certificado ECO. Formulación equilibrada que cubre las necesidades nutricionales en explotaciones extensivas y semi-extensivas. Apto para producción ecológica certificada. Caja de 10 bolos de 300g."
    },
    {
        id: 17,
        descripcion_completa: "Cicatrizante desinfectante natural en spray (200ml) para heridas en ganado, mascotas y animales de granja. Sin antibióticos y sin tiempo de espera en leche ni carne. Su fórmula con dexpantenol y carvacrol (aceite esencial de orégano) mejora la hidratación cutánea, acelera la cicatrización y protege contra infecciones. Aplicar 1-2 veces al día a 20-30 cm."
    },
    {
        id: 18,
        descripcion_completa: "Cicatrizante desinfectante natural en spray formato grande (400ml) para heridas en ganado, mascotas y animales de granja. Sin antibióticos y sin tiempo de espera en leche ni carne. Fórmula con dexpantenol y carvacrol (aceite esencial de orégano) para regeneración cutánea, cicatrización acelerada y protección antibacteriana. Aplicar 1-2 veces al día."
    },
    {
        id: 19,
        descripcion_completa: "Complemento alimenticio antidiarreico en polvo (2 kg) para terneros. Contiene proteínas funcionales IgY, electrolitos y carbohidratos de fácil asimilación que mejoran la salud intestinal. Previene y trata trastornos digestivos causados por rotavirus, coliformes y criptosporidia. Reduce la mortalidad neonatal. Sin antibióticos y sin tiempo de espera."
    },
    {
        id: 20,
        descripcion_completa: "Solución oral líquida (0,5L) de calcio y fósforo de alta biodisponibilidad para vacas lecheras en periparto. Reduce eficazmente el riesgo de fiebre de la leche e hipocalcemia peripartal. Administración directa por vía oral sin equipos especiales. Mejora el estado mineral de la vaca y favorece una lactación productiva. Sin tiempo de espera."
    },
    {
        id: 21,
        descripcion_completa: "Alimento complementario antidiarreico líquido (pack 6 botes de 1L) para terneros, corderos y cabritos. Preventivo y curativo frente a trastornos digestivos causados por coccidia, criptosporidia, coliformes y clostridium. Sin antibióticos y sin tiempo de espera. Fórmula con nutracéuticos naturales de alta eficacia clínica demostrada."
    },
    {
        id: 22,
        descripcion_completa: "Alimento complementario antidiarreico líquido en formato garrafa (pack 2x5L) para terneros, corderos y cabritos. Preventivo y curativo frente a trastornos digestivos causados por coccidia, criptosporidia, coliformes y clostridium. Sin antibióticos ni tiempo de espera. Formato económico para grandes explotaciones ganaderas."
    },
    {
        id: 23,
        descripcion_completa: "Spray dermoprotector (250ml) con acción biológica repelente y antipicaduras para el control de insectos y ectoparásitos en todas las especies ganaderas. Previene la Enfermedad Hemorrágica Epizoótica (EHE) transmitida por mosquitos Culicoides. Sin antibióticos y sin tiempo de espera. Aplicación directa sobre la piel del animal."
    },
    {
        id: 24,
        descripcion_completa: "Nutracéutico antiparasitario (pack 120 bloques de 10kg cada uno) para el control integral de endoparásitos y ectoparásitos en bovinos, ovinos, caprinos y equinos. Eficacia antipicaduras demostrada frente a mosquitos, moscas y garrapatas. Administración a libre disposición mezclado con el pienso. Sin tiempo de espera."
    },
    {
        id: 25,
        descripcion_completa: "Kit de detección rápida de residuos de antibióticos betalactámicos en leche (caja 30 test). Herramienta indispensable para el control de calidad en explotaciones lecheras bovinas, ovinas y caprinas. Resultados fiables en pocos minutos. Previene el rechazo de leche en la industria láctea por contaminación con antibióticos."
    },
    {
        id: 26,
        descripcion_completa: "Potente antiséptico antibacteriano y antiinflamatorio (250ml) con Certificación E.L.U.A. para higiene de ubres en ordeño. Uso como pre-dipping y post-dipping. Reduce significativamente la incidencia de mastitis clínica y subclínica. Mayor eficacia cuando se combina con Lactomint Care. Sin tiempo de espera en leche."
    },
    {
        id: 27,
        descripcion_completa: "Tratamiento natural intramamario antiinflamatorio, analgésico, antiséptico y cicatrizante (garrafa 5L) para mastitis en vacas, ovejas y cabras lecheras. Sin tiempo de supresión de leche ni prescripción veterinaria. Certificación E.L.U.A. No requiere masajeo de ubre tras la aplicación. Recomendado combinado con Dipp Forte 250ml."
    },
    {
        id: 28,
        descripcion_completa: "Pack combinado de Lactomint Care 5L y Dipp Forte 250ml para el protocolo completo de secado y postparto sin antibióticos en bovinos, ovinos y caprinos. Sin período de supresión ni descarte de leche. Sin recetas veterinarias. Certificación E.L.U.A. Seca todas las vacas por igual siguiendo los protocolos de secado."
    },
    {
        id: 29,
        descripcion_completa: "Tratamiento natural antiinflamatorio y dermoprotector de nanotecnología (pack 6 botes de 500ml) para inflamaciones y edemas subcutáneos en ganado. Indicado para golpes y contusiones. Sin antibióticos y sin tiempo de espera. Fórmula con aceites esenciales y extractos naturales de alta eficacia. Sin necesidad de prescripción veterinaria."
    },
    {
        id: 30,
        descripcion_completa: "Nutracéutico natural (caja 60 jeringas de 40ml) para el cuidado e higiene de la zona vaginal y uterina de hembras bovinas, ovinas, caprinas y porcinas de producción. Previene y trata la endometritis de forma natural y eficaz. Sin antibióticos y sin tiempo de espera. Sin necesidad de prescripción veterinaria."
    },
    {
        id: 31,
        descripcion_completa: "Alternativa natural a los antibióticos intramamarios en formato jeringa (caja 24 unidades) para vacas, ovejas y cabras lecheras. Válido para secados y profilaxis y control de mastitis. Sin descarte de leche ni tiempo de supresión al ser un producto 100% natural. No requiere receta veterinaria. Certificación E.L.U.A."
    },
    {
        id: 32,
        descripcion_completa: "Pienso complementario en pasta (pack 2 cajas con 12 jeringas en total) para terneros recién nacidos. Contiene proteínas funcionales IgY de origen avícola que refuerzan el sistema inmunológico neonatal. Mejora la absorción de calostro y reduce la mortalidad perinatal. Administrar en las primeras horas de vida del ternero."
    },
    {
        id: 33,
        descripcion_completa: "Activador de microorganismos beneficiosos (pack 3 garrafas de 20L) para el tratamiento de purines y estiércol en explotaciones ganaderas. Acelera la descomposición de la materia orgánica, elimina malos olores y reduce la población de moscas, larvas y otros insectos plaga. Homogeniza y licua los purines para facilitar su manejo."
    },
    {
        id: 34,
        descripcion_completa: "Cubo nutracéutico de 20kg (pack 30 cubos) a libre disposición para el tratamiento de toda la problemática respiratoria en bovinos, ovinos, caprinos y porcinos. Elaborado con fitobióticos, aceites esenciales y vitaminas. Actúa como expectorante, mucolítico y broncodilatador natural. Sin antibióticos y sin tiempo de espera."
    },
    {
        id: 35,
        descripcion_completa: "Potenciador calostral en polvo (cubo 4kg) rico en lactoferrina, inmunoglobulinas, flora intestinal, astringentes, protectores de mucosa intestinal y estimulantes del apetito. Para terneros, vacas, ovejas, cabras y cerdos. Refuerza la inmunidad pasiva neonatal y mejora la salud digestiva desde el nacimiento. Sin tiempo de espera."
    },
    {
        id: 36,
        descripcion_completa: "Potenciador calostral en polvo (bote 500g) rico en lactoferrina e inmunoglobulinas para terneros, corderos y cabritos. Complementa o sustituye el calostro materno en situaciones de déficit calostral. Protege la mucosa intestinal y favorece el desarrollo de una flora digestiva saludable desde las primeras horas de vida."
    },
    {
        id: 37,
        descripcion_completa: "Snack funcional antiparasitario natural para perros (palet 60 sacos de 20kg). Protege al perro desde dentro contra pulgas, garrapatas y mosquitos como refuerzo natural y complementario a los tratamientos externos. Sin cereales. Consumo continuo diario para máxima eficacia antiparasitaria. Para perros de todas las razas y tamaños."
    },
    {
        id: 38,
        descripcion_completa: "Galletas funcionales antiparasitarias naturales para perros (palet 60 sacos de 20kg). Protegen al perro desde dentro contra pulgas, garrapatas y mosquitos como refuerzo a los tratamientos antiparasitarios externos. Sin cereales. Consumo diario continuo para máxima eficacia. Para perros de todas las razas y tamaños."
    },
    {
        id: 39,
        descripcion_completa: "Detergente ácido CIP de alto rendimiento (palet 26 garrafas de 24kg) para la limpieza y desincrustación de circuitos cerrados en instalaciones de ordeño y la industria alimentaria. Elimina eficazmente la piedra de leche y residuos inorgánicos en equipos de ordeño, tanques de frío y pasteurizadores. Indispensable para el mantenimiento profesional."
    },
    {
        id: 40,
        descripcion_completa: "Detergente desinfectante alcalino y clorado no espumante (palet 26 garrafas de 24kg) para limpiezas CIP en la industria alimentaria y ganadera. Limpieza y desinfección en un solo paso con acción de amplio espectro contra bacterias y hongos. Elimina eficazmente materia orgánica, grasas y suciedad de circuitos, hornos y superficies."
    },
    {
        id: 41,
        descripcion_completa: "Detergente desinfectante alcalino y clorado no espumante en formato profesional (pack 6 garrafas de 60kg) para grandes instalaciones de la industria láctea y alimentaria. Limpieza y desinfección CIP en un solo paso. Acción de amplio espectro contra bacterias y hongos. Elimina materia orgánica, grasas y microorganismos patógenos eficazmente."
    },
    {
        id: 42,
        descripcion_completa: "Nutracéutico nanotecnológico (palet 24 sacos de 25kg) para el control metabólico en periparto bovino, ovino y caprino. Tratamiento de la Cetoacidosis Diabética y prevención de la toxemia de gestación. Inhibe la producción de cuerpos cetónicos y estimula los niveles de insulina. Protege la salud materna y asegura un inicio de lactación exitoso."
    },
    {
        id: 43,
        descripcion_completa: "Solución filmógena (pack 3 garrafas de 20kg) con efectos desinfectante, relajante, descongestionante, termorregulador y antiinflamatorio para el cuidado del pezón en bovinos, ovinos, caprinos y porcinos. Elaborado con aceites medicinales fermentados, extractos cítricos y mentha arvensis. Mejora la integridad cutánea y la flexibilidad de los esfínteres del pezón."
    },
    {
        id: 44,
        descripcion_completa: "Solución filmógena desinfectante y cicatrizante (pack 3 garrafas de 20kg) para ubres y pezones en bovinos, ovinos, caprinos y porcinos. Desarrollado con extractos cítricos, glicerina vegetal y ácido ascórbico. Gran poder de desinfección y cicatrización de heridas y cortes. Protege y refuerza el pezón como principal barrera natural de defensa."
    },
    {
        id: 45,
        descripcion_completa: "Sistema bicomponente generador de dióxido de cloro (pack 3 unidades de 10kg) para higiene post-ordeño en vacas, ovejas y cabras lecheras. Al mezclar Lactox A con Lactox B se genera dióxido de cloro, desinfectante de amplio espectro. Crea una película protectora duradera sobre el pezón. Previene mastitis con protección avanzada."
    },
    {
        id: 46,
        descripcion_completa: "Espuma higienizante elaborada con componentes naturales de la leche (pack 3 garrafas de 20kg) para la higiene de ubres en animales productores de leche. Gran poder de limpieza con mínimo riesgo de inhibidores y residuos en la leche. Diseñado para pre-dipping y cuidado rutinario del pezón en ordeño automatizado y manual."
    },
    {
        id: 47,
        descripcion_completa: "Fuente de energía líquida de alta concentración a base de propilenglicol (pack 3 unidades de 20kg) para rumiantes en periparto. Previene la cetosis y reduce el balance energético negativo en vacas, ovejas y cabras durante la transición. Administración directa o mezclada con pienso o agua. Rápida absorción y eficacia demostrada. Sin tiempo de espera."
    },
    {
        id: 48,
        descripcion_completa: "Aditivo secuestrante de micotoxinas de amplio espectro (palet 20 sacos de 30kg) para piensos de bovinos, ovinos, caprinos, porcinos y equinos. Protege contra aflatoxinas, zearalenona y otras micotoxinas. Su combinación de silicatos y paredes de levaduras adsorbe y neutraliza eficazmente las toxinas del pienso, mejorando la salud intestinal y el rendimiento."
    }
];

async function updateDescriptions() {
    console.log(`Actualizando ${descriptions.length} descripciones en Supabase...`);
    let ok = 0, fail = 0;

    for (const item of descriptions) {
        const { error } = await supabase
            .from('productos')
            .update({ descripcion_completa: item.descripcion_completa })
            .eq('id', item.id);

        if (error) {
            console.error(`❌ ID ${item.id}: ${error.message}`);
            fail++;
        } else {
            console.log(`✅ ID ${item.id} actualizado`);
            ok++;
        }
    }

    console.log(`\nResultado: ${ok} actualizados, ${fail} errores`);
}

updateDescriptions();
