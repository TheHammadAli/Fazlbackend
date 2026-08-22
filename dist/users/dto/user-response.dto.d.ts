import { Location } from "../schema/users.interfaces";
export declare class UserResponseDto {
    id: string;
    name: string;
    email: string;
    role: string[];
    location: Location;
    createdAt: Date;
    updatedAt: Date;
}
