import { Module } from "@nestjs/common";
import { ActivityLogController } from "./activity-log.controller";
import { ActivityLogService } from "./activity-log.service";

// PrismaModule is @Global, so PrismaService needs no import here — this
// replaces the ActivityLog + Counter model registrations.
@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
