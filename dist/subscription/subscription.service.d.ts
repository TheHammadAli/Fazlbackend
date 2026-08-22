import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { Subscription, SubscriptionDocument } from "./schema/subscription-schema";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
export declare class SubscriptionService {
    private readonly subscriptionModel;
    private readonly i18n;
    constructor(subscriptionModel: Model<SubscriptionDocument>, i18n: I18nService);
    create(dto: CreateSubscriptionDto): Promise<Subscription>;
    findAll(): Promise<Subscription[]>;
    findById(id: string): Promise<Subscription>;
    update(id: string, dto: UpdateSubscriptionDto): Promise<Subscription>;
    delete(id: string): Promise<void>;
}
