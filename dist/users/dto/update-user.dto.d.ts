import { Location } from "../schema/users.interfaces";
declare class LocationDto implements Location {
    type: "Point";
    coordinates: [number, number];
}
export declare class UpdateUserDto {
    password?: string;
    phone?: string;
    address?: string;
    roles?: ("buyer" | "seller" | "admin" | "subadmin")[];
    language?: "en" | "ur";
    location?: LocationDto;
    image?: any;
    refreshToken?: null | string;
    resetPasswordToken?: null | string;
    resetPasswordExpires?: null | Date;
}
export {};
