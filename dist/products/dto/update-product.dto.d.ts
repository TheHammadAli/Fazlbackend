declare class PromotionDto {
    discountPercent?: number;
    validUntil?: Date;
}
export declare class UpdateProductDto {
    title?: string;
    description?: string;
    type: 'retail' | 'classified';
    price?: number;
    category?: string;
    imageUrls?: string[];
    promotion?: PromotionDto;
}
export {};
