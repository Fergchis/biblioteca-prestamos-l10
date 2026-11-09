import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearPrestamoDto } from './crear-prestamo.dto.js';

const errores = async (cuerpo: object) =>
  validate(plainToInstance(CrearPrestamoDto, cuerpo), { whitelist: true, forbidNonWhitelisted: true });

describe('CrearPrestamoDto', () => {
  it('acepta lo que manda el BFF', async () => {
    const e = await errores({ libroId: 3, usuarioSub: 'x', desde: '2026-11-02', hasta: '2026-11-16', devuelto: false });
    expect(e).toHaveLength(0);
  });

  it('rechaza un libroId que no es entero positivo', async () => {
    expect(await errores({ libroId: '3', desde: '2026-11-02', hasta: '2026-11-16' })).not.toHaveLength(0);
    expect(await errores({ libroId: 0, desde: '2026-11-02', hasta: '2026-11-16' })).not.toHaveLength(0);
  });

  it('rechaza fechas que no existen', async () => {
    expect(await errores({ libroId: 1, desde: '2026-02-30', hasta: '2026-11-16' })).not.toHaveLength(0);
  });

  it('rechaza los campos que no estan en el DTO', async () => {
    expect(await errores({ libroId: 1, desde: '2026-11-02', hasta: '2026-11-16', sorpresa: 1 })).not.toHaveLength(0);
  });
});
