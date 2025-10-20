// src/main-api.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Default to 3001 to match docker-compose port mapping
  const port = Number(process.env.API_PORT) || 3001;
  try {
    await app.listen(port);
  } catch (err) {
    console.error(`Failed to listen on port ${port}:`, (err as any).message || err);
    process.exit(1);
  }
}
bootstrap();
