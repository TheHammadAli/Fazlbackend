import { CreateUpdateUserDto } from './dto/create-update-User.dto';
import { User, UserDocument } from './schema/users.schema';
import { Model } from 'mongoose';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { FileUploadService } from 'src/common/file-upload/file-upload.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private userModel;
    private readonly fileUploadService;
    constructor(userModel: Model<UserDocument>, fileUploadService: FileUploadService);
    createUser(createUserDto: CreateUpdateUserDto): Promise<import("mongoose").FlattenMaps<User & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>>;
    hashPassword(password: string): Promise<string>;
    findUserByEmail(email: string): Promise<(import("mongoose").Document<unknown, {}, UserDocument, {}> & User & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    findByResetToken(resetPasswordToken: string): Promise<UserDocument | null>;
    validateUserForLogin(email: string, password: string): Promise<UserDocument | false>;
    updateUser(userId: string, updateData: Partial<UpdateUserDto>): Promise<User>;
    findByIdWithToken(userId: string): Promise<UserDocument>;
    findUserById(userId: string): Promise<UserDocument>;
    getAllUsers(paginationDto: PaginationDto): Promise<PaginatedResponseDto<User>>;
}
