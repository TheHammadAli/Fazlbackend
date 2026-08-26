import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EmailLog, EmailLogSchema } from "./schema/email-log.schema";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { EmailLogService } from "./email-log.service";
import { EmailLogController } from "./email-log.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailLog.name, schema: EmailLogSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  providers: [EmailLogService],
  controllers: [EmailLogController],
  exports: [EmailLogService],
})
export class EmailLogModule {}
