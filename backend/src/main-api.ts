// src/main-api.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors();

  // Read the port from environment variables, with a fallback.
  // This call starts the HTTP server and keeps the application running.
  const port = process.env.API_PORT || 3002;
  await app.listen(port);

  // Log that the application has started and is listening on the correct port.
  console.log(`API service is running on port ${port}`);
}
bootstrap();
