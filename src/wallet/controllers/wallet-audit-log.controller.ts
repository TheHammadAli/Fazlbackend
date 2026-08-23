import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { WalletAuditLogService } from "../wallet-audit-log.service";

@ApiTags("Wallet - Audit Log")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission("wallet")
@Controller("wallet/audit-log")
export class WalletAuditLogController {
  constructor(private readonly auditLogService: WalletAuditLogService) {}

  @Get()
  @ApiOperation({ summary: "Every wallet admin action, with old/new values and reason (admin)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "adminId", required: false, type: String })
  @ApiQuery({ name: "action", required: false, type: String })
  @ApiQuery({ name: "targetType", required: false, type: String })
  @ApiQuery({ name: "subjectUserId", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getAll(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("adminId") adminId?: string,
    @Query("action") action?: string,
    @Query("targetType") targetType?: string,
    @Query("subjectUserId") subjectUserId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.auditLogService.getAll(page, limit, {
      adminId,
      action,
      targetType,
      subjectUserId,
      startDate,
      endDate,
    });
  }
}
