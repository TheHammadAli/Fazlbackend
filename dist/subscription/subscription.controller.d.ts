import { SubscriptionService } from "./subscription.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { Subscription } from "./schema/subscription-schema";
export declare class SubscriptionController {
    private readonly subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    create(dto: CreateSubscriptionDto): Promise<Subscription>;
    findAll(): Promise<Subscription[]>;
    findById(id: string): Promise<Subscription>;
    update(id: string, dto: UpdateSubscriptionDto): Promise<Subscription>;
    delete(id: string): Promise<void>;
}
