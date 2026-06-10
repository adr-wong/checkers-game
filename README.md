# Juego de Damas con Microservicio de IA

Juego de damas completo, multi-jugador y multi-variante, con un microservicio dedicado de inteligencia artificial. Los jugadores pueden competir entre si o contra una IA con niveles de dificultad seleccionables. El sistema esta containerizado y disenado para despliegue local y en la nube.

---

## Tabla de Contenidos

- [Prerequisitos](#prerequisitos)
- [Inicio Rapido](#inicio-rapido)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Stack Tecnologico](#stack-tecnologico)
- [Flujo de la Aplicacion](#flujo-de-la-aplicacion)
- [Variantes de Damas Soportadas](#variantes-de-damas-soportadas)
- [Motor de IA](#motor-de-ia)
- [Componentes del Frontend](#componentes-del-frontend)
- [API REST (web service)](#api-rest-web-service)
- [Modelo de Datos](#modelo-de-datos)
- [Variables de Entorno](#variables-de-entorno)
- [Autenticacion Clerk (opcional)](#autenticacion-clerk-opcional)
- [Configuracion y Ejecucion](#configuracion-y-ejecucion)
- [Limitaciones](#limitaciones)

---

## Prerequisitos

- [Bun](https://bun.sh) (runtime y gestor de paquetes)
- [Docker](https://docs.docker.com/get-docker/) y Docker Compose
- [MongoDB](https://www.mongodb.com/) (contenedor Docker)

Puedes verificar que todo este instalado con:

```bash
./check-deps.sh
```

---

## Inicio Rapido

### Forma mas facil: un solo comando

```bash
# 1. Verificar dependencias
./check-deps.sh

# 2. Configurar entorno (solo la primera vez)
cp .env.example .env

# 3. Reconstruir y arrancar todo
./rebuild.sh
```

`rebuild.sh` detiene contenedores anteriores, reconstruye las imagenes y arranca los 4 servicios en modo produccion. Finaliza mostrando el estado de los servicios.

Servicios:
- Frontend: http://localhost:3001
- API: http://localhost:3000

### Con Docker Compose directamente

```bash
# Produccion
docker compose up --build

# Desarrollo con HMR (recarga en caliente)
docker compose -f docker-compose.dev.yml up --build
```

### Configuracion Manual (servicio por servicio)

Si prefieres ejecutar cada servicio por separado:

```bash
# 1. MongoDB
docker run -d --name checkers-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=checkers \
  mongo:7

# 2. Servicio de IA
cd apps/ai-service
PORT=4000 ALLOWED_ORIGIN=* bun run src/index.ts

# 3. Servidor API (otra terminal)
cd apps/web
PORT=3000 \
MONGODB_URI=mongodb://localhost:27017/checkers \
AI_SERVICE_URL=http://localhost:4000 \
bun run index.ts

# 4. Frontend (otra terminal)
cd apps/web
bun run dev
```

---

## Estructura del Proyecto

El proyecto esta organizado como un monorepo gestionado con workspaces de Bun:

```
checkers/
├── apps/
│   ├── web/                    Aplicacion TanStack Start + API Hono
│   │   ├── src/
│   │   │   ├── routes/         Rutas basadas en archivos (TanStack Router)
│   │   │   ├── components/     Componentes React (Board, Piece, MoveLog, etc.)
│   │   │   ├── server/         Servidor Hono con rutas de la API
│   │   │   ├── models/         Modelo y servicio de juego (MongoDB/Mongoose)
│   │   │   ├── services/       Cliente del microservicio de IA
│   │   │   ├── lib/            Utilidades compartidas y cliente API
│   │   │   └── styles/         Sistema de estilos para piezas y tablero
│   │   └── index.ts            Punto de entrada del servidor Hono
│   │
│   └── ai-service/             Microservicio de IA independiente
│       ├── src/
│       │   ├── engine/         Motor de IA (negamax, eval, astar, noise)
│       │   └── index.ts        Servidor Hono
│       └── tests/              Pruebas del motor de IA
│
├── packages/
│   └── shared/                 Paquete compartido de tipos y utilidades
│       └── src/
│           ├── types.ts        Tipos TypeScript (Team, Cell, Move, etc.)
│           ├── board.ts        Funciones de tablero (parse, serialize, moves)
│           ├── ruleset.ts      Definiciones de variantes y configuracion de reglas
│           └── transposition.ts Tabla de transposicion para optimizacion del motor
│
├── docker-compose.yml          Orquestacion de servicios (produccion)
├── docker-compose.dev.yml      Orquestacion con HMR (desarrollo)
├── rebuild.sh                  Script de reconstruccion
├── package.json                Configuracion raiz del monorepo
└── .env.example                Ejemplo de variables de entorno
```

---

## Stack Tecnologico

| Componente              | Tecnologia                                    |
|-------------------------|-----------------------------------------------|
| Frontend                | React 19, TanStack Router (rutas por archivos)|
| Runtime                 | Bun                                           |
| API                     | Hono                                          |
| Base de datos           | MongoDB (via Mongoose)                        |
| Validacion              | Zod                                           |
| Contenerizacion         | Docker + Docker Compose                       |
| Lenguaje                | TypeScript en todo el proyecto                |
| Servidor frontend (prod)| Nginx                                         |

---

## Flujo de la Aplicacion

### 1. Creacion de Partida

El jugador accede a la pagina de inicio (`/`) y selecciona:
- **Variante de reglas**: English, International, Brazilian, Russian o Pool
- **Modo de juego**: PvP (Jugador vs Jugador), PvA (Jugador vs IA) o AiA (IA vs IA)
- **Opciones de IA** (si aplica): dificultad, algoritmo, equipo de la IA
- **Estilo de piezas**: Classic, Bottle Caps, Crystal, Heraldic, Hexagonal, Marble o Minimalist

Al presionar "Start Game", se crea una partida en MongoDB y se redirige a `/game/$gameId`.

### 2. Desarrollo de la Partida

- El tablero se renderiza desde el estado almacenado en MongoDB.
- El jugador selecciona una pieza -> se obtienen los movimientos legales -> se resaltan los destinos posibles.
- Al seleccionar un destino, se envia el movimiento via `POST /api/game/:gameId/move`.
- Si es turno de la IA, el servidor web llama al microservicio de IA (`POST /move`), aplica el resultado y lo guarda.
- El cliente obtiene actualizaciones via polling cada 1.5 segundos durante los turnos de la IA.

### 3. Animacion de Movimientos

- Los movimientos se animan usando `requestAnimationFrame` con interpolacion lineal y ease-out.
- Los movimientos multi-captura se descomponen en pasos individuales.
- En modo AiA, se detectan los movimientos de la IA via polling del tablero y se animan automaticamente.

### 4. Finalizacion de Partida

- La partida termina cuando un jugador se queda sin piezas, sin movimientos legales, o por renuncia.
- Se redirige a `/game/$gameId/end` donde se muestra el ganador, total de movimientos y piezas restantes.
- El jugador puede "Play Again" (misma configuracion) o volver al inicio.

---

## Variantes de Damas Soportadas

| Variante       | Tablero | Mov. Normales | Rey       | Captura Oblig. | Max Captura | Capt. Atras | Promocion Corta |
|----------------|---------|---------------|-----------|----------------|-------------|-------------|-----------------|
| English        | 8x8     | Adelante      | Corto     | Si             | No          | No          | Si              |
| International  | 10x10   | Adelante      | Volador   | Si             | Si          | Si          | Si              |
| Brazilian      | 8x8     | Adelante      | Volador   | Si             | Si          | Si          | Si              |
| Russian        | 8x8     | Adelante      | Volador   | Si             | No          | No          | No              |
| Pool           | 8x8     | Todas dir.    | Volador   | Si             | No          | Si          | Si              |

- **Movimiento normal "Adelante"**: Las piezas normales solo se mueven diagonalmente hacia adelante.
- **Movimiento normal "Todas dir."**: Las piezas normales se mueven en cualquier direccion diagonal (Pool).
- **Rey "Corto"**: El rey se mueve un cuadro en cualquier direccion diagonal.
- **Rey "Volador"**: El rey se desliza a lo largo de la diagonal hasta encontrar una pieza o el borde.
- **Captura Obligatoria**: Si hay una captura disponible, el jugador debe tomarla.
- **Captura Maxima**: El jugador debe tomar la secuencia de captura mas larga posible.
- **Captura Atras**: Las piezas normales pueden capturar hacia atras.
- **Promocion Corta**: Cuando una pieza alcanza la fila de promocion durante una captura multiple, se convierte en rey y la secuencia de captura termina.

---

## Motor de IA

El microservicio de IA opera como un servicio sin estado: misma entrada -> misma salida (cuando no hay ruido).

### Algoritmos

#### Negamax con poda alfa-beta y profundizacion iterativa
- **Negamax**: Formulacion de minimax donde el valor de una posicion desde la perspectiva de un jugador es el negativo del valor desde la perspectiva del oponente.
- **Poda alfa-beta**: Alpha rastrea el mejor puntaje que el jugador maximizador puede garantizar; beta rastrea el mejor del minimizador. Si alpha >= beta, se descartan los nodos restantes.
- **Profundizacion iterativa**: Busca desde profundidad 1 hasta la maxima. Si se interrumpe por timeout, devuelve el mejor movimiento de la ultima iteracion completada.
- **Ordenamiento de movimientos**: Capturas primero, luego capturas multiples, luego promociones. Maximiza la poda.
- **Tabla de transposicion**: Almacena evaluaciones de tableros ya vistos para evitar recalculaciones redundantes.

#### A* (busqueda de agente unico)
- Trata las damas como un problema de busqueda de caminos hacia el objetivo de eliminar todas las piezas del oponente.
- Heuristica: numero de piezas del oponente restantes (admisible, nunca sobrestima).
- Limitado a profundidad 8 y 50,000 iteraciones.
- Mas debil que negamax porque no modela las respuestas del oponente.

### Niveles de Dificultad

| Dificultad | Profundidad Maxima | Ruido de Evaluacion |
|------------|-------------------|---------------------|
| Easy       | 2                 | +/-80               |
| Medium     | 5                 | +/-20               |
| Hard       | 9                 | 0 (determinista)    |

El ruido de evaluacion es un entero aleatorio agregado al puntaje de evaluacion en nodos hoja. Hace que los niveles faciles jueguen de forma imperfecta sin parecer aleatorios.

### Funcion de Evaluacion

La evaluacion puntua un tablero desde la perspectiva de un equipo (positivo = mejor para ese equipo):

| Componente         | Peso   | Descripcion                                           |
|---------------------|--------|-------------------------------------------------------|
| Pieza normal        | 100    | Valor base de una pieza normal                        |
| Rey (corto)         | 160    | Rey con movimiento de un cuadro                       |
| Rey (volador)       | 280    | Rey que se desliza diagonalmente                      |
| Rey (volador+max)   | 320    | Rey volador con captura maxima obligatoria            |
| Centro              | 10     | Bonificacion por piezas en la region central 4x4/6x6  |
| fila trasera        | 15     | Bonificacion por piezas en la fila de inicio propia    |
| Movilidad           | 5      | Multiplicado por numero de movimientos legales         |
| Avance              | 3      | Multiplicado por filas avanzadas hacia el oponente     |

**Puntaje final** = (material + posicion del equipo) - (material + posicion del oponente)

### Endpoints del Servicio de IA

| Metodo | Ruta      | Descripcion                          |
|--------|-----------|--------------------------------------|
| GET    | /health   | Health check para orquestacion       |
| POST   | /move     | Calcula el mejor movimiento dado un tablero |

---

## Componentes del Frontend

### Rutas

| Ruta                    | Pagina             | Descripcion                                     |
|-------------------------|--------------------|-------------------------------------------------|
| `/`                     | Inicio             | Configuracion y creacion de nueva partida        |
| `/game/$gameId`         | Tablero            | Juego activo con tablero, estado y controles     |
| `/game/$gameId/end`     | Fin de partida     | Resultados, estadisticos y opciones para jugar   |

### Componentes Principales

- **Board**: Tablero de damas renderizado con CSS Grid. Resalta pieza seleccionada (amarillo), movimientos legales (punto verde) y ultimo movimiento (azul tenue).
- **Piece**: Piezas SVG renderizadas segun el estilo seleccionado. Cada estilo define componentes `Normal` y `Crowned` para ambos equipos.
- **AnimationOverlay**: Superposicion que anima el movimiento de piezas entre celdas usando `requestAnimationFrame`.
- **MoveLog**: Registro de movimientos en formato notacion algebraica (ej: `A3-B4`, `C5xE7`).
- **StylePicker**: Selector de estilo de piezas con vista previa.
- **GameBanner**: Banner informativo durante el juego.

### Sistema de Estilos

El proyecto implementa un registro de estilos extensible con 7 estilos:

| Estilo       | Descripcion                                              |
|--------------|----------------------------------------------------------|
| Classic      | Circulos simples con borde negro. Corona tipo estrella.  |
| Bottle Caps  | Forma de tapa de botella con bordes dentados.            |
| Crystal      | Forma cristalina con facetas translucidas.               |
| Heraldic     | Diseno heraldico con escudo y ornamentos.                |
| Hexagonal    | Forma hexagonal con patron geometrico.                  |
| Marble       | Textura de marmol con vetas naturales.                   |
| Minimalist   | Diseno minimalista y moderno.                            |

Los estilos se registran en `src/styles/index.ts` y se seleccionan antes de iniciar la partida. La preferencia se persiste en `localStorage`.

---

## API REST (web service)

Base path: `/api`

| Metodo | Ruta                          | Descripcion                                      |
|--------|-------------------------------|--------------------------------------------------|
| POST   | `/api/game`                   | Crea una nueva partida                            |
| GET    | `/api/game/:gameId/state`     | Obtiene el estado actual de la partida            |
| GET    | `/api/game/:gameId/legal`     | Movimientos legales para una pieza (`?row=&col=`) |
| POST   | `/api/game/:gameId/move`      | Realiza un movimiento del jugador                 |
| POST   | `/api/game/:gameId/resign`    | Rendirse (termina la partida)                     |
| POST   | `/api/leaderboard`            | Obtiene el leaderboard                           |
| POST   | `/api/shop/purchase`          | Procesa una compra en la tienda                   |

### Flujo de un Movimiento (PvA)

1. El jugador envia `POST /api/game/:gameId/move` con origen y destino.
2. El servidor valida que sea el turno correcto y que el movimiento sea legal.
3. Aplica el movimiento y guarda el historial en MongoDB.
4. Si el siguiente turno es de la IA, llama a `POST /move` del microservicio de IA.
5. Aplica la respuesta de la IA, guarda y devuelve el estado actualizado.

### Flujo de un Movimiento (AiA)

- Tras cada polling del cliente, el servidor verifica si es turno de la IA y ejecuta el movimiento en background.
- Usa un lock por partida (`aiMoveLocks`) para evitar movimientos concurrentes.
- Implementa un cooldown de 5 segundos tras fallos de la IA.

---

## Modelo de Datos

Coleccion: `games`

```typescript
{
  _id:           ObjectId,
  ruleset:       RuleSet,          // Configuracion completa de variantes
  mode:          "pvp" | "pva" | "ava",
  algorithm:     "minimax" | "astar",  // Requerido si mode !== "pvp"
  difficulty:    "easy" | "medium" | "hard" | null,
  ai_team:       "red" | "black" | null,
  board:         string,           // Tablero serializado como string plano
  turn:          "red" | "black",
  status:        "active" | "red_wins" | "black_wins" | "draw",
  move_count:    number,
  history:       Array<{
    from:            [number, number],
    to:              [number, number],
    captures:        [number, number][],
    promotion:       boolean,
    board_after:     string,
    timestamp:       Date
  }>,
  styleConfig: {
    pieceStyleId: string,
    boardStyleId: string
  },
  created_at:    Date,
  updated_at:    Date
}
```

### Representacion del Tablero

El tablero se codifica como un string plano de longitud `boardSize * boardSize`. Los caracteres se leen de izquierda a derecha, de arriba a abajo.

| Caracter | Significado                        |
|----------|------------------------------------|
| `#`      | Casilla oscura, vacia (jugable)    |
| `-`      | Casilla clara (no jugable)         |
| `r`      | Pieza normal roja                  |
| `R`      | Rey rojo                           |
| `b`      | Pieza normal negra                 |
| `B`      | Rey negro                          |

---

## Variables de Entorno

### Servicio Web

| Variable               | Valor por defecto                        | Descripcion                          |
|------------------------|------------------------------------------|--------------------------------------|
| `PORT`                 | `3000`                                   | Puerto del servidor web              |
| `MONGODB_URI`          | `mongodb://mongodb:27017/checkers`       | URI de conexion a MongoDB            |
| `AI_SERVICE_URL`       | `http://ai-service:4000`                 | URL del microservicio de IA          |
| `AI_REQUEST_TIMEOUT_MS`| `10000`                                  | Timeout para requests a la IA (ms)   |
| `VITE_CLERK_PUBLISHABLE_KEY` | (opcional)                      | Clave publica de Clerk               |
| `CLERK_SECRET_KEY`     | (opcional)                               | Clave secreta de Clerk               |

### Servicio de IA

| Variable           | Valor por defecto       | Descripcion                       |
|--------------------|-------------------------|-----------------------------------|
| `PORT`             | `4000`                  | Puerto del servidor de IA         |
| `ALLOWED_ORIGIN`   | `*`                     | Origenes permitidos para CORS     |

### MongoDB

| Variable                  | Valor por defecto   |
|---------------------------|---------------------|
| `MONGO_INITDB_DATABASE`   | `checkers`          |

---

## Autenticacion Clerk (opcional)

La aplicacion funciona sin Clerk. Para habilitar autenticacion y el leaderboard:

1. Crea una cuenta gratuita en [clerk.com](https://clerk.com)
2. Obtén tus claves del Dashboard de Clerk
3. Agrega las claves a `.env`:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   ```
4. Si usas Docker, reconstruye: `docker compose up --build`
5. Si ejecutas manualmente, reinicia el servidor de desarrollo del frontend

---

## Configuracion y Ejecucion

### Scripts disponibles

| Script           | Comando         | Descripcion                                     |
|------------------|-----------------|-------------------------------------------------|
| `check-deps.sh`  | `./check-deps.sh` | Valida que bun, Docker y Docker Compose esten instalados |
| `rebuild.sh`     | `./rebuild.sh`    | Reconstruye y arranca todos los servicios Docker  |

### Pruebas

```bash
# Todas las pruebas
bun test

# Solo paquete compartido
bun run test:shared

# Solo servicio de IA
bun run test:ai
```

### Servicios Docker

| Servicio     | Puerto  | Descripcion                              |
|--------------|---------|------------------------------------------|
| `frontend`   | 3001    | Frontend estatico servido via Nginx      |
| `api`        | (interno) | API REST + servidor Hono              |
| `ai-service` | (interno) | Microservicio de IA                    |
| `mongodb`    | (interno) | Base de datos MongoDB                  |

Solo el frontend (puerto 3001) se expone externamente. Los demas servicios se comunican a traves de la red interna `checkers-net`.

---

## Limitaciones

- **Sin multiplayer en red**: El modo PvP es local (dos jugadores en el mismo navegador). No hay juego entre diferentes maquinas.
- **Sin historial de partidas persistente en UI**: El historial se almacena en MongoDB pero no hay interfaz para revisar partidas anteriores.
- **Constructor de reglas no disponible**: El backend soporta layouts personalizados, pero la interfaz grafica solo permite las 5 variantes predefinidas.
- **Tableros 10x10 con reyes voladores**: El servicio de IA puede tardar mas de 10 segundos en calcular movimientos en tableros grandes con reyes voladores debido a la explosion combinatoria.
- **Sin soporte movil**: La interfaz esta disenada para escritorio, con uso baseline en tablet. No hay aplicacion nativa movil.
- **A* es debil**: El algoritmo A* trata las damas como un problema de busqueda de caminos unidireccional, ignorando las respuestas del oponente. Es significativamente mas debil que Negamax.
- **Sin endgame tablebases**: No se implementan bases de datos de finales (Chinook).
- **Eval no determinista en dificultad facil/media**: El ruido aleatorio en la evaluacion hace que los movimientos no sean reproducibles en dificultad facil y media.
