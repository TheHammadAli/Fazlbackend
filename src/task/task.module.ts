import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Task, TaskSchema } from "./schema/task.schema";
import { TaskService } from "./task.service";
import { TaskController } from "./task.controller";
import { UsersModule } from "src/users/users.module";
import { ActivityLogModule } from "src/activity-log/activity-log.module";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "src/common/email-service/email-service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    UsersModule,
    ActivityLogModule,
    ConfigModule,
  ],
  providers: [TaskService, EmailService, FileUploadService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
