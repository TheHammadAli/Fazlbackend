import { Module } from "@nestjs/common";
import { TaskService } from "./task.service";
import { TaskController } from "./task.controller";
import { AdminsModule } from "src/admins/admins.module";
import { ActivityLogModule } from "src/activity-log/activity-log.module";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "src/common/email-service/email-service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";

// PrismaModule is @Global, so PrismaService needs no import here — this
// replaces the Task model registration.
@Module({
  imports: [AdminsModule, ActivityLogModule, ConfigModule],
  providers: [TaskService, EmailService, FileUploadService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
