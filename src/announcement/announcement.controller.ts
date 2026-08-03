import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { AnnouncementService } from "./announcement.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";

@ApiTags("Announcements")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("announcements")
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission("announcements")
  @RequireAction("edit")
  @ApiOperation({ summary: "Send a new announcement to all users (admin only)" })
  @ApiBody({ type: CreateAnnouncementDto })
  async create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.announcementService.create(dto, currentUser.sub);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission("announcements")
  @ApiOperation({ summary: "Get paginated list of sent announcements (admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getAll(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.announcementService.getAll({ page, limit });
  }
}
