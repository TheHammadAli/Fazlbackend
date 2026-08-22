export declare class PaginationMetaDto {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class PaginatedResponseDto<T> {
    meta: PaginationMetaDto;
    data: T[];
}
