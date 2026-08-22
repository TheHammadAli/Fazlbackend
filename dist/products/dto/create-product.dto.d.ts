import { Location } from "src/users/schema/users.interfaces";
declare class ProductParameterDto {
    name: string;
    variants: string[];
}
declare class LocationDto implements Location {
    type: "Point";
    coordinates: [number, number];
}
export declare class CreateProductDto {
    title: string;
    description?: string;
    price: number;
    category: string;
    type: "retail" | "classified";
    images: any;
    video: any;
    parameters?: ProductParameterDto[];
    location?: LocationDto;
    address?: string;
}
export {};
