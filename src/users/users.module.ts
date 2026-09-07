import { forwardRef, Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { SharedModule } from "src/shared/shared.module";
import { ShopModule } from "src/shop/shop.module";
import { ProductsModule } from "src/products/products.module";
import { ServicesModule } from "src/services/services.module";
import { ActivityLogModule } from "src/activity-log/activity-log.module";
import { ChatModule } from "src/chat/chat.module";
import { PresenceModule } from "src/presence/presence.module";
import { EmailService } from "src/common/email-service/email-service";

// PrismaModule is @Global, so PrismaService needs no import here — this
// replaces the User + Counter model registrations.
@Module({
  imports: [
    forwardRef(() => SharedModule),
    forwardRef(() => ShopModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => ChatModule),
    ActivityLogModule,
    PresenceModule,
  ],
  controllers: [UsersController],
  exports: [UsersService],
  providers: [UsersService, EmailService],
})
export class UsersModule {}
