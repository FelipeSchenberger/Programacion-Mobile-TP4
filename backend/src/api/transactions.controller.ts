// src/api/transactions.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { KafkaService } from '../common/kafka.service';
// Asumimos que tienes un servicio para leer desde la base de datos
// import { TransactionsService } from '../transactions/transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly kafkaService: KafkaService,
    // Inyecta el servicio que lee de la BD. Descomenta cuando lo tengas.
    // private readonly transactionsService: TransactionsService,
  ) {}

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

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('userId') userId: string) {
    console.log(`TransactionsController.findAll called for userId: ${userId}`);
    // Aquí iría la lógica para buscar las transacciones en tu base de datos
    // const transactions = await this.transactionsService.findByUserId(userId);
    // return transactions;
    return [{ transactionId: 'mock-123', amount: 100, from: 'alice-001', to: 'bob-001' }]; // Devuelve datos de prueba por ahora
  }
}
