import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/exceptions/all-exceptions.filter";
import { SuccessResponseInterceptor } from "./common/interceptors/success-response.interceptor";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { LanguageInterceptor } from "./common/interceptors/language.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: "*", // allow all origins
    credentials: false, // no cookies / sessions
  });

  app.useGlobalInterceptors(app.get(LanguageInterceptor));

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
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
