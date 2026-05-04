import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ShopService } from "./shop.service";
import { CreateUpdateShopDto } from "./dto/create-update-shop.dto";
import { JwtAuthGuard } from "../auth/guard/jwt-auth-guard";
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
} from "@nestjs/swagger";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Public } from "src/common/decorators/public.decorator";

@ApiTags("Shops")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("shops")
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post("create")
  @ApiOperation({ summary: "Create a new shop" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileFieldsInterceptor([{ name: "image", maxCount: 1 }]))
  @ApiBody({ type: CreateUpdateShopDto })
  async createShop(
    @Body() dto: CreateUpdateShopDto,
    @Req() req: Request,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
    },
  ) {
    const user = req.user as { sub: string };
    if (files?.image && files.image.length > 0) {
      dto.image = files.image[0]; // Assuming the image is stored as a file object
    }
    if (dto.location) {
      dto.location = JSON.parse(dto.location?.toString() || "{}");
    }
    return this.shopService.createShop(new Types.ObjectId(user.sub), dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update existing shop by ID" })
  @ApiParam({ name: "id", type: String })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileFieldsInterceptor([{ name: "image", maxCount: 1 }]))
  @ApiBody({ type: CreateUpdateShopDto })
  async updateShop(
    @Param("id") id: string,
    @Body() dto: CreateUpdateShopDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
    },
  ) {
    if (files?.image && files.image.length > 0) {
      dto.image = files.image[0]; // Assuming the image is stored as a file object
    }
    if (dto.location) {
      dto.location = JSON.parse(dto.location?.toString() || "{}");
    }
    return this.shopService.updateShop(id, dto);
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
}
