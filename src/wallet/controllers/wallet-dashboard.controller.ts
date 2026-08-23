import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { WalletService } from "../wallet.service";

@ApiTags("Wallet - Dashboard")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("wallet")
@Controller("wallet/dashboard")
export class WalletDashboardController {
  constructor(private readonly walletService: WalletService) {}

  @Get("stats")
  @ApiOperation({ summary: "12 wallet dashboard metrics (admin)" })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getStats(@Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    return this.walletService.getDashboardStats(startDate, endDate);
  }
}
