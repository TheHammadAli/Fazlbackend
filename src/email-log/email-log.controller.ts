import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { EmailLogService } from "./email-log.service";

@ApiTags("Email Logs")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("email-logs")
export class EmailLogController {
  constructor(private readonly emailLogService: EmailLogService) {}

  @Get("stats")
  @UseGuards(PermissionsGuard)
  @RequirePermission("email-logs")
  @ApiOperation({ summary: "Get per-event send counts for the Email Logs summary cards (admin only)" })
  async getStats() {
    return this.emailLogService.getStats();
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission("email-logs")
  @ApiOperation({ summary: "Get paginated log of every automatic email sent by the platform (admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by email id, recipient, or related record id" })
  @ApiQuery({ name: "eventType", required: false, type: String })
  @ApiQuery({ name: "deliveryStatus", required: false, type: String })
  async getAll(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
    @Query("eventType") eventType?: string,
    @Query("deliveryStatus") deliveryStatus?: string,
  ) {
    return this.emailLogService.getAll({ page, limit, search, eventType, deliveryStatus });
  }
}
