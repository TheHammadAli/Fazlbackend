import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "src/auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { RespondReportDto } from "./dto/respond-report.dto";

@ApiTags("Reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("jwt")
  @ApiOperation({ summary: "Report a shop/listing/service (buyer)" })
  async create(
    @Body() dto: CreateReportDto,
    @CurrentUser("sub") userId: string,
  ) {
    return this.reportsService.createReport(userId, dto);
  }

  @Get("/mine")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("jwt")
  @ApiOperation({ summary: "My submitted reports (buyer)" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async getMine(
    @CurrentUser("sub") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.reportsService.getMyReports(userId, page, limit);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("jwt")
  @ApiOperation({
    summary: "Edit my own report — only while it's still open (buyer)",
  })
  async updateMine(
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
    @CurrentUser("sub") userId: string,
  ) {
    return this.reportsService.updateOwnReport(userId, id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("jwt")
  @ApiOperation({
    summary: "Delete my own report — only while it's still open (buyer)",
  })
  async deleteMine(
    @Param("id") id: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.reportsService.deleteOwnReport(userId, id);
  }

  @Get("/admin/all")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth("jwt")
  @RequirePermission("reports")
  @ApiOperation({
    summary: "All reports, filterable/searchable, for the admin Reports page",
  })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({
    name: "entityType",
    enum: ["shop", "product", "service", "user"],
    required: false,
  })
  @ApiQuery({ name: "status", enum: ["open", "closed"], required: false })
  @ApiQuery({ name: "reason", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  async getAllForAdmin(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("entityType") entityType?: "shop" | "product" | "service" | "user",
    @Query("status") status?: "open" | "closed",
    @Query("reason") reason?: string,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getAllReportsForAdmin(
      page,
      limit,
      entityType,
      status,
      reason,
      search,
      startDate,
      endDate,
    );
  }

  @Patch("/admin/:id/close")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth("jwt")
  @RequirePermission("reports")
  @RequireAction("edit")
  @ApiOperation({
    summary: "Close a report without touching the reported content (admin)",
  })
  async close(@Param("id") id: string, @CurrentUser("sub") adminId: string) {
    return this.reportsService.closeReport(id, adminId);
  }

  @Patch("/admin/:id/remove-content")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth("jwt")
  @RequirePermission("reports")
  @RequireAction("edit")
  @ApiOperation({
    summary: "Mark the reported content removed and close the report (admin)",
  })
  async removeContent(
    @Param("id") id: string,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.reportsService.removeContent(id, adminId);
  }

  @Patch("/admin/:id/respond")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth("jwt")
  @RequirePermission("reports")
  @RequireAction("edit")
  @ApiOperation({
    summary: "Write a response on a report, visible to the reporter (admin)",
  })
  async respond(
    @Param("id") id: string,
    @Body() dto: RespondReportDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.reportsService.respondToReport(id, adminId, dto.response);
  }
}
