import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { MerchantDealService } from "../merchant-deal.service";
import { UpdateMerchantDealDto } from "../dto/update-merchant-deal.dto";

@ApiTags("Wallet - Merchant Deals")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("wallet")
@Controller("wallet/merchant-deals")
export class MerchantDealController {
  constructor(private readonly merchantDealService: MerchantDealService) {}

  @Get(":merchantId")
  @ApiOperation({ summary: "Current + historical deal versions for a merchant (admin)" })
  async get(@Param("merchantId") merchantId: string) {
    return this.merchantDealService.getCurrentAndHistory(merchantId);
  }

  @Post(":merchantId")
  @RequireAction("edit")
  @ApiOperation({ summary: "Create a new deal version for a merchant (admin) — merchantDealPercent is server-computed" })
  async update(
    @Param("merchantId") merchantId: string,
    @Body() dto: UpdateMerchantDealDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.merchantDealService.updateDeal(merchantId, dto, adminId);
  }
}
