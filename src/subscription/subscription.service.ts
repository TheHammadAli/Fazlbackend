import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import {
  Subscription,
  SubscriptionDocument,
} from "./schema/subscription-schema";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    return this.subscriptionModel.create(dto);
  }

  async findAll(): Promise<Subscription[]> {
    return this.subscriptionModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<Subscription> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException("Invalid subscription ID");
    const sub = await this.subscriptionModel.findById(id);
    if (!sub) throw new NotFoundException("Subscription not found");
    return sub;
  }

  async update(id: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException("Invalid subscription ID");
    const updated = await this.subscriptionModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) throw new NotFoundException("Subscription not found");
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException("Invalid subscription ID");
    const result = await this.subscriptionModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException("Subscription not found");
  }
}
