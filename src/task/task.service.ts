import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { SubmitTaskDto } from "./dto/submit-task.dto";
import { ReviewTaskDto, REVIEW_DECISIONS } from "./dto/review-task.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { AdminsService } from "src/admins/admins.service";
import { EmailService } from "src/common/email-service/email-service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import {
  SUBMITTABLE_STATUSES,
  TASK_STATUSES,
  type TaskAttachment,
  type TaskPriority,
  type TaskStatus,
} from "./model/task.model";
import type { Prisma } from "../../generated/prisma/client";

/** Selects the joined rows needed to rebuild the task shape clients expect. */
const TASK_INCLUDE = {
  assignees: {
    include: {
      member: { select: { id: true, name: true, email: true, image: true } },
    },
  },
  createdBy: { select: { id: true, name: true, email: true } },
  submissions: {
    orderBy: { submittedAt: "asc" as const },
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
    },
  },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminsService: AdminsService,
    private readonly emailService: EmailService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  /**
   * `assignees` was an array of ObjectIds on the task document and is now a
   * junction table. Flattening it here keeps the API shape identical — a plain
   * array of users — so the admin panel needs no change.
   */
  private toApiShape(task: any) {
    if (!task) return task;
    return {
      ...task,
      assignees: (task.assignees ?? []).map((a: any) => a.member).filter(Boolean),
    };
  }

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
        .catch((err) =>
          this.logger.error(`Task-assigned email to ${recipient.email} failed`, err),
        );
    }
  }

  async createTask(dto: CreateTaskDto, createdBy: string, files: any[] = []) {
    // updateTask has always refused an empty list; creation did not, so a task
    // could be saved assigned to nobody — invisible to every member and with no
    // one to email about it. Same rule both ways now.
    if (!Array.isArray(dto.assignees) || dto.assignees.length === 0) {
      throw new BadRequestException("A task must be assigned to at least one member");
    }

    const assignees = await this.adminsService.assertMemberIds(dto.assignees);
    const assigneeIds = assignees.map((a: any) => String(a?.id ?? a));
    const taskId = generateObjectId();

    await this.prisma.task.create({
      data: {
        id: taskId,
        title: dto.title,
        description: dto.description ?? null,
        priority: (dto.priority ?? "medium") as TaskPriority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        createdById: createdBy,
        // Junction rows are created with the task in one statement, so a task
        // can never briefly exist with no assignees.
        assignees: { create: assigneeIds.map((memberId) => ({ memberId })) },
      },
    });

    if (files.length > 0) {
      const attachments = await this.fileUploadService.uploadTaskSubmissionFiles(
        taskId,
        files,
        "task-files",
      );
      await this.prisma.task.update({
        where: { id: taskId },
        data: { attachments: attachments as unknown as Prisma.InputJsonValue },
      });
    }

    const populated = await this.getTaskById(taskId);
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

    const where: Prisma.TaskWhereInput = {};
    if (search?.trim()) {
      where.title = { contains: search.trim(), mode: "insensitive" };
    }
    if (status?.trim() && (TASK_STATUSES as readonly string[]).includes(status.trim())) {
      where.status = status.trim() as TaskStatus;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks.map((t) => this.toApiShape(t)),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getTaskById(id: string) {
    if (!isObjectIdLike(id)) {
      throw new BadRequestException("Invalid task id");
    }
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    return this.toApiShape(task);
  }

  /** Loads the raw row plus its assignee ids, for the membership checks below. */
  private async findTaskOrThrow(id: string) {
    if (!isObjectIdLike(id)) {
      throw new BadRequestException("Invalid task id");
    }
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignees: { select: { memberId: true } } },
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto, files: any[] = []) {
    const existing = await this.findTaskOrThrow(id);
    const previousAssigneeIds = new Set(existing.assignees.map((a) => a.memberId));

    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority as TaskPriority;
    if (dto.status !== undefined) data.status = dto.status as TaskStatus;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    if (dto.assignees !== undefined) {
      if (dto.assignees.length === 0) {
        throw new BadRequestException("A task must have at least one assignee");
      }
      const members = await this.adminsService.assertMemberIds(dto.assignees);
      const ids = members.map((a: any) => String(a?.id ?? a));
      // Replace the whole set, matching the old $set on the assignees array.
      data.assignees = {
        deleteMany: {},
        create: ids.map((memberId) => ({ memberId })),
      };
    }

    if (files.length > 0) {
      const newAttachments = await this.fileUploadService.uploadTaskSubmissionFiles(
        id,
        files,
        "task-files",
      );
      // Was $push with $each. JSONB has no append operator through Prisma, so
      // the existing array is read and concatenated.
      const current = (existing.attachments ?? []) as unknown as TaskAttachment[];
      data.attachments = [
        ...current,
        ...newAttachments,
      ] as unknown as Prisma.InputJsonValue;
    }

    await this.prisma.task.update({ where: { id }, data });

    const populated = await this.getTaskById(id);

    if (dto.assignees !== undefined) {
      const newlyAdded = ((populated as any).assignees ?? []).filter(
        (a: any) => !previousAssigneeIds.has(String(a?.id ?? a)),
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

    // Was a direct match on the assignees array; now a relation filter.
    const where: Prisma.TaskWhereInput = { assignees: { some: { memberId: userId } } };
    if (status?.trim() && (TASK_STATUSES as readonly string[]).includes(status.trim())) {
      where.status = status.trim() as TaskStatus;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          // The member portal's "Last Submitted" column reads the final entry
          // of this array. Without it the column had nothing to show, however
          // many times the task had been submitted. Ascending, because the page
          // takes the LAST element as the most recent.
          submissions: {
            orderBy: { submittedAt: "asc" },
            select: { id: true, notes: true, link: true, submittedAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.task.count({ where }),
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
    const base: Prisma.TaskWhereInput = { assignees: { some: { memberId: userId } } };
    // "assigned" = still on the member's plate; a completed/cancelled task leaves that count.
    const [assigned, completed, revision, submitted] = await Promise.all([
      this.prisma.task.count({
        where: { ...base, status: { notIn: ["completed", "cancelled"] } },
      }),
      this.prisma.task.count({ where: { ...base, status: "completed" } }),
      this.prisma.task.count({ where: { ...base, status: "revision" } }),
      this.prisma.task.count({ where: { ...base, status: "submitted" } }),
    ]);
    return { data: { assigned, completed, revision, submitted } };
  }

  async submitTask(taskId: string, userId: string, dto: SubmitTaskDto, files: any[] = []) {
    const task = await this.findTaskOrThrow(taskId);

    if (!task.assignees.some((a) => a.memberId === userId)) {
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

    // Was a $push on the embedded submissions array plus a $set and $unset, all
    // in one document write. Submissions are their own table now, so the insert
    // and the status change are wrapped in a transaction to keep that atomicity.
    await this.prisma.$transaction([
      this.prisma.taskSubmission.create({
        data: {
          taskId,
          notes,
          link: dto.link?.trim() || null,
          attachments: attachments as unknown as Prisma.InputJsonValue,
          submittedById: userId,
          submittedAt: new Date(),
        },
      }),
      this.prisma.task.update({
        where: { id: taskId },
        // $unset: { revisionReason } becomes an explicit null.
        data: { status: "submitted", revisionReason: null },
      }),
    ]);

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

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: dto.decision as TaskStatus,
        revisionReason: dto.decision === "revision" ? reason : null,
      },
    });

    return {
      message:
        dto.decision === "completed" ? "Task approved as completed" : "Revision requested",
      data: await this.getTaskById(taskId),
    };
  }

  async deleteTask(id: string) {
    const task = await this.findTaskOrThrow(id);
    // Assignee and submission rows cascade from the task.
    await this.prisma.task.delete({ where: { id } });
    return {
      message: "Task deleted successfully",
      data: { id: task.id, _id: task.id, title: task.title },
    };
  }
}
