// src/app.module.ts
import { Module } from '@nestjs/common';
import { KafkaService } from './common/kafka.service';
import { TransactionsController } from './api/transactions.controller';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { GatewayService } from './gateway/gateway.service';

@Module({
  imports: [],
  controllers: [TransactionsController], // el controller solo se usa en API process pero registrarlo es inofensivo
  providers: [KafkaService, OrchestratorService, GatewayService],
})
export class AppModule {}
