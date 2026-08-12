# Protohelp

Editor web para diseñar montajes físicos sobre protoboards y calcular la longitud de los puentes antes de cortarlos.

## Estado actual

- protoboard estándar sobre una matriz configurable;
- componentes translúcidos, arrastrables y rotables;
- capa independiente de puentes;
- cálculo de longitudes y lista de corte;
- autoguardado en el navegador;
- importación y exportación de proyectos JSON;
- interfaz adaptable a escritorio y dispositivos móviles.

## Desarrollo local

Requiere Node.js 22 o posterior.

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173/protohelp/`.

## Crear bibliotecas

Las definiciones incorporadas no están codificadas dentro del editor. Son manifiestos JSON normales ubicados en:

- `src/libraries/default-components.json`
- `src/libraries/default-boards.json`

Para crear una biblioteca, copiá el archivo del tipo correspondiente, asignale un `id` único y modificá `name`, `version` e `items`. El formato raíz es:

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

`kind` debe ser `components` o `boards`. Las coordenadas y dimensiones se expresan como múltiplos del pitch del proyecto. Los tipos completos están documentados en `src/libraries/types.ts`.

La biblioteca puede importarse como archivo JSON desde la pantalla **Bibliotecas** o publicarse en una URL HTTPS con CORS habilitado. Protohelp valida el manifiesto, guarda una copia local y agrega los elementos activos a los selectores del editor.

## Verificación

```bash
npm run build
```
