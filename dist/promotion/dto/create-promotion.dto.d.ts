export declare class CreatePromotionDto {
    subscriptionId: string;
    targetType: "Product" | "Shop";
    targetId: string;
    startDate: Date;
    endDate: Date;
    status?: "active" | "expired" | "cancelled" | "scheduled";
    isAutoRenew?: boolean;
}
