# Protohelp

Diseñá circuitos sobre protoboards, verificá sus conexiones y calculá la longitud de cada puente antes de cortar los cables.

## [Abrir Protohelp en el navegador →](https://diejfer.github.io/protohelp/)

No requiere instalación, cuenta ni servidor. Los proyectos se guardan localmente en el navegador y se pueden importar o exportar como archivos JSON.

## Qué permite hacer

- combinar varios modelos de protoboard en un mismo proyecto;
- colocar, mover y rotar componentes manteniendo sus pines alineados con los contactos;
- dibujar puentes manualmente o generarlos mediante autoruteo;
- mover los extremos de cada puente entre agujeros sin volver a crearlo;
- deshacer el último cambio con el botón del editor o con `Ctrl+Z`;
- consultar la longitud de los cables y obtener una lista de corte;
- detectar pines, contactos y ubicaciones potencialmente inválidas;
- alternar entre la vista física y una vista esquemática de las conexiones;
- ampliar las bibliotecas de componentes y protoboards mediante manifiestos JSON;
- trabajar sin backend, con autoguardado en `localStorage`.

## Bibliotecas personalizadas

Protohelp incluye bibliotecas predeterminadas, pero cualquier persona puede crear y publicar las suyas usando el mismo formato:

- [Guía para crear componentes](https://diejfer.github.io/protohelp/guides/components/AGENTS.md)
- [Guía para crear protoboards](https://diejfer.github.io/protohelp/guides/protoboards/AGENTS.md)

Los manifiestos incluidos sirven como ejemplos completos:

- [`src/libraries/default-components.json`](src/libraries/default-components.json)
- [`src/libraries/default-boards.json`](src/libraries/default-boards.json)

Una biblioteca puede importarse desde un archivo JSON o desde una URL HTTPS con CORS habilitado. Protohelp valida el manifiesto, guarda una copia local e incorpora sus elementos a los selectores del editor.

## Desarrollo local

Requiere Node.js 22 o posterior.

```bash
npm install
npm run dev
```

La aplicación queda disponible en [http://localhost:5173/protohelp/](http://localhost:5173/protohelp/).

Para generar y verificar la versión de producción:

```bash
npm test
```

## Formato de las bibliotecas

Cada biblioteca es un manifiesto JSON independiente. El campo `kind` debe ser `components` o `boards`:

```json
{
  "schemaVersion": 1,
  "id": "mi-biblioteca",
  "name": "Mi biblioteca",
  "version": "1.0.0",
  "kind": "components",
  "items": []
}
```

Las coordenadas y dimensiones se expresan en múltiplos del pitch del proyecto. Los tipos completos están definidos en [`src/libraries/types.ts`](src/libraries/types.ts).
