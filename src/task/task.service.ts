import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Task, TaskDocument, TASK_STATUSES } from "./schema/task.schema";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { UsersService } from "src/users/users.service";

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly usersService: UsersService,
  ) {}

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

    return { message: "Task created successfully", data: await this.getTaskById(String(task._id)) };
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
    await this.findTaskOrThrow(id);

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

    return { message: "Task updated successfully", data: await this.getTaskById(id) };
  }

  async deleteTask(id: string) {
    const task = await this.findTaskOrThrow(id);
    await this.taskModel.findByIdAndDelete(id).exec();
    return { message: "Task deleted successfully", data: { _id: task._id, title: task.title } };
  }
}
