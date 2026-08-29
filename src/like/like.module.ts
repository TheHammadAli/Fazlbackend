import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LikeController } from "./like.controller";
import { LikeService } from "./like.service";
import { Like, LikeSchema } from "./schema/like.schema";

import { ProductsModule } from "src/products/products.module";
import { ServicesModule } from "src/services/services.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { UsersModule } from "src/users/users.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Like.name, schema: LikeSchema }]),

    forwardRef(() => ProductsModule),
    forwardRef(() => ServicesModule),
    NotificationsModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [LikeController],
  providers: [LikeService],
  exports: [LikeService],
})
export class LikeModule {}
