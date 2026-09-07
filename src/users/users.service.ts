import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CreateUpdateUserDto } from "./dto/create-update-User.dto";
import { AppError } from "src/common/exceptions/app-error";
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
import { PrismaService } from "src/prisma/prisma.service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { toGeoJson, toLatLng } from "src/common/utils/geo.util";
import { adminPermissionPage } from "src/common/utils/enum-wire.util";
import { userPublicSelect } from "./user-select";
import {
  ADMIN_TIER_ROLES,
  SELF_ASSIGNABLE_ROLES,
  USER_PERMISSIONS_INCLUDE,
  stripUserSecrets,
  type User,
  type UserRole,
} from "./model/user.model";
import type {
  AdminPermissionPage,
  Prisma,
} from "../../generated/prisma/client";
import { resolvePagination } from "../common/utils/pagination.util";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
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
  ) {}

  private get lang(): string {
    return this.cls?.get("lang") ?? "en";
  }

  /**
   * Rebuilds the document shape callers expect: `location` as GeoJSON rather
   * than latitude/longitude columns, `permissions` flattened out of its
   * relation, and `_id` alongside `id`.
   */
  private toApiShape<T extends Record<string, any>>(user: T | null): any {
    if (!user) return user;
    const { latitude, longitude, permissions, ...rest } = user as any;
    return {
      ...rest,
      _id: rest.id,
      location: toGeoJson(latitude, longitude),
      permissions: (permissions ?? []).map((p: any) => ({
        page: adminPermissionPage.toWire(p.page),
        actions: p.actions,
      })),
    };
  }

  /** Atomically reserves the next sequential user code (e.g. USR-000135). */
  private async generateNextUserCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "userCode" },
      create: { id: "userCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `USR-${String(counter.seq).padStart(6, "0")}`;
  }

  async createUser(createUserDto: CreateUpdateUserDto) {
    try {
      const normalizedEmail = createUserDto.email?.trim().toLowerCase();
      const normalizedPhone = createUserDto.phone?.trim();

      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ],
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException(
          this.i18n.translate("auth.users.email_or_phone_already_registered", {
            lang: this.lang,
          }),
        );
      }

      const hashedPassword = await this.hashPassword(createUserDto.password);
      const userCode = await this.generateNextUserCode();
      const userId = generateObjectId();
      const { latitude, longitude } = toLatLng(createUserDto.location);

      const savedUser = await this.prisma.user.create({
        data: {
          id: userId,
          name: createUserDto.name ?? null,
          email: normalizedEmail,
          phone: normalizedPhone || null,
          password: hashedPassword,
          roles: (createUserDto.roles as UserRole[]) ?? ["buyer"],
          address: createUserDto.address ?? null,
          latitude,
          longitude,
          userCode,
          image: "default-avatar.png",
        },
        include: USER_PERMISSIONS_INCLUDE,
      });

      if (createUserDto.image) {
        const imageUrl = await this.fileUploadService.uploadUserImage(
          userId,
          createUserDto.image,
        );
        const withImage = await this.prisma.user.update({
          where: { id: userId },
          data: { image: imageUrl },
          include: USER_PERMISSIONS_INCLUDE,
        });
        return {
          message: this.i18n.translate("auth.users.created_success", { lang: this.lang }),
          data: this.toApiShape(stripUserSecrets(withImage)),
        };
      }

      return {
        message: this.i18n.translate("auth.users.created_success", { lang: this.lang }),
        data: this.toApiShape(stripUserSecrets(savedUser)),
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }

      // Postgres unique-violation, the equivalent of Mongo's duplicate-key 11000.
      if (err instanceof Error && "code" in err && (err as any).code === "P2002") {
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

  /**
   * Used by the auth flows, which need the password hash — so this deliberately
   * returns the full row. Callers must not hand it straight to a client.
   */
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: USER_PERMISSIONS_INCLUDE,
    });
  }

  async findByResetToken(resetPasswordToken: string) {
    const result = await this.prisma.user.findFirst({
      where: { resetPasswordToken },
      include: USER_PERMISSIONS_INCLUDE,
    });
    if (!result) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
      );
    }
    return result;
  }

  /**
   * Bypasses updateUser's generic "strip null/empty values" sanitizer — that
   * behavior is correct for self-service profile updates, but it silently
   * swallows the null writes needed here, leaving a used reset token/expiry
   * in place (and therefore reusable) until it naturally expires.
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { resetPasswordToken: null, resetPasswordExpires: null },
    });
  }

  async validateUserForLogin(
    email: string,
    password: string,
    loginContext: "web" | "admin" = "web",
  ): Promise<any | false> {
    // Emails are stored trimmed + lowercased at signup — the lookup must match
    // that or any casing/whitespace difference at login silently fails here.
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: USER_PERMISSIONS_INCLUDE,
    });
    if (!user) {
      return false;
    }

    // A user promoted to member gets a separate admin-panel password (memberPassword),
    // scoped to that context — their original `password` keeps working only on the main
    // app. Member-only accounts created fresh never have memberPassword, so "admin"
    // logins for them fall back to the single password they were created with.
    const passwordField =
      loginContext === "admin" && user.memberPassword ? user.memberPassword : user.password;

    if (!passwordField) {
      return false;
    }

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
        updateData.roles = rolesArray.filter((role) =>
          (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(role),
        ) as typeof updateData.roles;
        if (updateData.roles.length === 0) {
          delete updateData.roles;
        }
      }

      const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
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

      const sanitizedData: Record<string, any> = { ...updateData };

      Object.keys(sanitizedData).forEach((key) => {
        if (
          sanitizedData[key] === "" ||
          sanitizedData[key] === null ||
          typeof sanitizedData[key] === "undefined"
        ) {
          delete sanitizedData[key];
        }
      });

      const data: Prisma.UserUpdateInput = {};

      if (sanitizedData.name !== undefined) data.name = sanitizedData.name;
      if (sanitizedData.address !== undefined) data.address = sanitizedData.address;
      if (sanitizedData.roles !== undefined) data.roles = sanitizedData.roles as UserRole[];
      if (sanitizedData.refreshToken !== undefined) {
        data.refreshToken = sanitizedData.refreshToken;
      }
      if (sanitizedData.resetPasswordToken !== undefined) {
        data.resetPasswordToken = sanitizedData.resetPasswordToken;
      }
      if (sanitizedData.resetPasswordExpires !== undefined) {
        data.resetPasswordExpires = sanitizedData.resetPasswordExpires;
      }

      // Handle password hashing
      if (sanitizedData.password) {
        const salt = await bcrypt.genSalt();
        data.password = await bcrypt.hash(sanitizedData.password, salt);
      }

      const normalizedEmail = sanitizedData.email?.trim?.().toLowerCase();
      const normalizedPhone = sanitizedData.phone?.trim?.();

      if (normalizedEmail || normalizedPhone) {
        const duplicateUser = await this.prisma.user.findFirst({
          where: {
            id: { not: userId },
            OR: [
              ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
              ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
            ],
          },
          select: { id: true },
        });

        if (duplicateUser) {
          throw new ConflictException(
            this.i18n.translate("auth.users.email_or_phone_already_registered", {
              lang: this.lang,
            }),
          );
        }
      }

      if (normalizedEmail) data.email = normalizedEmail;
      if (normalizedPhone) data.phone = normalizedPhone;

      // Only overwrite the coordinates when a new location was actually sent;
      // otherwise the row keeps what it already had. The old code re-assigned
      // the existing location explicitly to achieve the same thing.
      if (sanitizedData.location) {
        const { latitude, longitude } = toLatLng(sanitizedData.location);
        data.latitude = latitude;
        data.longitude = longitude;
      }

      if (
        sanitizedData.image &&
        typeof sanitizedData.image === "object" &&
        "buffer" in sanitizedData.image &&
        "originalname" in sanitizedData.image
      ) {
        data.image = await this.fileUploadService.uploadUserImage(
          userId,
          sanitizedData.image,
        );
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data,
        include: USER_PERMISSIONS_INCLUDE,
      });

      return {
        message: this.i18n.translate("auth.users.updated_success", { lang: this.lang }),
        // The old code used findByIdAndUpdate WITHOUT { new: true }, so it
        // returned the pre-update document — every successful profile update
        // handed the client back its stale values. This returns the saved row.
        data: this.toApiShape(stripUserSecrets(updatedUser)),
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }

      if (err instanceof Error && "code" in err && (err as any).code === "P2002") {
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

  /** Returns the full row including refreshToken — auth flows only. */
  async findByIdWithToken(userId: string, lang: string = "en") {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_PERMISSIONS_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("users.user_not_found", { lang: this.lang }),
      );
    }

    return user;
  }

  async findUserById(userId: string, lang: string = "en") {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_PERMISSIONS_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang }),
      );
    }

    return this.toApiShape(stripUserSecrets(user));
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
  ): Promise<PaginatedResponseDto<any>> {
    const { page: rawPage, limit: rawLimit, search, startDate, endDate } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const where: Prisma.UserWhereInput = {};

    if (onlineOnly) {
      where.id = { in: this.presenceService.getAllOnlineUserIds() };
    }

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { userCode: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      where.createdAt = createdAt;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: limit, select: userPublicSelect }),
      this.prisma.user.count({ where }),
    ]);

    const onlineIds = this.presenceService.getOnlineUserIds(users.map((u) => u.id));
    const enrichedUsers = users.map((user) => ({
      ...this.toApiShape(user),
      isOnline: onlineIds.has(user.id),
      lastSeenAt: user.lastSeenAt ?? null,
    }));

    return {
      data: enrichedUsers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Cheap, side-channel field touched by the presence gateway — not part of the self-service update flow. */
  async touchLastSeen(userId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
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

    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, lastSeenAt: true },
    });

    return Object.fromEntries(rows.map((row) => [row.id, row.lastSeenAt ?? null]));
  }

  async getUserDetailForAdmin(userId: string) {
    const user = await this.findUserById(userId);
    return {
      ...user,
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
   * all the others, so only one device could receive pushes — hence adding to a
   * list rather than an assignment.
   *
   * The token is pulled off every *other* account first: an FCM token identifies
   * a device install, not a person, so when a second account signs in on that
   * device the token has to move rather than stay duplicated on both accounts
   * (which would send the first account's notifications to the new user).
   *
   * The array writes are raw SQL because Prisma's scalar-list API has `push`
   * but no add-if-absent and no remove — $addToSet and $pull have no direct
   * equivalent. Doing it in SQL keeps each write a single atomic statement
   * rather than a read-modify-write that could lose a concurrent registration.
   */
  async saveFcmToken(userId: string, token: string) {
    const trimmed = token?.trim();
    if (!trimmed) {
      throw new BadRequestException("FCM token is required.");
    }

    await this.prisma.$executeRaw`
      UPDATE users
      SET fcm_tokens = array_remove(fcm_tokens, ${trimmed})
      WHERE id <> ${userId} AND ${trimmed} = ANY(fcm_tokens)
    `;
    await this.prisma.user.updateMany({
      where: { id: { not: userId }, fcmToken: trimmed },
      data: { fcmToken: null },
    });

    await this.prisma.$executeRaw`
      UPDATE users
      SET fcm_tokens = array_append(fcm_tokens, ${trimmed})
      WHERE id = ${userId} AND NOT (${trimmed} = ANY(fcm_tokens))
    `;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });
    return user ? this.toApiShape(user) : null;
  }

  /**
   * Drops tokens FCM reported as permanently dead (app uninstalled, token
   * rotated, browser storage cleared) so the list doesn't grow without bound.
   */
  async removeFcmTokens(userId: string, tokens: string[]) {
    if (!tokens?.length) return;

    // Postgres has no multi-value array_remove, so the surviving elements are
    // rebuilt with a filtered unnest. COALESCE keeps an emptied list as '{}'
    // rather than NULL.
    await this.prisma.$executeRaw`
      UPDATE users
      SET fcm_tokens = COALESCE(
        (SELECT array_agg(t) FROM unnest(fcm_tokens) AS t WHERE t <> ALL(${tokens})),
        '{}'
      )
      WHERE id = ${userId}
    `;
    await this.prisma.user.updateMany({
      where: { id: userId, fcmToken: { in: tokens } },
      data: { fcmToken: null },
    });
  }

  async disableAccount(userId: string): Promise<{ message: string; data: User }> {
    return this.setAccountDisabled(userId, true);
  }

  async reactivateAccount(userId: string): Promise<{ message: string; data: User }> {
    return this.setAccountDisabled(userId, false);
  }

  /** disable/reactivate were byte-identical apart from the flag and the message. */
  private async setAccountDisabled(
    userId: string,
    disabled: boolean,
  ): Promise<{ message: string; data: User }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: userPublicSelect,
      });
      if (!user) {
        throw new NotFoundException(
          this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
        );
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { isDisabled: disabled },
      });

      // fetch all shops for user and cascade the flag to them and their products
      const shops = await this.shopService.getAllShopsByUser(userId);

      if (shops.length > 0) {
        const shopIds = shops.map((shop: any) => String(shop?.id ?? shop?._id));

        await Promise.all([
          this.shopService.setShopsDisabledBulk(shopIds, disabled),
          this.productsService.setProductsDisabledByShopsBulk(shopIds, disabled),
        ]);
      }

      await this.productsService.setProductsDisabledByUser(userId, disabled);
      await this.servicesService.setDisabledByOwner(userId, disabled);

      return {
        message: this.i18n.translate(
          disabled ? "auth.users.account_disabled" : "auth.users.account_reactivated",
          { lang: this.lang },
        ),
        data: this.toApiShape(user),
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
  ): Promise<PaginatedResponseDto<any>> {
    const { page: rawPage, limit: rawLimit, search } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    // Super Admin is a single, fixed, protected account — never listed here.
    const where: Prisma.UserWhereInput = {
      roles: { hasSome: ["admin", "moderator"] },
    };

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const [admins, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: userPublicSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: admins.map((a) => this.toApiShape(a)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Ids of all non-disabled users, optionally filtered by role. Empty/undefined roles = all users. */
  async getUserIdsByRoles(roles?: string[]): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        isDisabled: false,
        ...(roles && roles.length > 0
          ? { roles: { hasSome: roles as UserRole[] } }
          : {}),
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
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
        entry.actions.some(
          (action) => !ADMIN_ACTIONS.includes(action as (typeof ADMIN_ACTIONS)[number]),
        )
      ) {
        throw new BadRequestException(`Invalid permission actions for page: ${entry.page}`);
      }
    }
    return permissions;
  }

  /**
   * The embedded permissions array is now its own table, so replacing a user's
   * permissions means clearing and re-creating the rows. `page` also has to be
   * translated: "email-logs" is stored under the Prisma identifier email_logs.
   */
  private permissionsWriteInput(permissions?: PermissionEntryDto[]) {
    const clean = this.sanitizePermissions(permissions);
    return {
      deleteMany: {},
      create: clean.map((p) => ({
        page: adminPermissionPage.fromWire(p.page) as AdminPermissionPage,
        actions: p.actions as any,
      })),
    };
  }

  async createAdminAccount(dto: CreateAdminAccountDto) {
    // No global ValidationPipe is registered in this app, so class-validator decorators on the
    // DTO are documentation only, not enforcement — this must be checked explicitly at runtime.
    if ((dto.role as string) === "super_admin") {
      throw new ForbiddenException("A new Super Admin cannot be created this way");
    }

    const trimmedPassword = dto.password?.trim();
    if (trimmedPassword && trimmedPassword.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long");
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      // Already registered (a regular buyer/seller account, or already an admin/moderator
      // from an earlier attempt) — grant/refresh admin-panel access instead of blocking.
      // Separate admin-panel password so the two logins never collide: their original
      // password keeps working on the main app (loginContext "web"), this one only works
      // on the admin panel ("admin"), and it's whatever was entered on this form (or a
      // generated one, if left blank).
      const adminPassword = trimmedPassword || this.generateRandomPassword();
      const savedExistingUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          memberPassword: await this.hashPassword(adminPassword),
          roles: [...new Set([...(existingUser.roles ?? []), dto.role])] as UserRole[],
          permissions: this.permissionsWriteInput(dto.permissions),
        },
        include: USER_PERMISSIONS_INCLUDE,
      });

      this.sendMemberAddedEmail(
        savedExistingUser.name ?? "",
        savedExistingUser.email,
        adminPassword,
      );

      return {
        message: "Admin account created successfully",
        data: {
          ...this.toApiShape(stripUserSecrets(savedExistingUser)),
          generatedPassword: adminPassword,
        },
      };
    }

    const adminPassword = trimmedPassword || this.generateRandomPassword();
    const hashedPassword = await this.hashPassword(adminPassword);
    const userCode = await this.generateNextUserCode();

    const savedUser = await this.prisma.user.create({
      data: {
        id: generateObjectId(),
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        roles: [dto.role] as UserRole[],
        permissions: { create: this.permissionsWriteInput(dto.permissions).create },
        userCode,
        image: "default-avatar.png",
      },
      include: USER_PERMISSIONS_INCLUDE,
    });

    return {
      message: "Admin account created successfully",
      data: {
        ...this.toApiShape(stripUserSecrets(savedUser)),
        generatedPassword: adminPassword,
      },
    };
  }

  /** Creates a moderator account for use as a task-assignable member — callable by
   *  Admin/Super Admin (unlike createAdminAccount, which is super_admin only), since
   *  member management is a separate, less-privileged capability. */
  async createMemberAccount(name: string, email: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      if (existingUser.roles?.includes("moderator")) {
        throw new ConflictException(
          this.i18n.translate("auth.users.already_a_member", { lang: this.lang }),
        );
      }

      // Not a member yet, but already has a regular account (buyer/seller/etc.) —
      // add member access on top of it rather than creating a duplicate account.
      // They get a SEPARATE admin-panel password so the two logins never collide:
      // their original password keeps working on the main app (loginContext "web"),
      // this new one only works on the admin panel (loginContext "admin").
      const generatedMemberPassword = this.generateRandomPassword();
      const savedExistingUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          memberPassword: await this.hashPassword(generatedMemberPassword),
          roles: [...new Set([...(existingUser.roles ?? []), "moderator"])] as UserRole[],
        },
        include: USER_PERMISSIONS_INCLUDE,
      });

      this.sendMemberAddedEmail(
        savedExistingUser.name ?? "",
        savedExistingUser.email,
        generatedMemberPassword,
      );

      return {
        message: "Existing user added as a member successfully",
        data: {
          ...this.toApiShape(stripUserSecrets(savedExistingUser)),
          generatedPassword: generatedMemberPassword,
        },
      };
    }

    const generatedPassword = this.generateRandomPassword();
    const hashedPassword = await this.hashPassword(generatedPassword);
    const userCode = await this.generateNextUserCode();

    const savedUser = await this.prisma.user.create({
      data: {
        id: generateObjectId(),
        name,
        email,
        password: hashedPassword,
        roles: ["moderator"] as UserRole[],
        userCode,
        image: "default-avatar.png",
      },
      include: USER_PERMISSIONS_INCLUDE,
    });

    this.sendMemberWelcomeEmail(name, email, generatedPassword);

    return {
      message: "Member created successfully",
      data: {
        ...this.toApiShape(stripUserSecrets(savedUser)),
        generatedPassword,
      },
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
      .catch((err) => this.logger.error(`Member welcome email to ${email} failed`, err));
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
      .catch((err) => this.logger.error(`Member-added email to ${email} failed`, err));
  }

  async updateMemberAccount(userId: string, name?: string, email?: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser || !existingUser.roles?.includes("moderator")) {
      throw new NotFoundException("Member not found");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      },
      include: USER_PERMISSIONS_INCLUDE,
    });

    return {
      message: "Member updated successfully",
      data: this.toApiShape(stripUserSecrets(updatedUser)),
    };
  }

  async resetMemberPassword(userId: string, dto: ResetMemberPasswordDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
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

    await this.prisma.user.update({
      where: { id: userId },
      data: isDualPersona
        ? { memberPassword: hashedPassword }
        : { password: hashedPassword },
    });

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
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser || !existingUser.roles?.includes("moderator")) {
      throw new NotFoundException("Member not found");
    }

    const otherRoles = (existingUser.roles ?? []).filter((role) => role !== "moderator");

    if (otherRoles.length > 0) {
      // This account existed before it was made a member (buyer/seller/etc.) — removing
      // member access must only demote it, never delete the account those other roles rely on.
      await this.prisma.user.update({
        where: { id: userId },
        data: { roles: otherRoles, memberPassword: null },
      });

      return {
        message: "Member access removed successfully",
        data: { _id: existingUser.id, id: existingUser.id, name: existingUser.name },
      };
    }

    await this.prisma.user.delete({ where: { id: userId } });

    return {
      message: "Member deleted successfully",
      data: { _id: existingUser.id, id: existingUser.id, name: existingUser.name },
    };
  }

  async updateAdminAccount(userId: string, dto: UpdateAdminAccountDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
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

    const data: Prisma.UserUpdateInput = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.role) {
      // Replace only the admin-tier role (admin/subadmin/moderator) being reassigned here —
      // never drop the account's underlying buyer/seller roles, which this form doesn't
      // manage at all.
      const nonAdminRoles = (existingUser.roles ?? []).filter(
        (role) => !(ADMIN_TIER_ROLES as readonly string[]).includes(role),
      );
      data.roles = [...new Set([...nonAdminRoles, dto.role])] as UserRole[];
    }
    if (dto.permissions) {
      data.permissions = this.permissionsWriteInput(dto.permissions);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: USER_PERMISSIONS_INCLUDE,
    });

    return {
      message: "Admin account updated successfully",
      data: this.toApiShape(stripUserSecrets(updatedUser)),
    };
  }

  async resetAdminPassword(userId: string, dto: ResetAdminPasswordDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new NotFoundException(
        this.i18n.translate("auth.users.user_not_found", { lang: this.lang }),
      );
    }
    if (existingUser.roles?.includes("super_admin")) {
      throw new ForbiddenException(
        "The Super Admin account's password cannot be reset this way",
      );
    }

    // Same reason as createAdminAccount: no global ValidationPipe enforces the DTO's decorators.
    const trimmed = dto.newPassword?.trim();
    if (trimmed && trimmed.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long");
    }

    const newPassword = trimmed || this.generateRandomPassword();
    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      message: "Password updated successfully",
      data: { generatedPassword: newPassword },
    };
  }

  /** Moderator accounts — the pool of members Admin/Super Admin can assign tasks to. */
  async getMembers() {
    const members = await this.prisma.user.findMany({
      where: { roles: { has: "moderator" } },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        image: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
    return members.map((m) => ({ ...m, _id: m.id }));
  }

  /** Validates that every id belongs to an existing moderator account; returns the ids. */
  async assertMemberIds(ids: string[]): Promise<string[]> {
    const uniqueIds = Array.from(new Set(ids));
    const invalidId = uniqueIds.find((id) => !isObjectIdLike(id));
    if (invalidId) {
      throw new BadRequestException(`Invalid user id: ${invalidId}`);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, roles: { has: "moderator" } },
      select: { id: true },
    });

    if (users.length !== uniqueIds.length) {
      throw new BadRequestException("One or more accounts are not valid member accounts");
    }

    return uniqueIds;
  }
}
