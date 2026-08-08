import { Body, Controller, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";

import { AnnouncementService } from "./announcement.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
import { FileUploadService } from "src/common/file-upload/file-upload.service";

@ApiTags("Announcements")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("announcements")
export class AnnouncementController {
  constructor(
    private readonly announcementService: AnnouncementService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission("announcements")
  @RequireAction("edit")
  @ApiOperation({ summary: "Create an announcement as draft, scheduled, or sent now (admin only)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("image"))
  @ApiBody({ type: CreateAnnouncementDto })
  async create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() currentUser: JwtPayload,
    @UploadedFile() image?: any,
  ) {
    if (dto.targetAudience && typeof dto.targetAudience === "string") {
      dto.targetAudience = JSON.parse(dto.targetAudience);
    }
    if (image) {
      dto.image = await this.fileUploadService.uploadAnnouncementImage(image);
    }
    return this.announcementService.create(dto, currentUser.sub);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission("announcements")
  @ApiOperation({ summary: "Get paginated list of announcements (admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getAll(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.announcementService.getAll({ page, limit });
  }
}
