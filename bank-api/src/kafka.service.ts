import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// Define el tipo para el Event Envelope (simplificado para el ejemplo)
interface EventEnvelope<T> {
  id: string; // uuid v4
  type: string; // ej: "txn.TransactionInitiated"
  version: number; // 1
  ts: number; // epoch ms
  transactionId: string; // clave de partición
  userId: string;
  payload: T;
}

// Tipo específico para la transacción iniciada
interface TransactionInitiatedPayload {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  userId: string;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private readonly KAFKA_BROKERS = process.env.KAFKA_BROKERS.split(',');

  constructor() {
    this.kafka = new Kafka({
      clientId: 'api-producer',
      brokers: this.KAFKA_BROKERS,
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    console.log('Kafka Producer conectado');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    console.log('Kafka Producer desconectado');
  }

  /**
   * Publica el evento TransactionInitiated en txn.commands
   * usando transactionId como clave de partición.
   */
  async publishTransactionInitiated(transactionData: TransactionInitiatedPayload): Promise<string> {
    const transactionId = uuidv4();
    const event: EventEnvelope<TransactionInitiatedPayload> = {
      id: uuidv4(),
      type: 'txn.TransactionInitiated',
      version: 1,
      ts: Date.now(),
      transactionId: transactionId,
      userId: transactionData.userId,
      payload: transactionData,
    };

    try {
      await this.producer.send({
        topic: 'txn.commands', // Tópico de comandos
        messages: [{
          key: transactionId, // Clave de partición
          value: JSON.stringify(event),
        }],
      });
      return transactionId;
    } catch (error) {
      console.error('Error publicando a Kafka:', error);
      throw new Error('Fallo al iniciar la transacción.');
    }
  }
}