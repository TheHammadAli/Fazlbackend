import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";

import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "src/common/email-service/email-service";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { adminPermissionPage } from "src/common/utils/enum-wire.util";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { resolvePagination } from "src/common/utils/pagination.util";
import {
  ADMIN_ACTIONS,
  ADMIN_PERMISSIONS,
} from "src/common/constants/admin-permissions.constants";
import type { AdminPermissionPage, AdminRole, Prisma } from "../../generated/prisma/client";

import { adminPublicSelect, memberPublicSelect } from "./admin-select";
import { PermissionEntryDto } from "./dto/create-admin-account.dto";
import type { CreateAdminAccountDto } from "./dto/create-admin-account.dto";
import type { UpdateAdminAccountDto } from "./dto/update-admin-account.dto";
import type { ResetAdminPasswordDto } from "./dto/reset-admin-password.dto";
import type { UpdateOwnProfileDto } from "./dto/update-own-profile.dto";

/**
 * Staff accounts. Admins and members are separate tables from `users` — a
 * customer account can never grant panel access, and nothing here reads or
 * writes `users`.
 *
 * The API still speaks in a `roles` ARRAY (["admin"], ["moderator"], ...) even
 * though the database now stores a single `role` column on `admins` and no role
 * at all on `members`. That is deliberate: RolesGuard, PermissionsGuard and
 * every role check in the admin panel read `roles[]`, and keeping the wire shape
 * lets the split stay invisible above the service layer.
 */
@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    private readonly emailService: EmailService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private generateRandomPassword(): string {
    return crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "");
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  /** Atomically reserves the next sequential code (ADM-000007, MEM-000003). */
  private async nextCode(counterId: "adminCode" | "memberCode", prefix: string) {
    const counter = await this.prisma.counter.upsert({
      where: { id: counterId },
      create: { id: counterId, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `${prefix}-${String(counter.seq).padStart(6, "0")}`;
  }

  /**
   * The response shape the admin panel already consumes: `_id` alongside `id`,
   * a `roles` array rather than the scalar column, and permission pages back in
   * their wire spelling ("email-logs", not the email_logs identifier).
   */
  private toAdminApiShape<T extends Record<string, any>>(admin: T | null): any {
    if (!admin) return admin;
    const { permissions, role, ...rest } = admin as any;
    return {
      ...rest,
      _id: rest.id,
      role,
      roles: role ? [role] : [],
      permissions: (permissions ?? []).map((p: any) => ({
        page: adminPermissionPage.toWire(p.page),
        actions: p.actions,
      })),
    };
  }

  /** Members carry no permission matrix; their access is fixed to the task endpoints. */
  private toMemberApiShape<T extends Record<string, any>>(member: T | null): any {
    if (!member) return member;
    return {
      ...member,
      _id: member.id,
      roles: ["moderator"],
      permissions: [],
    };
  }

  /** No global ValidationPipe is registered in this app, so the DTO's decorators are
   *  documentation only — the page/action shape must be checked here before it is saved. */
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

  /** Replacing an admin's permissions means clearing and re-creating the rows. */
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

  private assertObjectId(id: string, label: string) {
    if (!isObjectIdLike(id)) {
      throw new BadRequestException(`Invalid ${label} id: ${id}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Admins
  // ---------------------------------------------------------------------------

  /**
   * Super Admin is a single, fixed, protected account and is never listed here —
   * the same rule the pre-split version applied.
   */
  async getAllAdmins(paginationDto: PaginationDto): Promise<PaginatedResponseDto<any>> {
    const { page: rawPage, limit: rawLimit, search } = paginationDto;
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);

    const where: Prisma.AdminWhereInput = {
      role: { in: ["admin", "subadmin"] },
    };

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const [admins, total] = await Promise.all([
      this.prisma.admin.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: adminPublicSelect,
      }),
      this.prisma.admin.count({ where }),
    ]);

    return {
      data: admins.map((a) => this.toAdminApiShape(a)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAdminAccount(dto: CreateAdminAccountDto, createdById?: string) {
    if ((dto.role as string) === "super_admin") {
      throw new ForbiddenException("A new Super Admin cannot be created this way");
    }

    const trimmedPassword = dto.password?.trim();
    if (trimmedPassword && trimmedPassword.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long");
    }

    const email = dto.email?.trim().toLowerCase();

    // Pre-split this branch existed to promote an existing customer account.
    // It no longer can: an admin is its own row, so a clash here is a clash
    // between two staff accounts and there is nothing to merge.
    const existing = await this.prisma.admin.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An admin account with this email already exists");
    }

    const password = trimmedPassword || this.generateRandomPassword();

    const saved = await this.prisma.admin.create({
      data: {
        id: generateObjectId(),
        adminCode: await this.nextCode("adminCode", "ADM"),
        name: dto.name,
        email,
        password: await this.hashPassword(password),
        role: dto.role as AdminRole,
        image: "default-avatar.png",
        ...(createdById ? { createdById } : {}),
        permissions: { create: this.permissionsWriteInput(dto.permissions).create },
      },
      select: adminPublicSelect,
    });

    this.sendStaffWelcomeEmail(saved.name, saved.email, password, "admin");

    return {
      message: "Admin account created successfully",
      data: { ...this.toAdminApiShape(saved), generatedPassword: password },
    };
  }

  async updateAdminAccount(id: string, dto: UpdateAdminAccountDto) {
    this.assertObjectId(id, "admin");
    const existing = await this.prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Admin account not found");
    }
    if (existing.role === "super_admin") {
      throw new ForbiddenException("The Super Admin account cannot be edited");
    }
    if ((dto.role as string) === "super_admin") {
      throw new ForbiddenException("A new Super Admin cannot be assigned this way");
    }

    const data: Prisma.AdminUpdateInput = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email.trim().toLowerCase();
    if (dto.role) data.role = dto.role as AdminRole;
    if (dto.permissions) data.permissions = this.permissionsWriteInput(dto.permissions);

    const updated = await this.prisma.admin.update({
      where: { id },
      data,
      select: adminPublicSelect,
    });

    return {
      message: "Admin account updated successfully",
      data: this.toAdminApiShape(updated),
    };
  }

  async setAdminDisabled(id: string, disabled: boolean) {
    this.assertObjectId(id, "admin");
    const existing = await this.prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Admin account not found");
    }
    if (existing.role === "super_admin") {
      throw new ForbiddenException("The Super Admin account cannot be disabled");
    }

    const updated = await this.prisma.admin.update({
      where: { id },
      // Disabling must also end the current session: the refresh token is what
      // would otherwise let an already-signed-in admin keep going.
      data: { isDisabled: disabled, ...(disabled ? { refreshToken: null } : {}) },
      select: adminPublicSelect,
    });

    return {
      message: disabled
        ? "Admin account disabled successfully"
        : "Admin account enabled successfully",
      data: this.toAdminApiShape(updated),
    };
  }

  async resetAdminPassword(id: string, dto: ResetAdminPasswordDto) {
    this.assertObjectId(id, "admin");
    const existing = await this.prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Admin account not found");
    }
    if (existing.role === "super_admin") {
      throw new ForbiddenException("The Super Admin account's password cannot be reset this way");
    }

    const trimmed = dto.newPassword?.trim();
    if (trimmed && trimmed.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long");
    }

    const newPassword = trimmed || this.generateRandomPassword();

    await this.prisma.admin.update({
      where: { id },
      data: { password: await this.hashPassword(newPassword), refreshToken: null },
    });

    this.sendStaffWelcomeEmail(existing.name, existing.email, newPassword, "admin");

    return {
      message: "Password updated successfully",
      data: { generatedPassword: newPassword },
    };
  }

  // ---------------------------------------------------------------------------
  // Members
  // ---------------------------------------------------------------------------

  /** The pool of members Admin/Super Admin can assign tasks to. */
  async getMembers() {
    const members = await this.prisma.member.findMany({
      select: memberPublicSelect,
      orderBy: { name: "asc" },
    });
    return members.map((m) => this.toMemberApiShape(m));
  }

  async createMemberAccount(name: string, email: string, createdById: string) {
    const normalizedEmail = email?.trim().toLowerCase();

    const existing = await this.prisma.member.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException(
        this.i18n.translate("auth.users.already_a_member", { lang: this.lang }),
      );
    }

    const password = this.generateRandomPassword();

    const saved = await this.prisma.member.create({
      data: {
        id: generateObjectId(),
        memberCode: await this.nextCode("memberCode", "MEM"),
        name,
        email: normalizedEmail,
        password: await this.hashPassword(password),
        image: "default-avatar.png",
        createdById,
      },
      select: memberPublicSelect,
    });

    this.sendStaffWelcomeEmail(saved.name, saved.email, password, "member");

    return {
      message: "Member created successfully",
      data: { ...this.toMemberApiShape(saved), generatedPassword: password },
    };
  }

  async updateMemberAccount(id: string, name?: string, email?: string) {
    this.assertObjectId(id, "member");
    const existing = await this.prisma.member.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Member not found");
    }

    const updated = await this.prisma.member.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email: email.trim().toLowerCase() } : {}),
      },
      select: memberPublicSelect,
    });

    return {
      message: "Member updated successfully",
      data: this.toMemberApiShape(updated),
    };
  }

  async resetMemberPassword(id: string, dto: ResetAdminPasswordDto) {
    this.assertObjectId(id, "member");
    const existing = await this.prisma.member.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Member not found");
    }

    const trimmed = dto.newPassword?.trim();
    if (trimmed && trimmed.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long");
    }

    const newPassword = trimmed || this.generateRandomPassword();

    await this.prisma.member.update({
      where: { id },
      data: { password: await this.hashPassword(newPassword), refreshToken: null },
    });

    this.sendStaffWelcomeEmail(existing.name, existing.email, newPassword, "member");

    return {
      message: "Password updated successfully",
      data: { generatedPassword: newPassword },
    };
  }

  async deleteMemberAccount(id: string) {
    this.assertObjectId(id, "member");
    const existing = await this.prisma.member.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Member not found");
    }

    // Task submissions and activity logs are Restrict, so a member who has done
    // work cannot be deleted outright without taking that history with them.
    // Disabling keeps the audit trail intact and is what "remove access" means.
    const [submissions, logs] = await Promise.all([
      this.prisma.taskSubmission.count({ where: { submittedById: id } }),
      this.prisma.activityLog.count({ where: { actorMemberId: id } }),
    ]);

    if (submissions > 0 || logs > 0) {
      const disabled = await this.prisma.member.update({
        where: { id },
        data: { isDisabled: true, refreshToken: null },
        select: memberPublicSelect,
      });
      return {
        message: "Member access removed successfully",
        data: this.toMemberApiShape(disabled),
      };
    }

    await this.prisma.member.delete({ where: { id } });

    return {
      message: "Member deleted successfully",
      data: { _id: existing.id, id: existing.id, name: existing.name },
    };
  }

  /** Validates that every id belongs to an existing member account; returns the ids. */
  async assertMemberIds(ids: string[]): Promise<string[]> {
    const uniqueIds = Array.from(new Set(ids));
    const invalidId = uniqueIds.find((id) => !isObjectIdLike(id));
    if (invalidId) {
      throw new BadRequestException(`Invalid member id: ${invalidId}`);
    }

    const members = await this.prisma.member.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });

    if (members.length !== uniqueIds.length) {
      throw new BadRequestException("One or more accounts are not valid member accounts");
    }

    return uniqueIds;
  }

  // ---------------------------------------------------------------------------
  // The signed-in staff member's own profile
  //
  // The panel used to read and write these through /users/:id, which stopped
  // resolving when staff left that table. Routed by the JWT principal rather
  // than an id in the URL, so one account can never edit another's profile.
  // ---------------------------------------------------------------------------

  async getOwnProfile(principal: "admin" | "member", id: string) {
    const found = await this.findStaffById(id);
    if (!found || found.principal !== principal) {
      throw new NotFoundException("Account not found");
    }
    return { data: found.staff };
  }

  async updateOwnProfile(
    principal: "admin" | "member",
    id: string,
    dto: UpdateOwnProfileDto,
  ) {
    // Empty strings clear the field rather than storing "", so removing a phone
    // number from the form actually removes it.
    const data: { phone?: string | null; address?: string | null } = {};
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.address !== undefined) data.address = dto.address.trim() || null;

    if (Object.keys(data).length === 0) {
      return this.getOwnProfile(principal, id);
    }

    if (principal === "admin") {
      const updated = await this.prisma.admin.update({
        where: { id },
        data,
        select: adminPublicSelect,
      });
      return { message: "Profile updated successfully", data: this.toAdminApiShape(updated) };
    }

    const updated = await this.prisma.member.update({
      where: { id },
      data,
      select: memberPublicSelect,
    });
    return { message: "Profile updated successfully", data: this.toMemberApiShape(updated) };
  }

  /**
   * Self-service "delete account" from the profile page. Disables rather than
   * deletes: task history, announcements and the audit trail are Restrict
   * relations, so a staff member who has done any work cannot be removed
   * without taking that history with them.
   */
  async deactivateOwnAccount(principal: "admin" | "member", id: string) {
    if (principal === "admin") {
      const admin = await this.prisma.admin.findUnique({ where: { id } });
      if (!admin) throw new NotFoundException("Account not found");
      if (admin.role === "super_admin") {
        // There is no endpoint that can create another one, so a super admin
        // disabling itself would lock everybody out of the panel for good.
        throw new ForbiddenException("The Super Admin account cannot be disabled");
      }
      await this.prisma.admin.update({
        where: { id },
        data: { isDisabled: true, refreshToken: null },
      });
    } else {
      const member = await this.prisma.member.findUnique({ where: { id } });
      if (!member) throw new NotFoundException("Account not found");
      await this.prisma.member.update({
        where: { id },
        data: { isDisabled: true, refreshToken: null },
      });
    }

    return { message: "Account disabled successfully", data: { id } };
  }

  // ---------------------------------------------------------------------------
  // Lookups used by the auth flow
  // ---------------------------------------------------------------------------

  /**
   * Resolves a staff principal by id, whichever table it lives in. Used to
   * rebuild a JWT payload on refresh.
   */
  async findStaffById(id: string) {
    if (!isObjectIdLike(id)) return null;

    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: { ...adminPublicSelect, refreshToken: true },
    });
    if (admin) {
      const { refreshToken, ...rest } = admin;
      return { principal: "admin" as const, refreshToken, staff: this.toAdminApiShape(rest) };
    }

    const member = await this.prisma.member.findUnique({
      where: { id },
      select: { ...memberPublicSelect, refreshToken: true },
    });
    if (member) {
      const { refreshToken, ...rest } = member;
      return { principal: "member" as const, refreshToken, staff: this.toMemberApiShape(rest) };
    }

    return null;
  }

  /**
   * Admin-panel login. Checks `admins` first, then `members` — the two tables
   * have separate unique email indexes, so the same address could in principle
   * exist in both; admin wins, being the higher-privileged account.
   */
  async validateStaffForLogin(email: string, password: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password) return null;

    const admin = await this.prisma.admin.findUnique({
      where: { email: normalizedEmail },
      select: { ...adminPublicSelect, password: true },
    });

    if (admin) {
      if (!(await bcrypt.compare(password, admin.password))) return null;
      const { password: _pw, ...rest } = admin;
      return { principal: "admin" as const, staff: this.toAdminApiShape(rest) };
    }

    const member = await this.prisma.member.findUnique({
      where: { email: normalizedEmail },
      select: { ...memberPublicSelect, password: true },
    });

    if (member) {
      if (!(await bcrypt.compare(password, member.password))) return null;
      const { password: _pw, ...rest } = member;
      return { principal: "member" as const, staff: this.toMemberApiShape(rest) };
    }

    return null;
  }

  async storeRefreshToken(
    principal: "admin" | "member",
    id: string,
    refreshToken: string | null,
  ) {
    if (principal === "admin") {
      await this.prisma.admin.update({ where: { id }, data: { refreshToken } });
    } else {
      await this.prisma.member.update({ where: { id }, data: { refreshToken } });
    }
  }

  // ---------------------------------------------------------------------------
  // Email
  // ---------------------------------------------------------------------------

  /** Fire-and-forget: account creation must succeed even when the mail provider is down. */
  private sendStaffWelcomeEmail(
    name: string,
    email: string,
    password: string,
    kind: "admin" | "member",
  ) {
    const loginUrl = `${process.env.ADMIN_PANEL_URL}/signin`;
    const label = kind === "admin" ? "admin" : "member";
    const html = `
      <h2>Your account has been created</h2>
      <p>Hi ${name},</p>
      <p>Your Fazl ${label} account has been created. You can log in with the credentials below:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
    `;
    this.emailService
      .sendEmail(email, "Your Fazl account has been created", html)
      .catch((err) => this.logger.error(`Staff welcome email to ${email} failed`, err));
  }
}
