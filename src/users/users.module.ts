import { forwardRef, Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { User, UserSchema } from "./schema/users.schema";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { MongooseModule } from "@nestjs/mongoose";
import { SharedModule } from "src/shared/shared.module";
import { ShopModule } from "src/shop/shop.module";
import { ProductsModule } from "src/products/products.module";
import { ServicesModule } from "src/services/services.module";
import { ActivityLogModule } from "src/activity-log/activity-log.module";
import { ChatModule } from "src/chat/chat.module";
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    forwardRef(() => SharedModule),
    forwardRef(() => ShopModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => ChatModule),
    ActivityLogModule,
  ],
  controllers: [UsersController],
  exports: [UsersService],
  providers: [UsersService],
})
export class UsersModule { }
