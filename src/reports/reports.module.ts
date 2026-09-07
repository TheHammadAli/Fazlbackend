import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { EmailService } from "src/common/email-service/email-service";
import { NotificationsModule } from "src/notifications/notifications.module";

// PrismaModule is @Global and exports both PrismaService and ReportRepository,
// so neither needs importing here — this replaces the Report + Counter + User
// model registrations.
@Module({
  imports: [NotificationsModule],
  providers: [ReportsService, EmailService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
