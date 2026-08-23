import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { WalletService } from "../wallet.service";
import { WithdrawalService } from "../withdrawal.service";
import { AdjustBalanceDto } from "../dto/adjust-balance.dto";
import { FreezeWalletDto } from "../dto/freeze-wallet.dto";

/** Same wallet system as WalletUserController — every method here is the identical
 *  WalletService code path with walletType:"merchant", satisfying spec §3's "same wallet
 *  system for both Merchants and Service Providers" requirement. */
@ApiTags("Wallet - Merchant Wallets")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("wallet")
@Controller("wallet/merchants")
export class WalletMerchantController {
  constructor(
    private readonly walletService: WalletService,
    private readonly withdrawalService: WithdrawalService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Search merchants/service providers with their wallet summary (admin)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  async search(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
  ) {
    return this.walletService.searchWallets("merchant", page, limit, search);
  }

  @Get(":merchantId")
  @ApiOperation({ summary: "Merchant wallet detail (admin)" })
  async getDetail(@Param("merchantId") merchantId: string) {
    return this.walletService.getWalletDetail(merchantId, "merchant");
  }

  @Get(":merchantId/ledger")
  @ApiOperation({ summary: "Paginated ledger for a merchant wallet (admin)" })
  async getLedger(
    @Param("merchantId") merchantId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.walletService.getLedger(merchantId, "merchant", page, limit);
  }

  @Get(":merchantId/withdrawals")
  @ApiOperation({ summary: "Withdrawal history for a merchant (admin)" })
  async getWithdrawals(
    @Param("merchantId") merchantId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.withdrawalService.getForMerchant(merchantId, page, limit);
  }

  @Post(":merchantId/add-balance")
  @RequireAction("edit")
  @ApiOperation({ summary: "Manually add balance to a merchant wallet — requires a reason (admin)" })
  async addBalance(
    @Param("merchantId") merchantId: string,
    @Body() dto: AdjustBalanceDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.walletService.addBalance(merchantId, "merchant", dto, adminId);
  }

  @Post(":merchantId/deduct-balance")
  @RequireAction("edit")
  @ApiOperation({ summary: "Manually deduct balance from a merchant wallet — requires a reason (admin)" })
  async deductBalance(
    @Param("merchantId") merchantId: string,
    @Body() dto: AdjustBalanceDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.walletService.deductBalance(merchantId, "merchant", dto, adminId);
  }

  @Post(":merchantId/freeze")
  @RequireAction("edit")
  @ApiOperation({ summary: "Freeze a merchant wallet (admin)" })
  async freeze(
    @Param("merchantId") merchantId: string,
    @Body() dto: FreezeWalletDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.walletService.freeze(merchantId, "merchant", dto, adminId);
  }

  @Post(":merchantId/unfreeze")
  @RequireAction("edit")
  @ApiOperation({ summary: "Unfreeze a merchant wallet (admin)" })
  async unfreeze(@Param("merchantId") merchantId: string, @CurrentUser("sub") adminId: string) {
    return this.walletService.unfreeze(merchantId, "merchant", adminId);
  }

  @Post(":merchantId/recalculate")
  @RequireAction("edit")
  @ApiOperation({ summary: "Recalculate a merchant wallet's balance from its ledger (admin)" })
  async recalculate(@Param("merchantId") merchantId: string, @CurrentUser("sub") adminId: string) {
    return this.walletService.recalculate(merchantId, "merchant", adminId);
  }
}
