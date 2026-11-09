import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ChannelModel, connect } from 'amqplib';
import { randomUUID } from 'node:crypto';
import { EXCHANGES, declararTopologia } from './topologia.js';

/** Lo unico de este servicio que sabe de amqplib. La URL sale de RABBITMQ_URL. */
@Injectable()
export class PublicadorService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('prestamos');
  private readonly url: string;
  private conexion!: ChannelModel;
  private canal!: Channel;

  constructor(config: ConfigService) {
    this.url = config.getOrThrow<string>('RABBITMQ_URL');
  }

  async onModuleInit(): Promise<void> {
    this.conexion = await connect(this.url);
    // Sin este escucha, un error del broker tumba el proceso entero sin explicacion.
    this.conexion.on('error', (e: Error) => this.log.error(`conexion: ${e.message}`));
    this.canal = await this.conexion.createChannel();
    this.canal.on('error', (e: Error) => this.log.error(`canal: ${e.message}`));
    await declararTopologia(this.canal);
    this.log.log(`publicando en ${new URL(this.url).host}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.canal?.close().catch(() => undefined);
    await this.conexion?.close().catch(() => undefined);
  }

  /** Se llama DESPUES de escribir en Postgres. Si el broker falla, el prestamo ya existe: se registra y se sigue. */
  publicar(routingKey: string, payload: unknown): void {
    const eventoId = randomUUID();
    try {
      const aceptado = this.canal.publish(
        EXCHANGES.eventos.nombre,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
          contentType: 'application/json',
          headers: { 'x-evento-id': eventoId, 'x-emitido-en': new Date().toISOString() },
        },
      );
      this.log.log(`publicado ${routingKey} evento ${eventoId} aceptado=${aceptado}`);
    } catch (error) {
      this.log.error(`no se pudo publicar ${routingKey}: ${(error as Error).message}`);
    }
  }
}
