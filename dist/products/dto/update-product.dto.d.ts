declare class ProductParameterDto {
    name: string;
    variants: string[];
}
declare class LocationDto {
    type: "Point";
    coordinates: [number, number];
}
export declare class UpdateProductDto {
    title?: string;
    description?: string;
    type?: "retail" | "classified";
    price?: number;
    category?: string;
    images?: any;
    video?: any;
    parameters?: ProductParameterDto[];
    location?: LocationDto | string;
    address?: string;
}
export {};
