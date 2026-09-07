import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { BroadcastController } from "./broadcast.controller";
import { BroadcastService } from "./broadcast.service";
import { BroadcastGateway } from "./broadcast.gateway";
import { ShopModule } from "src/shop/shop.module";
import { CategoryModule } from "src/category/category.module";
import { UsersModule } from "src/users/users.module";
import { ServicesModule } from "src/services/services.module";
import { ProductsModule } from "src/products/products.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { ActivityLogModule } from "src/activity-log/activity-log.module";
import { EmailLogModule } from "src/email-log/email-log.module";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { EmailService } from "src/common/email-service/email-service";

// PrismaModule is @Global and exports PrismaService plus BroadcastRepository,
// so neither needs importing here — this replaces the Broadcast,
// BroadcastMessage, BroadcastThread, BroadcastOffer and Counter model
// registrations. Every other import is unchanged.
@Module({
  imports: [
    ShopModule,
    CategoryModule,
    UsersModule,
    ServicesModule,
    ProductsModule,
    NotificationsModule,
    ActivityLogModule,
    EmailLogModule,
  ],
  controllers: [BroadcastController],
  providers: [
    BroadcastService,
    BroadcastGateway,
    FileUploadService,
    ConfigService,
    EmailService,
  ],
  exports: [BroadcastService, BroadcastGateway],
})
export class BroadcastModule {}
