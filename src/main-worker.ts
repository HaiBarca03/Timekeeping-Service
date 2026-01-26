import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './modules/worker/worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  console.log('👷 Attendance Worker is listening to Redis...');
}
bootstrap();