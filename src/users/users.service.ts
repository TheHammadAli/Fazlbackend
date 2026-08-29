import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateUpdateUserDto } from "./dto/create-update-User.dto";
import { AppError } from "src/common/exceptions/app-error";
import { User, UserDocument } from "./schema/users.schema";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { CreateAdminAccountDto, PermissionEntryDto } from "./dto/create-admin-account.dto";
import { UpdateAdminAccountDto } from "./dto/update-admin-account.dto";
import {
  ADMIN_ACTIONS,
  ADMIN_PERMISSIONS,
} from "src/common/constants/admin-permissions.constants";
import { ResetAdminPasswordDto } from "./dto/reset-admin-password.dto";
import { ResetMemberPasswordDto } from "./dto/reset-member-password.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
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
import { ChatService } from "src/chat/chat.service";
import { PresenceService } from "src/presence/presence.service";
import { EmailService } from "src/common/email-service/email-service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    private readonly fileUploadService: FileUploadService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService, //
    @Inject(forwardRef(() => ShopService))
    private readonly shopService: ShopService,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    private readonly emailService: EmailService,
  ) { }

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }

  /** Atomically reserves the next sequential user code (e.g. USR-000135). */
  private async generateNextUserCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "userCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `USR-${String(counter.seq).padStart(6, "0")}`;
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
      const userCode = await this.generateNextUserCode();

      const newUser = new this.userModel({
        ...createUserDto,
        email: normalizedEmail,
        phone: normalizedPhone,
        userCode,
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

  /**
   * Bypasses updateUser's generic "strip null/empty values" sanitizer — that
   * behavior is correct for self-service profile updates, but it silently
   * swallows the null writes needed here, leaving a used reset token/expiry
   * in place (and therefore reusable) until it naturally expires.
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
    });
  }

  async validateUserForLogin(
    email: string,
    password: string,
    loginContext: "web" | "admin" = "web",
  ): Promise<UserDocument | false> {
    // Emails are stored trimmed + lowercased at signup — the lookup must match
    // that or any casing/whitespace difference at login silently fails here.
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await this.userModel
      .findOne({ email: normalizedEmail })
      .select("+password +memberPassword");
    if (!user) {
      return false;
    }

    // A user promoted to member gets a separate admin-panel password (memberPassword),
    // scoped to that context — their original `password` keeps working only on the main
    // app. Member-only accounts created fresh never have memberPassword, so "admin"
    // logins for them fall back to the single password they were created with.
    const passwordField =
      loginContext === "admin" && user.memberPassword ? user.memberPassword : user.password;

    const isMatch = await bcrypt.compare(password, passwordField);
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
      // Defense-in-depth: no global ValidationPipe enforces the DTO's shape, so a raw
      // request body could carry fields the DTO never declares. This is a generic
      // self-service endpoint — it must never be able to grant privileges.
      delete (updateData as Record<string, unknown>).permissions;
      delete (updateData as Record<string, unknown>).isDisabled;

      // Only safe, self-assignable role values may pass through this endpoint.
      // Admin-tier roles are managed exclusively via updateAdminAccount, which has
      // its own super_admin protection.
      if (updateData.roles) {
        // This endpoint accepts multipart/form-data (for the image upload), where a
        // single-value field arrives as a plain string rather than an array — only
        // 2+ repeated parts with the same name get parsed into an array.
        const rolesArray = Array.isArray(updateData.roles)
          ? updateData.roles
          : [updateData.roles];
        const SELF_ASSIGNABLE_ROLES = ["buyer", "seller"] as const;
        updateData.roles = rolesArray.filter((role) =>
          (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(role),
        ) as typeof updateData.roles;
        if (updateData.roles.length === 0) {
          delete updateData.roles;
        }
      }

      const existingUser = await this.userModel.findById(userId).exec();
      if (!existingUser) {
        throw new NotFoundException(
          this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
        );
      }

      // Only block attempts to change roles on a super_admin account — this method
      // is also used internally (login/refresh-token/password-reset flows), which
      // only ever touch refreshToken/password and must keep working.
      if (updateData.roles && existingUser.roles?.includes("super_admin")) {
        throw new ForbiddenException(
          "The Super Admin account's roles cannot be changed through this endpoint",
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

  /** Aggregate activity counts for the admin panel's User Profile modal. */
  async getUserStats(userId: string) {
    await this.findUserById(userId);

    const [
      shops,
      servicesResult,
      listingsResult,
      bookingsCount,
      conversationsCount,
      messagesSentCount,
      messagesReceivedCount,
    ] = await Promise.all([
      this.shopService.getAllShopsByUser(userId),
      this.servicesService.getByUser(userId, 1, 1),
      this.productsService.getAllProductsByUser(userId, { page: 1, limit: 1 }),
      this.servicesService.countServiceRequestsByUser(userId, "customer"),
      this.chatService.countConversationsForUser(userId),
      this.chatService.countMessagesSentByUser(userId),
      this.chatService.countMessagesReceivedByUser(userId),
    ]);

    return {
      shopsCount: shops.length,
      servicesCount: servicesResult.meta.total,
      listingsCount: listingsResult.meta.total,
      bookingsCount,
      conversationsCount,
      messagesSentCount,
      messagesReceivedCount,
    };
  }

  async getAllUsers(
    paginationDto: PaginationDto,
    onlineOnly?: boolean,
  ): Promise<PaginatedResponseDto<User>> {
    const { page = 1, limit = 10, search, startDate, endDate } = paginationDto;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (onlineOnly) {
      const onlineIds = this.presenceService.getAllOnlineUserIds();
      query._id = { $in: onlineIds.map((id) => new Types.ObjectId(id)) };
    }

    if (search?.trim()) {
      const trimmedSearch = search.trim();
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { userCode: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
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

    const userIds = users.map((user) => user._id.toString());
    const onlineIds = this.presenceService.getOnlineUserIds(userIds);
    const enrichedUsers = users.map((user) => ({
      ...user,
      isOnline: onlineIds.has(user._id.toString()),
      lastSeenAt: user.lastSeenAt ?? null,
    }));

    return {
      data: enrichedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Cheap, side-channel field touched by the presence gateway — not part of the self-service update flow. */
  async touchLastSeen(userId: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } })
      .exec();
  }

  /**
   * `lastSeenAt` for a set of users, keyed by id.
   *
   * Used to answer a presence subscription: online state is in memory, but the
   * timestamp is not, and a client opening a chat directly has no other source
   * for it.
   */
  async getLastSeenFor(userIds: string[]): Promise<Record<string, Date | null>> {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0) return {};

    const rows = await this.userModel
      .find({ _id: { $in: ids } }, { _id: 1, lastSeenAt: 1 })
      .lean()
      .exec();

    return Object.fromEntries(
      rows.map((row: any) => [String(row._id), row.lastSeenAt ?? null]),
    );
  }

  async getUserDetailForAdmin(userId: string) {
    const user = await this.findUserById(userId);
    return {
      ...user.toObject(),
      isOnline: this.presenceService.isOnline(userId),
      lastSeenAt: user.lastSeenAt ?? null,
    };
  }

  getOnlineUsersCount(): number {
    return this.presenceService.getOnlineCount();
  }

  /**
   * Registers one device's push token for a user.
   *
   * A user can be signed in on the phone app and in one or more browsers at the
   * same time, and every client posts its own token to this same endpoint.
   * Overwriting a single field meant the last client to register silently wiped
   * all the others, so only one device could receive pushes — hence $addToSet
   * into a list rather than an assignment.
   *
   * The token is pulled off every *other* account first: an FCM token identifies
   * a device install, not a person, so when a second account signs in on that
   * device the token has to move rather than stay duplicated on both accounts
   * (which would send the first account's notifications to the new user).
   */
  async saveFcmToken(userId: string, token: string) {
    const trimmed = token?.trim();
    if (!trimmed) {
      throw new BadRequestException("FCM token is required.");
    }

    await this.userModel.updateMany(
      { _id: { $ne: userId }, fcmTokens: trimmed },
      { $pull: { fcmTokens: trimmed } },
    );
    await this.userModel.updateMany(
      { _id: { $ne: userId }, fcmToken: trimmed },
      { $unset: { fcmToken: "" } },
    );

    return this.userModel.findByIdAndUpdate(
      userId,
      { $addToSet: { fcmTokens: trimmed } },
      { new: true },
    );
  }

  /**
   * Drops tokens FCM reported as permanently dead (app uninstalled, token
   * rotated, browser storage cleared) so the list doesn't grow without bound.
   */
  async removeFcmTokens(userId: string, tokens: string[]) {
    if (!tokens?.length) return;

    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { fcmTokens: { $in: tokens } } },
    );
    await this.userModel.updateOne(
      { _id: userId, fcmToken: { $in: tokens } },
      { $unset: { fcmToken: "" } },
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

  private generateRandomPassword(): string {
    return crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "");
  }

  async getAllAdminAccounts(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<User>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    // Super Admin is a single, fixed, protected account — never listed here.
    const query: any = { roles: { $in: ["admin", "moderator"] } };

    if (search?.trim()) {
      const trimmedSearch = search.trim();
      query.$or = [
        { name: { $regex: trimmedSearch, $options: "i" } },
        { email: { $regex: trimmedSearch, $options: "i" } },
      ];
    }

    const [admins, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    return {
      data: admins,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Ids of all non-disabled users, optionally filtered by role. Empty/undefined roles = all users. */
  async getUserIdsByRoles(roles?: string[]): Promise<string[]> {
    const query: any = { isDisabled: { $ne: true } };
    if (roles && roles.length > 0) {
      query.roles = { $in: roles };
    }

    const users = await this.userModel
      .find(query, { _id: 1 })
      .lean()
      .exec();

    return users.map((user) => user._id.toString());
  }

  /** No global ValidationPipe is registered in this app, so class-validator decorators on the
   *  DTO are documentation only, not enforcement — the page/action shape must be checked
   *  explicitly at runtime before it's persisted. */
  private sanitizePermissions(permissions?: PermissionEntryDto[]): PermissionEntryDto[] {
    if (!permissions) return [];
    for (const entry of permissions) {
      if (!ADMIN_PERMISSIONS.includes(entry?.page as (typeof ADMIN_PERMISSIONS)[number])) {
        throw new BadRequestException(`Invalid permission page: ${entry?.page}`);
      }
      if (
        !Array.isArray(entry.actions) ||
        entry.actions.some((action) => !ADMIN_ACTIONS.includes(action as (typeof ADMIN_ACTIONS)[number]))
      ) {
        throw new BadRequestException(`Invalid permission actions for page: ${entry.page}`);
      }
    }
    return permissions;
  }

  async createAdminAccount(dto: CreateAdminAccountDto) {
    // No global ValidationPipe is registered in this app, so class-validator decorators on the
    // DTO are documentation only, not enforcement — this must be checked explicitly at runtime.
    if ((dto.role as string) === "super_admin") {
      throw new ForbiddenException("A new Super Admin cannot be created this way");
    }

    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new ConflictException(
        this.i18n.translate("auth.users.email_already_registered", {
          lang: this.lang,
        }),
      );
    }

    const generatedPassword = this.generateRandomPassword();
    const hashedPassword = await this.hashPassword(generatedPassword);
    const userCode = await this.generateNextUserCode();

    const newUser = new this.userModel({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      roles: [dto.role],
      permissions: this.sanitizePermissions(dto.permissions),
      userCode,
      image: "default-avatar.png",
    });

    const savedUser = await newUser.save();

    return {
      message: "Admin account created successfully",
      data: { ...savedUser.toJSON(), generatedPassword },
    };
  }

  /** Creates a moderator account for use as a task-assignable member — callable by
   *  Admin/Super Admin (unlike createAdminAccount, which is super_admin only), since
   *  member management is a separate, less-privileged capability. */
  async createMemberAccount(name: string, email: string) {
    const existingUser = await this.userModel.findOne({ email });

    if (existingUser) {
      if (existingUser.roles?.includes("moderator")) {
        throw new ConflictException(
          this.i18n.translate("auth.users.already_a_member", {
            lang: this.lang,
          }),
        );
      }

      // Not a member yet, but already has a regular account (buyer/seller/etc.) —
      // add member access on top of it rather than creating a duplicate account.
      // They get a SEPARATE admin-panel password so the two logins never collide:
      // their original password keeps working on the main app (loginContext "web"),
      // this new one only works on the admin panel (loginContext "admin").
      const generatedMemberPassword = this.generateRandomPassword();
      existingUser.memberPassword = await this.hashPassword(generatedMemberPassword);
      existingUser.roles = [...new Set([...(existingUser.roles ?? []), "moderator"])];
      const savedExistingUser = await existingUser.save();

      this.sendMemberAddedEmail(savedExistingUser.name, savedExistingUser.email, generatedMemberPassword);

      return {
        message: "Existing user added as a member successfully",
        data: { ...savedExistingUser.toJSON(), generatedPassword: generatedMemberPassword },
      };
    }

    const generatedPassword = this.generateRandomPassword();
    const hashedPassword = await this.hashPassword(generatedPassword);
    const userCode = await this.generateNextUserCode();

    const newUser = new this.userModel({
      name,
      email,
      password: hashedPassword,
      roles: ["moderator"],
      permissions: [],
      userCode,
      image: "default-avatar.png",
    });

    const savedUser = await newUser.save();

    this.sendMemberWelcomeEmail(name, email, generatedPassword);

    return {
      message: "Member created successfully",
      data: { ...savedUser.toJSON(), generatedPassword },
    };
  }

  /** Fire-and-forget: creation must succeed even when the email provider is down. */
  private sendMemberWelcomeEmail(name: string, email: string, password: string) {
    const loginUrl = `${process.env.ADMIN_PANEL_URL}/signin`;
    const html = `
      <h2>Your account has been created</h2>
      <p>Hi ${name},</p>
      <p>Your Fazl member account has been created. You can log in with the credentials below:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p>This is your password — use it to log in here:</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
    `;
    this.emailService
      .sendEmail(email, "Your Fazl account has been created", html)
      .catch((err) => console.error(`Member welcome email to ${email} failed:`, err));
  }

  /** Fire-and-forget: for an existing account promoted to member — they get a second,
   *  admin-panel-only password; their original account password is untouched. */
  private sendMemberAddedEmail(name: string, email: string, memberPassword: string) {
    const loginUrl = `${process.env.ADMIN_PANEL_URL}/signin`;
    const html = `
      <h2>You've been added as a member</h2>
      <p>Hi ${name},</p>
      <p>Your existing Fazl account now also has member access on the admin panel. Your password there is separate from your regular account — use the credentials below:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Admin panel password:</strong> ${memberPassword}</p>
      <p>Your existing password still works as before on the main Fazl app — only the admin panel uses this new one.</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
    `;
    this.emailService
      .sendEmail(email, "You've been added as a member on Fazl", html)
      .catch((err) => console.error(`Member-added email to ${email} failed:`, err));
  }

  async updateMemberAccount(userId: string, name?: string, email?: string) {
    const existingUser = await this.userModel.findById(userId);
    if (!existingUser || !existingUser.roles?.includes("moderator")) {
      throw new NotFoundException("Member not found");
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .exec();

    return { message: "Member updated successfully", data: updatedUser?.toJSON() };
  }

  async resetMemberPassword(userId: string, dto: ResetMemberPasswordDto) {
    const existingUser = await this.userModel.findById(userId).select("+memberPassword");
    if (!existingUser || !existingUser.roles?.includes("moderator")) {
      throw new NotFoundException("Member not found");
    }

    // Same reason as createAdminAccount: no global ValidationPipe enforces the DTO's decorators.
    const trimmed = dto.newPassword?.trim();
    if (trimmed && trimmed.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long");
    }

    const newPassword = trimmed || this.generateRandomPassword();
    const hashedPassword = await this.hashPassword(newPassword);

    // A promoted account (has memberPassword) keeps its admin-panel password separate from
    // its regular one — reset that field, not the account's main password. A member-only
    // account created fresh has just the one password field.
    const isDualPersona = Boolean(existingUser.memberPassword);
    const updateField = isDualPersona ? "memberPassword" : "password";

    await this.userModel
      .findByIdAndUpdate(userId, { $set: { [updateField]: hashedPassword } }, { new: true })
      .exec();

    if (isDualPersona) {
      this.sendMemberAddedEmail(existingUser.name ?? "", existingUser.email, newPassword);
    } else {
      this.sendMemberWelcomeEmail(existingUser.name ?? "", existingUser.email, newPassword);
    }

    return {
      message: "Password updated successfully",
      data: { generatedPassword: newPassword },
    };
  }

  async deleteMemberAccount(userId: string) {
    const existingUser = await this.userModel.findById(userId);
    if (!existingUser || !existingUser.roles?.includes("moderator")) {
      throw new NotFoundException("Member not found");
    }

    const otherRoles = (existingUser.roles ?? []).filter((role) => role !== "moderator");

    if (otherRoles.length > 0) {
      // This account existed before it was made a member (buyer/seller/etc.) — removing
      // member access must only demote it, never delete the account those other roles rely on.
      await this.userModel
        .findByIdAndUpdate(userId, {
          $set: { roles: otherRoles },
          $unset: { memberPassword: "" },
        })
        .exec();

      return {
        message: "Member access removed successfully",
        data: { _id: existingUser._id, name: existingUser.name },
      };
    }

    await this.userModel.findByIdAndDelete(userId).exec();

    return {
      message: "Member deleted successfully",
      data: { _id: existingUser._id, name: existingUser.name },
    };
  }

  async updateAdminAccount(userId: string, dto: UpdateAdminAccountDto) {
    const existingUser = await this.userModel.findById(userId);
    if (!existingUser) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
      );
    }
    if (existingUser.roles?.includes("super_admin")) {
      throw new ForbiddenException("The Super Admin account cannot be edited");
    }
    // Same reason as createAdminAccount: no global ValidationPipe enforces the DTO's enum.
    if ((dto.role as string) === "super_admin") {
      throw new ForbiddenException("A new Super Admin cannot be assigned this way");
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.email) updateData.email = dto.email;
    if (dto.role) updateData.roles = [dto.role];
    if (dto.permissions) updateData.permissions = this.sanitizePermissions(dto.permissions);

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
      );
    }

    return { message: "Admin account updated successfully", data: updatedUser.toJSON() };
  }

  async resetAdminPassword(userId: string, dto: ResetAdminPasswordDto) {
    const existingUser = await this.userModel.findById(userId);
    if (!existingUser) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
      );
    }
    if (existingUser.roles?.includes("super_admin")) {
      throw new ForbiddenException("The Super Admin account's password cannot be reset this way");
    }

    // Same reason as createAdminAccount: no global ValidationPipe enforces the DTO's decorators.
    const trimmed = dto.newPassword?.trim();
    if (trimmed && trimmed.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long");
    }

    const newPassword = trimmed || this.generateRandomPassword();
    const hashedPassword = await this.hashPassword(newPassword);

    await this.userModel
      .findByIdAndUpdate(userId, { $set: { password: hashedPassword } }, { new: true })
      .exec();

    return {
      message: "Password updated successfully",
      data: { generatedPassword: newPassword },
    };
  }

  /** Moderator accounts — the pool of members Admin/Super Admin can assign tasks to. */
  async getMembers() {
    return this.userModel
      .find({ roles: { $in: ["moderator"] } })
      .select("_id name email roles image createdAt")
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  /** Validates that every id belongs to an existing moderator account; returns them as ObjectIds. */
  async assertMemberIds(ids: string[]): Promise<Types.ObjectId[]> {
    const uniqueIds = Array.from(new Set(ids));
    const invalidId = uniqueIds.find((id) => !Types.ObjectId.isValid(id));
    if (invalidId) {
      throw new BadRequestException(`Invalid user id: ${invalidId}`);
    }

    const users = await this.userModel
      .find({ _id: { $in: uniqueIds }, roles: { $in: ["moderator"] } })
      .select("_id")
      .lean()
      .exec();

    if (users.length !== uniqueIds.length) {
      throw new BadRequestException("One or more accounts are not valid member accounts");
    }

    return uniqueIds.map((id) => new Types.ObjectId(id));
  }
}
