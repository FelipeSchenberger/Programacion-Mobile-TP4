// src/main-gateway.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS to allow requests from the frontend
  app.enableCors();

  // Read the port from the environment variable defined in docker-compose.yml
  const port = process.env.GATEWAY_PORT || 4001;
  await app.listen(port);

  // Log that the gateway is running
  Logger.log(`Gateway service is running on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
