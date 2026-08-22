import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ShareService } from "./share.service";
import { CreateShareDto } from "./dto/share.dto";
import { JwtAuthGuard } from "../auth/guard/jwt-auth-guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

@ApiTags("Shares")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("shares")
export class ShareController {
  constructor(private readonly shareService: ShareService) { }

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
