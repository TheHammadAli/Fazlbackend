import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
import { PromotionService } from "./promotion.service";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
import { Promotion } from "./schema/promotion-schema";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";

@ApiTags("Promotions")
@ApiBearerAuth("jwt")
@UseGuards(JwtAuthGuard)
@Controller("promotions")
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Post()
  @ApiOperation({ summary: "Create a promotion" })
  @ApiResponse({ status: 201, type: Promotion })
  async create(@Body() dto: CreatePromotionDto): Promise<Promotion> {
    return this.promotionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all promotions" })
  @ApiResponse({ status: 200, type: [Promotion] })
  async findAll(): Promise<Promotion[]> {
    return this.promotionService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get promotion by ID" })
  @ApiParam({ name: "id", description: "Promotion ID" })
  @ApiResponse({ status: 200, type: Promotion })
  async findById(@Param("id") id: string): Promise<Promotion> {
    return this.promotionService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a promotion" })
  @ApiParam({ name: "id", description: "Promotion ID" })
  @ApiResponse({ status: 200, type: Promotion })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<Promotion> {
    return this.promotionService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a promotion" })
  @ApiParam({ name: "id", description: "Promotion ID" })
  @ApiResponse({ status: 204, description: "Promotion deleted" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string): Promise<void> {
    return this.promotionService.delete(id);
  }

  @Get("feed")
  @ApiOperation({
    summary: "Get feed promotions",
    description: "Fetches all promotions where isInFeed is true.",
  })
  @ApiResponse({
    status: 200,
    description: "Feed promotions found.",
    type: [Promotion],
  })
  async getFeedPromotions(): Promise<Promotion[]> {
    return this.promotionService.getFeedPromotions();
  }
}
