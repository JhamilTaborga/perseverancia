# Perseverancia

Paisaje de Marte cinematográfico en Vite + Three.js con el rover Perseverance de la NASA manejable.

## Qué hay

- **Escena** (`src/`): dunas procedurales con ondulaciones suaves (`terrain.js`), rocas instanciadas (`rocks.js`), cielo caramelo con halo azulado y bruma (`sky.js`), sol de tarde con sombras, Fobos y Deimos (`moons.js`), polvo flotante (`dust.js`) y post-proceso (bloom, viñeta, grano) en `main.js`.
- **Rover** (`rover.js`): modelo oficial `public/models/perseverance.glb` (Draco; decodificadores en `public/draco/`), escalado a tamaño real (3.0 m de largo) con el mástil desplegado. Se maneja con WASD/flechas y la cámara lo sigue.
- **Ruedas**: el GLB trae las 6 ruedas en una sola malla; `rigWheels` las separa en pivotes. Giran según la distancia recorrida y las de las esquinas se orientan (Ackermann al doblar, en diagonal al girar en el sitio).
- **Huellas** (`tracks.js`): dos franjas continuas con normal map (surco, garras, bordes). Se apoyan con `surfaceHeight`, que da la altura exacta de la malla dibujada.
- **Control de misión** (`src/mission/`): panel con el patrón de Open MCT: cada dato declara nombre, unidad y proveedor; los proveedores responden `request` (historial) y `subscribe` (en vivo). Distancia, altura e inclinación vienen del historial de manejos de la NASA (`M20_waypoints.json` + `M20_waypoints_current.json`, solo paradas `final: "y"`, revalidados siempre y consultados cada 10 min); el tiempo de luz Tierra–Marte se calcula en `lighttime.js` con órbitas de JPL. La tecla T lo oculta. `window.__mission` solo existe en desarrollo.
- **Fotos reales** (`src/photos/`): 4 puntos brillan sobre Mastcam_Z_cams, NavCams, hazcams_front y WATSON (si dos caen a menos de 30 px en pantalla se separan; Mastcam y Navcam comparten la cabeza del mástil). Clic: obturador, flash y revelado de una foto real; clic amplía, ←/→ más fotos de esa cámara, Esc vuelve. Con el visor abierto el teclado no maneja el rover. Las fotos están elegidas a mano en `curated.js` (de la API raw_images de la NASA, mirándolas antes); para renovarlas hay que volver a elegir. `window.__photos` solo existe en desarrollo.
- **Cámaras del rover**: al cargar se listan en consola con el prefijo `[cámaras]` y quedan en `rover.userData.cameras` para usarlas más adelante.

## Comandos

- `npm run dev`: servidor en http://localhost:5173
- `npm run check`: abre la escena en Opera GX con Playwright (`playwright-core`, sin descargar navegadores; si no está, usa Chrome Dev o Edge). Conduce el rover, guarda capturas en `screenshots/` (inicio, tras conducir y girando en el sitio), verifica que las ruedas giren, que los 4 datos del control de misión tengan número y que T lo oculte, hace clic en las 4 cámaras (guarda `check-foto-<cámara>.png` con la foto abierta y prueba flechas y Esc), y termina con código 1 si hay errores de consola. Si el servidor no está corriendo, lo arranca.

## Notas

- El frente del modelo es +Z y +X es su lado izquierdo. El clip `CylinderAction` a mitad de su duración despliega el mástil.
- `window.__rover` solo existe en modo desarrollo y lo usa `npm run check`.
