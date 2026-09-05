import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Request } from "express";
import { ProductsService } from "./products.service";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";

/** A shop video post is a lightweight "just a video + caption" entry — no
 *  category/price to pick. It's stored as a Product under the hood (so it
 *  automatically shows up in the existing product/video feed alongside real
 *  listings), but exposed here through its own route rather than under
 *  `/products`, since conceptually it isn't one. */
@ApiTags("Video Posts")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("video-posts")
export class VideoPostController {
  constructor(private readonly productsService: ProductsService) {}

  @Post(":shopId")
  @ApiOperation({ summary: "Post a video to a shop (just a video + caption, no category/price)" })
  @ApiConsumes("multipart/form-data")
  @ApiParam({ name: "shopId", required: true })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Caption" },
        video: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(FileFieldsInterceptor([{ name: "video", maxCount: 1 }]))
  async create(
    @Param("shopId") shopId: string,
    @Body("title") title: string,
    @UploadedFiles() files: { video?: Express.Multer.File[] },
  ) {
    return this.productsService.create(shopId, "shop", {
      title,
      isVideoPost: true,
      images: [],
      video: files?.video?.[0] ?? null,
    });
  }

  @Get("shop/:shopId")
  @ApiOperation({ summary: "Get a shop's own posted videos (paginated)" })
  @ApiParam({ name: "shopId", required: true })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getByShop(
    @Param("shopId") shopId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.productsService.getVideoPostsByShop(shopId, paginationDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a posted video" })
  @ApiParam({ name: "id", required: true })
  async delete(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    // Must actually be a video post — a real listing can't be deleted from here.
    await this.productsService.delete(id, currentUser, undefined, req.ip, true);
    return { message: "Video deleted successfully" };
  }
}
