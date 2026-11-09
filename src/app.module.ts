import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MensajeriaModule } from './mensajeria/mensajeria.module.js';
import { PrestamosModule } from './prestamos/prestamos.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MensajeriaModule, PrestamosModule],
})
export class AppModule {}
