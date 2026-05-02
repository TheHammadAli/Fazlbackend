import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
  Patch,
  Req,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from "@nestjs/common";
import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { Request } from "express";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { CreateRequestDto } from "./dto/create-request-dto";
import { UpdateRequestStatusDto } from "./dto/update-request-dto";
import { UpdateJobStatusDto } from "./dto/update-job-dto";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

@ApiTags("Services")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post("create-request")
  @ApiOperation({ summary: "Create a new service request" })
  @ApiBody({ type: CreateRequestDto })
  createRequest(@Body() dto: CreateRequestDto) {
    return this.servicesService.createServiceRequest(dto);
  }

  @Patch("status")
  @ApiOperation({
    summary:
      "Update the status of a request (accept, reject, cancel, confirm, propose)",
  })
  @ApiBody({ type: UpdateRequestStatusDto })
  updateStatus(@Body() dto: UpdateRequestStatusDto) {
    return this.servicesService.updateRequestStatus(dto);
  }

  @Patch("job-status")
  @ApiOperation({
    summary: "Update the job status of a request (start_job, complete_job)",
  })
  @ApiBody({ type: UpdateJobStatusDto })
  updateJobStatus(@Body() dto: UpdateJobStatusDto) {
    return this.servicesService.updateJobStatus(dto);
  }

  @Post("create")
  @ApiOperation({ summary: "Create a new service for a user" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "images", maxCount: 5 },
      { name: "video", maxCount: 1 },
    ]),
  )
  @ApiBody({ type: CreateServiceDto })
  @ApiResponse({ status: 201, description: "Service created successfully" })
  async create(
    @Req() req: Request,
    @Body() dto: CreateServiceDto,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) {
    const user = req.user as { sub: string };
    if (files?.images && files.images.length > 0) {
      dto.images = files.images; // Assuming images are stored as file objects
    } else {
      dto.images = []; // Ensure images is always an array
    }
    if (files?.video && files.video.length > 0) {
      dto.video = files.video; // Assuming video is stored as a file object
    } else {
      dto.video = []; // Ensure video is always an array
    }
    return await this.servicesService.create(user.sub, dto);
  }

  @Put("update/:serviceId")
  @ApiOperation({ summary: "Update an existing service" })
  @ApiParam({ name: "serviceId", required: true })
  @ApiResponse({ status: 200, description: "Service updated successfully" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "images", maxCount: 5 },
      { name: "video", maxCount: 1 },
    ]),
  )
  @ApiBody({ type: UpdateServiceDto })
  async update(
    @Param("serviceId") serviceId: string,
    @Body() dto: UpdateServiceDto,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) {
    if (files?.images && files.images.length > 0) {
      dto.images = files.images; // Assuming images are stored as file objects
    }
    if (files?.video && files.video.length > 0) {
      dto.video = files.video; // Assuming video is stored as a file object
    }
    return await this.servicesService.update(serviceId, dto);
  }

  // @Delete(':serviceId')
  // @ApiOperation({ summary: 'Delete a service' })
  // @ApiParam({ name: 'serviceId', required: true })
  // @ApiResponse({ status: 204, description: 'Service deleted successfully' })
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async delete(@Param('serviceId') serviceId: string): Promise<void> {
  //   return await this.servicesService.delete(serviceId);
  // }

  @Get(":serviceId")
  @ApiOperation({ summary: "Get service by ID" })
  @ApiParam({ name: "serviceId", required: true })
  @ApiResponse({ status: 200, description: "Service found" })
  async getById(@Param("serviceId") serviceId: string) {
    return await this.servicesService.getById(serviceId);
  }

  @Get("/user/:userId")
  @ApiOperation({ summary: "Get paginated services by user ID" })
  @ApiParam({ name: "userId", required: true })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Paginated list of services",
  })
  async getByUser(
    @Param("userId") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ): Promise<PaginatedResponseDto<any>> {
    return this.servicesService.getByUser(userId, page, limit);
  }

  @Get("/requests/:userId")
  @ApiOperation({ summary: "Get paginated services by user ID" })
  @ApiParam({ name: "userId", required: true })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Paginated list of services",
  })
  async getServiceRequestsByUser(
    @Param("userId") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ): Promise<PaginatedResponseDto<any>> {
    return this.servicesService.getServiceRequestsByUser(userId, page, limit);
  }

  @Get("with-videos/all")
  @ApiOperation({ summary: "Get all services with videos (paginated)" })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Items per page (default: 10)",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of services with videos",
  })
  async getServicesWithVideos(
    @Query() paginationDto: { page?: number; limit?: number },
    @CurrentUser("sub") userId: string,
  ): Promise<PaginatedResponseDto<any>> {
    console.log("Recieved pagination", paginationDto);
    return this.servicesService.getServicesWithVideos(paginationDto, userId);
  }

  @Delete(":id/media")
  @ApiOperation({ summary: "Delete selected media files for a service" })
  @ApiParam({ name: "id", description: "Service ID" })
  @ApiBody({
    schema: {
      properties: {
        media: {
          type: "array",
          items: { type: "string" },
          description: "Array of media file URLs to delete",
        },
      },
      required: ["media"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Selected service media deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Service not found" })
  @ApiResponse({
    status: 400,
    description: "No media files provided for deletion",
  })
  @HttpCode(HttpStatus.OK)
  async deleteProductMedia(
    @Param("id") serviceId: string,
    @Body("media") media: string[],
  ) {
    if (!Array.isArray(media) || media.length === 0) {
      throw new BadRequestException("No media files provided for deletion");
    }
    await this.servicesService.deleteServiceMedia(serviceId, media);
    return { message: "Selected service media deleted successfully" };
  }
}
