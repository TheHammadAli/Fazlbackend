import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { RolesGuard } from "src/auth/guard/roles-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { JwtPayload } from "src/auth/strategies/jwt-strategy";
import { ActivityLogService } from "src/activity-log/activity-log.service";

import { AdminsService } from "./admins.service";
import { CreateAdminAccountDto } from "./dto/create-admin-account.dto";
import { UpdateAdminAccountDto } from "./dto/update-admin-account.dto";
import { ResetAdminPasswordDto } from "./dto/reset-admin-password.dto";
import { CreateMemberDto } from "./dto/create-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";

/**
 * Admin Management — super_admin only.
 *
 * These endpoints were `/users/admins` before staff were split out of the
 * `users` table. They now operate on the `admins` table and live under their own
 * path, since an admin is no longer a kind of user.
 */
@ApiTags("Admins")
@ApiBearerAuth()
@Controller("admins")
@UseGuards(JwtAuthGuard)
export class AdminsController {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Get paginated list of admin accounts (super_admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by name or email" })
  async getAllAdmins(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
  ) {
    return this.adminsService.getAllAdmins({ page, limit, search });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Create a new admin account (super_admin only)" })
  @ApiBody({ type: CreateAdminAccountDto })
  async createAdmin(
    @Body() dto: CreateAdminAccountDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminsService.createAdminAccount(dto, currentUser.sub);
    await this.activityLogService.record(
      currentUser,
      "member_created",
      "User",
      result.data?.id,
      result.data?.name,
      req.ip,
    );
    return result;
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Update an admin account's name/email/role (super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateAdminAccountDto })
  async updateAdmin(@Param("id") id: string, @Body() dto: UpdateAdminAccountDto) {
    return this.adminsService.updateAdminAccount(id, dto);
  }

  @Patch(":id/disable")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Disable an admin account (super_admin only)" })
  @ApiParam({ name: "id", type: String })
  async disableAdmin(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminsService.setAdminDisabled(id, true);
    await this.activityLogService.record(
      currentUser,
      "user_suspended",
      "User",
      id,
      result.data?.name ?? result.data?.email,
      req.ip,
    );
    return result;
  }

  @Patch(":id/enable")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Re-enable a disabled admin account (super_admin only)" })
  @ApiParam({ name: "id", type: String })
  async enableAdmin(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminsService.setAdminDisabled(id, false);
    await this.activityLogService.record(
      currentUser,
      "user_enabled",
      "User",
      id,
      result.data?.name ?? result.data?.email,
      req.ip,
    );
    return result;
  }

  @Patch(":id/reset-password")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Update an admin account's password (super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ResetAdminPasswordDto })
  async resetAdminPassword(
    @Param("id") id: string,
    @Body() dto: ResetAdminPasswordDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminsService.resetAdminPassword(id, dto);
    await this.activityLogService.record(
      currentUser,
      "admin_password_reset",
      "User",
      id,
      undefined,
      req.ip,
    );
    return result;
  }
}

/**
 * Member Management — admin/super_admin.
 *
 * Members are the pool of people tasks can be assigned to. Distinct from Admin
 * Management above, which is super_admin-only.
 */
@ApiTags("Members")
@ApiBearerAuth()
@Controller("members")
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Get()
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles("admin", "super_admin")
  @RequirePermission("members")
  @ApiOperation({ summary: "Get all members (admin/super_admin only)" })
  async getAllMembers() {
    return { data: await this.adminsService.getMembers() };
  }

  @Post()
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles("admin", "super_admin")
  @RequirePermission("members")
  @RequireAction("edit")
  @ApiOperation({ summary: "Create a new member account (admin/super_admin only)" })
  @ApiBody({ type: CreateMemberDto })
  async createMember(
    @Body() dto: CreateMemberDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminsService.createMemberAccount(
      dto.name,
      dto.email,
      currentUser.sub,
    );
    await this.activityLogService.record(
      currentUser,
      "member_created",
      "User",
      result.data?.id,
      result.data?.name,
      req.ip,
    );
    return result;
  }

  @Patch(":id")
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles("admin", "super_admin")
  @RequirePermission("members")
  @RequireAction("edit")
  @ApiOperation({ summary: "Update a member account's name/email (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateMemberDto })
  async updateMember(
    @Param("id") id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminsService.updateMemberAccount(id, dto.name, dto.email);
    await this.activityLogService.record(
      currentUser,
      "member_updated",
      "User",
      id,
      result.data?.name,
      req.ip,
    );
    return result;
  }

  @Delete(":id")
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles("admin", "super_admin")
  @RequirePermission("members")
  @RequireAction("delete")
  @ApiOperation({ summary: "Delete a member account (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  async deleteMember(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminsService.deleteMemberAccount(id);
    await this.activityLogService.record(
      currentUser,
      "member_deleted",
      "User",
      id,
      result.data?.name,
      req.ip,
    );
    return result;
  }

  @Patch(":id/reset-password")
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles("admin", "super_admin")
  @RequirePermission("members")
  @RequireAction("edit")
  @ApiOperation({ summary: "Update a member account's password (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ResetAdminPasswordDto })
  async resetMemberPassword(
    @Param("id") id: string,
    @Body() dto: ResetAdminPasswordDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminsService.resetMemberPassword(id, dto);
    await this.activityLogService.record(
      currentUser,
      "member_password_reset",
      "User",
      id,
      undefined,
      req.ip,
    );
    return result;
  }
}
