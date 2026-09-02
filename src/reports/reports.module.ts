import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { Report, ReportSchema } from "./schema/report.schema";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { User, UserSchema } from "src/users/schema/users.schema";
import { EmailService } from "src/common/email-service/email-service";
import { NotificationsModule } from "src/notifications/notifications.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  providers: [ReportsService, EmailService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
