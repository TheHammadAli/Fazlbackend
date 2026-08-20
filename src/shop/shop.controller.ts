import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Query,
} from "@nestjs/common";
import { ShopService } from "./shop.service";
import { CreateUpdateShopDto } from "./dto/create-update-shop.dto";
import { SearchNearbyShopDto } from "./dto/search-nearby-shop.dto";
import { JwtAuthGuard } from "../auth/guard/jwt-auth-guard";
import { PermissionsGuard } from "../auth/guard/permissions-guard";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { RequireAction } from "src/common/decorators/require-action.decorator";
import { ActivityLogService } from "src/activity-log/activity-log.service";
import { Request } from "express";
import { Types } from "mongoose";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Public } from "src/common/decorators/public.decorator";

@ApiTags("Shops")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("shops")
export class ShopController {
  constructor(
    private readonly shopService: ShopService,
    private readonly activityLogService: ActivityLogService,
  ) { }

  @Post("create")
  @ApiOperation({ summary: "Create a new shop" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileFieldsInterceptor([
    { name: "image", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]))
  @ApiBody({ type: CreateUpdateShopDto })
  async createShop(
    @Body() dto: CreateUpdateShopDto,
    @Req() req: Request,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
  ) {
    const user = req.user as { sub: string };
    if (files?.image && files.image.length > 0) {
      dto.image = files.image[0];
    }
    if (files?.banner && files.banner.length > 0) {
      dto.banner = files.banner[0];
    }
    if (dto.location && typeof dto.location === "string") {
      dto.location = JSON.parse(dto.location);
    }
    return this.shopService.createShop(new Types.ObjectId(user.sub), dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update existing shop by ID (own shop, or requires 'shops' edit permission for others)" })
  @ApiParam({ name: "id", type: String })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileFieldsInterceptor([
    { name: "image", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]))
  @ApiBody({ type: CreateUpdateShopDto })
  async updateShop(
    @Param("id") id: string,
    @Body() dto: CreateUpdateShopDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
    @CurrentUser() currentUser: JwtPayload,
  ) {
    if (files?.image && files.image.length > 0) {
      dto.image = files.image[0];
    }
    if (files?.banner && files.banner.length > 0) {
      dto.banner = files.banner[0];
    }
    if (dto.location && typeof dto.location === "string") {
      dto.location = JSON.parse(dto.location);
    }
    return this.shopService.updateShop(id, dto, currentUser);
  }

  @Public()
  @Get("detail/:id")
  @ApiOperation({ summary: "Get shop details by ID" })
  @ApiParam({ name: "id", type: String })
  async getShop(@Param("id") id: string) {
    return this.shopService.getShopById(id);
  }

  @Get("userShops")
  @ApiOperation({ summary: "Get all shops owned by current user" })
  async getMyShops(@CurrentUser() user: JwtPayload) {
    return this.shopService.getAllShopsByUser(user.sub);
  }

  @Get("admin/user/:userId")
  @UseGuards(PermissionsGuard)
  @RequirePermission("shops")
  @ApiOperation({ summary: "Get paginated shops owned by a specific user (admin, for User Profile modal)" })
  @ApiParam({ name: "userId", type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getShopsByUserForAdmin(
    @Param("userId") userId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 5,
  ) {
    return this.shopService.getAllShopsByUserPaginated(userId, { page, limit });
  }

  @Get("allShops")
  @UseGuards(PermissionsGuard)
  @RequirePermission("shops")
  @ApiOperation({ summary: "Get paginated list of all shops with optional title search (protected)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by shop title (partial, case-insensitive)" })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getAllShops(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.shopService.getAllShops({ page, limit, search, startDate, endDate });
  }

  @Public()
  @Get("search/nearby")
  @ApiOperation({ summary: "Search shops near a coordinate within a radius" })
  @ApiQuery({ name: "lat", required: true, type: Number })
  @ApiQuery({ name: "lng", required: true, type: Number })
  @ApiQuery({ name: "radius", required: true, type: Number, description: "Distance in kilometers" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Paginated list of nearby shops" })
  async searchNearbyShops(@Query() query: SearchNearbyShopDto) {
    const coordinates: [number, number] = [query.lng, query.lat];
    const radiusMeters = query.radius * 1000;
    return await this.shopService.findShopsNearLocationPaginated(
      coordinates,
      radiusMeters,
      { page: query.page, limit: query.limit },
    );
  }

  @Patch(":id/disable")
  @UseGuards(PermissionsGuard)
  @RequirePermission("shops")
  @RequireAction("edit")
  @ApiOperation({ summary: "Suspend a shop (admin)" })
  @ApiParam({ name: "id", type: String })
  async disableShop(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const shop = await this.shopService.setShopDisabled(id, true);
    await this.activityLogService.record(
      currentUser.sub,
      "shop_suspended",
      "Shop",
      id,
      shop.title,
    );
    return { message: "Shop suspended successfully", data: shop };
  }

  @Patch(":id/enable")
  @UseGuards(PermissionsGuard)
  @RequirePermission("shops")
  @RequireAction("edit")
  @ApiOperation({ summary: "Re-enable a suspended shop (admin)" })
  @ApiParam({ name: "id", type: String })
  async enableShop(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const shop = await this.shopService.setShopDisabled(id, false);
    await this.activityLogService.record(
      currentUser.sub,
      "shop_enabled",
      "Shop",
      id,
      shop.title,
    );
    return { message: "Shop enabled successfully", data: shop };
  }
}
