import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { WalletTransactionService } from "../wallet-transaction.service";

@ApiTags("Wallet - Transactions")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("wallet")
@Controller("wallet/transactions")
export class WalletTransactionController {
  constructor(private readonly transactionService: WalletTransactionService) {}

  @Get()
  @ApiOperation({ summary: "Searchable/filterable wallet transaction list (admin)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "paymentMethod", required: false, type: String })
  @ApiQuery({ name: "userId", required: false, type: String })
  @ApiQuery({ name: "merchantId", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getList(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("paymentMethod") paymentMethod?: string,
    @Query("userId") userId?: string,
    @Query("merchantId") merchantId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.transactionService.getList(
      { search, status, paymentMethod, userId, merchantId, startDate, endDate },
      page,
      limit,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Transaction detail including linked ledger entries (admin)" })
  async getDetail(@Param("id") id: string) {
    return this.transactionService.getDetail(id);
  }
}
