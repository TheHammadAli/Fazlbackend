import { forwardRef, Module } from "@nestjs/common";
import { ShopService } from "./shop.service";
import { ShopController } from "./shop.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Shop, ShopSchema } from "./schema/shop.schema";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { SharedModule } from "src/shared/shared.module";
import { ProductsModule } from "src/products/products.module";
import { ServicesModule } from "src/services/services.module";
import { UsersModule } from "src/users/users.module";
import { OrdersModule } from "src/orders/orders.module";
import { ActivityLogModule } from "src/activity-log/activity-log.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    forwardRef(() => SharedModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ServicesModule),
  forwardRef(() => OrdersModule),
    ActivityLogModule,
  ],
  providers: [ShopService],
  controllers: [ShopController],
  exports: [ShopService],
})
export class ShopModule { }
