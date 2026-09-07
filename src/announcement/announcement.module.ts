import { Module } from "@nestjs/common";

import { AnnouncementController } from "./announcement.controller";
import { AnnouncementService } from "./announcement.service";
import { SharedModule } from "src/shared/shared.module";
import { UsersModule } from "src/users/users.module";
import { NotificationsModule } from "src/notifications/notifications.module";

// PrismaModule is @Global, so PrismaService needs no import here — this
// replaces the Announcement + AnnouncementView + Counter model registrations.
@Module({
  imports: [SharedModule, UsersModule, NotificationsModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
