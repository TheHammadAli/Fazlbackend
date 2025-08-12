export declare class SearchQueryDto {
    type: 'product' | 'service';
    category?: string;
    radius: number;
    lat: number;
    lng: number;
    page?: number;
    limit?: number;
}
