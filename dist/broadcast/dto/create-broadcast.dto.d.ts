import { Location } from "src/users/schema/users.interfaces";
declare class LocationDto implements Location {
    type: "Point";
    coordinates: [number, number];
}
export declare class CreateBroadcastDto {
    message: string;
    radius: number;
    categoryId: string;
    type: "product" | "service";
    purpose: "Buying" | "Selling";
    location?: LocationDto;
    files?: any[];
}
export {};
