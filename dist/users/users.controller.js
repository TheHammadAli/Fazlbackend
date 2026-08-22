"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const activity_log_service_1 = require("../activity-log/activity-log.service");
const users_service_1 = require("./users.service");
const create_update_User_dto_1 = require("./dto/create-update-User.dto");
const create_admin_account_dto_1 = require("./dto/create-admin-account.dto");
const update_admin_account_dto_1 = require("./dto/update-admin-account.dto");
const reset_admin_password_dto_1 = require("./dto/reset-admin-password.dto");
const reset_member_password_dto_1 = require("./dto/reset-member-password.dto");
const create_member_dto_1 = require("./dto/create-member.dto");
const update_member_dto_1 = require("./dto/update-member.dto");
const jwt_auth_guard_1 = require("../auth/guard/jwt-auth-guard");
const roles_guard_1 = require("../auth/guard/roles-guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const permissions_guard_1 = require("../auth/guard/permissions-guard");
const require_permission_decorator_1 = require("../common/decorators/require-permission.decorator");
const require_action_decorator_1 = require("../common/decorators/require-action.decorator");
const permission_utils_1 = require("../common/utils/permission.utils");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const platform_express_1 = require("@nestjs/platform-express");
const update_user_dto_1 = require("./dto/update-user.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let UsersController = class UsersController {
    usersService;
    activityLogService;
    constructor(usersService, activityLogService) {
        this.usersService = usersService;
        this.activityLogService = activityLogService;
    }
    async createUser(createUserDto, files) {
        if (files?.image && files.image.length > 0) {
            createUserDto.image = files.image[0];
        }
        else {
            createUserDto.image = null;
        }
        createUserDto.location = JSON.parse(createUserDto.location?.toString() || "{}");
        const user = await this.usersService.createUser(createUserDto);
        if (!user) {
            throw new common_1.InternalServerErrorException();
        }
        return user;
    }
    async updateUser(userId, updateUserDto, files, currentUser, req) {
        (0, permission_utils_1.assertOwnerOrPermission)(currentUser, userId, "users", "edit");
        if (files?.image && files.image.length > 0) {
            updateUserDto.image = files.image[0];
        }
        if (updateUserDto.location) {
            console.log("Location before parsing:", updateUserDto.location);
            updateUserDto.location = JSON.parse(updateUserDto.location?.toString() || "{}");
        }
        const result = await this.usersService.updateUser(userId, updateUserDto);
        if (currentUser.sub !== userId) {
            await this.activityLogService.record(currentUser.sub, "user_updated", "User", userId, result.data?.name ?? result.data?.email, req.ip);
        }
        return result;
    }
    async getUser(userId) {
        return this.usersService.findUserById(userId);
    }
    async getUserStats(userId) {
        return this.usersService.getUserStats(userId);
    }
    async getAllUsers(page = 1, limit = 10, search, startDate, endDate) {
        return this.usersService.getAllUsers({ page, limit, search, startDate, endDate });
    }
    async registerFcmToken(user, token) {
        return this.usersService.saveFcmToken(user.sub, token);
    }
    async disableAccount(userId, currentUser, req) {
        (0, permission_utils_1.assertOwnerOrPermission)(currentUser, userId, "users", "delete");
        const result = await this.usersService.disableAccount(userId);
        if (currentUser.sub !== userId) {
            await this.activityLogService.record(currentUser.sub, "user_suspended", "User", userId, result.data?.name ?? result.data?.email, req.ip);
        }
        return result;
    }
    async reactivateAccount(userId, currentUser, req) {
        const result = await this.usersService.reactivateAccount(userId);
        await this.activityLogService.record(currentUser.sub, "user_enabled", "User", userId, result.data?.name ?? result.data?.email, req.ip);
        return result;
    }
    async getAllAdminAccounts(page = 1, limit = 10, search) {
        return this.usersService.getAllAdminAccounts({ page, limit, search });
    }
    async createAdminAccount(dto) {
        return this.usersService.createAdminAccount(dto);
    }
    async updateAdminAccount(id, dto) {
        return this.usersService.updateAdminAccount(id, dto);
    }
    async disableAdminAccount(id, currentUser, req) {
        const target = await this.usersService.findUserById(id);
        if (target.roles?.includes("super_admin")) {
            throw new common_1.ForbiddenException("The Super Admin account cannot be disabled");
        }
        const result = await this.usersService.disableAccount(id);
        await this.activityLogService.record(currentUser.sub, "user_suspended", "User", id, result.data?.name ?? result.data?.email, req.ip);
        return result;
    }
    async enableAdminAccount(id, currentUser, req) {
        const result = await this.usersService.reactivateAccount(id);
        await this.activityLogService.record(currentUser.sub, "user_enabled", "User", id, result.data?.name ?? result.data?.email, req.ip);
        return result;
    }
    async resetAdminPassword(id, dto, currentUser, req) {
        const target = await this.usersService.findUserById(id);
        const result = await this.usersService.resetAdminPassword(id, dto);
        await this.activityLogService.record(currentUser.sub, "admin_password_reset", "User", id, target?.name ?? target?.email, req.ip);
        return result;
    }
    async getAllMembers() {
        return { data: await this.usersService.getMembers() };
    }
    async createMember(dto, currentUser, req) {
        const result = await this.usersService.createMemberAccount(dto.name, dto.email);
        await this.activityLogService.record(currentUser.sub, "member_created", "User", result.data?._id?.toString(), result.data?.name, req.ip);
        return result;
    }
    async updateMember(id, dto, currentUser, req) {
        const result = await this.usersService.updateMemberAccount(id, dto.name, dto.email);
        await this.activityLogService.record(currentUser.sub, "member_updated", "User", id, result.data?.name, req.ip);
        return result;
    }
    async deleteMember(id, currentUser, req) {
        const result = await this.usersService.deleteMemberAccount(id);
        await this.activityLogService.record(currentUser.sub, "member_deleted", "User", id, result.data?.name, req.ip);
        return result;
    }
    async resetMemberPassword(id, dto, currentUser, req) {
        const target = await this.usersService.findUserById(id);
        const result = await this.usersService.resetMemberPassword(id, dto);
        await this.activityLogService.record(currentUser.sub, "member_password_reset", "User", id, target?.name ?? target?.email, req.ip);
        return result;
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)("createUser"),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiOperation)({ summary: "Create a new user (public)" }),
    (0, swagger_1.ApiBody)({ type: create_update_User_dto_1.CreateUpdateUserDto }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([{ name: "image", maxCount: 1 }])),
    (0, swagger_1.ApiBearerAuth)(undefined),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_update_User_dto_1.CreateUpdateUserDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createUser", null);
__decorate([
    (0, common_1.Put)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Update a user (protected; self, or requires 'users' permission for other accounts)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([{ name: "image", maxCount: 1 }])),
    (0, swagger_1.ApiBody)({ type: update_user_dto_1.UpdateUserDto }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Get)("detail/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get user detail by ID (protected)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUser", null);
__decorate([
    (0, common_1.Get)(":id/stats"),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("users"),
    (0, swagger_1.ApiOperation)({ summary: "Get aggregated activity counts for a user (admin, for User Profile modal)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserStats", null);
__decorate([
    (0, common_1.Get)("allUsers"),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("users"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated list of all users with optional name/email/phone/ID search and join-date range filter (protected)" }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "search", required: false, type: String, description: "Search by user name, email, phone, or userCode (partial, case-insensitive)" }),
    (0, swagger_1.ApiQuery)({ name: "startDate", required: false, type: String, description: "Filter by join date, inclusive lower bound (ISO date)" }),
    (0, swagger_1.ApiQuery)({ name: "endDate", required: false, type: String, description: "Filter by join date, inclusive upper bound (ISO date)" }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Post)("register-fcm-token"),
    (0, swagger_1.ApiOperation)({ summary: "Post acmToken against user" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "FCM token saved successfully" }),
    (0, swagger_1.ApiBody)({
        schema: { properties: { token: { type: "string" } } },
        required: true,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "registerFcmToken", null);
__decorate([
    (0, common_1.Delete)(":id/deactivate"),
    (0, swagger_1.ApiOperation)({ summary: "Disable/Delete user account (protected; self, or requires 'users' permission for other accounts)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Account has been disabled successfully" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "disableAccount", null);
__decorate([
    (0, common_1.Post)(":id/reactivate"),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permission_decorator_1.RequirePermission)("users"),
    (0, require_action_decorator_1.RequireAction)("edit"),
    (0, swagger_1.ApiOperation)({ summary: "Reactivate disabled user account (protected)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Account has been reactivated successfully" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "reactivateAccount", null);
__decorate([
    (0, common_1.Get)("admins"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("super_admin"),
    (0, swagger_1.ApiOperation)({ summary: "Get paginated list of admin-panel accounts (super_admin only)" }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: "search", required: false, type: String, description: "Search by name or email" }),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("limit")),
    __param(2, (0, common_1.Query)("search")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAllAdminAccounts", null);
__decorate([
    (0, common_1.Post)("admins"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("super_admin"),
    (0, swagger_1.ApiOperation)({ summary: "Create a new admin-panel account (super_admin only)" }),
    (0, swagger_1.ApiBody)({ type: create_admin_account_dto_1.CreateAdminAccountDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_admin_account_dto_1.CreateAdminAccountDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createAdminAccount", null);
__decorate([
    (0, common_1.Patch)("admins/:id"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("super_admin"),
    (0, swagger_1.ApiOperation)({ summary: "Update an admin-panel account's name/email/role (super_admin only)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    (0, swagger_1.ApiBody)({ type: update_admin_account_dto_1.UpdateAdminAccountDto }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_admin_account_dto_1.UpdateAdminAccountDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateAdminAccount", null);
__decorate([
    (0, common_1.Patch)("admins/:id/disable"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("super_admin"),
    (0, swagger_1.ApiOperation)({ summary: "Disable an admin-panel account (super_admin only)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "disableAdminAccount", null);
__decorate([
    (0, common_1.Patch)("admins/:id/enable"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("super_admin"),
    (0, swagger_1.ApiOperation)({ summary: "Re-enable a disabled admin-panel account (super_admin only)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "enableAdminAccount", null);
__decorate([
    (0, common_1.Patch)("admins/:id/reset-password"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("super_admin"),
    (0, swagger_1.ApiOperation)({ summary: "Update an admin-panel account's password (super_admin only)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    (0, swagger_1.ApiBody)({ type: reset_admin_password_dto_1.ResetAdminPasswordDto }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reset_admin_password_dto_1.ResetAdminPasswordDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetAdminPassword", null);
__decorate([
    (0, common_1.Get)("members"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)("admin", "super_admin"),
    (0, require_permission_decorator_1.RequirePermission)("members"),
    (0, swagger_1.ApiOperation)({ summary: "Get all members (admin/super_admin only)" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAllMembers", null);
__decorate([
    (0, common_1.Post)("members"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)("admin", "super_admin"),
    (0, require_permission_decorator_1.RequirePermission)("members"),
    (0, require_action_decorator_1.RequireAction)("edit"),
    (0, swagger_1.ApiOperation)({ summary: "Create a new member account (admin/super_admin only)" }),
    (0, swagger_1.ApiBody)({ type: create_member_dto_1.CreateMemberDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_member_dto_1.CreateMemberDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createMember", null);
__decorate([
    (0, common_1.Patch)("members/:id"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)("admin", "super_admin"),
    (0, require_permission_decorator_1.RequirePermission)("members"),
    (0, require_action_decorator_1.RequireAction)("edit"),
    (0, swagger_1.ApiOperation)({ summary: "Update a member account's name/email (admin/super_admin only)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    (0, swagger_1.ApiBody)({ type: update_member_dto_1.UpdateMemberDto }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_member_dto_1.UpdateMemberDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMember", null);
__decorate([
    (0, common_1.Delete)("members/:id"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)("admin", "super_admin"),
    (0, require_permission_decorator_1.RequirePermission)("members"),
    (0, require_action_decorator_1.RequireAction)("delete"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a member account (admin/super_admin only)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteMember", null);
__decorate([
    (0, common_1.Patch)("members/:id/reset-password"),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)("admin", "super_admin"),
    (0, require_permission_decorator_1.RequirePermission)("members"),
    (0, require_action_decorator_1.RequireAction)("edit"),
    (0, swagger_1.ApiOperation)({ summary: "Reset a member account's password (admin/super_admin only)" }),
    (0, swagger_1.ApiParam)({ name: "id", type: String }),
    (0, swagger_1.ApiBody)({ type: reset_member_password_dto_1.ResetMemberPasswordDto }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reset_member_password_dto_1.ResetMemberPasswordDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetMemberPassword", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)("Users"),
    (0, swagger_1.ApiBearerAuth)("jwt"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("users"),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        activity_log_service_1.ActivityLogService])
], UsersController);
//# sourceMappingURL=users.controller.js.map