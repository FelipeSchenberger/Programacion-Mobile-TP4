// src/api/transactions.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { KafkaService } from '../common/kafka.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly kafkaService: KafkaService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() payload: any) {
    console.log('TransactionsController.create called - payload:', JSON.stringify(payload));
    try {
      await this.kafkaService.send('transactions', null, payload);
      return { status: 'accepted' };
    } catch (err) {
      // Responder OK para permitir pruebas frontend mientras Kafka está unhealthy
      console.warn('Kafka send failed, returning accepted for frontend testing:', (err as any).message || err);
      return { status: 'accepted', kafkaError: String((err as any).message || err) };
    }
  }
}
