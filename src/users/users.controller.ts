import {
  BadRequestException,
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
import type { User } from "./model/user.model";
import { UserModel } from "./model/user.model";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { RolesGuard } from "src/auth/guard/roles-guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
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
    assertOwnerOrPermission(currentUser, userId, "users", "edit");
    if (files?.image && files.image.length > 0) {
      updateUserDto.image = files.image[0];
    }
    if (updateUserDto.location) {
      updateUserDto.location = JSON.parse(
        updateUserDto.location?.toString() || "{}",
      );
    }
    const result = await this.usersService.updateUser(userId, updateUserDto);
    if (currentUser.sub !== userId) {
      await this.activityLogService.record(
        currentUser,
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
  async getUser(@Param("id") userId: string) {
    return this.usersService.getUserDetailForAdmin(userId);
  }
  @Get(":id/stats")
  @UseGuards(PermissionsGuard)
  @RequirePermission("users")
  @ApiOperation({ summary: "Get aggregated activity counts for a user (admin, for User Profile modal)" })
  @ApiParam({ name: "id", type: String })
  async getUserStats(@Param("id") userId: string) {
    return this.usersService.getUserStats(userId);
  }
  @Get("allUsers")
  @UseGuards(PermissionsGuard)
  @RequirePermission("users")
  @ApiOperation({ summary: "Get paginated list of all users with optional name/email/phone/ID search and join-date range filter (protected)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by user name, email, phone, or userCode (partial, case-insensitive)" })
  @ApiQuery({ name: "startDate", required: false, type: String, description: "Filter by join date, inclusive lower bound (ISO date)" })
  @ApiQuery({ name: "endDate", required: false, type: String, description: "Filter by join date, inclusive upper bound (ISO date)" })
  @ApiQuery({ name: "online", required: false, type: Boolean, description: "When true, only return users currently online" })
  async getAllUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('online') online?: string,
  ) {
    return this.usersService.getAllUsers({ page, limit, search, startDate, endDate }, online === "true");
  }

  @Get("online-count")
  @UseGuards(PermissionsGuard)
  @RequirePermission("users")
  @ApiOperation({ summary: "Get count of currently online users (protected)" })
  async getOnlineUsersCount() {
    return { count: this.usersService.getOnlineUsersCount() };
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

  @Post("unregister-fcm-token")
  @ApiOperation({
    summary: "Drop this device's FCM token when the user signs out",
  })
  @ApiResponse({ status: 200, description: "FCM token removed" })
  @ApiBody({
    schema: { properties: { token: { type: "string" } } },
    required: true,
  })
  async unregisterFcmToken(
    @CurrentUser() user: JwtPayload,
    @Body("token") token: string,
  ) {
    // Signing out has to take the device's token with it: the token outlives the
    // session, so leaving it attached means this user's notifications keep
    // arriving on a phone they have signed out of — and land in front of whoever
    // signs in next.
    const trimmed = token?.trim();
    if (!trimmed) {
      throw new BadRequestException("FCM token is required.");
    }

    await this.usersService.removeFcmTokens(user.sub, [trimmed]);
    return { message: "FCM token removed" };
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
    assertOwnerOrPermission(currentUser, userId, "users", "delete");
    const result = await this.usersService.disableAccount(userId);
    if (currentUser.sub !== userId) {
      await this.activityLogService.record(
        currentUser,
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
  @RequireAction("edit")
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
      currentUser,
      "user_enabled",
      "User",
      userId,
      result.data?.name ?? result.data?.email,
      req.ip,
    );
    return result;
  }
}
