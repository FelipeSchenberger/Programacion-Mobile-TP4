// src/main-orchestrator.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  Logger.log('Orchestrator started', 'MainOrchestrator');
  // AppContext carga providers y OrchestratorService en onModuleInit se subscribe
}
bootstrap();
