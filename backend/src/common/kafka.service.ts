// src/common/kafka.service.ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, logLevel, Partitioners, KafkaJSProtocolError, Producer, Admin } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer | null = null;
  private admin: Admin | null = null;
  private broker: string;
  private topics: string[];

  constructor() {
    this.broker = process.env.KAFKA_BROKER || 'kafka:9092';
    const topicsEnv = process.env.KAFKA_TOPICS || 'transactions';
    this.topics = topicsEnv.split(',').map(t => t.trim()).filter(Boolean);

    this.kafka = new Kafka({
      clientId: 'tp4-backend',
      brokers: [this.broker],
      logLevel: logLevel.INFO,
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    try {
      if (this.producer) await this.producer.disconnect();
      if (this.admin) await this.admin.disconnect();
    } catch (e) {
      this.logger.warn('Error disconnecting kafka clients', e as any);
    }
  }

  private async connectWithRetry(retries = 30, delayMs = 2000) {
    let attempt = 0;
    while (attempt < retries) {
      attempt++;
      try {
        this.logger.log(`Attempting to connect to Kafka broker ${this.broker} (attempt ${attempt})`);
        this.admin = this.kafka.admin();
        await this.admin.connect();

        // Create topics if they don't exist.
        try {
          if (this.topics.length > 0) {
            const topicsToCreate = this.topics.map(topic => ({
              topic,
              numPartitions: 1,
              replicationFactor: 1,
            }));
            const created = await this.admin.createTopics({
              topics: topicsToCreate,
              waitForLeaders: true,
            });
            if (created) this.logger.log(`Created topics: ${this.topics.join(', ')}`);
            else this.logger.log(`Topics already exist or creation not needed: ${this.topics.join(', ')}`);
          }
        } catch (e) {
          if (e instanceof KafkaJSProtocolError && e.type === 'TOPIC_ALREADY_EXISTS') {
            this.logger.log(`Topics already exist: ${this.topics.join(', ')}`);
          } else {
            throw e; // Rethrow other errors
          }
        }

        // producer
        this.producer = this.kafka.producer({
          createPartitioner: Partitioners.LegacyPartitioner, // keep legacy behavior if needed
        });
        await this.producer.connect();
        this.logger.log('Kafka producer connected');
        return;
      } catch (err: any) {
        this.logger.warn(`Kafka connect attempt ${attempt} failed: ${err?.message || err}`);        
        await this.sleep(delayMs);
      }
    }
    this.logger.error(`Could not connect to Kafka after ${retries} attempts. The application may not function correctly.`);
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getProducer() {
    if (!this.producer) {
      this.logger.error('Producer is not available. Kafka connection may have failed.');
    }
    return this.producer;
  }

  getAdmin() {
    return this.admin;
  }

  async send(topic: string, key: string | null, value: any): Promise<void> {
    if (!this.producer) {
      throw new Error('Kafka producer is not connected. Cannot send message.');
    }

    const messageValue = typeof value === 'string' ? value : JSON.stringify(value);
    const messages = [{ key: key != null ? String(key) : null, value: messageValue }];

    try {
      await this.producer.send({ topic, messages });
    } catch (err) {
      this.logger.warn(`Failed to send message to ${topic}: ${(err as any).message || err}`);
      throw err;
    }
  }

  // NEW: create and return a connected consumer for a group
  createConsumer(groupId: string) {
    return this.kafka.consumer({ groupId });
  }
}
