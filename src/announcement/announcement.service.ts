import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Announcement } from "./schema/announcement.schema";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<Announcement>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
  ) {}

  /** Atomically reserves the next sequential announcement code (e.g. ANN-000001). */
  private async generateNextAnnouncementCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "announcementCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `ANN-${String(counter.seq).padStart(6, "0")}`;
  }

  async create(dto: CreateAnnouncementDto, createdBy: string) {
    // No global ValidationPipe is registered in this app, so class-validator decorators on the
    // DTO are documentation only, not enforcement — this must be checked explicitly at runtime.
    const title = dto.title?.trim();
    const message = dto.message?.trim();
    if (!title || !message) {
      throw new BadRequestException("Title and message are required");
    }

    const announcementCode = await this.generateNextAnnouncementCode();

    const announcement = await this.announcementModel.create({
      announcementCode,
      title,
      message,
      createdBy: new Types.ObjectId(createdBy),
    });

    return {
      message: "Announcement sent successfully",
      data: announcement,
    };
  }

  async getAll(paginationDto: PaginationDto): Promise<PaginatedResponseDto<Announcement>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.announcementModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean()
        .exec(),
      this.announcementModel.countDocuments(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
