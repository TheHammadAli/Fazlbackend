import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  Req,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Request } from "express";

import { BroadcastService } from "./broadcast.service";
import { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import { SendBroadcastMessageDto } from "./dto/send-broadcast.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";

// ✅ import your guard
import { JwtAuthGuard } from "../auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "../auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
import { ActivityLogService } from "src/activity-log/activity-log.service";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { FileUploadService } from "src/common/file-upload/file-upload.service";

@ApiTags("Broadcast")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard) // 🔥 protects ALL routes in controller
@Controller("broadcast")
export class BroadcastController {
  constructor(
    private readonly broadcastService: BroadcastService,
    private readonly fileUploadService: FileUploadService,
    private readonly activityLogService: ActivityLogService,
  ) { }

  // 🚀 Create broadcast
  @Post("/create")
  @ApiOperation({ summary: "Create broadcast and dispatch sellers" })
  @ApiConsumes("application/json", "multipart/form-data")
  @ApiBody({ type: CreateBroadcastDto })
  @UseInterceptors(FilesInterceptor("files", 5))
  async createBroadcast(
    @Body() dto: CreateBroadcastDto,
    @Req() req: Request,
    @UploadedFiles() files?: Express.Multer.File[], // Grab the file
  ) {
    const user = req.user as {
      sub: string;
      location: { type: string; coordinates: [number, number] };
    };

    const buyerId = user.sub;
    let location = user.location;
    if (dto.location) {
      location = typeof dto.location === "string"
        ? JSON.parse(dto.location)
        : dto.location;
    }


    let imageUrls: string[] = [];

    console.log("Received files for broadcast:", files);
    // Upload to S3 if a file exists
    if (files?.length) {
      imageUrls = await Promise.all(
        files.map((file) =>
          this.fileUploadService.uploadBroadcastImage(buyerId, file),
        ),
      );
    }

    console.log("Final image URLs for broadcast:", imageUrls);
    // Pass imageUrl to your service
    return this.broadcastService.createBroadcastAndDispatch(
      dto,
      buyerId,
      location,
      imageUrls, // Ensure your service method is updated to accept this
    );
  }

  // 💬 Send message in broadcast thread
  @Post("/message/:id")
  @ApiOperation({ summary: "Send message in broadcast thread" })
  @ApiParam({ name: "id", description: "Broadcast ID" })
  @ApiConsumes("application/json", "multipart/form-data") // Allow file upload in Swagger
  @UseInterceptors(FileInterceptor("file"))
  async sendMessage(
    @Param("id") broadcastId: string,
    @Body() dto: SendBroadcastMessageDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = req.user as { sub: string };
    const senderId = user.sub;
    const lang = (req.headers["accept-language"] || "en").split(",")[0];

    let imageUrl: string | undefined;

    if (file) {
      // We use the threadId from the DTO to organize the file path
      imageUrl = await this.fileUploadService.uploadBroadcastThreadImage(
        dto.threadId,
        file,
      );
    }

    return this.broadcastService.sendBroadcastMessage(
      broadcastId,
      senderId,
      dto.receiverId,
      dto.threadId,
      dto.message,
      imageUrl, // Pass the new URL to your service
    );
  }

  // 📥 Get all threads
  @Get("threads/:id")
  @ApiOperation({ summary: "Get all threads for a broadcast" })
  async getThreads(@Param("id") broadcastId: string) {
    return this.broadcastService.getBroadcastThreads(broadcastId);
  }

  // 💬 Get messages in thread
  @Get(":id/threads/:threadId")
  @ApiOperation({ summary: "Get messages for a thread" })
  async getThreadMessages(
    @Param("id") broadcastId: string,
    @Param("threadId") threadId: string,
  ) {
    return this.broadcastService.getThreadMessages(threadId);
  }
  // 📤 Buyer broadcasts
  @Get("/my/broadcasts")
  @ApiOperation({ summary: "Get broadcasts created by logged-in user (buyer)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Paginated broadcasts created by buyer",
  })
  async getMyBroadcasts(
    @Req() req: Request,
    @Query() paginationDto: PaginationDto,
  ) {
    const user = req.user as { sub: string };
    return this.broadcastService.getBroadcastsByBuyer(
      user.sub,
      paginationDto.page,
      paginationDto.limit,
    );
  }

  // Seller broadcasts
  @Get("/my/received")
  @ApiOperation({ summary: "Get broadcasts where logged-in user is a seller" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Paginated broadcasts where user is seller",
  })
  async getReceivedBroadcasts(
    @Req() req: Request,
    @Query() paginationDto: PaginationDto,
  ) {
    const user = req.user as { sub: string };
    return this.broadcastService.getBroadcastsForSeller(
      user.sub,
      paginationDto.page,
      paginationDto.limit,
    );
  }

  // 🛠️ Admin: list all broadcasts with analytics
  @Get("admin/all")
  @UseGuards(PermissionsGuard)
  @RequirePermission("broadcasts")
  @ApiOperation({ summary: "Get all broadcasts across all users, with analytics (admin)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by buyer name or message text" })
  @ApiQuery({ name: "status", required: false, enum: ["open", "closed"] })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiResponse({ status: 200, description: "Paginated list of all broadcasts with view/response analytics" })
  async getAllBroadcastsForAdmin(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.broadcastService.getAllBroadcastsForAdmin(page, limit, search, status, startDate, endDate);
  }

  // 🛠️ Admin: get recipient sellers for a broadcast
  @Get("admin/:broadcastId/recipients")
  @UseGuards(PermissionsGuard)
  @RequirePermission("broadcasts")
  @ApiOperation({ summary: "Get recipient sellers for a broadcast (admin)" })
  @ApiParam({ name: "broadcastId", required: true })
  @ApiResponse({ status: 200, description: "List of sellers who received this broadcast" })
  async getBroadcastRecipients(@Param("broadcastId") broadcastId: string) {
    return this.broadcastService.getBroadcastRecipients(broadcastId);
  }

  // 🛠️ Admin: close a broadcast
  @Patch("admin/:broadcastId/close")
  @UseGuards(PermissionsGuard)
  @RequirePermission("broadcasts")
  @RequireAction("edit")
  @ApiOperation({ summary: "Close a broadcast (admin)" })
  @ApiParam({ name: "broadcastId", required: true })
  async closeBroadcast(@Param("broadcastId") broadcastId: string) {
    return this.broadcastService.closeBroadcast(broadcastId);
  }

  // 🛠️ Admin: delete (soft) a broadcast
  @Delete("admin/:broadcastId")
  @UseGuards(PermissionsGuard)
  @RequirePermission("broadcasts")
  @RequireAction("delete")
  @ApiOperation({ summary: "Delete a broadcast (admin, soft delete)" })
  @ApiParam({ name: "broadcastId", required: true })
  async deleteBroadcast(
    @Param("broadcastId") broadcastId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.broadcastService.deleteBroadcast(broadcastId);
    await this.activityLogService.record(
      currentUser.sub,
      "broadcast_deleted",
      "Broadcast",
      broadcastId,
      result.data?.message,
      req.ip,
    );
    return result;
  }
}
