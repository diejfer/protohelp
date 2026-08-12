# Guía para crear bibliotecas de protoboards de Protohelp

Esta guía está dirigida a personas y agentes que necesiten crear, revisar o ampliar una biblioteca de protoboards compatible con Protohelp.

## Objetivo y archivo de referencia

Una biblioteca es un archivo JSON declarativo. Usá como referencia `src/libraries/default-boards.json` del repositorio.

```json
{
  "schemaVersion": 1,
  "id": "mis-protoboards",
  "name": "Mis protoboards",
  "version": "1.0.0",
  "kind": "boards",
  "items": []
}
```

- `schemaVersion`: actualmente `1`.
- `id`: identificador único y estable de la colección.
- `name`: nombre visible.
- `version`: versión semántica.
- `kind`: debe ser exactamente `boards`.
- `items`: definiciones de protoboards.

## Sistema geométrico

Todas las dimensiones se expresan como múltiplos del pitch global del proyecto. El render mantiene cada agujero sobre la matriz base y permite rotaciones de 90°.

El formato actual representa protoboards rectangulares clásicos con:

- diez filas centrales, separadas en dos grupos eléctricos de cinco;
- canal central de dos pitches;
- opcionalmente cuatro rieles de alimentación: positivo y negativo en cada lado;
- grupos de cinco agujeros en cada riel.

## Definición

```json
{
  "id": "breadboard-ejemplo",
  "name": "Protoboard de ejemplo",
  "cols": 30,
  "railCols": 25,
  "railMargin": 0,
  "hasRails": true,
  "color": "#f7f3e9"
}
```

- `id`: identificador único del modelo.
- `name`: nombre del selector.
- `cols`: columnas centrales; cada columna aporta diez agujeros.
- `railCols`: agujeros de cada uno de los cuatro rieles.
- `railMargin`: pitches libres antes del primer grupo y después del último.
- `hasRails`: indica si existen los cuatro rieles.
- `color`: color hexadecimal del cuerpo.

Cantidad total:

```text
cols × 10 + railCols × 4
```

Cuando `hasRails` es `false`, usá `railCols = 0` y `railMargin = 0`.

## Conectividad interna

La zona central se conecta por columna:

- cinco agujeros de la mitad superior forman una red;
- cinco agujeros de la mitad inferior forman otra red;
- el canal central mantiene ambas redes aisladas.

Cada riel de alimentación forma una red longitudinal independiente. Los rieles positivo y negativo nunca se conectan entre sí ni con los del lado opuesto.

Los huecos visuales entre grupos de cinco no eliminan la continuidad lógica del riel en el formato actual. Si un modelo real tiene rieles eléctricamente interrumpidos, el esquema deberá ampliarse antes de representarlo; no falsifiques esa conectividad mediante el color.

## Ejemplos comprobados

### Estándar de 830 puntos

```json
{
  "id": "breadboard-830",
  "name": "Estándar 830 puntos",
  "cols": 63,
  "railCols": 50,
  "railMargin": 2,
  "hasRails": true,
  "color": "#f7f3e9"
}
```

Comprobación: `63 × 10 + 50 × 4 = 830`.

- Los rieles tienen diez grupos de cinco agujeros.
- Hay separación de un pitch entre grupos.
- Hay dos pitches de margen en cada extremo.
- Existen cuatro rieles: `+`, `−`, `+`, `−`.

### Compacta de 400 puntos

```json
{
  "id": "breadboard-400",
  "name": "Compacta 400 puntos",
  "cols": 30,
  "railCols": 25,
  "railMargin": 0,
  "hasRails": true,
  "color": "#f7f3e9"
}
```

Comprobación: `30 × 10 + 25 × 4 = 400`.

### Mini de 170 puntos, sin alimentación

```json
{
  "id": "breadboard-170",
  "name": "Mini 170 puntos · sin alimentación",
  "cols": 17,
  "railCols": 0,
  "railMargin": 0,
  "hasRails": false,
  "color": "#f7f3e9"
}
```

Comprobación: `17 × 10 = 170`. Este modelo muestra el canal central y dos puntos de montaje deshabilitados, pero no dibuja franjas ni agujeros de alimentación.

## Reglas visuales aprendidas

- La separación entre rieles y pistas centrales ocupa dos pitches.
- El canal central también ocupa dos pitches y debe estar centrado.
- Las franjas roja y azul recorren el largo útil del protoboard aunque los agujeros estén agrupados.
- Los agujeros siempre se centran exactamente sobre la matriz; no desplaces el fondo gris medio pitch.
- Los rieles deben llegar visualmente a ambos extremos según el modelo real.
- No deduzcas el número de puntos desde el nombre: calculalo con la fórmula.

## Verificación obligatoria

1. Compará el diseño contra fotografías o planos del fabricante.
2. Contá las columnas centrales y los agujeros de cada riel.
3. Verificá el total mediante la fórmula.
4. Confirmá la cantidad y polaridad de los rieles.
5. Revisá los márgenes y grupos repetidos de cinco.
6. Comprobá que el canal y las separaciones ocupen dos pitches.
7. Probá las cuatro rotaciones.
8. Confirmá en la vista esquemática que los grupos centrales y rieles forman redes correctas.
9. Mantené IDs estables para no romper proyectos guardados.

## Publicación

Importá el archivo JSON desde la pantalla Bibliotecas o alojalo en una URL HTTPS pública con CORS habilitado. Protohelp valida el manifiesto antes de instalarlo y conserva una copia en el navegador.
