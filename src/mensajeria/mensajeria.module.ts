import { Module } from '@nestjs/common';
import { PublicadorService } from './publicador.service.js';

@Module({
  providers: [PublicadorService],
  exports: [PublicadorService],
})
export class MensajeriaModule {}
