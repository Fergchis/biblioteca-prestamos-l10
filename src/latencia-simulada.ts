import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// Latencia simulada, igual que en libros. En produccion este servicio estaria en otra maquina
// y la red costaria algo: es lo que hace medible la ventaja del BFF.
export const LATENCIA_SIMULADA_MS = 300;

const log = new Logger('prestamos');

export async function latenciaSimulada(req: Request, _res: Response, next: NextFunction): Promise<void> {
  await new Promise((listo) => setTimeout(listo, LATENCIA_SIMULADA_MS));
  log.log(`${req.method} ${req.url}`);
  next();
}
