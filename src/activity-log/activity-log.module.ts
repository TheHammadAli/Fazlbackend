import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { ActivityLogController } from "./activity-log.controller";
import { ActivityLogService } from "./activity-log.service";
import { ActivityLog, ActivityLogSchema } from "./schema/activity-log.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
