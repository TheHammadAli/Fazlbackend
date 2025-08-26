import { UsersService } from './users.service';
import { CreateUpdateUserDto } from './dto/create-update-User.dto';
import { User } from './schema/users.schema';
import { UpdateUserDto } from './dto/update-user.dto';
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
    }): Promise<User>;
    getUser(userId: string): Promise<User>;
    getAllUsers(page?: number, limit?: number): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<User>>;
}
