# VoxWave — Bloque de finanzas (escenas 10 a 15) · versión 2

Continúa tras la escena 9 (el mercado). Locución en inglés. Cada escena arranca donde termina la anterior: el punto coral pasa de una a otra. Los tiempos asumen que la escena 9 termina en 2:38.

**Idea del bloque:** *una puerta entre un paciente y un mercado.* Primero se ve lo bien que funciona cada paciente (480 € de ingreso, ≈ 90 % de margen). Después aparece la única puerta que hay que cruzar, el marcado CE, que a la vez es la barrera que protege el negocio. Y por último, lo que se gana una vez cruzada.

## Resumen

| Escena | Título | Duración | Tiempo |
| --- | --- | --- | --- |
| 10 | Quién paga | 7 s | 2:38–2:45 |
| 11 | El precio | 7 s | 2:45–2:52 |
| 12 | Un paciente | 9 s | 2:52–3:01 |
| 13 | La puerta | 9 s | 3:01–3:10 |
| 14 | Después de la puerta | 11 s | 3:10–3:21 |
| 15 | La escala | 9 s | 3:21–3:30 |
|  | **Total** | **52 s** |  |

Etiquetas de estado: **\[H\]** hipótesis por validar, **\[S\]** supuesto de trabajo, **\[C\]** cálculo, **\[V\]** verificado.

---

## Escena 10 · Quién paga (7 s)

**Se dice:** *"Our customers are the institutions that care for patients: clinics and care homes first, hospitals and public systems next."*

**Se ve:** el punto coral de la escena 9 se abre bajo el rótulo "WHO PAYS · INSTITUTIONAL MODEL". Aparecen dos tarjetas sólidas, "CLINICS · Private neuro-rehab" y "CARE HOMES · Residential care", unidas por líneas a un nodo central de VoxWave. A la derecha entran dos tarjetas tenues de borde punteado, "HOSPITALS · Regional networks" y "PUBLIC HEALTH SYSTEMS", con la etiqueta "NEXT".

**Enlace:** las tarjetas sólidas se agrupan a la izquierda y dejan la derecha libre para el precio.

---

## Escena 11 · El precio (7 s)

**Se dice:** *"They pay forty euros a month per patient. For the patient, it's free. The device is included."*

**Se ve:** a la izquierda, "40 €" en grande con "/ month · PER PATIENT" y "480 € / year billed to the institution". A la derecha, "0 €" con "PATIENT · FREE". Entre ambos cae la insignia "DEVICE INCLUDED" con un pequeño icono del dispositivo. Etiqueta "PRICING HYPOTHESIS" junto al 40 €.

**Enlace:** los 480 € se convierten en una barra horizontal que abre la escena 12.

---

## Escena 12 · Un paciente (9 s)

**Se dice:** *"Every patient brings in four hundred and eighty euros a year. Calls, cloud, database upkeep and the device we lend them cost about forty. We keep roughly ninety percent."*

**Se ve:** una barra de 480 € con el rótulo "ONE PATIENT · ONE YEAR". De ella se desprenden, una a una y con un golpe, tres piezas pequeñas: "CALLS", "CLOUD & DATABASE UPKEEP" y "DEVICE · LENT", y una cuarta aún menor, "SUPPORT". Debajo se lee "≈ 40 € / patient / year" y, a su lado, la barra que queda se tiñe de coral. Un contador sube hasta "≈ 90 %" con el rótulo "CONTRIBUTION MARGIN".

**Nota:** las piezas de coste no llevan importes individuales; solo el total.

**Enlace:** la barra coral se endurece y se convierte en una llave que se dirige hacia una puerta.

---

## Escena 13 · La puerta (9 s)

**Se dice:** *"One gate stands between us and that margin: CE marking. About fifty thousand euros, one time. It is also the wall that keeps copycats out."*

**Se ve:** en el centro, una puerta sobria con el rótulo "CE MARKING · EU MEDICAL-DEVICE REGULATION". A un lado quedan varios puntos grises sin nombre, que no pueden pasar; la llave coral de VoxWave abre la puerta y cruza. Aparecen "≈ 50,000 € · ONE-TIME" y la frase "REGULATION: A BARRIER TO ENTRY". Tras la puerta, la barra de margen de la escena 12 se ilumina entera.

**Enlace:** la barra iluminada del otro lado de la puerta se convierte en el eje de la gráfica de la escena 14.

---

## Escena 14 · Después de la puerta (11 s)

**Se dice:** *"About a hundred and fifty patients, thirty clinics, repay the gate. After that, every new patient adds more than four hundred euros a year. A thousand patients: over four hundred thousand a year."*

**Se ve:** una gráfica con "PATIENTS" en el eje horizontal y "CUMULATIVE CONTRIBUTION" en el vertical. La línea arranca bajo cero, bajo el peso de la puerta, y sube con firmeza. Cruza el cero en "GATE REPAID · ≈ 150 PATIENTS · ≈ 30 CLINICS" y, a partir de ahí, se vuelve más empinada, con la etiqueta "+ ≈ 430 € PER PATIENT / YEAR". Un marcador en los 1.000 pacientes dice "≈ 0.4 M€ / YEAR". Etiqueta "ILLUSTRATIVE SCENARIO · full run-rate · 5 patients per clinic".

**Enlace:** la línea sale de la gráfica y se estira hasta convertirse en la silueta de los tres países bálticos.

---

## Escena 15 · La escala (9 s)

**Se dice:** *"Across the Baltics, that is a seven-point-seven-million-euro market a year. And the same engine scales across the EU, one language at a time."*

**Se ve:** Estonia, Letonia y Lituania se iluminan. El rótulo "16,000 PATIENTS × 480 € ≈ 7.7 M€ / YEAR · ESTIMATE". Tres anillos se expanden desde el punto central: Baltics, EU, con la etiqueta "ONE LANGUAGE AT A TIME".

**Enlace:** los anillos se contraen en un punto coral, que abre la escena del MVP.

---

## Números

### Un paciente

| Concepto | Valor | Cálculo | Estado |
| --- | --- | --- | --- |
| Ingreso por paciente y año | 480 € | 40 € × 12 | \[H\] |
| Coste variable | 25–40 € | Llamadas, base de datos y nube, soporte | \[S\] |
| Dispositivo | 35 € para ≈ 25 % de los pacientes = 8,75 € de media | 35 × 0,25 | \[S\] |
| Coste total por paciente | ≈ 34–49 € (se dice "about forty") |  | \[C\] |
| Contribución por paciente y año | ≈ 431–446 € | 480 − coste | \[C\] |
| Margen de contribución | 89,8–93,0 % (se dice "about ninety") |  | \[C\] |

### La puerta y lo que viene después

| Concepto | Valor | Estado |
| --- | --- | --- |
| Marcado CE (clase IIa) | ≈ 50.000 €, una sola vez | \[S\] |
| Costes corrientes anuales (calidad, auditorías, alojamiento, seguro) | ≈ 15.000 €/año | \[S\] |
| Pacientes para repagar la puerta | (50.500 + 15.000) / 431 ≈ **152 pacientes ≈ 30 clínicas** de 5 pacientes | \[C\] |
| Cuota de Lituania (7.600 pacientes) | ≈ 2,0 % | \[C\] |
| Contribución con 1.000 pacientes | 1.000 × 431 ≈ 431.000 €/año | \[C\], escenario ilustrativo |
| Contribución con toda Lituania atendida | 7.600 × 431 ≈ 3,3 M€/año | \[C\], solo como referencia teórica |
| Mercado de Lituania | 7.600 × 480 ≈ 3,6 M€/año | \[C\] |
| Mercado del Báltico | 16.000 × 480 ≈ 7,7 M€/año | \[C\] |
| Pacientes en el mundo | 11,8 M (GBD 2021) | \[V\] |

**Los costes corrientes no se nombran en el vídeo, pero los 152 pacientes ya los incluyen.** Es lo que hace que la cifra sea honesta aunque no se detalle cada partida.

---

## Cómo responder si preguntan

| Pregunta | Respuesta |
| --- | --- |
| ¿Cuándo hay ingresos? | Tras el marcado CE. Hasta entonces hay pilotos y validación clínica. La puerta es el hito que abre el negocio |
| ¿Por qué 50.000 €? | Es nuestra estimación para un producto sanitario de clase IIa; la certificación puede salir entre 50.000 y 120.000 € según la complejidad, y hay que confirmarlo con un organismo notificado |
| ¿Y los costes corrientes? | Unos 15.000 € al año de calidad, auditorías, alojamiento y seguro, incluidos en el cálculo del repago |
| ¿Cobráis los fundadores? | No durante el lanzamiento; es un supuesto de trabajo y la estructura de costes cambiaría al contratar |
| ¿Por qué pagaría una clínica 480 € al año por paciente? | Por tener datos objetivos entre visitas sin visitas ni trabajo extra del personal; el piloto debe medir el valor concreto |
| ¿El margen es beneficio? | No, es margen de contribución por paciente: antes de costes fijos |
| ¿Y si el coste de las llamadas es mayor? | Con 60 € por paciente y año, el margen sigue en ≈ 85 % |
| ¿Cuántas clínicas hacen falta? | Unas 30 de cinco pacientes para repagar la puerta, ≈ 2 % de los pacientes de Lituania |

---

## Pendientes

1. **Coste real de las llamadas y de la base de datos.** El "about forty" es un total aproximado; sustituirlo por un presupuesto de proveedor.
2. **Desglose de los 50.000 €.** Qué parte es organismo notificado, sistema de calidad y estudio clínico.
3. **Costes corrientes.** Confirmar los ≈ 15.000 €/año con el informe de finanzas.
4. **Cotejar** cada cifra con `VoxWave_Reporte de Finanzas.md`.
5. **Supuesto de 5 pacientes por clínica.** Es el más sensible de todo el bloque.