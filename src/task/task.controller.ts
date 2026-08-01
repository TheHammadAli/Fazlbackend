import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { TaskService } from "./task.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { RolesGuard } from "src/auth/guard/roles-guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
import { ActivityLogService } from "src/activity-log/activity-log.service";

@ApiTags("Tasks")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "super_admin")
@Controller("tasks")
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create and assign a new task to members (admin/super_admin only)" })
  @ApiBody({ type: CreateTaskDto })
  async createTask(
    @Body() dto: CreateTaskDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.taskService.createTask(dto, currentUser.sub);
    await this.activityLogService.record(
      currentUser.sub,
      "task_assigned",
      "Task",
      result.data?._id?.toString(),
      result.data?.title,
      req.ip,
    );
    return result;
  }

  @Get()
  @ApiOperation({ summary: "Get paginated list of tasks (admin/super_admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  async getAllTasks(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.taskService.getAllTasks(page, limit, search, status);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get task detail by ID (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  async getTaskById(@Param("id") id: string) {
    return { data: await this.taskService.getTaskById(id) };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a task, including reassignment or status (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateTaskDto })
  async updateTask(
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.taskService.updateTask(id, dto);
    await this.activityLogService.record(
      currentUser.sub,
      "task_updated",
      "Task",
      id,
      result.data?.title,
      req.ip,
    );
    return result;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a task (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  async deleteTask(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.taskService.deleteTask(id);
    await this.activityLogService.record(
      currentUser.sub,
      "task_deleted",
      "Task",
      id,
      result.data?.title,
      req.ip,
    );
    return result;
  }
}
