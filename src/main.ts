import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { useContainer } from 'class-validator';
import {
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { AllExceptionsFilter } from './constants/filters/exception.filter';
import validationOptions from './utils/validation-options';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  useContainer(app.select(AppModule), {
    fallbackOnErrors: true,
  });

  app.useGlobalPipes(new ValidationPipe(validationOptions));

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: '*',
    credentials: true,
    allowedHeaders: '*',
    methods: 'GET,PUT,POST,DELETE,OPTIONS,PATCH',
  });

  app.enableVersioning({
    type: VersioningType.URI,
  });

  const options = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API docs')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'header',
      name: 'Authorization',
      description: 'Enter your Bearer token',
    })
    .addSecurityRequirements('bearer')
    .build();
    
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('apis/docs', app, document);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Server running at http://localhost:${port}`);
}

bootstrap();
