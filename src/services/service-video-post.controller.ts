import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
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
import { ServicesService } from "./services.service";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { JwtPayload } from "src/auth/strategies/jwt-strategy";

/** A service video post is a lightweight "just a video + caption" entry — no
 *  category/price to pick. It's stored as a Service under the hood (so it
 *  automatically shows up alongside a provider's real service), but exposed
 *  here through its own route rather than under `/services`, since
 *  conceptually it isn't one. Unlike a shop's video posts, a service is
 *  always owned by a user directly — no shop id in the path. */
@ApiTags("Video Posts")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("service-video-posts")
export class ServiceVideoPostController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: "Post a video as a service provider (just a video + caption)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Caption" },
        video: { type: "string", format: "binary" },
        taggedProductId: {
          type: "string",
          description: "Optional: id of one of this provider's own listings to tag",
        },
      },
    },
  })
  @UseInterceptors(FileFieldsInterceptor([{ name: "video", maxCount: 1 }]))
  async create(
    @CurrentUser() currentUser: JwtPayload,
    @Body("title") title: string,
    @Body("taggedProductId") taggedProductId: string,
    @UploadedFiles() files: { video?: Express.Multer.File[] },
  ) {
    return this.servicesService.create(currentUser.sub, {
      title,
      isVideoPost: true,
      images: [],
      video: files?.video?.[0] ?? null,
      taggedProductId: taggedProductId || undefined,
    });
  }

  @Get("mine")
  @ApiOperation({ summary: "Get my own posted videos (paginated)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMine(
    @CurrentUser() currentUser: JwtPayload,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.servicesService.getMyVideoPosts(currentUser.sub, paginationDto);
  }

  @Delete(":id")
  @ApiOperation({
    summary:
      "Delete a video from 'My Videos' — a video post is removed entirely; a real service just loses its video and stays listed",
  })
  @ApiParam({ name: "id", required: true })
  async delete(
    @Param("id") id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<{ message: string }> {
    await this.servicesService.deleteVideoPost(id, currentUser);
    return { message: "Video deleted successfully" };
  }
}
