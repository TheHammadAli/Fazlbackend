import { LikeService } from './like.service';
import { CreateLikeDto, RemoveLikeDto } from './dto/like.dto';
export declare class LikeController {
    private readonly likeService;
    constructor(likeService: LikeService);
    addLike(userId: string, dto: CreateLikeDto): Promise<{
        message: string;
        data: import("./schema/like.schema").Like;
    }>;
    removeLike(userId: string, dto: RemoveLikeDto): Promise<{
        message: string;
    }>;
    getLikesByUser(userId: string, itemType?: 'product' | 'service'): Promise<import("./like.service").PopulatedLikeItem[]>;
}
