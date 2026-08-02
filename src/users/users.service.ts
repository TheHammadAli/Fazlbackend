import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateUpdateUserDto } from "./dto/create-update-User.dto";
import { AppError } from "src/common/exceptions/app-error";
import { User, UserDocument } from "./schema/users.schema";
import * as bcrypt from "bcryptjs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { Inject, forwardRef } from "@nestjs/common";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ClsService } from "nestjs-cls";
import { ShopService } from "src/shop/shop.service";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly fileUploadService: FileUploadService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService, //
    @Inject(forwardRef(() => ShopService))
    private readonly shopService: ShopService,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
  ) { }

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }
  async createUser(createUserDto: CreateUpdateUserDto) {
    try {
      const normalizedEmail = createUserDto.email?.trim().toLowerCase();
      const normalizedPhone = createUserDto.phone?.trim();

      const existingUser = await this.userModel.findOne({
        $or: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      });

      if (existingUser) {
        throw new ConflictException(
          this.i18n.translate("auth.users.email_or_phone_already_registered", {
            lang: this.lang,
          }),
        );
      }

      const hashedPassword = await this.hashPassword(createUserDto.password);
      let imageUrl = "default-avatar.png"; // Default image URL

      const newUser = new this.userModel({
        ...createUserDto,
        email: normalizedEmail,
        phone: normalizedPhone,
        image: "default-avatar.png", // Default image if none provided
        password: hashedPassword,
      });

      const savedUser = await newUser.save();
      console.log("User image", createUserDto.image);
      if (createUserDto.image) {
        imageUrl = await this.fileUploadService.uploadUserImage(
          newUser._id as string,
          createUserDto.image,
        ); // Function to handle image upload
        savedUser.image = imageUrl; // Ensure the image is stored as a filename
      }
      await savedUser.save(); // Save the user again to update the image field
      return {
        message: this.i18n.translate("auth.users.created_success", {
          lang: this.lang,
        }),
        data: savedUser.toJSON(),
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }

      if (
        err instanceof Error &&
        "code" in err &&
        (err as any).code === 11000
      ) {
        throw new ConflictException(
          this.i18n.translate("auth.users.email_or_phone_already_registered", {
            lang: this.lang,
          }),
        );
      }

      const errorMessage = err instanceof Error ? err.message : "Internal server error";
      throw new AppError(errorMessage);
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(password, salt);
  }

  async findUserByEmail(email: string) {
    return await this.userModel.findOne({ email }).exec();
  }

  async findByResetToken(
    resetPasswordToken: string,
  ): Promise<UserDocument | null> {
    const results = await this.userModel
      .findOne({ resetPasswordToken })
      .select("+resetPasswordExpires")
      .exec();
    if (!results) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
      );
    }
    return results;
  }

  async validateUserForLogin(
    email: string,
    password: string,
  ): Promise<UserDocument | false> {
    const user = await this.userModel.findOne({ email }).select("+password");
    if (!user) {
      return false;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return false;
    }

    return user;
  }

  async updateUser(
    userId: string,
    updateData: Partial<UpdateUserDto>,
  ): Promise<{ message: string; data: User }> {
    try {
      const existingUser = await this.userModel.findById(userId).exec();
      if (!existingUser) {
        throw new NotFoundException(
          this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
        );
      }

      const sanitizedData = { ...updateData };

      Object.keys(sanitizedData).forEach((key) => {
        if (
          sanitizedData[key] === "" ||
          sanitizedData[key] === null ||
          typeof sanitizedData[key] === "undefined"
        ) {
          delete sanitizedData[key];
        }
      });

      const updatePayload: Partial<UpdateUserDto> = {};

      Object.entries(sanitizedData).forEach(([key, value]) => {
        const currentValue = (existingUser as Record<string, any>)[key];

        if (Array.isArray(currentValue) && Array.isArray(value)) {
          const sameArray =
            currentValue.length === value.length &&
            currentValue.every((item, index) => item === value[index]);
          if (sameArray) {
            return;
          }
        } else if (typeof currentValue === "object" && currentValue !== null && typeof value === "object" && value !== null) {
          if (JSON.stringify(currentValue) === JSON.stringify(value)) {
            return;
          }
        } else if (currentValue === value) {
          return;
        }

        (updatePayload as Record<string, any>)[key] = value;
      });

      // Handle password hashing
      if (updatePayload.password) {
        const salt = await bcrypt.genSalt();
        updatePayload.password = await bcrypt.hash(updatePayload.password, salt);
      }

      const normalizedEmail = updatePayload.email?.trim().toLowerCase();
      const normalizedPhone = updatePayload.phone?.trim();

      if (normalizedEmail || normalizedPhone) {
        const duplicateUser = await this.userModel
          .findOne({
            _id: { $ne: userId },
            $or: [
              ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
              ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
            ],
          })
          .exec();

        if (duplicateUser) {
          throw new ConflictException(
            this.i18n.translate("auth.users.email_or_phone_already_registered", {
              lang: this.lang,
            }),
          );
        }
      }

      if (normalizedEmail) {
        updatePayload.email = normalizedEmail;
      }

      if (normalizedPhone) {
        updatePayload.phone = normalizedPhone;
      }

      let imageUrl = existingUser.image || "default-avatar.png";
      if (
        updatePayload.image &&
        typeof updatePayload.image === "object" &&
        "buffer" in updatePayload.image &&
        "originalname" in updatePayload.image
      ) {
        imageUrl = await this.fileUploadService.uploadUserImage(
          userId,
          updatePayload.image,
        );
      }

      if (!updatePayload.location) {
        updatePayload.location = existingUser.location;
      }

      updatePayload.image = imageUrl;

      const updatedUser = await this.userModel.findByIdAndUpdate(userId, {
        $set: updatePayload,
      });

      if (!updatedUser) {
        throw new NotFoundException(
          this.i18n.translate("users.user_not_found", { lang: this.lang }),
        );
      }

      return {
        message: this.i18n.translate("auth.users.updated_success", {
          lang: this.lang,
        }),
        data: updatedUser,
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }

      if (
        err instanceof Error &&
        "code" in err &&
        (err as any).code === 11000
      ) {
        throw new ConflictException(
          this.i18n.translate("auth.users.email_or_phone_already_registered", {
            lang: this.lang,
          }),
        );
      }

      const errorMessage = err instanceof Error ? err.message : "Internal server error";
      throw new AppError(errorMessage);
    }
  }

  async findByIdWithToken(
    userId: string,
    lang: string = "en",
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findById(userId)
      .select("+refreshToken")
      .exec();

    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("users.user_not_found", { lang: this.lang }),
      );
    }

    return user;
  }

  async findUserById(
    userId: string,
    lang: string = "en",
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang }),
      );
    }

    return user;
  }

  async getAllUsers(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<User>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search?.trim()) {
      query.name = {
        $regex: search.trim(),
        $options: 'i'   // case-insensitive
      };
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async saveFcmToken(userId: string, token: string) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return this.userModel.findByIdAndUpdate(
      userId,
      { fcmToken: token },
      { new: true },
    );
  }

  async disableAccount(userId: string): Promise<{ message: string; data: User }> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException(
          this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
        );
      }

      // disable user
      await this.userModel.findByIdAndUpdate(userId, { $set: { isDisabled: true } }, { new: true }).exec();

      // fetch all shops for user and disable them and their products
      const shops = await this.shopService.getAllShopsByUser(userId);

      if (shops.length > 0) {
        const shopIds = shops.map(shop => (shop as any)._id ?? (shop as any).id);

        // Bulk disable shops and products in parallel
        await Promise.all([
          this.shopService.setShopsDisabledBulk(shopIds, true),
          this.productsService.setProductsDisabledByShopsBulk(shopIds, true),
        ]);
      }

      await this.productsService.setProductsDisabledByUser(userId, true);

      // disable services owned by user
      await this.servicesService.setDisabledByOwner(userId, true);

      return {
        message: this.i18n.translate("auth.users.account_disabled", {
          lang: this.lang,
        }),
        data: user,
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message : "Internal server error";
      throw new AppError(errorMessage);
    }
  }

  async reactivateAccount(userId: string): Promise<{ message: string; data: User }> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException(
          this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
        );
      }

      // reactivate user
      await this.userModel.findByIdAndUpdate(userId, { $set: { isDisabled: false } }, { new: true }).exec();

      // fetch all shops for user and enable them and their products
      const shops = await this.shopService.getAllShopsByUser(userId);

      if (shops.length > 0) {
        const shopIds = shops.map(shop => (shop as any)._id ?? (shop as any).id);

        // Bulk enable shops and products in parallel
        await Promise.all([
          this.shopService.setShopsDisabledBulk(shopIds, false),
          this.productsService.setProductsDisabledByShopsBulk(shopIds, false),
        ]);
      }

      // enable services owned by user
      await this.servicesService.setDisabledByOwner(userId, false);

      await this.productsService.setProductsDisabledByUser(userId, false);

      return {
        message: this.i18n.translate("auth.users.account_reactivated", {
          lang: this.lang,
        }),
        data: user,
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message : "Internal server error";
      throw new AppError(errorMessage);
    }
  }
}
