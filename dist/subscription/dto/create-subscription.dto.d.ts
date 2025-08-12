export declare class CreateSubscriptionDto {
    targetType: 'product' | 'shop';
    name: string;
    price: number;
    durationInDays: number;
    screenType?: 'listing' | 'feed';
    description?: string;
}
