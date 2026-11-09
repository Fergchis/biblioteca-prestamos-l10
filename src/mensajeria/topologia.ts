import type { Channel } from 'amqplib';

// Lo que publica este servicio: un exchange y dos routing keys. Ninguna cola.
export const EXCHANGES = {
  eventos: { nombre: 'biblioteca.eventos', tipo: 'topic' },
};

export const ROUTING_KEYS = {
  prestamoCreado: 'prestamo.creado',
  prestamoDevuelto: 'prestamo.devuelto',
};

export async function declararTopologia(canal: Channel): Promise<void> {
  await canal.assertExchange(EXCHANGES.eventos.nombre, EXCHANGES.eventos.tipo, { durable: true });
}
