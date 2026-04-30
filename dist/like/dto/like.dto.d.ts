export declare class CreateLikeDto {
    itemId: string;
    itemType: 'product' | 'service';
    ownerModel: 'Shop' | 'User';
}
export declare class RemoveLikeDto {
    itemId: string;
    itemType: 'product' | 'service';
}
