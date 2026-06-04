import { CreateUpdateUserDto } from "./dto/create-update-User.dto";
import { User, UserDocument } from "./schema/users.schema";
import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ClsService } from "nestjs-cls";
import { ShopService } from "src/shop/shop.service";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
export declare class UsersService {
    private userModel;
    private readonly fileUploadService;
    private readonly i18n;
    private readonly cls;
    private readonly shopService;
    private readonly productsService;
    private readonly servicesService;
    constructor(userModel: Model<UserDocument>, fileUploadService: FileUploadService, i18n: I18nService, cls: ClsService, shopService: ShopService, productsService: ProductsService, servicesService: ServicesService);
    private get lang();
    createUser(createUserDto: CreateUpdateUserDto): Promise<{
        message: string;
        data: import("mongoose").FlattenMaps<User & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>;
    }>;
    hashPassword(password: string): Promise<string>;
    findUserByEmail(email: string): Promise<(import("mongoose").Document<unknown, {}, UserDocument, {}> & User & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    findByResetToken(resetPasswordToken: string): Promise<UserDocument | null>;
    validateUserForLogin(email: string, password: string): Promise<UserDocument | false>;
    updateUser(userId: string, updateData: Partial<UpdateUserDto>): Promise<{
        message: string;
        data: User;
    }>;
    findByIdWithToken(userId: string, lang?: string): Promise<UserDocument>;
    findUserById(userId: string, lang?: string): Promise<UserDocument>;
    getAllUsers(paginationDto: PaginationDto): Promise<PaginatedResponseDto<User>>;
    saveFcmToken(userId: string, token: string): Promise<(import("mongoose").Document<unknown, {}, UserDocument, {}> & User & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    disableAccount(userId: string): Promise<{
        message: string;
        data: User;
    }>;
    reactivateAccount(userId: string): Promise<{
        message: string;
        data: User;
    }>;
}
