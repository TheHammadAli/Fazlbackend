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
import { userPublicSelect } from "./user-select";
import {
  SELF_ASSIGNABLE_ROLES,
  USER_ROLES,
  stripUserSecrets,
  type User,
  type UserRole,
} from "./model/user.model";
import type { Prisma } from "../../generated/prisma/client";
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
    const { latitude, longitude, ...rest } = user as any;
    return {
      ...rest,
      _id: rest.id,
      location: toGeoJson(latitude, longitude),
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
      });

      if (createUserDto.image) {
        const imageUrl = await this.fileUploadService.uploadUserImage(
          userId,
          createUserDto.image,
        );
        const withImage = await this.prisma.user.update({
          where: { id: userId },
          data: { image: imageUrl },
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
    });
  }

  async findByResetToken(resetPasswordToken: string) {
    const result = await this.prisma.user.findFirst({
      where: { resetPasswordToken },
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

  /**
   * Main-app login only. The admin panel authenticates against `admins` /
   * `members` instead — see AdminsService.validateStaffForLogin. Since the
   * split there is no second password column here and no login context to
   * branch on: a customer row has exactly one credential, for the app.
   */
  async validateUserForLogin(email: string, password: string): Promise<any | false> {
    // Emails are stored trimmed + lowercased at signup — the lookup must match
    // that or any casing/whitespace difference at login silently fails here.
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user?.password) {
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



  /** Ids of all non-disabled users, optionally filtered by role. Empty/undefined roles = all users. */
  async getUserIdsByRoles(roles?: string[]): Promise<string[]> {
    // announcements.target_audience is a free-form String[], and staff roles
    // were removed from UserRole when admins/members moved to their own tables.
    // An announcement saved before that still carries e.g. "admin", which is no
    // longer a valid enum value and would make the query throw — so unknown
    // roles are dropped rather than passed through.
    const validRoles = (roles ?? []).filter((role): role is UserRole =>
      (USER_ROLES as readonly string[]).includes(role),
    );

    const users = await this.prisma.user.findMany({
      where: {
        isDisabled: false,
        ...(validRoles.length > 0 ? { roles: { hasSome: validRoles } } : {}),
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }













}
