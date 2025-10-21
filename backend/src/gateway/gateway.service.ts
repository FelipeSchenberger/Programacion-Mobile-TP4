// src/gateway/gateway.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { KafkaService } from '../common/kafka.service';
import * as WebSocket from 'ws';
import { Consumer } from 'kafkajs';

@Injectable()
export class GatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GatewayService.name);
  private consumer: Consumer;
  private wss: WebSocket.Server;

  constructor(private readonly kafkaService: KafkaService) {
    // 1. Crear el consumidor de Kafka
    this.consumer = this.kafkaService.createConsumer('gateway-group');
  }

  async onModuleInit() {
    // 2. Iniciar el servidor de WebSockets
    const port = parseInt(process.env.PORT || '4001', 10);
    this.wss = new WebSocket.Server({ port });

    this.wss.on('connection', (ws: WebSocket & { subscriptions?: any }) => {
      ws.on('message', (msg: string) => {
        try {
          const parsed = JSON.parse(msg);
          // Guardar suscripciones del cliente (ej: por userId o transactionId)
          if (parsed.action === 'subscribe') {
            ws.subscriptions = parsed;
          }
        } catch (e) {
          this.logger.warn('Invalid WebSocket message received');
        }
      });
    });

    this.logger.log(`WebSocket server listening on ${port}`);

    // 3. Conectar y suscribir el consumidor de Kafka
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'txn.events', fromBeginning: true });
    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) {
          this.logger.warn(`Received message with null value on topic "${topic}"`);
          return;
        }
        const envelope = JSON.parse(message.value.toString());
        // 4. Enviar el evento a los clientes WebSocket suscritos
        this.wss.clients.forEach((ws: WebSocket & { subscriptions?: any }) => {
          const subs = ws.subscriptions || {};
          if ((subs.userId && subs.userId === envelope.payload.userId) ||
              (subs.transactionId && subs.transactionId === envelope.transactionId) ||
              (!subs.userId && !subs.transactionId)) { // Broadcast si no hay suscripción específica
            ws.send(JSON.stringify({ type: 'event', data: envelope }));
          }
        });
      }
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.wss.close();
  }
}
