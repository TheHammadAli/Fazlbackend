import { CreateUpdateUserDto } from './dto/create-update-User.dto';
import { User, UserDocument } from './schema/users.schema';
import { Model } from 'mongoose';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    createUser(createUserDto: CreateUpdateUserDto): Promise<User>;
    hashPassword(password: string): Promise<string>;
    findUserByEmail(email: string): Promise<UserDocument | null>;
    findByResetToken(resetPasswordToken: string): Promise<UserDocument | null>;
    validateUserForLogin(email: string, password: string): Promise<UserDocument | false>;
    updateUser(userId: string, updateData: Partial<User>): Promise<User>;
    findByIdWithToken(userId: string): Promise<UserDocument>;
    findUserById(userId: string): Promise<UserDocument>;
    getAllUsers(paginationDto: PaginationDto): Promise<PaginatedResponseDto<User>>;
}
