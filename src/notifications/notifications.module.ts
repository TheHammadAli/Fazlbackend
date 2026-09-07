// notifications.module.ts
import { forwardRef, Module } from "@nestjs/common";

import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { FirebaseService } from "./firebase.service";
import { UsersModule } from "src/users/users.module";
import { NotificationsGateway } from "./notification.gateway";
import { ConfigModule } from "@nestjs/config";
import { PresenceModule } from "src/presence/presence.module";

// PrismaModule is @Global, so PrismaService needs no import here — this
// replaces the Notification model registration.
@Module({
  imports: [forwardRef(() => UsersModule), ConfigModule, PresenceModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, FirebaseService],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
