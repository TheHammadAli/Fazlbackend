import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AnnouncementController } from "./announcement.controller";
import { AnnouncementService } from "./announcement.service";
import { Announcement, AnnouncementSchema } from "./schema/announcement.schema";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { SharedModule } from "src/shared/shared.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    SharedModule,
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
