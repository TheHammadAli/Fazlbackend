import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { SearchModule } from './search/search.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopModule } from './shop/shop.module';
import { CategoryModule } from './category/category.module';
import { ServicesModule } from './services/services.module';
import { ChatModule } from './chat/chat.module';
import { PaymentModule } from './payment/payment.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { OrdersModule } from './orders/orders.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PromotionModule } from './promotion/promotion.module';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
console.log(path.join(process.cwd(), 'src/i18n/'), 'isProduction:', isProduction);
@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 100,
        },
      ],
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(process.cwd(), 'src/i18n/'),
        watch: !isProduction,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale', 'l'] }, // supports ?lang=ur
        AcceptLanguageResolver, // supports Accept-Language header
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    ServicesModule,
    SearchModule,
    ShopModule,
    CategoryModule,
    ChatModule,
    PaymentModule,
    ReviewsModule,
    OrdersModule,
    SubscriptionModule,
    PromotionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
