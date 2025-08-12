import { Model } from 'mongoose';
import { Subscription, SubscriptionDocument } from './schema/subscription-schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
export declare class SubscriptionService {
    private readonly subscriptionModel;
    constructor(subscriptionModel: Model<SubscriptionDocument>);
    create(dto: CreateSubscriptionDto): Promise<Subscription>;
    findAll(): Promise<Subscription[]>;
    findById(id: string): Promise<Subscription>;
    update(id: string, dto: UpdateSubscriptionDto): Promise<Subscription>;
    delete(id: string): Promise<void>;
}
