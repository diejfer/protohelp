# Guía para crear bibliotecas de componentes de Protohelp

Esta guía está dirigida a personas y agentes que necesiten crear, revisar o ampliar una biblioteca de componentes compatible con Protohelp.

## Objetivo y archivo de referencia

Una biblioteca es un único archivo JSON declarativo. No puede contener JavaScript, HTML, SVG ni código ejecutable. Usá como referencia el archivo público `src/libraries/default-components.json` del repositorio.

El manifiesto raíz debe tener esta forma:

```json
{
  "schemaVersion": 1,
  "id": "fabricante-componentes",
  "name": "Componentes del fabricante",
  "version": "1.0.0",
  "kind": "components",
  "items": []
}
```

- `schemaVersion`: actualmente debe ser `1`.
- `id`: identificador estable y único de la colección. Usá minúsculas, números y guiones.
- `name`: nombre legible de la colección.
- `version`: versión semántica de la biblioteca. Incrementala cuando cambie una definición.
- `kind`: debe ser exactamente `components`.
- `items`: definiciones de componentes.

## Sistema de coordenadas

Todas las medidas son relativas al pitch del proyecto, no píxeles ni milímetros. Si un proyecto usa `pitchX = pitchY = 2,54 mm`, una unidad equivale a 2,54 mm.

- El anclaje `(0,0)` de un componente cae sobre una intersección de la matriz.
- Todos los pines deben usar coordenadas enteras para coincidir con agujeros.
- El cuerpo puede empezar medio pitch antes del anclaje usando offsets fraccionarios.
- El componente puede rotarse únicamente en múltiplos de 90°.

El cuerpo y el rectángulo ocupado se definen con:

- `w`, `h`: ancho y alto visual, en pitches.
- `bodyOffsetX`, `bodyOffsetY`: desplazamiento del borde superior izquierdo respecto del anclaje.

Importante: `w` y `h` expresan el tamaño del cuerpo, no la distancia entre el primer y el último pin. Por ejemplo, un carrier Pololu de 6 × 8 pitches con pines separados 5 × 7 pitches necesita offsets `-0.5, -0.5`. Así conserva medio pitch de borde en los cuatro lados y no invade la siguiente fila.

## Definición de un componente

```json
{
  "id": "mi-componente",
  "name": "Mi componente",
  "label": "U1",
  "w": 4,
  "h": 3,
  "bodyOffsetX": 0,
  "bodyOffsetY": 0,
  "color": "#2563eb",
  "pins": [[0,0], [0,3], [4,3], [4,0]],
  "pinLabels": ["VCC", "IN", "OUT", "GND"],
  "pinColors": ["#ef4444", "#22c55e", "#22c55e", "#475569"]
}
```

- `id`: único dentro de todas las bibliotecas activas. Incluí fabricante y modelo cuando sea necesario.
- `name`: nombre que aparecerá en el selector.
- `label`: texto inicial de cada instancia; el usuario podrá personalizarlo.
- `color`: color hexadecimal del cuerpo.
- `pins`: posiciones `[x,y]`, relativas al anclaje.
- `pinLabels`: etiqueta eléctrica correspondiente a cada pin.
- `pinColors`: color de cada pin, en el mismo orden.

`pins`, `pinLabels` y `pinColors` deben tener exactamente la misma cantidad de elementos.

## Ejemplo: resistencia de un pitch de alto

Los pines están en una misma línea de la matriz. El cuerpo se extiende medio pitch arriba y abajo:

```json
{
  "id": "resistor-axial",
  "name": "Resistencia axial",
  "label": "R · 220 Ω",
  "w": 5,
  "h": 1,
  "bodyOffsetX": 0,
  "bodyOffsetY": -0.5,
  "color": "#d6a86e",
  "pins": [[0,0], [5,0]],
  "pinLabels": ["1", "2"],
  "pinColors": ["#64748b", "#64748b"]
}
```

Nunca ubiques los pines en `y = 0.5` para centrar el cuerpo: eso dejaría los pines entre dos agujeros. Desplazá el cuerpo, no los pines.

## Ejemplo: carrier Pololu

```json
{
  "id": "pololu-a5984",
  "name": "Pololu A5984 · driver paso a paso",
  "label": "A5984",
  "w": 6,
  "h": 8,
  "bodyOffsetX": -0.5,
  "bodyOffsetY": -0.5,
  "color": "#2563eb",
  "pins": [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[5,7],[5,6],[5,5],[5,4],[5,3],[5,2],[5,1],[5,0],[3,0]],
  "pinLabels": ["EN","MS1","MS2","MS3","RST","SLP","STEP","DIR","VMOT","GND","2B","2A","1A","1B","VDD","GND","FAULT"],
  "pinColors": ["#22c55e","#a855f7","#a855f7","#a855f7","#f59e0b","#f59e0b","#22c55e","#22c55e","#ef4444","#475569","#f97316","#f97316","#f97316","#f97316","#ef4444","#475569","#eab308"]
}
```

## Colores recomendados

- Alimentación positiva: `#ef4444`.
- Tierra: `#475569`.
- Señales digitales: `#22c55e`.
- Configuración: `#a855f7`.
- Motor o carga: `#f97316`.
- Advertencia/control especial: `#f59e0b` o `#eab308`.

Los colores son visuales y no agregan semántica eléctrica automática.

## Verificación obligatoria

Antes de distribuir una biblioteca:

1. Confirmá el pinout con documentación del fabricante.
2. Contá que `pins`, `pinLabels` y `pinColors` tengan igual longitud.
3. Verificá que todos los pines tengan coordenadas enteras.
4. Comprobá que ningún pin esté fuera del cuerpo salvo que el componente real lo requiera.
5. Colocá el componente sobre un protoboard en las cuatro rotaciones.
6. Confirmá que cada pin caiga en un agujero y que el cuerpo no invada una fila adicional.
7. Revisá las etiquetas en la vista física y esquemática.
8. Usá IDs estables: cambiar un ID rompe la referencia de proyectos existentes.

## Publicación

Podés importar el JSON desde un archivo local o alojarlo en una URL HTTPS pública. Para cargarlo por URL, el servidor debe responder con JSON válido y permitir CORS. No uses redirecciones privadas, autenticación ni recursos ejecutables.
