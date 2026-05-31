export declare class CreateBroadcastDto {
    message: string;
    radius: number;
    categoryId: string;
    type: "product" | "service";
    purpose: "Buying" | "Selling";
    files?: any[];
}
