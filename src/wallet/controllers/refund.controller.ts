import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { RefundService } from "../refund.service";
import { CreateRefundDto, RejectRefundDto } from "../dto/create-refund.dto";

@ApiTags("Wallet - Refunds")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("wallet")
@Controller("wallet/refunds")
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Get()
  @ApiOperation({ summary: "Filterable refund list (admin)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "refundStatus", required: false, type: String })
  @ApiQuery({ name: "customerId", required: false, type: String })
  @ApiQuery({ name: "merchantId", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getList(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
    @Query("refundStatus") refundStatus?: string,
    @Query("customerId") customerId?: string,
    @Query("merchantId") merchantId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.refundService.getList(
      { search, refundStatus, customerId, merchantId, startDate, endDate },
      page,
      limit,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Refund detail (admin)" })
  async getDetail(@Param("id") id: string) {
    return this.refundService.getDetail(id);
  }

  @Post()
  @RequireAction("edit")
  @ApiOperation({ summary: "Create a pending refund against an original transaction (admin)" })
  async create(@Body() dto: CreateRefundDto, @CurrentUser("sub") adminId: string) {
    return this.refundService.create(dto, adminId);
  }

  @Patch(":id/complete")
  @RequireAction("edit")
  @ApiOperation({ summary: "Complete a pending refund — credits the customer wallet ledger (admin)" })
  async complete(@Param("id") id: string, @CurrentUser("sub") adminId: string) {
    return this.refundService.complete(id, adminId);
  }

  @Patch(":id/reject")
  @RequireAction("edit")
  @ApiOperation({ summary: "Reject a pending refund (admin)" })
  async reject(@Param("id") id: string, @Body() dto: RejectRefundDto, @CurrentUser("sub") adminId: string) {
    return this.refundService.reject(id, dto, adminId);
  }
}
