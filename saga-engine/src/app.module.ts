import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka.consumer.service';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [],
  controllers: [],
  // El KafkaConsumerService se inicia automáticamente por OnModuleInit
  providers: [KafkaConsumerService, OrchestratorService], 
})
export class AppModule {}