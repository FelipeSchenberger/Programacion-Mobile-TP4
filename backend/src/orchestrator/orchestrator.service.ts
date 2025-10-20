// src/orchestrator/orchestrator.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KafkaService } from '../common/kafka.service';
import { randomUUID } from 'crypto';

@Injectable()
export class OrchestratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrchestratorService.name);
  private consumer;
  private running = false;

  constructor(private readonly kafkaService: KafkaService) {
    this.consumer = this.kafkaService.createConsumer('orchestrator-group');
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'txn.commands', fromBeginning: true });
    this.running = true;
    this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const envelope = JSON.parse(message.value.toString());
          await this.handleEnvelope(envelope);
        } catch (err) {
          this.logger.error('Error processing command', err);
          // enviar a dlq
          await this.kafkaService.send('txn.dlq', null, message.value.toString());
        }
      },
    });
    this.logger.log('Orchestrator consumer running');
  }

  async onModuleDestroy() {
    this.running = false;
    await this.consumer.disconnect();
  }

  private async handleEnvelope(envelope: any) {
    const txId = envelope.transactionId;
    // FundsReserved
    await this.kafkaService.send('txn.events', txId, {
      id: randomUUID(), type: 'txn.FundsReserved', version: 1, ts: Date.now(), transactionId: txId,
      payload: { ok: true, holdId: 'hold-' + Math.floor(Math.random() * 1000), amount: envelope.payload.amount, userId: envelope.payload.userId }
    });

    // Fraud check
    const risk = Math.random() < 0.95 ? 'LOW' : 'HIGH';
    await this.kafkaService.send('txn.events', txId, {
      id: randomUUID(), type: 'txn.FraudChecked', version: 1, ts: Date.now(), transactionId: txId,
      payload: { risk, userId: envelope.payload.userId }
    });

    if (risk === 'LOW') {
      await this.kafkaService.send('txn.events', txId, {
        id: randomUUID(), type: 'txn.Committed', version: 1, ts: Date.now(), transactionId: txId,
        payload: { ledgerTxId: 'ledger-' + randomUUID(), userId: envelope.payload.userId }
      });

      await this.kafkaService.send('txn.events', txId, {
        id: randomUUID(), type: 'txn.Notified', version: 1, ts: Date.now(), transactionId: txId,
        payload: { channels: ['email'], userId: envelope.payload.userId }
      });
    } else {
      await this.kafkaService.send('txn.events', txId, {
        id: randomUUID(), type: 'txn.Reversed', version: 1, ts: Date.now(), transactionId: txId,
        payload: { reason: 'FraudHigh', userId: envelope.payload.userId }
      });
    }
  }
}
