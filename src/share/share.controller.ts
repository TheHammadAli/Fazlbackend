import { Controller, Post, Get, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ShareService } from "./share.service";
import { CreateShareDto } from "./dto/share.dto";
import { JwtAuthGuard } from "../auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "../auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

@ApiTags("Shares")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("shares")
export class ShareController {
  constructor(private readonly shareService: ShareService) { }

  @Get("admin/:itemType/:itemId")
  @UseGuards(PermissionsGuard)
  @RequirePermission("feed")
  @ApiOperation({ summary: "Get the users who shared one item (admin)" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async getSharersForItem(
    @Param("itemType") itemType: "product" | "service",
    @Param("itemId") itemId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.shareService.getSharersForItem(itemId, itemType, page, limit);
  }

  @Post()
  @ApiOperation({ summary: "Record a share of a product or service (deduped per user)" })
  async trackShare(
    @CurrentUser("sub") userId: string,
    @Body() dto: CreateShareDto,
  ) {
    await this.shareService.trackShare(userId, dto);
    return { success: true };
  }
}
