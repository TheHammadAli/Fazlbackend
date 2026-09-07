import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import type { Subscription } from "./model/subscription.model";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    return this.prisma.subscription.create({
      data: { id: generateObjectId(), ...(dto as any) },
    });
  }

  async findAll(): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string): Promise<Subscription> {
    // Was Types.ObjectId.isValid — the shape check is kept so a malformed id
    // still yields 400 rather than 404.
    if (!isObjectIdLike(id)) throw new BadRequestException("Invalid subscription ID");
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException("Subscription not found");
    return sub;
  }

  async update(id: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    if (!isObjectIdLike(id)) throw new BadRequestException("Invalid subscription ID");
    // findUnique first so a missing row is a 404, matching the old
    // findByIdAndUpdate-returned-null behaviour rather than Prisma's P2025.
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Subscription not found");
    return this.prisma.subscription.update({ where: { id }, data: dto as any });
  }

  async delete(id: string): Promise<void> {
    if (!isObjectIdLike(id)) throw new BadRequestException("Invalid subscription ID");
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Subscription not found");
    await this.prisma.subscription.delete({ where: { id } });
  }
}
