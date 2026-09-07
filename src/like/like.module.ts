import { forwardRef, Module } from "@nestjs/common";
import { LikeController } from "./like.controller";
import { LikeService } from "./like.service";

import { ProductsModule } from "src/products/products.module";
import { ServicesModule } from "src/services/services.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { UsersModule } from "src/users/users.module";

// PrismaModule is @Global, so PrismaService needs no import here — this
// replaces the Like model registration. The forwardRef imports remain: they
// break real circular module references, which are unrelated to the ORM.
@Module({
  imports: [
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
