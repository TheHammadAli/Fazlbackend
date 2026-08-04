import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { RolesGuard } from "src/auth/guard/roles-guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { ActivityLogService } from "./activity-log.service";

@ApiTags("Activity Logs")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("activity-logs")
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @Roles("super_admin")
  @ApiOperation({ summary: "Get paginated admin activity logs (super_admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by actor name/email or details" })
  @ApiQuery({ name: "action", required: false, type: String })
  @ApiQuery({ name: "role", required: false, type: String, description: "Filter by actor role: super_admin or admin" })
  @ApiQuery({ name: "actorId", required: false, type: String, description: "Filter by a specific actor's user id" })
  async getAllActivityLogs(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
    @Query("action") action?: string,
    @Query("role") role?: string,
    @Query("actorId") actorId?: string,
  ) {
    return this.activityLogService.getAllActivityLogs(page, limit, search, action, role, actorId);
  }
}
