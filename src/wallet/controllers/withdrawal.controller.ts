import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { WithdrawalService } from "../withdrawal.service";
import { CreateWithdrawalDto } from "../dto/create-withdrawal.dto";
import {
  CancelWithdrawalDto,
  CompleteWithdrawalDto,
  RejectWithdrawalDto,
} from "../dto/withdrawal-actions.dto";

@ApiTags("Wallet - Withdrawals")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("wallet")
@Controller("wallet/withdrawals")
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get()
  @ApiOperation({ summary: "Filterable withdrawal list (admin)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "merchantId", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getList(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("merchantId") merchantId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.withdrawalService.getList({ search, status, merchantId, startDate, endDate }, page, limit);
  }

  @Get(":id")
  @ApiOperation({ summary: "Withdrawal detail (admin)" })
  async getDetail(@Param("id") id: string) {
    return this.withdrawalService.getDetail(id);
  }

  @Post()
  @RequireAction("edit")
  @ApiOperation({ summary: "Record a withdrawal request on a merchant's behalf (admin)" })
  async create(@Body() dto: CreateWithdrawalDto, @CurrentUser("sub") adminId: string) {
    return this.withdrawalService.create(dto, adminId);
  }

  @Patch(":id/approve")
  @RequireAction("edit")
  @ApiOperation({ summary: "Approve a pending withdrawal (admin)" })
  async approve(@Param("id") id: string, @CurrentUser("sub") adminId: string) {
    return this.withdrawalService.approve(id, adminId);
  }

  @Patch(":id/reject")
  @RequireAction("edit")
  @ApiOperation({ summary: "Reject a pending/approved withdrawal (admin)" })
  async reject(@Param("id") id: string, @Body() dto: RejectWithdrawalDto, @CurrentUser("sub") adminId: string) {
    return this.withdrawalService.reject(id, dto, adminId);
  }

  @Patch(":id/processing")
  @RequireAction("edit")
  @ApiOperation({ summary: "Move an approved withdrawal to processing (admin)" })
  async markProcessing(@Param("id") id: string, @CurrentUser("sub") adminId: string) {
    return this.withdrawalService.markProcessing(id, adminId);
  }

  @Patch(":id/complete")
  @RequireAction("edit")
  @ApiOperation({ summary: "Complete a withdrawal — debits the merchant wallet ledger (admin)" })
  async complete(
    @Param("id") id: string,
    @Body() dto: CompleteWithdrawalDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.withdrawalService.complete(id, dto, adminId);
  }

  @Patch(":id/cancel")
  @RequireAction("edit")
  @ApiOperation({ summary: "Cancel a withdrawal before it completes (admin)" })
  async cancel(@Param("id") id: string, @Body() dto: CancelWithdrawalDto, @CurrentUser("sub") adminId: string) {
    return this.withdrawalService.cancel(id, dto, adminId);
  }
}
