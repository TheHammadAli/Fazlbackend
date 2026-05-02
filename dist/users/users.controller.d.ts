import { UsersService } from "./users.service";
import { CreateUpdateUserDto } from "./dto/create-update-User.dto";
import { User } from "./schema/users.schema";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    createUser(createUserDto: CreateUpdateUserDto, files: {
        image?: Express.Multer.File[];
    }): Promise<import("mongoose").FlattenMaps<User & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>>;
    updateUser(userId: string, updateUserDto: UpdateUserDto, files: {
        image?: Express.Multer.File[];
    }): Promise<{
        message: string;
        data: User;
    }>;
    getUser(userId: string): Promise<User>;
    getAllUsers(page?: number, limit?: number): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<User>>;
    registerFcmToken(user: JwtPayload, token: string): Promise<(import("mongoose").Document<unknown, {}, import("./schema/users.schema").UserDocument, {}> & User & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
}
