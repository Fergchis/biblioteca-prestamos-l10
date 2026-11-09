import { IsBoolean, IsInt, IsISO8601, IsOptional, IsString, Matches, Min } from 'class-validator';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * El cuerpo del POST. `forbidNonWhitelisted` rechaza con 400 todo lo que no este declarado aca.
 *
 * `usuarioSub` y `devuelto` se aceptan SOLO porque el BFF los sigue mandando; se ignoran. El dueño
 * del prestamo es el `sub` del token y un prestamo nuevo nace vigente.
 */
export class CrearPrestamoDto {
  @IsInt({ message: 'libroId tiene que ser un entero' })
  @Min(1, { message: 'libroId tiene que ser positivo' })
  libroId!: number;

  @Matches(FECHA, { message: 'desde tiene que ser una fecha AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'desde no es una fecha valida' })
  desde!: string;

  @Matches(FECHA, { message: 'hasta tiene que ser una fecha AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'hasta no es una fecha valida' })
  hasta!: string;

  @IsOptional()
  @IsString()
  usuarioSub?: string;

  @IsOptional()
  @IsBoolean()
  devuelto?: boolean;
}
