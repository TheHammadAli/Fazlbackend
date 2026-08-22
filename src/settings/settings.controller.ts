import { Controller, Get, Put, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { UpdateSocialLinksDto } from "./dto/update-social-links.dto";
import { JwtAuthGuard } from "../auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "../auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { Public } from "src/common/decorators/public.decorator";

@ApiTags("Settings")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Get("social-links")
  @Public()
  @ApiOperation({ summary: "Get social media links (public)" })
  async getSocialLinks() {
    return this.settingsService.getSocialLinks();
  }

  @Put("social-links")
  @UseGuards(PermissionsGuard)
  @RequirePermission("settings")
  @RequireAction("edit")
  @ApiOperation({ summary: "Update social media links (admin only)" })
  @ApiBody({ type: UpdateSocialLinksDto })
  async updateSocialLinks(@Body() dto: UpdateSocialLinksDto) {
    return this.settingsService.updateSocialLinks(dto);
  }
}
