import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { Order, OrderSchema } from "./schema/order.schema";
import { UsersModule } from "src/users/users.module";
import { ProductsModule } from "src/products/products.module";
import { ShopModule } from "src/shop/shop.module";
import { NotificationsModule } from "src/notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    UsersModule,
    ProductsModule,
    ShopModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
