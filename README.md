# biblioteca-prestamos

Microservicio de préstamos del proyecto guía de DSY1107, **tal como queda al terminar L9**: NestJS 12 con el contrato
HTTP de siempre. Puerto **3002**. Es el dueño del esquema `prestamos` de Postgres y el que publica
`prestamo.creado` y `prestamo.devuelto`, **después** de escribir, en RabbitMQ (exchange `biblioteca.eventos`) y,
desde L9, **además** en Kafka (topic `biblioteca.prestamos`).

## El contrato HTTP

Lo consumen el gateway (`GET /prestamos`) y el BFF (la raíz y `/:id`). Cada petición paga 300 ms de latencia
simulada, también las que terminan en 401 o 405. Los errores traen `{ "mensaje": "..." }`.

| Método y ruta | Código | Qué hace |
|---|---|---|
| `GET /` o `GET /prestamos` | 200 | Lista de préstamos. No pide token |
| | 503 | Postgres no responde |
| `POST /` o `POST /prestamos` | 201 | Crea un préstamo del `sub` del token y publica `prestamo.creado` |
| | 400 | Cuerpo inválido (DTO) o dato que Postgres rechaza |
| | 401 | Sin token válido |
| | 409 | Ya tiene un préstamo vigente de ese libro |
| | 503 | Postgres no responde |
| `DELETE /:id` o `DELETE /prestamos/:id` | 200 | Marca devuelto y publica `prestamo.devuelto` |
| | 401 / 404 / 503 | Sin token válido / no existe / Postgres no responde |
| cualquier otro método | 405 | `metodo X no soportado` |

Cuerpo del `POST`: `{ "libroId": 3, "desde": "2026-11-02", "hasta": "2026-11-16" }`. `ValidationPipe` con
`whitelist` y `forbidNonWhitelisted` rechaza lo que no esté en `src/prestamos/dto/crear-prestamo.dto.ts`. El BFF
también manda `usuarioSub` y `devuelto`; el DTO los acepta y los ignora: el dueño sale del token.

## Kafka (L9): `biblioteca.prestamos`

Después de guardar en Postgres y de publicar en RabbitMQ, el controlador publica el mismo hecho en Kafka: se agregó
un productor, no se cambió uno por otro. El mensaje:

| Parte | Valor |
|---|---|
| Topic | `biblioteca.prestamos` (3 particiones, 3 réplicas, `min.insync.replicas=2`) |
| Key | `usuarioSub`: el `sub` del token en `prestamo.creado`; el dueño del préstamo en `prestamo.devuelto` |
| Value | El sobre en JSON: `eventoId`, `tipo`, `version` (1), `emitidoEn`, `libroId` (string), `usuarioSub` y `datos`: `{prestamoId, desde, hasta}` o `{prestamoId}`. `prestamoId` viaja como string |
| Headers | `x-evento-id` (igual a `eventoId`), `x-correlation-id` (un uuid por mensaje) y `content-type: application/json` |

El productor (`src/kafka/productor.provider.ts`) usa `idempotent: true`, `acks: ProduceAcks.ALL`, `retries: 10`,
`partitioner: compatibilityPartitioner`, `autocreateTopics: false` y `stringSerializers`. El sobre se arma desde
`EventoDto` (`class-validator`) y se valida **antes** de enviar; `aMensaje` es el único lugar que arma `topic`, `key`,
`value` y `headers`.

**Si Kafka no responde:** el préstamo ya está guardado, así que la petición sigue en **201**, igual que cuando falla
RabbitMQ. El productor reintenta 10 veces (con `retries`, no para siempre), por eso el fallo se ve y la petición no
se cuelga: tarda unos 11 segundos y deja en el log una línea `ERROR` con el motivo (por ejemplo `Messages are
rejected since there are fewer in-sync replicas than required` con dos brokers caídos, o `Connection to
broker-1:19092 failed` con los tres). Con un solo broker caído se publica sin diferencia. El evento perdido no se
recupera solo: reintentarlo sin perderlo, con la base y el log de acuerdo, es de la E3.

## Qué hay en cada archivo

| Archivo | Qué es |
|---|---|
| `src/main.ts` | Arranque: latencia simulada, `ValidationPipe`, filtro de errores y cierre ordenado |
| `src/auth/jwt.guard.ts` | `jose` y JWKS en `COGNITO_ISSUER`: firma, `iss` y `exp`. Deja el `sub` en la petición |
| `src/prestamos/` | Controlador, DTO y repositorio `pg` (todo el SQL). Aplica `esquema.sql` al arrancar |
| `src/mensajeria/` | Publicador `amqplib`: exchange `biblioteca.eventos`, headers `x-evento-id` y `x-emitido-en` |
| `src/kafka/` | `topics.ts` (`TOPICS`), `evento.dto.ts`, `a-mensaje.ts`, `productor.provider.ts` (crea el `Producer` desde `KAFKA_BROKERS`) y `publicador-kafka.service.ts` (valida, envía y cierra el productor en `onModuleDestroy`) |
| `esquema.sql` | El esquema `prestamos`, con la regla de un préstamo vigente por lector y libro |
| `Dockerfile` | Dos etapas sobre `node:24-alpine`: compila y deja solo lo de producción |

## Cómo usarlo

Necesitas **Node 24.15.0 o superior**, Postgres y RabbitMQ (los de `biblioteca-plataforma`). Forkea
`biblioteca-prestamos-l10` y clónalo **sin el sufijo**, junto a los otros siete. Los mismos comandos sirven en
Windows (PowerShell), macOS y Linux:

```bash
cd $HOME/DSY1107/l10
git clone https://github.com/TU_USUARIO/biblioteca-prestamos-l10.git biblioteca-prestamos
cd biblioteca-prestamos
npm install
```

Copia `.env.example` a `.env` (Windows: `Copy-Item .env.example .env`; macOS y Linux: `cp .env.example .env`) y
rellena los valores en blanco. `KAFKA_BROKERS` ya trae las direcciones del equipo. Después, con Postgres, RabbitMQ y
Kafka arriba (los de `biblioteca-plataforma`: `bash levantar.sh`):

```bash
npm run start:dev
```

`npm run build` compila y `npm test` corre las pruebas del DTO. Con todo el sistema, desde
`biblioteca-plataforma`: `bash levantar.sh`; el compose le pone `POSTGRES_HOST`, `POSTGRES_PORT`, `RABBITMQ_URL` y
`KAFKA_BROKERS` hacia los contenedores.
