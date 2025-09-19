# Ares Tac Toe

Aplicación de Tic-Tac-Toe creada con React y Vite que ahora admite tres modos de juego:

- **Juego local** en el mismo dispositivo.
- **Modo solo** contra un bot con inteligencia básica basada en *minimax*.
- **Juego online** mediante salas privadas protegidas con código y contraseña, sincronizadas con WebSockets.

## Requisitos

- Node.js 20 o superior (LTS)

## Instalación

```bash
npm install
```

## Scripts disponibles

- `npm run dev`: inicia el cliente de Vite en modo desarrollo.
- `npm run build`: genera la versión optimizada para producción.
- `npm run preview`: ejecuta la vista previa del build.
- `npm run server`: levanta el servidor WebSocket necesario para las partidas online.

## Juego online

1. Ejecutá el servidor WebSocket en una terminal:
   ```bash
   npm run server
   ```
2. En otra terminal, iniciá la aplicación web:
   ```bash
   npm run dev
   ```
3. Abrí `http://localhost:5173` en tu navegador. En la pantalla de inicio elegí "Juego Online".
4. Ingresá tu nombre de usuario, luego seleccioná si querés crear o unirte a una sala.
5. Al crear o unirte se te pedirá un **código** y una **contraseña**. Ambos datos son necesarios tanto para el host como para la persona invitada.

> 💡 Podés cambiar la URL del WebSocket estableciendo la variable de entorno `VITE_WS_URL` antes de arrancar el cliente. Por defecto la app usa un `wss://` apuntando al mismo dominio cuando se sirve sobre HTTPS, o `ws://localhost:3001` durante el desarrollo local.

## Juego contra el bot

El modo "Jugar Solo" ahora permite elegir la dificultad entre **Fácil**, **Intermedio** y **Difícil**. El bot combina jugadas aleatorias con estrategia minimax para adaptarse al nivel seleccionado. Tras cada encuentro podés reiniciar la partida y volver al inicio cuando quieras.

## Licencia

Proyecto con fines educativos.
