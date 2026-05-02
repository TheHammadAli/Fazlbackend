import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Model } from "mongoose";
export declare class ListingUtilsService {
    findNearbyWithCategory<T>(model: Model<T>, category: string, coordinates: [number, number], radius: number, pagination: PaginationDto): Promise<PaginatedResponseDto<T>>;
}
