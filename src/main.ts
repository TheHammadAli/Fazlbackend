import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/exceptions/all-exceptions.filter';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin: string, callback: (arg0: Error | null, arg1: boolean) => any) => {
      if (!origin) return callback(null, true); // Postman, mobile apps

      if (process.env.NODE_ENV === 'production') {
        if (origin === 'https://my-frontend.com') return callback(null, true);
        return callback(new Error('Not allowed by CORS'), false);
      } else {
        // DEV: allow any localhost / 127.* IP dynamically
        if (/^https?:\/\/(localhost|127\.\d+\.\d+\.\d+):\d+$/.test(origin)) {
          return callback(null, true);
        }
        // Optionally allow all other origins temporarily
        return callback(null, true);
      }
    },
    credentials: true,
  });


  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useWebSocketAdapter(new IoAdapter(app));
  const config = new DocumentBuilder()
    .setTitle('Buy & Sell API')
    .setDescription('API documentation for the Buy/Sell Platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'jwt', // This is the security name
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
