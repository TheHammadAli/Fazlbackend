import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/exceptions/all-exceptions.filter";
import { SuccessResponseInterceptor } from "./common/interceptors/success-response.interceptor";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { LanguageInterceptor } from "./common/interceptors/language.interceptor";
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import * as express from "express";
import { join } from "path";


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-lang"],
  });

  app.use("/media", express.static(join(process.cwd(), "media")));

  app.useGlobalInterceptors(app.get(LanguageInterceptor));
  app.useGlobalInterceptors(
    new TimeoutInterceptor(Number(process.env.REQUEST_TIMEOUT_MS ?? 300000)),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useWebSocketAdapter(new IoAdapter(app));
  const config = new DocumentBuilder()
    .setTitle("Buy & Sell API")
    .setDescription("API documentation for the Buy/Sell Platform")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        in: "header",
      },
      "jwt", // This is the security name
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const host = process.env.HOST ?? "0.0.0.0";
  const port = Number(process.env.PORT ?? 3000);
  const server = await app.listen(port, host);
  server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS ?? 650000);
  server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS ?? 660000);
  server.timeout = Number(process.env.SO_TIMEOUT_MS ?? 600000);
  server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS ?? 300000);

}
bootstrap();
