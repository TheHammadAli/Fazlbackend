import { Module } from "@nestjs/common";
import { EmailLogService } from "./email-log.service";
import { EmailLogController } from "./email-log.controller";

// PrismaModule is @Global, so PrismaService needs no import here — this is what
// MongooseModule.forFeature([EmailLog, Counter]) used to provide.
@Module({
  providers: [EmailLogService],
  controllers: [EmailLogController],
  exports: [EmailLogService],
})
export class EmailLogModule {}
