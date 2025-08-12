export declare class CreateReviewDto {
    userId: string;
    itemId: string;
    itemType: 'product' | 'service';
    rating: number;
    comment?: string;
}
