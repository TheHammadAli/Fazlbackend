import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Task, TaskDocument, TASK_STATUSES } from "./schema/task.schema";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { SubmitTaskDto } from "./dto/submit-task.dto";
import { ReviewTaskDto, REVIEW_DECISIONS } from "./dto/review-task.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { UsersService } from "src/users/users.service";
import { EmailService } from "src/common/email-service/email-service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";

/** Statuses a member is allowed to submit work from. */
const SUBMITTABLE_STATUSES = ["pending", "in_progress", "revision"] as const;

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  /** Fire-and-forget: an email failure must never fail the task API call. */
  private sendTaskAssignedEmails(
    task: { title?: string; dueDate?: Date | string | null },
    recipients: { name?: string; email?: string }[],
  ) {
    const loginUrl = `${process.env.ADMIN_PANEL_URL}/signin`;
    const dueLine = task.dueDate
      ? `<p><strong>Due date:</strong> ${new Date(task.dueDate).toDateString()}</p>`
      : "";
    for (const recipient of recipients) {
      if (!recipient?.email) continue;
      const html = `
        <h2>New task assigned to you</h2>
        <p>Hi ${recipient.name ?? ""},</p>
        <p>A new task has been assigned to you on the Fazl panel:</p>
        <p><strong>Task:</strong> ${task.title ?? ""}</p>
        ${dueLine}
        <p>Log in to view the details and submit your work:</p>
        <p><a href="${loginUrl}">${loginUrl}</a></p>
      `;
      this.emailService
        .sendEmail(recipient.email, "New task assigned to you", html)
        .catch((err) => this.logger.error(`Task-assigned email to ${recipient.email} failed`, err));
    }
  }

  async createTask(dto: CreateTaskDto, createdBy: string) {
    const assignees = await this.usersService.assertMemberIds(dto.assignees);

    const task = await this.taskModel.create({
      title: dto.title,
      description: dto.description,
      assignees,
      priority: dto.priority ?? "medium",
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdBy: new Types.ObjectId(createdBy),
    });

    const populated = await this.getTaskById(String(task._id));
    this.sendTaskAssignedEmails(populated as any, (populated as any).assignees ?? []);

    return { message: "Task created successfully", data: populated };
  }

  async getAllTasks(
    page = 1,
    limit = 10,
    search?: string,
    status?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, any> = {};
    if (search?.trim()) {
      query.title = { $regex: search.trim(), $options: "i" };
    }
    if (status?.trim() && (TASK_STATUSES as readonly string[]).includes(status.trim())) {
      query.status = status.trim();
    }

    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(query)
        .populate("assignees", "name email image")
        .populate("createdBy", "name email")
        .populate("submissions.submittedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      this.taskModel.countDocuments(query),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getTaskById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid task id");
    }
    const task = await this.taskModel
      .findById(id)
      .populate("assignees", "name email image")
      .populate("createdBy", "name email")
      .populate("submissions.submittedBy", "name email")
      .lean()
      .exec();
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    return task;
  }

  private async findTaskOrThrow(id: string): Promise<TaskDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid task id");
    }
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const existing = await this.findTaskOrThrow(id);
    const previousAssigneeIds = new Set(existing.assignees.map((a) => a.toString()));

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.assignees !== undefined) {
      if (dto.assignees.length === 0) {
        throw new BadRequestException("A task must have at least one assignee");
      }
      updateData.assignees = await this.usersService.assertMemberIds(dto.assignees);
    }

    await this.taskModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();

    const populated = await this.getTaskById(id);

    if (dto.assignees !== undefined) {
      const newlyAdded = ((populated as any).assignees ?? []).filter(
        (a: any) => !previousAssigneeIds.has(String(a?._id ?? a)),
      );
      this.sendTaskAssignedEmails(populated as any, newlyAdded);
    }

    return { message: "Task updated successfully", data: populated };
  }

  // ===== Member-facing =====

  async getMyTasks(
    userId: string,
    page = 1,
    limit = 10,
    status?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, any> = { assignees: new Types.ObjectId(userId) };
    if (status?.trim() && (TASK_STATUSES as readonly string[]).includes(status.trim())) {
      query.status = status.trim();
    }

    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(query)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      this.taskModel.countDocuments(query),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getMyTaskStats(userId: string) {
    const base = { assignees: new Types.ObjectId(userId) };
    const [assigned, completed, revision, submitted] = await Promise.all([
      this.taskModel.countDocuments(base),
      this.taskModel.countDocuments({ ...base, status: "completed" }),
      this.taskModel.countDocuments({ ...base, status: "revision" }),
      this.taskModel.countDocuments({ ...base, status: "submitted" }),
    ]);
    return { data: { assigned, completed, revision, submitted } };
  }

  async submitTask(taskId: string, userId: string, dto: SubmitTaskDto, files: any[] = []) {
    const task = await this.findTaskOrThrow(taskId);

    if (!task.assignees.some((a) => a.toString() === userId)) {
      throw new ForbiddenException("You are not assigned to this task");
    }
    if (!(SUBMITTABLE_STATUSES as readonly string[]).includes(task.status)) {
      throw new BadRequestException(
        `This task cannot be submitted while it is ${task.status.replace("_", " ")}`,
      );
    }

    const notes = dto.notes?.trim();
    if (!notes) {
      throw new BadRequestException("Notes are required");
    }

    const attachments =
      files.length > 0
        ? await this.fileUploadService.uploadTaskSubmissionFiles(taskId, files)
        : [];

    await this.taskModel
      .findByIdAndUpdate(taskId, {
        $push: {
          submissions: {
            notes,
            link: dto.link?.trim() || undefined,
            attachments,
            submittedBy: new Types.ObjectId(userId),
            submittedAt: new Date(),
          },
        },
        $set: { status: "submitted" },
        $unset: { revisionReason: "" },
      })
      .exec();

    return { message: "Task submitted for review", data: await this.getTaskById(taskId) };
  }

  async reviewTask(taskId: string, dto: ReviewTaskDto) {
    const task = await this.findTaskOrThrow(taskId);

    if (task.status !== "submitted") {
      throw new BadRequestException("Only submitted tasks can be reviewed");
    }
    if (!(REVIEW_DECISIONS as readonly string[]).includes(dto.decision)) {
      throw new BadRequestException("Invalid review decision");
    }

    const reason = dto.reason?.trim();
    if (dto.decision === "revision" && !reason) {
      throw new BadRequestException("A reason is required when requesting a revision");
    }

    const update: Record<string, any> = { $set: { status: dto.decision } };
    if (dto.decision === "revision") {
      update.$set.revisionReason = reason;
    } else {
      update.$unset = { revisionReason: "" };
    }

    await this.taskModel.findByIdAndUpdate(taskId, update).exec();

    return {
      message: dto.decision === "completed" ? "Task approved as completed" : "Revision requested",
      data: await this.getTaskById(taskId),
    };
  }

  async deleteTask(id: string) {
    const task = await this.findTaskOrThrow(id);
    await this.taskModel.findByIdAndDelete(id).exec();
    return { message: "Task deleted successfully", data: { _id: task._id, title: task.title } };
  }
}
