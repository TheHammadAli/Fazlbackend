import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AnnouncementController } from "./announcement.controller";
import { AnnouncementService } from "./announcement.service";
import { Announcement, AnnouncementSchema } from "./schema/announcement.schema";
import { AnnouncementView, AnnouncementViewSchema } from "./schema/announcement-view.schema";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { SharedModule } from "src/shared/shared.module";
import { UsersModule } from "src/users/users.module";
import { NotificationsModule } from "src/notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: AnnouncementView.name, schema: AnnouncementViewSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    SharedModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
