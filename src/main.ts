import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // JWT-based REST API — CSRF is not needed (no cookie/session auth).
  // XSS protection is provided by helmet headers + ValidationPipe whitelist.
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // URL pública da API (no Docker o container escuta na 3000, mas o host expõe a 10000)
  const publicUrl = (process.env.APP_URL ?? 'http://localhost:10000').replace(/\/$/, '');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('AutoUni API')
    .setDescription(
      'Sistema de Automação Inteligente para Universidades - API de gerenciamento de dispositivos IoT, energia, automações e monitoramento em tempo real',
    )
    .setVersion('1.0.0')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(publicUrl, 'Servidor configurado (APP_URL)')
    .addServer('/', 'Origem atual')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Insira o token JWT obtido no endpoint /auth/login',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Autenticação e gerenciamento de sessões')
    .addTag('Users', 'Gerenciamento de usuários do sistema')
    .addTag('Buildings', 'Gerenciamento de prédios')
    .addTag('Floors', 'Gerenciamento de andares')
    .addTag('Rooms', 'Gerenciamento de salas')
    .addTag('Devices', 'Gerenciamento de dispositivos IoT')
    .addTag('Energy', 'Monitoramento e estatísticas de energia')
    .addTag('Automations', 'Automações e agendamentos')
    .addTag('Notifications', 'Sistema de notificações')
    .addTag('Reports', 'Geração e gerenciamento de relatórios')
    .addTag('MQTT', 'Integração com broker MQTT')
    .addTag('Realtime', 'WebSocket para eventos em tempo real')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'AutoUni API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1890ff; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  
  console.log('');
  console.log('🚀 AutoUni Backend is running!');
  console.log('');
  console.log(`📡 API: ${publicUrl}`);
  console.log(`📚 Swagger Docs: ${publicUrl}/docs`);
  console.log(`🔌 WebSocket: ${publicUrl.replace(/^http/, 'ws')}`);
  console.log('');
}
bootstrap();
