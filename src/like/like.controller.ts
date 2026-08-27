import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { LikeService } from "./like.service";
import { CreateLikeDto, RemoveLikeDto } from "./dto/like.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "../auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

@ApiTags("Likes")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("likes")
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  // Declared before "admin/:itemType/:itemId" — otherwise that route would
  // greedily match this path too (itemType="total-count").
  @Get("admin/total-count")
  @UseGuards(PermissionsGuard)
  @RequirePermission("feed")
  @ApiOperation({ summary: "Get the total like count across all products and services (admin)" })
  async getTotalLikeCount() {
    return { data: await this.likeService.getTotalLikeCount() };
  }

  @Get("admin/:itemType/:itemId")
  @UseGuards(PermissionsGuard)
  @RequirePermission("feed")
  @ApiOperation({ summary: "Get the users who liked one item (admin)" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async getLikersForItem(
    @Param("itemType") itemType: "product" | "service",
    @Param("itemId") itemId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.likeService.getLikersForItem(itemId, itemType, page, limit);
  }

  @Post()
  @ApiOperation({ summary: "Like a product or service" })
  @ApiResponse({ status: 201, description: "Item liked" })
  async addLike(
    @CurrentUser("sub") userId: string,
    @Body() dto: CreateLikeDto,
  ) {
    return this.likeService.addLike(userId, dto);
  }

  @Delete()
  @ApiOperation({ summary: "Unlike a product or service" })
  @ApiResponse({ status: 200, description: "Item unliked" })
  async removeLike(
    @CurrentUser("sub") userId: string,
    @Body() dto: RemoveLikeDto,
  ) {
    return this.likeService.removeLike(userId, dto);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Get liked items by user" })
  @ApiQuery({ name: "itemType", required: false, enum: ["product", "service"] })
  async getLikesByUser(
    @Param("userId") userId: string,
    @Query("itemType") itemType?: "product" | "service",
  ) {
    return this.likeService.getLikesByUser(userId, itemType);
  }
}
