import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { TaskService } from "./task.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { SubmitTaskDto } from "./dto/submit-task.dto";
import { ReviewTaskDto } from "./dto/review-task.dto";
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

  /** With multipart form-data every field arrives as a string — arrays come JSON-encoded. */
  private parseAssignees(dto: { assignees?: unknown }) {
    if (typeof dto.assignees === "string") {
      try {
        dto.assignees = JSON.parse(dto.assignees);
      } catch {
        dto.assignees = [];
      }
    }
  }

  @Post()
  @ApiOperation({ summary: "Create and assign a new task to members, with optional attachment files (admin/super_admin only)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("attachments", 5))
  @ApiBody({ type: CreateTaskDto })
  async createTask(
    @Body() dto: CreateTaskDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
    @UploadedFiles() files?: any[],
  ) {
    this.parseAssignees(dto);
    const result = await this.taskService.createTask(dto, currentUser.sub, files ?? []);
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

  // Member routes — declared before ":id" so "my" isn't captured as a task id.
  @Get("my")
  @Roles("moderator")
  @ApiOperation({ summary: "Get paginated list of the logged-in member's assigned tasks" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, type: String })
  async getMyTasks(
    @CurrentUser() currentUser: JwtPayload,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("status") status?: string,
  ) {
    return this.taskService.getMyTasks(currentUser.sub, page, limit, status);
  }

  @Get("my/stats")
  @Roles("moderator")
  @ApiOperation({ summary: "Get the logged-in member's task counts for their dashboard" })
  async getMyTaskStats(@CurrentUser() currentUser: JwtPayload) {
    return this.taskService.getMyTaskStats(currentUser.sub);
  }

  @Post(":id/submit")
  @Roles("moderator")
  @ApiOperation({ summary: "Submit work on an assigned task for admin review (member only)" })
  @ApiParam({ name: "id", type: String })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("attachments", 5))
  @ApiBody({ type: SubmitTaskDto })
  async submitTask(
    @Param("id") id: string,
    @Body() dto: SubmitTaskDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
    @UploadedFiles() files?: any[],
  ) {
    const result = await this.taskService.submitTask(id, currentUser.sub, dto, files ?? []);
    await this.activityLogService.record(
      currentUser.sub,
      "task_submitted",
      "Task",
      id,
      result.data?.title,
      req.ip,
    );
    return result;
  }

  @Patch(":id/review")
  @ApiOperation({ summary: "Approve a submitted task or send it back for revision (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ReviewTaskDto })
  async reviewTask(
    @Param("id") id: string,
    @Body() dto: ReviewTaskDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.taskService.reviewTask(id, dto);
    await this.activityLogService.record(
      currentUser.sub,
      "task_reviewed",
      "Task",
      id,
      result.data?.title,
      req.ip,
    );
    return result;
  }

  @Get(":id")
  @ApiOperation({ summary: "Get task detail by ID (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  async getTaskById(@Param("id") id: string) {
    return { data: await this.taskService.getTaskById(id) };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a task, including reassignment, status, or added attachment files (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("attachments", 5))
  @ApiBody({ type: UpdateTaskDto })
  async updateTask(
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
    @UploadedFiles() files?: any[],
  ) {
    this.parseAssignees(dto);
    const result = await this.taskService.updateTask(id, dto, files ?? []);
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
