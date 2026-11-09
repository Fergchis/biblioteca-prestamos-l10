import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'node:fs';
import pg from 'pg';

export type Prestamo = {
  id: number;
  libroId: number;
  usuarioSub: string;
  desde: string;
  hasta: string;
  devuelto: boolean;
};

// Los alias devuelven la misma forma del JSON de siempre: el BFF y el Angular no se enteran del cambio.
const COLUMNAS = `id, libro_id AS "libroId", usuario_sub AS "usuarioSub",
  desde::text AS desde, hasta::text AS hasta, estado = 'devuelto' AS devuelto`;

/** Toda la conversacion con Postgres vive aca; el SQL tambien. */
@Injectable()
export class PrestamosRepositorio implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('prestamos');
  private readonly pool: pg.Pool;

  constructor(config: ConfigService) {
    this.pool = new pg.Pool({
      host: config.getOrThrow<string>('POSTGRES_HOST'),
      port: Number(config.getOrThrow<string>('POSTGRES_PORT')),
      user: config.getOrThrow<string>('POSTGRES_USER'),
      password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
      database: config.getOrThrow<string>('POSTGRES_DB'),
    });
    // Si Postgres se reinicia con un cliente ocioso en el pool, el pool emite 'error'.
    // Sin este escucha, Node termina el proceso entero.
    this.pool.on('error', (e) => this.log.error(`conexion ociosa perdida: ${e.message}`));
  }

  // El esquema.sql esta en la raiz del repositorio: dos carpetas arriba de src/prestamos y de dist/prestamos.
  async onModuleInit(): Promise<void> {
    await this.pool.query(readFileSync(new URL('../../esquema.sql', import.meta.url), 'utf8'));
    this.log.log('esquema prestamos listo');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async listar(): Promise<Prestamo[]> {
    const { rows } = await this.pool.query<Prestamo>(`SELECT ${COLUMNAS} FROM prestamos.prestamos ORDER BY id`);
    return rows;
  }

  async crear(p: { libroId: number; usuarioSub: string; desde: string; hasta: string }): Promise<Prestamo> {
    const { rows } = await this.pool.query<Prestamo>(
      `INSERT INTO prestamos.prestamos (libro_id, usuario_sub, desde, hasta)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNAS}`,
      [p.libroId, p.usuarioSub, p.desde, p.hasta],
    );
    return rows[0];
  }

  async devolver(id: number): Promise<Prestamo | null> {
    const { rows } = await this.pool.query<Prestamo>(
      `UPDATE prestamos.prestamos
          SET estado = 'devuelto', devuelto_en = coalesce(devuelto_en, now())
        WHERE id = $1 RETURNING ${COLUMNAS}`,
      [id],
    );
    return rows[0] ?? null;
  }
}
