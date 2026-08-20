import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Task, TaskSchema } from "./schema/task.schema";
import { TaskService } from "./task.service";
import { TaskController } from "./task.controller";
import { UsersModule } from "src/users/users.module";
import { ActivityLogModule } from "src/activity-log/activity-log.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    UsersModule,
    ActivityLogModule,
  ],
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
