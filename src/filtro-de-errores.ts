import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Deja todos los errores con la forma que siempre tuvo este servicio: `{ "mensaje": "..." }`.
 * Sin esto, Nest respondería `{ "message", "error", "statusCode" }` y cambiaria el contrato.
 */
@Catch()
export class FiltroDeErrores implements ExceptionFilter {
  private readonly log = new Logger('prestamos');

  catch(error: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (error instanceof HttpException) {
      const cuerpo = error.getResponse();
      const detalle = typeof cuerpo === 'string' ? cuerpo : (cuerpo as { message?: string | string[] }).message;
      const mensaje = Array.isArray(detalle) ? detalle.join('; ') : (detalle ?? error.message);
      res.status(error.getStatus()).json({ mensaje });
      return;
    }

    this.log.error(`error no controlado: ${(error as Error)?.message ?? error}`);
    res.status(500).json({ mensaje: 'error interno' });
  }
}
