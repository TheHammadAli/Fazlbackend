import { UsersService } from './users.service';
import { CreateUpdateUserDto } from './dto/create-update-User.dto';
import { User } from './schema/users.schema';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    createUser(createUserDto: CreateUpdateUserDto): Promise<User>;
    updateUser(userId: string, updateUserDto: CreateUpdateUserDto): Promise<User>;
    getUser(userId: string): Promise<User>;
    getAllUsers(page?: number, limit?: number): Promise<import("../common/dto/pagination-response.dto").PaginatedResponseDto<User>>;
}
