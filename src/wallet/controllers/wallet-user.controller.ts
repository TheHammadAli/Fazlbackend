import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { WalletService } from "../wallet.service";
import { AdjustBalanceDto } from "../dto/adjust-balance.dto";
import { FreezeWalletDto } from "../dto/freeze-wallet.dto";

@ApiTags("Wallet - User Wallets")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("wallet")
@Controller("wallet/users")
export class WalletUserController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: "Search users with their wallet summary (admin)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  async search(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
  ) {
    return this.walletService.searchWallets("user", page, limit, search);
  }

  @Get(":userId")
  @ApiOperation({ summary: "User wallet detail (admin)" })
  async getDetail(@Param("userId") userId: string) {
    return this.walletService.getWalletDetail(userId, "user");
  }

  @Get(":userId/ledger")
  @ApiOperation({ summary: "Paginated ledger for a user wallet (admin)" })
  async getLedger(
    @Param("userId") userId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.walletService.getLedger(userId, "user", page, limit);
  }

  @Post(":userId/add-balance")
  @RequireAction("edit")
  @ApiOperation({ summary: "Manually add balance to a user wallet — requires a reason (admin)" })
  async addBalance(
    @Param("userId") userId: string,
    @Body() dto: AdjustBalanceDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.walletService.addBalance(userId, "user", dto, adminId);
  }

  @Post(":userId/deduct-balance")
  @RequireAction("edit")
  @ApiOperation({ summary: "Manually deduct balance from a user wallet — requires a reason (admin)" })
  async deductBalance(
    @Param("userId") userId: string,
    @Body() dto: AdjustBalanceDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.walletService.deductBalance(userId, "user", dto, adminId);
  }

  @Post(":userId/freeze")
  @RequireAction("edit")
  @ApiOperation({ summary: "Freeze a user wallet (admin)" })
  async freeze(
    @Param("userId") userId: string,
    @Body() dto: FreezeWalletDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.walletService.freeze(userId, "user", dto, adminId);
  }

  @Post(":userId/unfreeze")
  @RequireAction("edit")
  @ApiOperation({ summary: "Unfreeze a user wallet (admin)" })
  async unfreeze(@Param("userId") userId: string, @CurrentUser("sub") adminId: string) {
    return this.walletService.unfreeze(userId, "user", adminId);
  }

  @Post(":userId/recalculate")
  @RequireAction("edit")
  @ApiOperation({ summary: "Recalculate a user wallet's balance from its ledger (admin)" })
  async recalculate(@Param("userId") userId: string, @CurrentUser("sub") adminId: string) {
    return this.walletService.recalculate(userId, "user", adminId);
  }
}
