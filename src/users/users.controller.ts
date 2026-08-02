import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { ActivityLogService } from "src/activity-log/activity-log.service";
import { UsersService } from "./users.service";
import { CreateUpdateUserDto } from "./dto/create-update-User.dto";
import { CreateAdminAccountDto } from "./dto/create-admin-account.dto";
import { UpdateAdminAccountDto } from "./dto/update-admin-account.dto";
import { ResetAdminPasswordDto } from "./dto/reset-admin-password.dto";
import { CreateMemberDto } from "./dto/create-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { User } from "./schema/users.schema";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { RolesGuard } from "src/auth/guard/roles-guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { assertOwnerOrPermission } from "src/common/utils/permission.utils";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from "@nestjs/swagger";
import { Public } from "src/common/decorators/public.decorator";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { UpdateUserDto } from "./dto/update-user.dto";
import { create } from "domain";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";

@ApiTags("Users")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly activityLogService: ActivityLogService,
  ) { }

  @Public()
  @Post("createUser")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create a new user (public)" })
  @ApiBody({ type: CreateUpdateUserDto })
  @UseInterceptors(FileFieldsInterceptor([{ name: "image", maxCount: 1 }]))
  @ApiBearerAuth(undefined) // 👈 This hides the lock icon and Bearer field in Swagger
  async createUser(
    @Body() createUserDto: CreateUpdateUserDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
    },
  ) {
    if (files?.image && files.image.length > 0) {
      createUserDto.image = files.image[0];
    } else {
      createUserDto.image = null;
    }
    createUserDto.location = JSON.parse(
      createUserDto.location?.toString() || "{}",
    );
    const user = await this.usersService.createUser(createUserDto);
    if (!user) {
      throw new InternalServerErrorException();
    }
    return user;
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a user (protected; self, or requires 'users' permission for other accounts)" })
  @ApiParam({ name: "id", type: String })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileFieldsInterceptor([{ name: "image", maxCount: 1 }]))
  @ApiBody({ type: UpdateUserDto })
  async updateUser(
    @Param("id") userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
    },
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ): Promise<{ message: string; data: User }> {
    assertOwnerOrPermission(currentUser, userId, "users");
    if (files?.image && files.image.length > 0) {
      updateUserDto.image = files.image[0];
    }
    if (updateUserDto.location) {
      console.log("Location before parsing:", updateUserDto.location);
      updateUserDto.location = JSON.parse(
        updateUserDto.location?.toString() || "{}",
      );
    }
    const result = await this.usersService.updateUser(userId, updateUserDto);
    if (currentUser.sub !== userId) {
      await this.activityLogService.record(
        currentUser.sub,
        "user_updated",
        "User",
        userId,
        result.data?.name ?? result.data?.email,
        req.ip,
      );
    }
    return result;
  }

  @Get("detail/:id")
  @ApiOperation({ summary: "Get user detail by ID (protected)" })
  @ApiParam({ name: "id", type: String })
  async getUser(@Param("id") userId: string): Promise<User> {
    return this.usersService.findUserById(userId);
  }
  @Get("allUsers")
  @UseGuards(PermissionsGuard)
  @RequirePermission("users")
  @ApiOperation({ summary: "Get paginated list of all users with optional name/ID search and join-date range filter (protected)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by user name or userCode (partial, case-insensitive)" })
  @ApiQuery({ name: "startDate", required: false, type: String, description: "Filter by join date, inclusive lower bound (ISO date)" })
  @ApiQuery({ name: "endDate", required: false, type: String, description: "Filter by join date, inclusive upper bound (ISO date)" })
  async getAllUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usersService.getAllUsers({ page, limit, search, startDate, endDate });
  }

  @Post("register-fcm-token")
  @ApiOperation({ summary: "Post acmToken against user" })
  @ApiResponse({ status: 200, description: "FCM token saved successfully" })
  @ApiBody({
    schema: { properties: { token: { type: "string" } } },
    required: true,
  })
  async registerFcmToken(
    @CurrentUser() user: JwtPayload,
    @Body("token") token: string,
  ) {
    return this.usersService.saveFcmToken(user.sub, token);
  }

  @Delete(":id/deactivate")
  @ApiOperation({ summary: "Disable/Delete user account (protected; self, or requires 'users' permission for other accounts)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Account has been disabled successfully" })
  async disableAccount(
    @Param("id") userId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ): Promise<{ message: string; data: User }> {
    assertOwnerOrPermission(currentUser, userId, "users");
    const result = await this.usersService.disableAccount(userId);
    if (currentUser.sub !== userId) {
      await this.activityLogService.record(
        currentUser.sub,
        "user_suspended",
        "User",
        userId,
        result.data?.name ?? result.data?.email,
        req.ip,
      );
    }
    return result;
  }

  @Post(":id/reactivate")
  @UseGuards(PermissionsGuard)
  @RequirePermission("users")
  @ApiOperation({ summary: "Reactivate disabled user account (protected)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Account has been reactivated successfully" })
  async reactivateAccount(
    @Param("id") userId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ): Promise<{ message: string; data: User }> {
    const result = await this.usersService.reactivateAccount(userId);
    await this.activityLogService.record(
      currentUser.sub,
      "user_enabled",
      "User",
      userId,
      result.data?.name ?? result.data?.email,
      req.ip,
    );
    return result;
  }

  // --- Admin Management (super_admin only) ---

  @Get("admins")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Get paginated list of admin-panel accounts (super_admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by name or email" })
  async getAllAdminAccounts(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
  ) {
    return this.usersService.getAllAdminAccounts({ page, limit, search });
  }

  @Post("admins")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Create a new admin-panel account (super_admin only)" })
  @ApiBody({ type: CreateAdminAccountDto })
  async createAdminAccount(@Body() dto: CreateAdminAccountDto) {
    return this.usersService.createAdminAccount(dto);
  }

  @Patch("admins/:id")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Update an admin-panel account's name/email/role (super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateAdminAccountDto })
  async updateAdminAccount(
    @Param("id") id: string,
    @Body() dto: UpdateAdminAccountDto,
  ) {
    return this.usersService.updateAdminAccount(id, dto);
  }

  @Patch("admins/:id/disable")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Disable an admin-panel account (super_admin only)" })
  @ApiParam({ name: "id", type: String })
  async disableAdminAccount(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ): Promise<{ message: string; data: User }> {
    const target = await this.usersService.findUserById(id);
    if (target.roles?.includes("super_admin")) {
      throw new ForbiddenException("The Super Admin account cannot be disabled");
    }
    const result = await this.usersService.disableAccount(id);
    await this.activityLogService.record(
      currentUser.sub,
      "user_suspended",
      "User",
      id,
      result.data?.name ?? result.data?.email,
      req.ip,
    );
    return result;
  }

  @Patch("admins/:id/enable")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Re-enable a disabled admin-panel account (super_admin only)" })
  @ApiParam({ name: "id", type: String })
  async enableAdminAccount(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ): Promise<{ message: string; data: User }> {
    const result = await this.usersService.reactivateAccount(id);
    await this.activityLogService.record(
      currentUser.sub,
      "user_enabled",
      "User",
      id,
      result.data?.name ?? result.data?.email,
      req.ip,
    );
    return result;
  }

  @Patch("admins/:id/reset-password")
  @UseGuards(RolesGuard)
  @Roles("super_admin")
  @ApiOperation({ summary: "Update an admin-panel account's password (super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ResetAdminPasswordDto })
  async resetAdminPassword(
    @Param("id") id: string,
    @Body() dto: ResetAdminPasswordDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const target = await this.usersService.findUserById(id);
    const result = await this.usersService.resetAdminPassword(id, dto);
    await this.activityLogService.record(
      currentUser.sub,
      "admin_password_reset",
      "User",
      id,
      target?.name ?? target?.email,
      req.ip,
    );
    return result;
  }

  // --- Member Management (admin/super_admin) ---
  // Members (moderator accounts) are the pool of people tasks can be assigned to.
  // Distinct from Admin Management above, which is super_admin-only.

  @Get("members")
  @UseGuards(RolesGuard)
  @Roles("admin", "super_admin")
  @ApiOperation({ summary: "Get all members (admin/super_admin only)" })
  async getAllMembers() {
    return { data: await this.usersService.getMembers() };
  }

  @Post("members")
  @UseGuards(RolesGuard)
  @Roles("admin", "super_admin")
  @ApiOperation({ summary: "Create a new member account (admin/super_admin only)" })
  @ApiBody({ type: CreateMemberDto })
  async createMember(
    @Body() dto: CreateMemberDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.usersService.createMemberAccount(dto.name, dto.email);
    await this.activityLogService.record(
      currentUser.sub,
      "member_created",
      "User",
      result.data?._id?.toString(),
      result.data?.name,
      req.ip,
    );
    return result;
  }

  @Patch("members/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "super_admin")
  @ApiOperation({ summary: "Update a member account's name/email (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateMemberDto })
  async updateMember(
    @Param("id") id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.usersService.updateMemberAccount(id, dto.name, dto.email);
    await this.activityLogService.record(
      currentUser.sub,
      "member_updated",
      "User",
      id,
      result.data?.name,
      req.ip,
    );
    return result;
  }

  @Delete("members/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "super_admin")
  @ApiOperation({ summary: "Delete a member account (admin/super_admin only)" })
  @ApiParam({ name: "id", type: String })
  async deleteMember(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.usersService.deleteMemberAccount(id);
    await this.activityLogService.record(
      currentUser.sub,
      "member_deleted",
      "User",
      id,
      result.data?.name,
      req.ip,
    );
    return result;
  }
}
