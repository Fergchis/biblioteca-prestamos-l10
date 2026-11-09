import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { FiltroDeErrores } from './filtro-de-errores.js';
import { latenciaSimulada } from './latencia-simulada.js';

const PUERTO = 3002;

const app = await NestFactory.create(AppModule);

// La latencia va primero: toda peticion la paga, tambien las que terminan en 401 o 405.
app.use(latenciaSimulada);

// El cuerpo del POST se valida con el DTO: lo que no esta declarado, se rechaza con 400.
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }),
);
app.useGlobalFilters(new FiltroDeErrores());

// Para que Nest llame a onModuleDestroy (cerrar el canal AMQP y el pool) con SIGTERM.
app.enableShutdownHooks();

await app.listen(PUERTO);
new Logger('prestamos').log(`microservicio de prestamos escuchando en http://localhost:${PUERTO}`);
